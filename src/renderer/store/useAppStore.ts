import { create } from 'zustand';
import { buildCardExcerpt, type Card } from '../../shared/models/card';

const CARDS_PAGE_SIZE = 20;

type AppState = {
  cards: Card[];
  titleErrors: Record<string, string | undefined>;
  searchQuery: string;
  hasMoreCards: boolean;
  isHydratingCards: boolean;
  isLoadingMoreCards: boolean;
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
  removeCard: (id: string) => Promise<void>;
  setSearchQuery: (searchQuery: string) => void;
};

type PaginationState = {
  loadedCount: number;
  activeKeyword: string;
};

function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((left, right) => right.position - left.position || right.createdAt.localeCompare(left.createdAt));
}

function findCard(cards: Card[], id: string): Card | undefined {
  return cards.find((card) => card.id === id);
}

function mergeCard(cards: Card[], nextCard: Card): Card[] {
  const hasCard = cards.some((card) => card.id === nextCard.id);
  if (!hasCard) return sortCards([nextCard, ...cards]);
  return sortCards(cards.map((card) => (card.id === nextCard.id ? nextCard : card)));
}

function normalizeKeyword(keyword: string): string {
  return keyword.trim();
}

function matchesSearch(card: Card, keyword: string): boolean {
  const normalizedKeyword = normalizeKeyword(keyword).toLocaleLowerCase();
  if (normalizedKeyword === '') return true;

  const haystack = [card.title, card.tags.join(' '), card.excerpt].join(' ').toLocaleLowerCase();
  return haystack.includes(normalizedKeyword);
}

async function fetchCardsPage(offset: number, keyword: string): Promise<Card[]> {
  if (!window.kardsCards) return [];

  return window.kardsCards.list({
    limit: CARDS_PAGE_SIZE,
    offset,
    keyword,
  });
}

const latestPersistRequestByCardId: Record<string, number> = {};
let nextPersistRequestId = 1;
const paginationState: PaginationState = {
  loadedCount: 0,
  activeKeyword: '',
};

async function persistCard(card: Card): Promise<Card | null> {
  if (!window.kardsCards) return null;

  return window.kardsCards.update({
    id: card.id,
    title: card.title,
    content: card.content,
    tags: card.tags,
    updatedAt: card.updatedAt,
    isArchived: card.isArchived,
    position: card.position,
    editorHeight: card.editorHeight,
    isCollapsed: card.isCollapsed,
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
  const nextCards = await fetchCardsPage(currentOffset, keyword);

  if (paginationState.activeKeyword !== keyword) {
    set(() => ({
      isHydratingCards: false,
      isLoadingMoreCards: false,
    }));
    return;
  }

  set((state) => {
    const cards = mode === 'reset' ? nextCards : sortCards([...state.cards, ...nextCards]);
    syncLoadedCount(cards);

    return {
      cards,
      hasMoreCards: nextCards.length === CARDS_PAGE_SIZE,
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
    const nextCards = mergeCard(state.cards, optimisticCard).filter((card) => matchesSearch(card, state.searchQuery));
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
      ? mergeCard(state.cards, persistedCard)
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
  hasMoreCards: true,
  isHydratingCards: false,
  isLoadingMoreCards: false,
  hydrateCards: async () => {
    await refreshCards(set, get, 'reset');
  },
  loadMoreCards: async () => {
    await refreshCards(set, get, 'append');
  },
  addCard: async () => {
    if (!window.kardsCards) return;
    const card = await window.kardsCards.create();
    if (!card) return;

    if (!matchesSearch(card, get().searchQuery)) return;

    set((state) => {
      const nextCards = sortCards([card, ...state.cards]);
      syncLoadedCount(nextCards);

      return {
        cards: nextCards,
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
    let error: string | undefined;

    if (normalizedTitle === '') {
      error = 'Title cannot be empty.';
    } else {
      const hasDuplicate = get().cards.some(
        (card) => card.id !== id && card.title.trim().toLocaleLowerCase() === normalizedTitle.toLocaleLowerCase(),
      );
      if (hasDuplicate) {
        error = 'Title must be unique.';
      }
    }

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
  removeCard: async (id) => {
    if (!window.kardsCards) return;
    const fallbackCard = await window.kardsCards.delete(id);

    set((state) => {
      const filteredCards = state.cards.filter((card) => card.id !== id);
      const nextCards =
        fallbackCard && matchesSearch(fallbackCard, state.searchQuery) ? sortCards([fallbackCard, ...filteredCards]) : filteredCards;
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
}));
