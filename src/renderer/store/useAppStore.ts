import { create } from 'zustand';
import { DEFAULT_CARD_TITLE, buildCardExcerpt, type Card } from '../../shared/models/card';
import {
  deleteCard,
  createCard,
  getCardSortMode,
  getCardsPageSize,
  listCards,
  saveCardSortMode,
  updateCard as persistUpdatedCard,
} from './cardsRepository';
import {
  findCard,
  matchesSearch,
  mergeCard,
  mergeCardInPlace,
  normalizeKeyword,
  sortCards,
  type CardSortMode,
} from './cardStoreUtils';

type AppState = {
  cards: Card[];
  titleErrors: Record<string, string | undefined>;
  searchQuery: string;
  sortMode: CardSortMode;
  isSortModeHydrated: boolean;
  hasMoreCards: boolean;
  isHydratingCards: boolean;
  isLoadingMoreCards: boolean;
  selectedCardId: string | null;
  editingCardId: string | null;
  isLargeMode: boolean;
  hydrateSortMode: () => Promise<void>;
  hydrateCards: () => Promise<void>;
  loadMoreCards: () => Promise<void>;
  addCard: () => Promise<void>;
  toggleCollapseAllCards: () => Promise<void>;
  updateCardTitle: (id: string, title: string) => Promise<void>;
  validateCardTitle: (id: string) => Promise<boolean>;
  updateCardTags: (id: string, tags: string[]) => Promise<void>;
  updateCardContent: (id: string, content: string) => Promise<void>;
  updateCardEditorHeight: (id: string, editorHeight: number) => Promise<void>;
  updateCardCollapsed: (id: string, isCollapsed: boolean) => Promise<void>;
  markCardOpened: (id: string) => Promise<void>;
  toggleCardContentMasked: (id: string) => Promise<void>;
  removeCard: (id: string) => Promise<void>;
  setSearchQuery: (searchQuery: string) => void;
  setSortMode: (sortMode: CardSortMode) => void;
  clearCardFocus: () => void;
  selectCard: (cardId: string) => void;
  startEditingCard: (cardId: string) => void;
  stopEditingCard: (cardId: string) => void;
  openLargeMode: (cardId: string) => void;
  closeLargeMode: () => void;
  resetCardInteractionState: () => void;
};

type PaginationState = {
  loadedCount: number;
  activeKeyword: string;
  activeSortMode: CardSortMode;
};

const latestPersistRequestByCardId: Record<string, number> = {};
let nextPersistRequestId = 1;
const DRAFT_CARD_ID_PREFIX = 'draft-card-';
const paginationState: PaginationState = {
  loadedCount: 0,
  activeKeyword: '',
  activeSortMode: 'created',
};

function isDraftCard(card: Card): boolean {
  return card.id.startsWith(DRAFT_CARD_ID_PREFIX);
}

function createDraftCard(): Card {
  const now = new Date().toISOString();

  return {
    id: `${DRAFT_CARD_ID_PREFIX}${crypto.randomUUID()}`,
    title: DEFAULT_CARD_TITLE,
    content: '',
    contentFormat: 'html',
    tags: [],
    excerpt: '',
    createdAt: now,
    updatedAt: now,
    recentOpenedAt: null,
    isArchived: false,
    position: 0,
    editorHeight: 48,
    isCollapsed: false,
    isContentMasked: false,
  };
}

async function persistCard(card: Card): Promise<Card | null> {
  if (isDraftCard(card)) return null;

  return persistUpdatedCard({
    id: card.id,
    title: card.title,
    content: card.content,
    tags: card.tags,
    updatedAt: card.updatedAt,
    recentOpenedAt: card.recentOpenedAt,
    isArchived: card.isArchived,
    position: card.position,
    editorHeight: card.editorHeight,
    isCollapsed: card.isCollapsed,
    isContentMasked: card.isContentMasked,
  });
}

function syncLoadedCount(cards: Card[]): void {
  paginationState.loadedCount = cards.length;
}

function mergeUpdatedCard(cards: Card[], card: Card, sortMode: CardSortMode, preserveOrder: boolean | undefined): Card[] {
  return preserveOrder ? mergeCardInPlace(cards, card) : mergeCard(cards, card, sortMode);
}

async function refreshCards(
  set: (fn: (state: AppState) => Partial<AppState>) => void,
  get: () => AppState,
  mode: 'reset' | 'append',
): Promise<void> {
  const keyword = normalizeKeyword(get().searchQuery);
  const sortMode = get().sortMode;

  if (mode === 'reset') {
    const shouldClearCards = paginationState.activeKeyword !== keyword;
    paginationState.activeKeyword = keyword;
    paginationState.activeSortMode = sortMode;
    paginationState.loadedCount = 0;
    set((state) => ({
      cards: shouldClearCards ? [] : state.cards,
      hasMoreCards: true,
      isHydratingCards: true,
    }));
  } else {
    if (get().isLoadingMoreCards || !get().hasMoreCards) return;
    paginationState.activeKeyword = keyword;
    paginationState.activeSortMode = sortMode;
    set(() => ({
      isLoadingMoreCards: true,
    }));
  }

  const currentOffset = mode === 'reset' ? 0 : paginationState.loadedCount;
  const nextCards = await listCards({ offset: currentOffset, keyword, sortMode });

  if (paginationState.activeKeyword !== keyword || paginationState.activeSortMode !== sortMode) {
    set(() => ({
      isHydratingCards: false,
      isLoadingMoreCards: false,
    }));
    return;
  }

  set((state) => {
    const cards = mode === 'reset' ? nextCards : sortCards([...state.cards, ...nextCards], sortMode);
    syncLoadedCount(cards);

    return {
      cards,
      hasMoreCards: nextCards.length === getCardsPageSize(),
      isHydratingCards: false,
      isLoadingMoreCards: false,
    };
  });
}

async function updatePersistedCard(
  set: (fn: (state: AppState) => Partial<AppState>) => void,
  get: () => AppState,
  id: string,
  updater: (card: Card) => Card,
  options: { preserveOrder?: boolean } = {},
): Promise<void> {
  const currentCard = findCard(get().cards, id);
  if (!currentCard) return;

  const optimisticCard = {
    ...updater(currentCard),
    updatedAt: new Date().toISOString(),
  };
  const requestId = nextPersistRequestId++;
  latestPersistRequestByCardId[id] = requestId;

  set((state) => {
    const nextCards = mergeUpdatedCard(state.cards, optimisticCard, state.sortMode, options.preserveOrder).filter((card) =>
      matchesSearch(card, state.searchQuery),
    );
    syncLoadedCount(nextCards);

    return {
      cards: nextCards,
    };
  });

  const persistedCard = await persistCard(optimisticCard);
  if (!persistedCard) return;
  if (latestPersistRequestByCardId[id] !== requestId) return;

  set((state) => {
    const nextCards = matchesSearch(persistedCard, state.searchQuery)
      ? mergeUpdatedCard(state.cards, persistedCard, state.sortMode, options.preserveOrder)
      : state.cards.filter((card) => card.id !== persistedCard.id);
    syncLoadedCount(nextCards);

    return {
      cards: nextCards,
    };
  });
}

export const useAppStore = create<AppState>((set, get) => ({
  cards: [],
  titleErrors: {},
  searchQuery: '',
  sortMode: 'created',
  isSortModeHydrated: false,
  hasMoreCards: true,
  isHydratingCards: false,
  isLoadingMoreCards: false,
  selectedCardId: null,
  editingCardId: null,
  isLargeMode: false,
  hydrateSortMode: async () => {
    const sortMode = await getCardSortMode();
    set({
      sortMode,
      isSortModeHydrated: true,
    });
  },
  hydrateCards: async () => {
    await refreshCards(set, get, 'reset');
  },
  loadMoreCards: async () => {
    await refreshCards(set, get, 'append');
  },
  addCard: async () => {
    const card = createDraftCard();

    set((state) => {
      const shouldClearSearch = !matchesSearch(card, state.searchQuery);
      const nextCards = sortCards([card, ...state.cards], state.sortMode);
      syncLoadedCount(nextCards);

      return {
        cards: nextCards,
        searchQuery: shouldClearSearch ? '' : state.searchQuery,
        selectedCardId: card.id,
        editingCardId: card.id,
        titleErrors: {
          ...state.titleErrors,
          [card.id]: undefined,
        },
      };
    });
  },
  toggleCollapseAllCards: async () => {
    const cards = get().cards;
    if (cards.length === 0) return;

    const shouldCollapse = cards.some((card) => !card.isCollapsed);

    set((state) => ({
      cards: state.cards.map((card) => (card.isCollapsed === shouldCollapse ? card : { ...card, isCollapsed: shouldCollapse })),
    }));

    await Promise.all(
      cards
        .filter((card) => card.isCollapsed !== shouldCollapse)
        .map((card) =>
          persistCard({
            ...card,
            isCollapsed: shouldCollapse,
            updatedAt: new Date().toISOString(),
          }),
        ),
    );

    await refreshCards(set, get, 'reset');
  },
  updateCardTitle: async (id, title) => {
    set((state) => ({
      titleErrors: {
        ...state.titleErrors,
        [id]: undefined,
      },
      cards: state.cards.map((card) => (card.id === id && card.title !== title ? { ...card, title } : card)),
    }));
  },
  validateCardTitle: async (id) => {
    const currentCard = findCard(get().cards, id);
    if (!currentCard) return false;

    const normalizedTitle = currentCard.title.trim();

    if (normalizedTitle === '') {
      set((state) => {
        const filteredCards = state.cards.filter((card) => card.id !== id);
        const deletedCardIndex = state.cards.findIndex((card) => card.id === id);
        const previousCard = deletedCardIndex > 0 ? state.cards[deletedCardIndex - 1] : null;
        const shouldMoveSelection = state.selectedCardId === id;
        syncLoadedCount(filteredCards);

        return {
          cards: filteredCards,
          selectedCardId: shouldMoveSelection ? previousCard?.id ?? filteredCards[0]?.id ?? null : state.selectedCardId,
          editingCardId: state.editingCardId === id ? null : state.editingCardId,
          titleErrors: {
            ...state.titleErrors,
            [id]: undefined,
          },
        };
      });

      return false;
    }

    set((state) => ({
      titleErrors: {
        ...state.titleErrors,
        [id]: undefined,
      },
      cards: state.cards.map((card) => (card.id === id ? { ...card, title: normalizedTitle } : card)),
    }));

    if (isDraftCard(currentCard)) {
      const cardToCreate = {
        ...currentCard,
        title: normalizedTitle,
        updatedAt: new Date().toISOString(),
      };
      const persistedCard = await createCard({
        title: cardToCreate.title,
        content: cardToCreate.content,
        tags: cardToCreate.tags,
        createdAt: cardToCreate.createdAt,
        updatedAt: cardToCreate.updatedAt,
        recentOpenedAt: cardToCreate.recentOpenedAt,
        isArchived: cardToCreate.isArchived,
        position: cardToCreate.position,
        editorHeight: cardToCreate.editorHeight,
        isCollapsed: cardToCreate.isCollapsed,
        isContentMasked: cardToCreate.isContentMasked,
      });

      if (persistedCard) {
        set((state) => ({
          cards: state.cards.map((card) => (card.id === id ? persistedCard : card)),
          selectedCardId: state.selectedCardId === id ? persistedCard.id : state.selectedCardId,
          editingCardId: state.editingCardId === id ? persistedCard.id : state.editingCardId,
          titleErrors: {
            ...state.titleErrors,
            [id]: undefined,
            [persistedCard.id]: undefined,
          },
        }));
      }

      return Boolean(persistedCard);
    }

    await updatePersistedCard(set, get, id, (card) => ({
      ...card,
      title: normalizedTitle,
    }));

    return true;
  },
  updateCardTags: async (id, tags) => {
    await updatePersistedCard(set, get, id, (card) => ({
      ...card,
      tags,
    }));
  },
  updateCardContent: async (id, content) => {
    if (findCard(get().cards, id)?.content === content) return;

    await updatePersistedCard(set, get, id, (card) => ({
      ...card,
      content,
      excerpt: buildCardExcerpt(content),
    }));
  },
  updateCardEditorHeight: async (id, editorHeight) => {
    await updatePersistedCard(set, get, id, (card) => ({
      ...card,
      editorHeight,
    }));
  },
  updateCardCollapsed: async (id, isCollapsed) => {
    await updatePersistedCard(set, get, id, (card) => ({
      ...card,
      isCollapsed,
    }));
  },
  markCardOpened: async (id) => {
    await updatePersistedCard(
      set,
      get,
      id,
      (card) => ({
        ...card,
        recentOpenedAt: new Date().toISOString(),
      }),
      { preserveOrder: true },
    );
  },
  toggleCardContentMasked: async (id) => {
    await updatePersistedCard(set, get, id, (card) => ({
      ...card,
      isContentMasked: !card.isContentMasked,
    }));
  },
  removeCard: async (id) => {
    const fallbackCard = await deleteCard(id);

    set((state) => {
      const deletedCardIndex = state.cards.findIndex((card) => card.id === id);
      const filteredCards = state.cards.filter((card) => card.id !== id);
      const nextCards =
        fallbackCard && matchesSearch(fallbackCard, state.searchQuery) ? sortCards([fallbackCard, ...filteredCards], state.sortMode) : filteredCards;
      const shouldMoveSelection = state.selectedCardId === id;
      const previousCard = deletedCardIndex > 0 ? state.cards[deletedCardIndex - 1] : null;
      const nextSelectedCardId = shouldMoveSelection ? previousCard?.id ?? nextCards[0]?.id ?? null : state.selectedCardId;
      syncLoadedCount(nextCards);

      return {
        cards: nextCards,
        selectedCardId: nextSelectedCardId,
        editingCardId: state.editingCardId === id ? null : state.editingCardId,
        titleErrors: {
          ...state.titleErrors,
          [id]: undefined,
        },
      };
    });

    const stateAfterDelete = get();
    if (fallbackCard || !stateAfterDelete.hasMoreCards) return;
    if (stateAfterDelete.cards.length === 0) {
      await refreshCards(set, get, 'reset');
      return;
    }

    await refreshCards(set, get, 'append');
  },
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setSortMode: (sortMode) => {
    set((state) => {
      const nextCards = sortCards(state.cards, sortMode);
      syncLoadedCount(nextCards);

      return {
        sortMode,
        cards: nextCards,
      };
    });
    void saveCardSortMode(sortMode);
  },
  clearCardFocus: () =>
    set({
      selectedCardId: null,
      editingCardId: null,
    }),
  selectCard: (cardId) =>
    set((state) => ({
      selectedCardId: cardId,
      editingCardId: state.editingCardId === cardId ? state.editingCardId : null,
    })),
  startEditingCard: (cardId) =>
    set({
      selectedCardId: cardId,
      editingCardId: cardId,
    }),
  stopEditingCard: (cardId) =>
    set((state) => ({
      editingCardId: state.editingCardId === cardId ? null : state.editingCardId,
    })),
  openLargeMode: (cardId) =>
    set({
      selectedCardId: cardId,
      editingCardId: null,
      isLargeMode: true,
    }),
  closeLargeMode: () =>
    set({
      isLargeMode: false,
      editingCardId: null,
    }),
  resetCardInteractionState: () =>
    set({
      selectedCardId: null,
      editingCardId: null,
      isLargeMode: false,
    }),
}));
