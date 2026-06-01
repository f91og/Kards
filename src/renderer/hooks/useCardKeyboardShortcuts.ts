import { useEffect } from 'react';
import {
  resolveCardInteractionAction,
  type CardInteractionAction,
  type CardInteractionEvent,
} from '@/lib/cardInteractionState';
import type { LargeModeDirection } from '@/lib/largeMode';
import type { Card } from '../../shared/models/card';

function isTextEditingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  return Boolean(
    target.closest('input, textarea, select, [contenteditable="true"], .ProseMirror'),
  );
}

type UseCardKeyboardShortcutsParams = {
  cards: Card[];
  selectedCardId: string | null;
  editingCardId: string | null;
  isLargeMode: boolean;
  largeModeDirection: LargeModeDirection;
  isSearchFocused: boolean;
  onFocusSearch: () => void;
  onCommitSearchSelection: () => boolean;
  addCard: () => Promise<void>;
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
  largeModeDirection,
  isSearchFocused,
  onFocusSearch,
  onCommitSearchSelection,
  addCard,
  selectCard,
  startEditingCard,
  stopEditingCard,
  updateCardCollapsed,
  closeLargeModeAndCollapseSelectedCard,
  openSelectedCardInLargeMode,
}: UseCardKeyboardShortcutsParams) {
  useEffect(() => {
    const selectedCard = selectedCardId ? cards.find((card) => card.id === selectedCardId) ?? null : null;
    const isSelectedCardCollapsed = !isLargeMode && Boolean(selectedCard?.isCollapsed);
    const isActivelyEditing = Boolean(editingCardId && !isSelectedCardCollapsed);

    const moveSelection = (direction: 'next' | 'previous') => {
      const currentIndex = cards.findIndex((card) => card.id === selectedCardId);
      const safeIndex = currentIndex === -1 ? 0 : currentIndex;
      const nextIndex =
        direction === 'next'
          ? Math.min(safeIndex + 1, cards.length - 1)
          : Math.max(safeIndex - 1, 0);

      selectCard(cards[nextIndex].id);
    };

    const executeCardInteractionAction = (action: CardInteractionAction) => {
      if (action === 'none') return false;

      if (action === 'stop-editing' && editingCardId) {
        stopEditingCard(editingCardId);
        return true;
      }

      if (action === 'start-editing' && selectedCardId) {
        startEditingCard(selectedCardId);
        return true;
      }

      if (action === 'expand-card' && selectedCardId) {
        void updateCardCollapsed(selectedCardId, false).catch((error) => {
          console.error('Failed to expand selected card', error);
        });
        return true;
      }

      if (action === 'collapse-card' && selectedCardId) {
        void updateCardCollapsed(selectedCardId, true).catch((error) => {
          console.error('Failed to collapse selected card', error);
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
      const action = resolveCardInteractionAction(interactionEvent, {
        hasSelectedCard: selectedCard !== null,
        isCollapsed: isSelectedCardCollapsed,
        isEditing: isActivelyEditing,
        isLargeMode,
      });

      const handled = executeCardInteractionAction(action);
      if (handled) {
        event.preventDefault();
      }

      return handled;
    };

    const handleDirectionalLargeModeKey = (event: KeyboardEvent) => {
      const isOpenKey = largeModeDirection === 'right' ? event.key === 'l' : event.key === 'j';
      const isCloseKey = largeModeDirection === 'right' ? event.key === 'j' : event.key === 'l';

      if (isOpenKey && !isLargeMode) {
        const handled = executeCardInteractionAction('open-large-card');
        if (handled) {
          event.preventDefault();
        }
        return handled;
      }

      if (isCloseKey && isLargeMode) {
        const handled = executeCardInteractionAction('close-large-card');
        if (handled) {
          event.preventDefault();
        }
        return handled;
      }

      return false;
    };

    const dockWindowToScreenEdge = async (edge: 'left' | 'right') => {
      if (!window.kardsWindow) return;

      const [bounds, workArea] = await Promise.all([
        window.kardsWindow.getBounds(),
        window.kardsWindow.getWorkArea(),
      ]);
      if (!bounds || !workArea) return;

      const nextX = edge === 'left' ? workArea.x : workArea.x + workArea.width - bounds.width;
      await window.kardsWindow.setBounds({
        x: nextX,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      });
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLocaleLowerCase();
      const isEditingText = isTextEditingTarget(event.target);

      if (event.metaKey && !event.ctrlKey && !event.altKey && (key === 'j' || key === 'l')) {
        event.preventDefault();
        void dockWindowToScreenEdge(key === 'j' ? 'left' : 'right').catch((error) => {
          console.error('Failed to dock window', error);
        });
        return;
      }

      if (event.metaKey && !event.ctrlKey && !event.altKey && key === 'n') {
        event.preventDefault();
        void addCard();
        return;
      }

      if (isSearchFocused) {
        if ((event.key === 'Enter' && !event.isComposing) || event.key === 'Escape') {
          if (!onCommitSearchSelection()) return;
          event.preventDefault();
        }
        return;
      }

      if (event.key === 'Escape' && handleCardInteractionKey(event, 'escape')) {
        return;
      }

      if (isActivelyEditing && isEditingText) return;
      if (event.key === '/') {
        event.preventDefault();
        onFocusSearch();
        return;
      }

      if (cards.length === 0) return;
      if (event.key === 'j' || event.key === 'l') {
        handleDirectionalLargeModeKey(event);
        return;
      }
      if (event.key === ' ') {
        if (isActivelyEditing) {
          event.preventDefault();
          return;
        }

        if (isLargeMode) {
          event.preventDefault();
          return;
        }

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
    addCard,
    cards,
    closeLargeModeAndCollapseSelectedCard,
    editingCardId,
    isLargeMode,
    largeModeDirection,
    isSearchFocused,
    onCommitSearchSelection,
    onFocusSearch,
    openSelectedCardInLargeMode,
    selectCard,
    selectedCardId,
    startEditingCard,
    stopEditingCard,
    updateCardCollapsed,
  ]);
}
