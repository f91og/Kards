import { AppTitleBar } from '@/components/AppTitleBar';
import { CardList } from '@/components/CardList';
import { SearchBox } from '@/components/SearchBox';
import { useStoredState } from '@/hooks/useStoredState';
import { useAppStore } from '@/store/useAppStore';
import { collectUniqueTags, copyCardContentToClipboard, type Card } from '../shared/models/card';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { CardItemProps } from '@/components/CardItem';

type PoppedCardMode = 'medium' | 'large';
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
  const noticeTimeoutRef = useRef<number | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [poppedCardId, setPoppedCardId] = useState<string | null>(null);
  const [poppedCardMode, setPoppedCardMode] = useState<PoppedCardMode | null>(null);
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
    setSearchQuery,
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
    removeCard,
  } = useAppStore();
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  const allTags = useMemo(() => collectUniqueTags(cards.map((card) => card.tags)), [cards]);
  const visibleCards = cards;
  const poppedCard = poppedCardId ? cards.find((card) => card.id === poppedCardId) ?? null : null;
  const listCards = poppedCardId ? visibleCards.filter((card) => card.id !== poppedCardId) : visibleCards;
  const areAllLoadedCardsCollapsed = listCards.length > 0 && listCards.every((card) => card.isCollapsed);
  const showTagDropdown = isSearchFocused && normalizedQuery === '' && allTags.length > 0;
  const selectedCard = selectedCardId ? visibleCards.find((card) => card.id === selectedCardId) ?? null : null;

  const showNotice = (message: string) => {
    setNoticeMessage(message);
    if (noticeTimeoutRef.current !== null) {
      window.clearTimeout(noticeTimeoutRef.current);
    }
    noticeTimeoutRef.current = window.setTimeout(() => {
      setNoticeMessage(null);
      noticeTimeoutRef.current = null;
    }, 2200);
  };

  const selectCard = (cardId: string) => {
    setSelectedCardId(cardId);
    setEditingCardId((currentEditingCardId) => (currentEditingCardId === cardId ? currentEditingCardId : null));
  };

  const startEditingCard = (cardId: string) => {
    selectCard(cardId);
    setEditingCardId(cardId);
  };

  const stopEditingCard = (cardId: string) => {
    setEditingCardId((currentEditingCardId) => (currentEditingCardId === cardId ? null : currentEditingCardId));
  };

  const copySelectedCardContent = async () => {
    if (!selectedCardId) return;

    const selectedCard = visibleCards.find((card) => card.id === selectedCardId);
    if (!selectedCard) return;

    await copyCardContentToClipboard(selectedCard.content);
  };

  const closePoppedCard = () => {
    setPoppedCardId(null);
    setPoppedCardMode(null);
    setEditingCardId(null);
  };

  const cyclePoppedCard = () => {
    if (!selectedCardId) return;
    if (selectedCard?.isCollapsed) {
      showNotice('Collapsed card cannot be enlarged');
      return;
    }

    if (poppedCardId !== selectedCardId) {
      setPoppedCardId(selectedCardId);
      setPoppedCardMode('medium');
      setEditingCardId(selectedCardId);
      return;
    }

    if (poppedCardMode === 'medium') {
      setPoppedCardMode('large');
      return;
    }

    closePoppedCard();
  };

  useEffect(() => {
    if (isSearchFocused) {
      setSelectedCardId(null);
      setEditingCardId(null);
    }
  }, [isSearchFocused]);

  useEffect(() => {
    return () => {
      if (noticeTimeoutRef.current !== null) {
        window.clearTimeout(noticeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (visibleCards.length === 0) {
      setSelectedCardId(null);
      setEditingCardId(null);
      setPoppedCardId(null);
      setPoppedCardMode(null);
      return;
    }

    if (isSearchFocused) {
      return;
    }

    if (!selectedCardId || !visibleCards.some((card) => card.id === selectedCardId)) {
      setSelectedCardId(visibleCards[0].id);
    }

    if (editingCardId && !visibleCards.some((card) => card.id === editingCardId)) {
      setEditingCardId(null);
    }

    if (poppedCardId && !cards.some((card) => card.id === poppedCardId)) {
      setPoppedCardId(null);
      setPoppedCardMode(null);
    }
  }, [cards, editingCardId, isSearchFocused, poppedCardId, selectedCardId, visibleCards]);

  useEffect(() => {
    void hydrateCards();
  }, [hydrateCards, normalizedQuery]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isSearchFocused) {
        event.preventDefault();
        setIsSearchFocused(false);
        if (visibleCards.length > 0) {
          setSelectedCardId(visibleCards[0].id);
        }
        searchInputRef.current?.blur();
        return;
      }

      if (event.key === 'Escape' && editingCardId) {
        event.preventDefault();
        setEditingCardId(null);
        return;
      }

      if (event.key === 'Escape' && poppedCardId) {
        event.preventDefault();
        closePoppedCard();
        return;
      }

      if (editingCardId || isSearchFocused || visibleCards.length === 0) return;
      if (event.key === ' ') {
        event.preventDefault();
        cyclePoppedCard();
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        void copySelectedCardContent();
        return;
      }
      if (poppedCardId) return;
      if (!['ArrowDown', 'ArrowUp', 'k', 'i'].includes(event.key)) return;

      event.preventDefault();

      const currentIndex = visibleCards.findIndex((card) => card.id === selectedCardId);
      const safeIndex = currentIndex === -1 ? 0 : currentIndex;
      const nextIndex =
        event.key === 'ArrowDown' || event.key === 'k'
          ? Math.min(safeIndex + 1, visibleCards.length - 1)
          : Math.max(safeIndex - 1, 0);

      selectCard(visibleCards[nextIndex].id);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [editingCardId, isSearchFocused, poppedCardId, poppedCardMode, selectedCard, selectedCardId, visibleCards]);

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
      if (poppedCardId && poppedCardMode) {
        const currentBounds = await window.kardsWindow.getBounds();
        if (!currentBounds) return;

        if (!previousWindowBoundsRef.current) {
          previousWindowBoundsRef.current = currentBounds;
        }

        const minimumBounds =
          poppedCardMode === 'large'
            ? { width: 1280, height: 900 }
            : { width: 1040, height: 760 };
        const nextWidth = Math.max(currentBounds.width, minimumBounds.width);
        const nextHeight = Math.max(currentBounds.height, minimumBounds.height);

        if (nextWidth !== currentBounds.width || nextHeight !== currentBounds.height) {
          await window.kardsWindow.setBounds({ width: nextWidth, height: nextHeight });
        }

        return;
      }

      if (previousWindowBoundsRef.current) {
        await window.kardsWindow.setBounds(previousWindowBoundsRef.current);
        previousWindowBoundsRef.current = null;
      }
    };

    void syncWindowBoundsToPopoutState();
  }, [poppedCardId, poppedCardMode]);

  useEffect(() => {
    const loadMoreNode = loadMoreRef.current;
    if (!loadMoreNode || !hasMoreCards || isHydratingCards || isLoadingMoreCards || poppedCardId) return;

    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (!entry?.isIntersecting) return;
      void loadMoreCards();
    });

    observer.observe(loadMoreNode);
    return () => {
      observer.disconnect();
    };
  }, [hasMoreCards, isHydratingCards, isLoadingMoreCards, loadMoreCards, poppedCardId, listCards.length]);

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
    onRemove: removeCard,
    ...overrides,
  });

  return (
    <main className="app-shell">
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

      <CardList
        listCards={listCards}
        poppedCard={poppedCard}
        poppedCardMode={poppedCardMode}
        poppedCardId={poppedCardId}
        editingCardId={editingCardId}
        loadMoreRef={loadMoreRef}
        buildCardItemProps={buildCardItemProps}
        onSelectCard={selectCard}
        onClosePoppedCard={closePoppedCard}
      />

      {noticeMessage ? <div className="app-notice">{noticeMessage}</div> : null}
    </main>
  );
}
