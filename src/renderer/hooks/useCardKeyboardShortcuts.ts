import { useEffect, type RefObject } from 'react';
import {
  resolveCardInteractionAction,
  type CardInteractionAction,
  type CardInteractionEvent,
} from '@/lib/cardInteractionState';
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
  closeLargeModeAndCollapseSelectedCard: () => void;
  openSelectedCardInLargeMode: () => void;
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
  closeLargeModeAndCollapseSelectedCard,
  openSelectedCardInLargeMode,
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

    const executeCardInteractionAction = (action: CardInteractionAction, selectedCard: Card | null) => {
      if (action === 'none') return false;

      if (action === 'stop-editing' && editingCardId) {
        stopEditingCard(editingCardId);
        return true;
      }

      if (action === 'start-editing' && selectedCardId) {
        startEditingCard(selectedCardId);
        return true;
      }

      if (action === 'expand-card' && selectedCard) {
        void updateCardCollapsed(selectedCard.id, false).catch((error) => {
          console.error('Failed to expand selected card', error);
        });
        return true;
      }

      if (action === 'open-large-card') {
        openSelectedCardInLargeMode();
        return true;
      }

      if (action === 'close-large-card') {
        closeLargeModeAndCollapseSelectedCard();
        return true;
      }

      return false;
    };

    const handleCardInteractionKey = (event: KeyboardEvent, interactionEvent: CardInteractionEvent) => {
      const selectedCard = selectedCardId ? cards.find((card) => card.id === selectedCardId) ?? null : null;
      const action = resolveCardInteractionAction(interactionEvent, {
        hasSelectedCard: selectedCard !== null,
        isCollapsed: selectedCard?.isCollapsed ?? false,
        isContentMasked: selectedCard?.isContentMasked ?? false,
        isEditing: Boolean(editingCardId),
        isLargeMode,
      });

      const handled = executeCardInteractionAction(action, selectedCard);
      if (handled) {
        event.preventDefault();
      }

      return handled;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isSearchFocused) {
        event.preventDefault();
        setIsSearchFocused(false);
        selectFirstCard();
        searchInputRef.current?.blur();
        return;
      }

      if (event.key === 'Escape' && handleCardInteractionKey(event, 'escape')) {
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
        handleCardInteractionKey(event, 'space');
        return;
      }
      if (event.key === 'Enter') {
        handleCardInteractionKey(event, 'enter');
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
    closeLargeModeAndCollapseSelectedCard,
    editingCardId,
    isLargeMode,
    isSearchFocused,
    openSelectedCardInLargeMode,
    searchInputRef,
    selectCard,
    selectedCardId,
    setIsSearchFocused,
    startEditingCard,
    stopEditingCard,
    updateCardCollapsed,
  ]);
}
