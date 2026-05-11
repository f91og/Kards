import type { Card } from '../../shared/models/card';

export function sortCards(cards: Card[]): Card[] {
  return [...cards].sort((left, right) => right.position - left.position || right.createdAt.localeCompare(left.createdAt));
}

export function findCard(cards: Card[], id: string): Card | undefined {
  return cards.find((card) => card.id === id);
}

export function mergeCard(cards: Card[], nextCard: Card): Card[] {
  const hasCard = cards.some((card) => card.id === nextCard.id);
  if (!hasCard) return sortCards([nextCard, ...cards]);
  return sortCards(cards.map((card) => (card.id === nextCard.id ? nextCard : card)));
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
