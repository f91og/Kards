import { AppTitleBar } from '@/components/AppTitleBar';
import { CardList } from '@/components/CardList';
import { LargeCardPane } from '@/components/LargeCardPane';
import { SearchBox } from '@/components/SearchBox';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useCardKeyboardShortcuts } from '@/hooks/useCardKeyboardShortcuts';
import { useInfiniteCardScroll } from '@/hooks/useInfiniteCardScroll';
import { useLargeModeLayout } from '@/hooks/useLargeModeLayout';
import { useAppStore } from '@/store/useAppStore';
import { collectUniqueTags, copyCardContentToClipboard, type Card } from '../shared/models/card';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CardItemProps } from '@/components/CardItem';

export default function App() {
  const appShellRef = useRef<HTMLElement | null>(null);
  const leftRailRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const {
    cards,
    titleErrors,
    searchQuery,
    hasMoreCards,
    isHydratingCards,
    isLoadingMoreCards,
    selectedCardId,
    editingCardId,
    isLargeMode,
    setSearchQuery,
    clearCardFocus,
    selectCard,
    startEditingCard,
    stopEditingCard,
    openLargeMode,
    closeLargeMode,
    resetCardInteractionState,
    hydrateCards,
    loadMoreCards,
    addCard,
    toggleCollapseAllCards,
    updateCardTitle,
    validateCardTitle,
    updateCardTags,
    updateCardContent,
    updateCardEditorHeight,
    updateCardCollapsed,
    toggleCardContentMasked,
    removeCard,
  } = useAppStore();
  const {
    settingsRef,
    settingsFields,
    themeMode,
    isPinned,
    isSettingsOpen,
    toggleThemeMode,
    toggleSettingsOpen,
    togglePin,
  } = useAppSettings();
  const { largeModeRailWidth, workspaceEditorStyle, captureRailWidth } = useLargeModeLayout({
    isLargeMode,
    appShellRef,
    leftRailRef,
  });
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  const allTags = useMemo(() => collectUniqueTags(cards.map((card) => card.tags)), [cards]);
  const areAllLoadedCardsCollapsed = cards.length > 0 && cards.every((card) => card.isCollapsed);
  const showTagDropdown = isSearchFocused && normalizedQuery === '' && allTags.length > 0;
  const selectedCard = selectedCardId ? cards.find((card) => card.id === selectedCardId) ?? null : null;

  const copySelectedCardContent = async () => {
    if (!selectedCard) return;

    await copyCardContentToClipboard(selectedCard.content);
  };

  const toggleLargeMode = () => {
    if (!selectedCardId) return;

    if (!isLargeMode) {
      captureRailWidth();
      openLargeMode(selectedCardId);
      return;
    }

    closeLargeMode();
  };

  useEffect(() => {
    if (isSearchFocused) {
      clearCardFocus();
    }
  }, [clearCardFocus, isSearchFocused]);

  useEffect(() => {
    if (cards.length === 0) {
      resetCardInteractionState();
      return;
    }

    if (isSearchFocused) {
      return;
    }

    if (!selectedCardId || !cards.some((card) => card.id === selectedCardId)) {
      selectCard(cards[0].id);
    }

    if (editingCardId && !cards.some((card) => card.id === editingCardId)) {
      stopEditingCard(editingCardId);
    }

  }, [
    cards,
    editingCardId,
    isSearchFocused,
    resetCardInteractionState,
    selectCard,
    selectedCardId,
    stopEditingCard,
  ]);

  useEffect(() => {
    void hydrateCards();
  }, [hydrateCards, normalizedQuery]);

  useCardKeyboardShortcuts({
    cards,
    selectedCardId,
    editingCardId,
    isLargeMode,
    isSearchFocused,
    searchInputRef,
    setIsSearchFocused,
    selectCard,
    stopEditingCard,
    closeLargeMode,
    toggleLargeMode,
    copySelectedCardContent,
  });

  useInfiniteCardScroll({
    loadMoreRef,
    cardsCount: cards.length,
    hasMoreCards,
    isHydratingCards,
    isLoadingMoreCards,
    loadMoreCards,
  });

  const buildCardItemProps = (card: Card, overrides: Partial<CardItemProps> = {}): CardItemProps => ({
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
            forceCollapsed: true,
          }
        : {},
    );

  const leftRail = (
    <div
      ref={leftRailRef}
      className="app-rail"
      style={isLargeMode && largeModeRailWidth ? { width: `${largeModeRailWidth}px` } : undefined}
    >
      <div className="app-topbar">
        <AppTitleBar
          areAllLoadedCardsCollapsed={areAllLoadedCardsCollapsed}
          themeMode={themeMode}
          isPinned={isPinned}
          isSettingsOpen={isSettingsOpen}
          settingsFields={settingsFields}
          settingsRef={settingsRef}
          onAddCard={addCard}
          onToggleCollapseAllCards={() => {
            void toggleCollapseAllCards();
          }}
          onToggleThemeMode={toggleThemeMode}
          onTogglePin={togglePin}
          onToggleSettingsOpen={toggleSettingsOpen}
        />

        <SearchBox
          searchRef={searchRef}
          searchInputRef={searchInputRef}
          searchQuery={searchQuery}
          allTags={allTags}
          showTagDropdown={showTagDropdown}
          onFocusChange={setIsSearchFocused}
          onSearchQueryChange={setSearchQuery}
          onTagSelect={(tag) => {
            setSearchQuery(tag);
            setIsSearchFocused(false);
          }}
        />
      </div>

      <CardList listCards={cards} loadMoreRef={loadMoreRef} buildCardItemProps={buildListCardItemProps} />
    </div>
  );

  return (
    <main ref={appShellRef} className="app-shell">
      {isLargeMode && selectedCard ? (
        <>
          {leftRail}

          <LargeCardPane
            style={workspaceEditorStyle}
            onClose={closeLargeMode}
            cardItemProps={buildCardItemProps(selectedCard, {
              isSelected: true,
              isPoppedOut: true,
            })}
          />
        </>
      ) : (
        leftRail
      )}
    </main>
  );
}
