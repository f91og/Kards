import { create } from 'zustand';
import { buildCardExcerpt, type Card } from '../../shared/models/card';
import type { LargeModeDirection } from '@/lib/largeMode';
import { deleteCard, createCard, getCardsPageSize, listCards, updateCard as persistUpdatedCard } from './cardsRepository';
import { findCard, matchesSearch, mergeCard, normalizeKeyword, sortCards, type CardSortMode, validateCardTitle as getCardTitleError } from './cardStoreUtils';

type AppState = {
  cards: Card[];
  titleErrors: Record<string, string | undefined>;
  searchQuery: string;
  sortMode: CardSortMode;
  hasMoreCards: boolean;
  isHydratingCards: boolean;
  isLoadingMoreCards: boolean;
  selectedCardId: string | null;
  editingCardId: string | null;
  isLargeMode: boolean;
  largeModeDirection: LargeModeDirection;
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
  setLargeModeDirection: (largeModeDirection: LargeModeDirection) => void;
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
};

const latestPersistRequestByCardId: Record<string, number> = {};
let nextPersistRequestId = 1;
const paginationState: PaginationState = {
  loadedCount: 0,
  activeKeyword: '',
};

async function persistCard(card: Card): Promise<Card | null> {
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

async function refreshCards(
  set: (fn: (state: AppState) => Partial<AppState>) => void,
  get: () => AppState,
  mode: 'reset' | 'append',
): Promise<void> {
  const keyword = normalizeKeyword(get().searchQuery);
  const sortMode = get().sortMode;

  if (mode === 'reset') {
    paginationState.activeKeyword = keyword;
    paginationState.loadedCount = 0;
    set(() => ({
      cards: [],
      hasMoreCards: true,
      isHydratingCards: true,
    }));
  } else {
    if (get().isLoadingMoreCards || !get().hasMoreCards) return;
    paginationState.activeKeyword = keyword;
    set(() => ({
      isLoadingMoreCards: true,
    }));
  }

  const currentOffset = mode === 'reset' ? 0 : paginationState.loadedCount;
  const nextCards = await listCards({ offset: currentOffset, keyword, sortMode });

  if (paginationState.activeKeyword !== keyword) {
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
    const nextCards = mergeCard(state.cards, optimisticCard, state.sortMode).filter((card) => matchesSearch(card, state.searchQuery));
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
      ? mergeCard(state.cards, persistedCard, state.sortMode)
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
  hasMoreCards: true,
  isHydratingCards: false,
  isLoadingMoreCards: false,
  selectedCardId: null,
  editingCardId: null,
  isLargeMode: false,
  largeModeDirection: 'right',
  hydrateCards: async () => {
    await refreshCards(set, get, 'reset');
  },
  loadMoreCards: async () => {
    await refreshCards(set, get, 'append');
  },
  addCard: async () => {
    const card = await createCard();
    if (!card) return;

    set((state) => {
      const shouldClearSearch = !matchesSearch(card, state.searchQuery);
      const nextCards = sortCards([card, ...state.cards], state.sortMode);
      syncLoadedCount(nextCards);

      return {
        cards: nextCards,
        searchQuery: shouldClearSearch ? '' : state.searchQuery,
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
      cards: state.cards.map((card) => (card.id === id ? { ...card, title } : card)),
    }));
  },
  validateCardTitle: async (id) => {
    const currentCard = findCard(get().cards, id);
    if (!currentCard) return false;

    const normalizedTitle = currentCard.title.trim();
    const error = getCardTitleError(get().cards, id, normalizedTitle);

    set((state) => ({
      titleErrors: {
        ...state.titleErrors,
        [id]: error,
      },
      cards:
        error === undefined
          ? state.cards.map((card) => (card.id === id ? { ...card, title: normalizedTitle } : card))
          : state.cards,
    }));

    if (error !== undefined) return false;

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
    await updatePersistedCard(set, get, id, (card) => ({
      ...card,
      recentOpenedAt: new Date().toISOString(),
    }));
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
      const filteredCards = state.cards.filter((card) => card.id !== id);
      const nextCards =
        fallbackCard && matchesSearch(fallbackCard, state.searchQuery) ? sortCards([fallbackCard, ...filteredCards], state.sortMode) : filteredCards;
      syncLoadedCount(nextCards);

      return {
        cards: nextCards,
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
  setSortMode: (sortMode) => set({ sortMode }),
  setLargeModeDirection: (largeModeDirection) => set({ largeModeDirection }),
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
