import { useEffect, useMemo, type CSSProperties, type RefObject } from 'react';
import type { CardItemProps } from '@/components/CardItem';
import { useLargeModeLayout } from '@/hooks/useLargeModeLayout';
import type { LargeModeDirection } from '@/lib/largeMode';
import type { Card } from '../../shared/models/card';

type UseLargeModeControllerParams = {
  cards: Card[];
  titleErrors: Record<string, string | undefined>;
  selectedCardId: string | null;
  editingCardId: string | null;
  isLargeMode: boolean;
  largeModeDirection: LargeModeDirection;
  appShellRef: RefObject<HTMLElement>;
  leftRailRef: RefObject<HTMLDivElement>;
  setSearchQuery: (query: string) => void;
  selectCard: (cardId: string) => void;
  startEditingCard: (cardId: string) => void;
  stopEditingCard: (cardId: string) => void;
  openLargeMode: (cardId: string) => void;
  closeLargeMode: () => void;
  markCardOpened: (id: string) => Promise<void>;
  updateCardTitle: (id: string, title: string) => Promise<void>;
  validateCardTitle: (id: string) => Promise<boolean>;
  updateCardTags: (id: string, tags: string[]) => Promise<void>;
  updateCardContent: (id: string, content: string) => Promise<void>;
  updateCardEditorHeight: (id: string, editorHeight: number) => Promise<void>;
  updateCardCollapsed: (id: string, isCollapsed: boolean) => Promise<void>;
  toggleCardContentMasked: (id: string) => Promise<void>;
  removeCard: (id: string) => Promise<void>;
};

type BuildCardItemProps = (card: Card, overrides?: Partial<CardItemProps>) => CardItemProps;

export function useLargeModeController({
  cards,
  titleErrors,
  selectedCardId,
  editingCardId,
  isLargeMode,
  largeModeDirection,
  appShellRef,
  leftRailRef,
  setSearchQuery,
  selectCard,
  startEditingCard,
  stopEditingCard,
  openLargeMode,
  closeLargeMode,
  markCardOpened,
  updateCardTitle,
  validateCardTitle,
  updateCardTags,
  updateCardContent,
  updateCardEditorHeight,
  updateCardCollapsed,
  toggleCardContentMasked,
  removeCard,
}: UseLargeModeControllerParams) {
  const { largeModeRailWidth, workspaceEditorStyle } = useLargeModeLayout({
    isLargeMode,
    largeModeDirection,
    appShellRef,
    leftRailRef,
  });

  const selectedCard = useMemo(
    () => (selectedCardId ? cards.find((card) => card.id === selectedCardId) ?? null : null),
    [cards, selectedCardId],
  );

  const collapseCardIfNeeded = (card: Card | null) => {
    if (!card || card.isCollapsed) return;
    void updateCardCollapsed(card.id, true);
  };

  useEffect(() => {
    if (!isLargeMode || !selectedCard || selectedCard.isCollapsed) return;
    void updateCardCollapsed(selectedCard.id, true);
  }, [isLargeMode, selectedCard, updateCardCollapsed]);

  const closeLargeModeAndCollapseSelectedCard = () => {
    collapseCardIfNeeded(selectedCard);
    closeLargeMode();
  };

  const openSelectedCardInLargeMode = () => {
    if (!selectedCard) return;

    openLargeMode(selectedCard.id);
    void markCardOpened(selectedCard.id);
    collapseCardIfNeeded(selectedCard);
  };

  const buildCardItemProps: BuildCardItemProps = (card, overrides = {}) => ({
    card,
    isSelected: card.id === selectedCardId,
    isEditing: card.id === editingCardId,
    titleError: titleErrors[card.id],
    onSelect: () => selectCard(card.id),
    onStartEditing: () => startEditingCard(card.id),
    onStopEditing: () => stopEditingCard(card.id),
    onTitleChange: updateCardTitle,
    onTitleBlur: validateCardTitle,
    onTagsChange: updateCardTags,
    onTagClick: setSearchQuery,
    onContentChange: updateCardContent,
    onEditorHeightChange: updateCardEditorHeight,
    onCollapsedChange: updateCardCollapsed,
    onContentMaskedToggle: toggleCardContentMasked,
    onRemove: removeCard,
    ...overrides,
  });

  const buildListCardItemProps = (card: Card): CardItemProps =>
    buildCardItemProps(
      card,
      isLargeMode
        ? {
            isEditing: false,
            forceCollapsed: card.id === selectedCardId && !card.isCollapsed,
          }
        : {},
    );

  const leftRailStyle: CSSProperties | undefined =
    isLargeMode && largeModeRailWidth
      ? {
          width: `${largeModeRailWidth}px`,
          marginLeft: largeModeDirection === 'left' ? 'auto' : undefined,
        }
      : undefined;

  return {
    buildCardItemProps,
    buildListCardItemProps,
    largeModeDirection,
    leftRailStyle,
    selectedCard,
    closeLargeModeAndCollapseSelectedCard,
    openSelectedCardInLargeMode,
    workspaceEditorStyle,
  };
}
