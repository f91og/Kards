import type { Card, CardUpdate } from '../shared/models/card';

export {};

declare global {
  interface KardsWindowBounds {
    x: number;
    y: number;
    width: number;
    height: number;
  }

  interface Window {
    kardsWindow: {
      togglePin: () => Promise<boolean>;
      getPinState: () => Promise<boolean>;
      getBounds: () => Promise<KardsWindowBounds | null>;
      getWorkArea: () => Promise<KardsWindowBounds | null>;
      setOpacity: (opacity: number) => Promise<number>;
      setBounds: (bounds: { width: number; height: number; x?: number; y?: number }) => Promise<KardsWindowBounds | null>;
      onBoundsChanged: (listener: (bounds: KardsWindowBounds) => void) => () => void;
    };
    kardsCards: {
      list: (options?: { limit?: number; offset?: number; keyword?: string | null }) => Promise<Card[]>;
      create: () => Promise<Card | null>;
      update: (card: CardUpdate) => Promise<Card | null>;
      delete: (id: string) => Promise<Card | null>;
    };
  }
}
