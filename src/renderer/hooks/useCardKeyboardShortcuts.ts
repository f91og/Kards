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
  updateCardCollapsed: (cardId: string, isCollapsed: boolean) => Promise<void>;
  closeLargeMode: () => void;
  toggleLargeMode: () => void;
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
      if (event.key === ' ') {
        event.preventDefault();
        toggleLargeMode();
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        if (isLargeMode) {
          if (selectedCardId) {
            startEditingCard(selectedCardId);
          }
          return;
        }

        const selectedCard = cards.find((card) => card.id === selectedCardId);
        if (selectedCard) {
          void updateCardCollapsed(selectedCard.id, !selectedCard.isCollapsed);
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
    toggleLargeMode,
    updateCardCollapsed,
  ]);
}
