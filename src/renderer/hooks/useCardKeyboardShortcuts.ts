import { useEffect, type RefObject } from 'react';
import type { Card } from '../../shared/models/card';

type UseCardKeyboardShortcutsParams = {
  cards: Card[];
  selectedCardId: string | null;
  editingCardId: string | null;
  isLargeMode: boolean;
  isSearchFocused: boolean;
  searchInputRef: RefObject<HTMLInputElement>;
  setIsSearchFocused: (isFocused: boolean) => void;
  selectCard: (cardId: string) => void;
  startEditingCard: (cardId: string) => void;
  stopEditingCard: (cardId: string) => void;
  updateCardCollapsed: (id: string, isCollapsed: boolean) => Promise<void>;
  closeLargeMode: () => void;
  toggleLargeMode: () => Promise<void>;
};

export function useCardKeyboardShortcuts({
  cards,
  selectedCardId,
  editingCardId,
  isLargeMode,
  isSearchFocused,
  searchInputRef,
  setIsSearchFocused,
  selectCard,
  startEditingCard,
  stopEditingCard,
  updateCardCollapsed,
  closeLargeMode,
  toggleLargeMode,
}: UseCardKeyboardShortcutsParams) {
  useEffect(() => {
    const selectFirstCard = () => {
      if (cards.length > 0) {
        selectCard(cards[0].id);
      }
    };

    const moveSelection = (direction: 'next' | 'previous') => {
      const currentIndex = cards.findIndex((card) => card.id === selectedCardId);
      const safeIndex = currentIndex === -1 ? 0 : currentIndex;
      const nextIndex =
        direction === 'next'
          ? Math.min(safeIndex + 1, cards.length - 1)
          : Math.max(safeIndex - 1, 0);

      selectCard(cards[nextIndex].id);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isSearchFocused) {
        event.preventDefault();
        setIsSearchFocused(false);
        selectFirstCard();
        searchInputRef.current?.blur();
        return;
      }

      if (event.key === 'Escape' && editingCardId) {
        event.preventDefault();
        stopEditingCard(editingCardId);
        return;
      }

      if (event.key === 'Escape' && isLargeMode && selectedCardId && !editingCardId) {
        event.preventDefault();
        closeLargeMode();
        return;
      }

      if (editingCardId || isSearchFocused || cards.length === 0) return;
      if (event.key === '/') {
        event.preventDefault();
        setIsSearchFocused(true);
        searchInputRef.current?.focus();
        return;
      }
      if (event.key === ' ') {
        event.preventDefault();

        if (isLargeMode) {
          closeLargeMode();
          return;
        }

        const selectedCard = selectedCardId ? cards.find((card) => card.id === selectedCardId) ?? null : null;
        if (!selectedCard) return;

        if (selectedCard.isCollapsed) {
          void updateCardCollapsed(selectedCard.id, false).catch((error) => {
            console.error('Failed to expand selected card', error);
          });
          return;
        }

        void toggleLargeMode().catch((error) => {
          console.error('Failed to toggle large mode', error);
        });
        return;
      }
      if (event.key === 'Enter') {
        if (isLargeMode && selectedCardId) {
          event.preventDefault();
          startEditingCard(selectedCardId);
        }
        return;
      }
      if (!['ArrowDown', 'ArrowUp', 'k', 'i'].includes(event.key)) return;

      event.preventDefault();
      moveSelection(event.key === 'ArrowDown' || event.key === 'k' ? 'next' : 'previous');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    cards,
    closeLargeMode,
    editingCardId,
    isLargeMode,
    isSearchFocused,
    searchInputRef,
    selectCard,
    selectedCardId,
    setIsSearchFocused,
    startEditingCard,
    stopEditingCard,
    updateCardCollapsed,
    toggleLargeMode,
  ]);
}
