import type { Card } from '../../shared/models/card';

export type CardSortMode = 'created' | 'recent-opened';

export function sortCards(cards: Card[], sortMode: CardSortMode = 'created'): Card[] {
  return [...cards].sort((left, right) => {
    if (sortMode === 'recent-opened') {
      const leftRecent = left.recentOpenedAt ?? '';
      const rightRecent = right.recentOpenedAt ?? '';
      if (rightRecent !== leftRecent) return rightRecent.localeCompare(leftRecent);
    }

    return right.createdAt.localeCompare(left.createdAt);
  });
}

export function findCard(cards: Card[], id: string): Card | undefined {
  return cards.find((card) => card.id === id);
}

export function mergeCard(cards: Card[], nextCard: Card, sortMode: CardSortMode = 'created'): Card[] {
  const hasCard = cards.some((card) => card.id === nextCard.id);
  if (!hasCard) return sortCards([nextCard, ...cards], sortMode);
  return sortCards(cards.map((card) => (card.id === nextCard.id ? nextCard : card)), sortMode);
}

export function normalizeKeyword(keyword: string): string {
  return keyword.trim();
}

export function matchesSearch(card: Card, keyword: string): boolean {
  const normalizedKeyword = normalizeKeyword(keyword).toLocaleLowerCase();
  if (normalizedKeyword === '') return true;

  const haystack = [card.title, card.tags.join(' '), card.excerpt].join(' ').toLocaleLowerCase();
  return haystack.includes(normalizedKeyword);
}

export function validateCardTitle(cards: Card[], id: string, title: string): string | undefined {
  const normalizedTitle = title.trim();

  if (normalizedTitle === '') {
    return 'Title cannot be empty.';
  }

  const hasDuplicate = cards.some(
    (card) => card.id !== id && card.title.trim().toLocaleLowerCase() === normalizedTitle.toLocaleLowerCase(),
  );

  return hasDuplicate ? 'Title must be unique.' : undefined;
}
