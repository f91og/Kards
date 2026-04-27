import type { Card, CardUpdate } from '../shared/models/card';

export {};

declare global {
  interface Window {
    kardsWindow: {
      togglePin: () => Promise<boolean>;
      getPinState: () => Promise<boolean>;
    };
    kardsCards: {
      list: () => Promise<Card[]>;
      create: () => Promise<Card | null>;
      update: (card: CardUpdate) => Promise<Card | null>;
      delete: (id: string) => Promise<Card[]>;
    };
  }
}
