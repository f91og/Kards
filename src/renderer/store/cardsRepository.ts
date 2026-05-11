import type { Card, CardUpdate } from '../../shared/models/card';

const CARDS_PAGE_SIZE = 20;

export type ListCardsOptions = {
  limit?: number;
  offset?: number;
  keyword?: string | null;
};

export function getCardsPageSize(): number {
  return CARDS_PAGE_SIZE;
}

export async function listCards(options?: ListCardsOptions): Promise<Card[]> {
  if (!window.kardsCards) return [];
  return window.kardsCards.list({
    limit: options?.limit ?? CARDS_PAGE_SIZE,
    offset: options?.offset ?? 0,
    keyword: options?.keyword ?? '',
  });
}

export async function createCard(): Promise<Card | null> {
  if (!window.kardsCards) return null;
  return window.kardsCards.create();
}

export async function updateCard(card: CardUpdate): Promise<Card | null> {
  if (!window.kardsCards) return null;
  return window.kardsCards.update(card);
}

export async function deleteCard(id: string): Promise<Card | null> {
  if (!window.kardsCards) return null;
  return window.kardsCards.delete(id);
}
