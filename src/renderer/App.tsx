import { AppTitleBar } from '@/components/AppTitleBar';
import { CardList } from '@/components/CardList';
import { LargeCardPane } from '@/components/LargeCardPane';
import { SearchBox } from '@/components/SearchBox';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useCardKeyboardShortcuts } from '@/hooks/useCardKeyboardShortcuts';
import { useInfiniteCardScroll } from '@/hooks/useInfiniteCardScroll';
import { useLargeModeController } from '@/hooks/useLargeModeController';
import { useAppStore } from '@/store/useAppStore';
import { collectUniqueTags } from '../shared/models/card';
import { useEffect, useMemo, useRef, useState } from 'react';

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
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  const allTags = useMemo(() => collectUniqueTags(cards.map((card) => card.tags)), [cards]);
  const showTagDropdown = isSearchFocused && normalizedQuery === '' && allTags.length > 0;
  const {
    buildCardItemProps,
    buildListCardItemProps,
    leftRailStyle,
    selectedCard,
    toggleLargeMode,
    workspaceEditorStyle,
  } = useLargeModeController({
    cards,
    titleErrors,
    selectedCardId,
    editingCardId,
    isLargeMode,
    appShellRef,
    leftRailRef,
    setSearchQuery,
    selectCard,
    startEditingCard,
    stopEditingCard,
    openLargeMode,
    closeLargeMode,
    updateCardTitle,
    validateCardTitle,
    updateCardTags,
    updateCardContent,
    updateCardEditorHeight,
    updateCardCollapsed,
    toggleCardContentMasked,
    removeCard,
  });

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
    startEditingCard,
    stopEditingCard,
    updateCardCollapsed,
    closeLargeMode,
    toggleLargeMode,
  });

  useInfiniteCardScroll({
    loadMoreRef,
    cardsCount: cards.length,
    hasMoreCards,
    isHydratingCards,
    isLoadingMoreCards,
    loadMoreCards,
  });

  const leftRail = (
    <div ref={leftRailRef} className="app-rail" style={leftRailStyle}>
      <div className="app-topbar">
        <AppTitleBar
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

      <CardList
        listCards={cards}
        selectedCardId={selectedCardId}
        loadMoreRef={loadMoreRef}
        buildCardItemProps={buildListCardItemProps}
      />
    </div>
  );

  return (
    <main
      ref={appShellRef}
      className={isLargeMode && selectedCard ? 'app-shell app-shell--large-mode' : 'app-shell'}
    >
      {leftRail}

      {isLargeMode && selectedCard ? (
        <LargeCardPane
          style={workspaceEditorStyle}
          onClose={closeLargeMode}
          cardItemProps={buildCardItemProps(selectedCard, {
            isSelected: true,
            isPoppedOut: true,
          })}
        />
      ) : null}
    </main>
  );
}
