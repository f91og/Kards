import { AppTitleBar } from '@/components/AppTitleBar';
import { CardList } from '@/components/CardList';
import { LargeCardPane } from '@/components/LargeCardPane';
import { SearchBox } from '@/components/SearchBox';
import { useStoredState } from '@/hooks/useStoredState';
import { useAppStore } from '@/store/useAppStore';
import { collectUniqueTags, copyCardContentToClipboard, type Card } from '../shared/models/card';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { CardItemProps } from '@/components/CardItem';

type ThemeMode = 'light' | 'dark';

const DEFAULT_TITLE_FONT_SIZE_REM = 0.7;
const DEFAULT_CONTENT_FONT_SIZE_REM = 0.94;
const DEFAULT_WINDOW_OPACITY = 1;
const THEME_STORAGE_KEY = 'kards-theme';
const TITLE_FONT_SIZE_STORAGE_KEY = 'kards-title-font-size';
const CONTENT_FONT_SIZE_STORAGE_KEY = 'kards-content-font-size';
const WINDOW_OPACITY_STORAGE_KEY = 'kards-window-opacity-v2';

export default function App() {
  const previousWindowBoundsRef = useRef<KardsWindowBounds | null>(null);
  const appShellRef = useRef<HTMLElement | null>(null);
  const leftRailRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [largeModeRailWidth, setLargeModeRailWidth] = useState<number | null>(null);
  const [workspaceEditorStyle, setWorkspaceEditorStyle] = useState<CSSProperties | undefined>(undefined);
  const [themeMode, setThemeMode] = useStoredState<ThemeMode>(THEME_STORAGE_KEY, 'light', {
    deserialize: (rawValue) => (rawValue === 'dark' ? 'dark' : 'light'),
    serialize: (value) => value,
  });
  const [titleFontSize, setTitleFontSize] = useStoredState<number>(
    TITLE_FONT_SIZE_STORAGE_KEY,
    DEFAULT_TITLE_FONT_SIZE_REM,
    {
      deserialize: (rawValue) => {
        const storedValue = Number(rawValue);
        return Number.isFinite(storedValue) ? storedValue : DEFAULT_TITLE_FONT_SIZE_REM;
      },
      serialize: (value) => String(value),
    },
  );
  const [contentFontSize, setContentFontSize] = useStoredState<number>(
    CONTENT_FONT_SIZE_STORAGE_KEY,
    DEFAULT_CONTENT_FONT_SIZE_REM,
    {
      deserialize: (rawValue) => {
        const storedValue = Number(rawValue);
        return Number.isFinite(storedValue) ? storedValue : DEFAULT_CONTENT_FONT_SIZE_REM;
      },
      serialize: (value) => String(value),
    },
  );
  const [windowOpacity, setWindowOpacity] = useStoredState<number>(
    WINDOW_OPACITY_STORAGE_KEY,
    DEFAULT_WINDOW_OPACITY,
    {
      deserialize: (rawValue) => {
        const storedValue = Number(rawValue);
        return Number.isFinite(storedValue) ? storedValue : DEFAULT_WINDOW_OPACITY;
      },
      serialize: (value) => String(value),
    },
  );
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
      const nextRailWidth = leftRailRef.current?.getBoundingClientRect().width;
      if (nextRailWidth) {
        setLargeModeRailWidth(nextRailWidth);
      }
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isSearchFocused) {
        event.preventDefault();
        setIsSearchFocused(false);
        if (cards.length > 0) {
          selectCard(cards[0].id);
        }
        searchInputRef.current?.blur();
        return;
      }

      if (event.key === 'Escape' && editingCardId) {
        event.preventDefault();
        stopEditingCard(editingCardId);
        return;
      }

      if (event.key === 'Escape' && isLargeMode) {
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
        void copySelectedCardContent();
        return;
      }
      if (!['ArrowDown', 'ArrowUp', 'k', 'i'].includes(event.key)) return;

      event.preventDefault();

      const currentIndex = cards.findIndex((card) => card.id === selectedCardId);
      const safeIndex = currentIndex === -1 ? 0 : currentIndex;
      const nextIndex =
        event.key === 'ArrowDown' || event.key === 'k'
          ? Math.min(safeIndex + 1, cards.length - 1)
          : Math.max(safeIndex - 1, 0);

      selectCard(cards[nextIndex].id);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [cards, closeLargeMode, editingCardId, isLargeMode, isSearchFocused, selectCard, selectedCard, selectedCardId, stopEditingCard]);

  useEffect(() => {
    if (!window.kardsWindow) {
      setIsPinned(false);
      return;
    }

    window.kardsWindow.getPinState().then(setIsPinned).catch(() => {
      setIsPinned(false);
    });
  }, []);

  useEffect(() => {
    document.body.dataset.theme = themeMode;
  }, [themeMode]);

  useEffect(() => {
    document.documentElement.style.setProperty('--card-title-font-size', `${titleFontSize}rem`);
  }, [titleFontSize]);

  useEffect(() => {
    document.documentElement.style.setProperty('--card-content-font-size', `${contentFontSize}rem`);
  }, [contentFontSize]);

  useEffect(() => {
    void window.kardsWindow?.setOpacity(windowOpacity);
  }, [windowOpacity]);

  useEffect(() => {
    if (!isSettingsOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!settingsRef.current?.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isSettingsOpen]);

  useEffect(() => {
    if (!window.kardsWindow) return;

    const syncWindowBoundsToPopoutState = async () => {
      if (isLargeMode) {
        const currentBounds = await window.kardsWindow.getBounds();
        if (!currentBounds) return;

        if (!previousWindowBoundsRef.current) {
          previousWindowBoundsRef.current = currentBounds;
        }

        const minimumWidth = 1280;
        const nextWidth = Math.max(currentBounds.width, minimumWidth);

        if (nextWidth !== currentBounds.width) {
          await window.kardsWindow.setBounds({ width: nextWidth, height: currentBounds.height });
        }

        return;
      }

      if (previousWindowBoundsRef.current) {
        await window.kardsWindow.setBounds(previousWindowBoundsRef.current);
        previousWindowBoundsRef.current = null;
      }
    };

    void syncWindowBoundsToPopoutState();
  }, [isLargeMode]);

  useEffect(() => {
    if (!isLargeMode) {
      setWorkspaceEditorStyle(undefined);
      setLargeModeRailWidth(null);
      return;
    }

    const updateWorkspaceEditorStyle = () => {
      const shellRect = appShellRef.current?.getBoundingClientRect();
      if (!shellRect || !largeModeRailWidth) return;

      const gap = 16;
      const left = largeModeRailWidth + gap;
      const width = Math.max(320, shellRect.width - left);

      setWorkspaceEditorStyle({
        left: `${left}px`,
        width: `${width}px`,
      });
    };

    updateWorkspaceEditorStyle();
    window.addEventListener('resize', updateWorkspaceEditorStyle);
    return () => {
      window.removeEventListener('resize', updateWorkspaceEditorStyle);
    };
  }, [isLargeMode, largeModeRailWidth]);

  useEffect(() => {
    const loadMoreNode = loadMoreRef.current;
    if (!loadMoreNode || !hasMoreCards || isHydratingCards || isLoadingMoreCards) return;

    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (!entry?.isIntersecting) return;
      void loadMoreCards();
    });

    observer.observe(loadMoreNode);
    return () => {
      observer.disconnect();
    };
  }, [cards.length, hasMoreCards, isHydratingCards, isLoadingMoreCards, loadMoreCards]);

  const settingsFields = [
    {
      label: 'Title size',
      min: '0.5',
      max: '1.4',
      step: '0.02',
      value: titleFontSize,
      onChange: setTitleFontSize,
      formatValue: (nextValue: number) => `${nextValue.toFixed(2)}rem`,
    },
    {
      label: 'Content size',
      min: '0.7',
      max: '1.4',
      step: '0.02',
      value: contentFontSize,
      onChange: setContentFontSize,
      formatValue: (nextValue: number) => `${nextValue.toFixed(2)}rem`,
    },
    {
      label: 'Transparency',
      min: '0.35',
      max: '1',
      step: '0.01',
      value: windowOpacity,
      onChange: setWindowOpacity,
      formatValue: (nextValue: number) => `${Math.round(nextValue * 100)}%`,
    },
  ] as const;

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
          onToggleThemeMode={() => setThemeMode((currentMode) => (currentMode === 'light' ? 'dark' : 'light'))}
          onTogglePin={async () => {
            if (!window.kardsWindow) return;
            const nextState = await window.kardsWindow.togglePin();
            setIsPinned(nextState);
          }}
          onToggleSettingsOpen={() => setIsSettingsOpen((currentState) => !currentState)}
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
            card={selectedCard}
            titleError={titleErrors[selectedCard.id]}
            isEditing={editingCardId === selectedCard.id}
            onClose={closeLargeMode}
            onSelect={() => selectCard(selectedCard.id)}
            onStartEditing={() => startEditingCard(selectedCard.id)}
            onStopEditing={() => stopEditingCard(selectedCard.id)}
            onTitleChange={updateCardTitle}
            onTitleBlur={validateCardTitle}
            onTagsChange={updateCardTags}
            onTagClick={setSearchQuery}
            onContentChange={updateCardContent}
            onEditorHeightChange={updateCardEditorHeight}
            onCollapsedChange={updateCardCollapsed}
            onContentMaskedToggle={toggleCardContentMasked}
            onRemove={removeCard}
          />
        </>
      ) : (
        leftRail
      )}
    </main>
  );
}
