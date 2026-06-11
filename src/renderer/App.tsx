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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export default function App() {
  const appShellRef = useRef<HTMLElement | null>(null);
  const leftRailRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isWindowFocused, setIsWindowFocused] = useState(() => document.hasFocus());
  const {
    cards,
    titleErrors,
    searchQuery,
    sortMode,
    isSortModeHydrated,
    hasMoreCards,
    isHydratingCards,
    isLoadingMoreCards,
    selectedCardId,
    editingCardId,
    isLargeMode,
    setSearchQuery,
    setSortMode,
    clearCardFocus,
    selectCard,
    startEditingCard,
    stopEditingCard,
    openLargeMode,
    closeLargeMode,
    resetCardInteractionState,
    hydrateSortMode,
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
    markCardOpened,
    toggleCardContentMasked,
    removeCard,
  } = useAppStore();
  const {
    settingsRef,
    settingsFields,
    autoCollapse,
    setAutoCollapse,
    pinAcrossWorkspaces,
    setPinAcrossWorkspaces,
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
  const focusSearch = useCallback(() => {
    setIsSearchFocused(true);
    searchInputRef.current?.focus();
  }, []);
  const leaveSearch = useCallback(() => {
    setIsSearchFocused(false);
    searchInputRef.current?.blur();
  }, []);
  const commitSearchSelection = useCallback(() => {
    const firstCard = cards[0];
    if (!firstCard) return false;

    leaveSearch();
    selectCard(firstCard.id);
    return true;
  }, [cards, leaveSearch, selectCard]);
  const selectCardFromInteraction = useCallback(
    (cardId: string) => {
      leaveSearch();
      selectCard(cardId);
    },
    [leaveSearch, selectCard],
  );
  const {
    buildCardItemProps,
    buildListCardItemProps,
    closeLargeModeAndCollapseSelectedCard,
    leftRailStyle,
    largeModeDirection,
    openSelectedCardInLargeMode,
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
    selectCard: selectCardFromInteraction,
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
  });

  useEffect(() => {
    if (isSearchFocused) {
      clearCardFocus();
    }
  }, [clearCardFocus, isSearchFocused]);

  const handleWindowFocusChanged = useCallback(
    (isFocused: boolean) => {
      setIsWindowFocused(isFocused);

      if (!isFocused && autoCollapse && isLargeMode) {
        closeLargeModeAndCollapseSelectedCard();
      }
    },
    [autoCollapse, closeLargeModeAndCollapseSelectedCard, isLargeMode],
  );

  useEffect(() => {
    const handleWindowFocus = () => {
      handleWindowFocusChanged(true);
    };
    const handleWindowBlur = () => {
      handleWindowFocusChanged(false);
    };

    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('blur', handleWindowBlur);
    const removeWindowFocusChanged = window.kardsWindow?.onFocusChanged?.(handleWindowFocusChanged);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('blur', handleWindowBlur);
      removeWindowFocusChanged?.();
    };
  }, [handleWindowFocusChanged]);

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
    void hydrateSortMode();
  }, [hydrateSortMode]);

  useEffect(() => {
    if (!isSortModeHydrated) return;
    void hydrateCards();
  }, [hydrateCards, isSortModeHydrated, normalizedQuery, sortMode]);

  useCardKeyboardShortcuts({
    cards,
    selectedCardId,
    editingCardId,
    isLargeMode,
    largeModeDirection,
    isSearchFocused,
    onFocusSearch: focusSearch,
    onCommitSearchSelection: commitSearchSelection,
    addCard,
    selectCard: selectCardFromInteraction,
    startEditingCard,
    stopEditingCard,
    updateCardCollapsed,
    closeLargeModeAndCollapseSelectedCard,
    openSelectedCardInLargeMode,
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
          isLargeMode={isLargeMode}
          isSettingsOpen={isSettingsOpen}
          autoCollapse={autoCollapse}
          pinAcrossWorkspaces={pinAcrossWorkspaces}
          settingsFields={settingsFields}
          settingsRef={settingsRef}
          onAddCard={addCard}
          onToggleCollapseAllCards={() => {
            void toggleCollapseAllCards();
          }}
          onToggleLargeMode={toggleLargeMode}
          onToggleThemeMode={toggleThemeMode}
          onTogglePin={togglePin}
          onToggleSettingsOpen={toggleSettingsOpen}
          onAutoCollapseChange={setAutoCollapse}
          onPinAcrossWorkspacesChange={setPinAcrossWorkspaces}
        />

        <SearchBox
          searchRef={searchRef}
          searchInputRef={searchInputRef}
          searchQuery={searchQuery}
          allTags={allTags}
          showTagDropdown={showTagDropdown}
          sortMode={sortMode}
          onFocusChange={setIsSearchFocused}
          onSearchQueryChange={setSearchQuery}
          onSortModeChange={setSortMode}
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
    <main ref={appShellRef} className={`app-shell${isWindowFocused ? ' app-shell--focused' : ''}`}>
      {leftRail}

      <LargeCardPane
        visible={Boolean(isLargeMode && selectedCard)}
        style={workspaceEditorStyle}
        onClose={closeLargeModeAndCollapseSelectedCard}
        cardItemProps={
          selectedCard
            ? buildCardItemProps(selectedCard, {
                isSelected: true,
                isPoppedOut: true,
              })
          : null
        }
      />
    </main>
  );
}
