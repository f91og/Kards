import { create } from 'zustand';
import { buildCardExcerpt, type Card } from '../../shared/models/card';

type AppState = {
  cards: Card[];
  titleErrors: Record<string, string | undefined>;
  searchQuery: string;
  hydrateCards: () => Promise<void>;
  addCard: () => Promise<void>;
  updateCardTitle: (id: string, title: string) => Promise<void>;
  validateCardTitle: (id: string) => Promise<boolean>;
  updateCardTags: (id: string, tags: string[]) => Promise<void>;
  updateCardContent: (id: string, content: string) => Promise<void>;
  updateCardEditorHeight: (id: string, editorHeight: number) => Promise<void>;
  updateCardCollapsed: (id: string, isCollapsed: boolean) => Promise<void>;
  removeCard: (id: string) => Promise<void>;
  setSearchQuery: (searchQuery: string) => void;
};

function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((left, right) => right.position - left.position || right.createdAt.localeCompare(left.createdAt));
}

function findCard(cards: Card[], id: string): Card | undefined {
  return cards.find((card) => card.id === id);
}

function mergeCard(cards: Card[], nextCard: Card): Card[] {
  return sortCards(cards.map((card) => (card.id === nextCard.id ? nextCard : card)));
}

const latestPersistRequestByCardId: Record<string, number> = {};
let nextPersistRequestId = 1;

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

  set((state) => ({
    cards: mergeCard(state.cards, optimisticCard),
  }));

  const persistedCard = await persistCard(optimisticCard);
  if (!persistedCard) return;
  if (latestPersistRequestByCardId[id] !== requestId) return;

  set((state) => ({
    cards: mergeCard(state.cards, persistedCard),
  }));
}

export const useAppStore = create<AppState>((set, get) => ({
  cards: [],
  titleErrors: {},
  searchQuery: '',
  hydrateCards: async () => {
    if (!window.kardsCards) return;
    const cards = await window.kardsCards.list();
    set({ cards: sortCards(cards) });
  },
  addCard: async () => {
    if (!window.kardsCards) return;
    const card = await window.kardsCards.create();
    if (!card) return;

    set((state) => ({
      cards: sortCards([card, ...state.cards]),
      titleErrors: {
        ...state.titleErrors,
        [card.id]: undefined,
      },
    }));
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
    const cards = await window.kardsCards.delete(id);
    set((state) => ({
      cards: sortCards(cards),
      titleErrors: {
        ...state.titleErrors,
        [id]: undefined,
      },
    }));
  },
  setSearchQuery: (searchQuery) => set({ searchQuery }),
}));
