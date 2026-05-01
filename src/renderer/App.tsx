import { CardItem } from '@/components/CardItem';
import { useAppStore } from '@/store/useAppStore';
import { useEffect, useMemo, useRef, useState } from 'react';

type PoppedCardMode = 'medium' | 'large';
const DEFAULT_TITLE_FONT_SIZE_REM = 0.7;
const DEFAULT_CONTENT_FONT_SIZE_REM = 0.94;
const DEFAULT_WINDOW_OPACITY = 1;
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
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    return window.localStorage.getItem('kards-theme') === 'dark' ? 'dark' : 'light';
  });
  const [titleFontSize, setTitleFontSize] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_TITLE_FONT_SIZE_REM;
    const rawStoredValue = window.localStorage.getItem('kards-title-font-size');
    if (rawStoredValue === null) return DEFAULT_TITLE_FONT_SIZE_REM;
    const storedValue = Number(rawStoredValue);
    return Number.isFinite(storedValue) ? storedValue : DEFAULT_TITLE_FONT_SIZE_REM;
  });
  const [contentFontSize, setContentFontSize] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_CONTENT_FONT_SIZE_REM;
    const rawStoredValue = window.localStorage.getItem('kards-content-font-size');
    if (rawStoredValue === null) return DEFAULT_CONTENT_FONT_SIZE_REM;
    const storedValue = Number(rawStoredValue);
    return Number.isFinite(storedValue) ? storedValue : DEFAULT_CONTENT_FONT_SIZE_REM;
  });
  const [windowOpacity, setWindowOpacity] = useState<number>(() => {
    if (typeof window === 'undefined') return DEFAULT_WINDOW_OPACITY;
    const rawStoredValue = window.localStorage.getItem(WINDOW_OPACITY_STORAGE_KEY);
    if (rawStoredValue === null) return DEFAULT_WINDOW_OPACITY;
    const storedValue = Number(rawStoredValue);
    return Number.isFinite(storedValue) ? storedValue : DEFAULT_WINDOW_OPACITY;
  });
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
  const allTags = useMemo(() => {
    const dedupedTags = new Map<string, string>();

    cards.forEach((card) => {
      card.tags.forEach((tag) => {
        const normalizedTag = tag.trim().toLocaleLowerCase();
        if (normalizedTag !== '' && !dedupedTags.has(normalizedTag)) {
          dedupedTags.set(normalizedTag, tag);
        }
      });
    });

    return Array.from(dedupedTags.values()).sort((left, right) => left.localeCompare(right));
  }, [cards]);
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

  const copySelectedCardContent = async () => {
    if (!selectedCardId) return;

    const selectedCard = visibleCards.find((card) => card.id === selectedCardId);
    if (!selectedCard) return;

    const plainText = selectedCard.content
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (plainText === '') return;

    try {
      await navigator.clipboard.writeText(plainText);
    } catch {
      // Ignore clipboard failures for now.
    }
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
    window.localStorage.setItem('kards-theme', themeMode);
  }, [themeMode]);

  useEffect(() => {
    document.documentElement.style.setProperty('--card-title-font-size', `${titleFontSize}rem`);
    window.localStorage.setItem('kards-title-font-size', String(titleFontSize));
  }, [titleFontSize]);

  useEffect(() => {
    document.documentElement.style.setProperty('--card-content-font-size', `${contentFontSize}rem`);
    window.localStorage.setItem('kards-content-font-size', String(contentFontSize));
  }, [contentFontSize]);

  useEffect(() => {
    window.localStorage.setItem(WINDOW_OPACITY_STORAGE_KEY, String(windowOpacity));
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

  return (
    <main className="app-shell">
      <header className="window-titlebar">
        <button
          type="button"
          className="window-titlebar__add"
          onClick={addCard}
          aria-label="Add card"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" className="window-titlebar__add-icon">
            <path
              d="M8 3.1a.75.75 0 0 1 .75.75v3.4h3.4a.75.75 0 0 1 0 1.5h-3.4v3.4a.75.75 0 0 1-1.5 0v-3.4h-3.4a.75.75 0 0 1 0-1.5h3.4v-3.4A.75.75 0 0 1 8 3.1Z"
              fill="currentColor"
            />
          </svg>
        </button>

        <button
          type="button"
          className={`window-titlebar__collapse${areAllLoadedCardsCollapsed ? ' window-titlebar__collapse--active' : ''}`}
          onClick={() => {
            void toggleCollapseAllCards();
          }}
          aria-label={areAllLoadedCardsCollapsed ? 'Expand all cards' : 'Collapse all cards'}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" className="window-titlebar__collapse-icon">
            <path
              d="M4.22 5.22a.75.75 0 0 1 1.06 0L8 7.94l2.72-2.72a.75.75 0 1 1 1.06 1.06l-3.25 3.25a.75.75 0 0 1-1.06 0L4.22 6.28a.75.75 0 0 1 0-1.06Z"
              fill="currentColor"
            />
            <path
              d="M4 11.25a.75.75 0 0 1 .75-.75h6.5a.75.75 0 0 1 0 1.5h-6.5A.75.75 0 0 1 4 11.25Z"
              fill="currentColor"
            />
          </svg>
        </button>

        <button
          type="button"
          className={`window-titlebar__theme${themeMode === 'dark' ? ' window-titlebar__theme--active' : ''}`}
          onClick={() => setThemeMode((currentMode) => (currentMode === 'light' ? 'dark' : 'light'))}
          aria-label={themeMode === 'dark' ? 'Switch to day mode' : 'Switch to night mode'}
        >
          {themeMode === 'dark' ? (
            <svg viewBox="0 0 16 16" aria-hidden="true" className="window-titlebar__theme-icon">
              <path
                d="M8 3.1a.75.75 0 0 1 .75.75v.55a.75.75 0 0 1-1.5 0v-.55A.75.75 0 0 1 8 3.1Zm0 8.5a.75.75 0 0 1 .75.75v.55a.75.75 0 0 1-1.5 0v-.55A.75.75 0 0 1 8 11.6Zm4.15-3.35a.75.75 0 0 1 .75-.75h.55a.75.75 0 0 1 0 1.5h-.55a.75.75 0 0 1-.75-.75ZM2.5 8.25A.75.75 0 0 1 3.25 7.5h.55a.75.75 0 0 1 0 1.5h-.55a.75.75 0 0 1-.75-.75Zm7.4-2.65a2.65 2.65 0 1 1-3.8 3.7 2.65 2.65 0 0 1 3.8-3.7ZM11 4.2a.75.75 0 0 1 1.06 0l.38.39a.75.75 0 0 1-1.06 1.06L11 5.26A.75.75 0 0 1 11 4.2Zm-7.44 7.44a.75.75 0 0 1 1.06 0l.39.38a.75.75 0 0 1-1.07 1.07l-.38-.39a.75.75 0 0 1 0-1.06Zm8.5 1.06a.75.75 0 0 1 0-1.06l.38-.38a.75.75 0 1 1 1.07 1.06l-.39.38a.75.75 0 0 1-1.06 0ZM4.62 4.2a.75.75 0 0 1 0 1.06l-.38.39A.75.75 0 1 1 3.18 4.6l.38-.39a.75.75 0 0 1 1.06 0Z"
                fill="currentColor"
              />
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" aria-hidden="true" className="window-titlebar__theme-icon">
              <path
                d="M9.22 2.14a.75.75 0 0 1 .82.96 4.76 4.76 0 0 0 6.06 6.06.75.75 0 0 1 .96.82A6.27 6.27 0 1 1 9.22 2.14Z"
                fill="currentColor"
              />
            </svg>
          )}
        </button>

        <button
          type="button"
          className={`window-titlebar__pin${isPinned ? ' window-titlebar__pin--active' : ''}`}
          onClick={async () => {
            if (!window.kardsWindow) return;
            const nextState = await window.kardsWindow.togglePin();
            setIsPinned(nextState);
          }}
          aria-label={isPinned ? 'Unpin window' : 'Pin window'}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" className="window-titlebar__pin-icon">
            <path
              d="M10.9 1.75a.75.75 0 0 1 .53 1.28L10.2 4.26l1.54 3.08a.75.75 0 0 1-.14.86l-2.1 2.1v3.95a.75.75 0 0 1-1.28.53l-1.5-1.5a.75.75 0 0 1-.22-.53V10.3L4.4 8.2a.75.75 0 0 1-.14-.86L5.8 4.26 4.57 3.03A.75.75 0 0 1 5.1 1.75h5.8ZM6.31 3.25l.78.78a.75.75 0 0 1 .14.86L5.84 7.66l1.44 1.44a.75.75 0 0 1 .22.53v2.3l.5.5v-2.8a.75.75 0 0 1 .22-.53l1.44-1.44-1.39-2.77a.75.75 0 0 1 .14-.86l.78-.78H6.31Z"
              fill="currentColor"
            />
          </svg>
        </button>

        <div ref={settingsRef} className="window-settings">
          <button
            type="button"
            className={`window-titlebar__settings${isSettingsOpen ? ' window-titlebar__settings--active' : ''}`}
            onClick={() => setIsSettingsOpen((currentState) => !currentState)}
            aria-label="Open settings"
            aria-expanded={isSettingsOpen}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true" className="window-titlebar__settings-icon">
              <path
                d="M6.83 1.98a1 1 0 0 1 1.94 0l.2.8a5.3 5.3 0 0 1 1.03.42l.7-.42a1 1 0 0 1 1.37.37l.5.87a1 1 0 0 1-.23 1.28l-.62.54c.05.28.08.57.08.87s-.03.59-.08.87l.62.54a1 1 0 0 1 .23 1.28l-.5.87a1 1 0 0 1-1.36.37l-.71-.42a5.3 5.3 0 0 1-1.03.42l-.2.8a1 1 0 0 1-1.94 0l-.2-.8a5.3 5.3 0 0 1-1.03-.42l-.7.42a1 1 0 0 1-1.37-.37l-.5-.87a1 1 0 0 1 .23-1.28l.62-.54A5 5 0 0 1 4.1 8c0-.3.03-.59.08-.87l-.62-.54a1 1 0 0 1-.23-1.28l.5-.87a1 1 0 0 1 1.36-.37l.71.42c.33-.18.68-.32 1.03-.42l.2-.8ZM7.8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z"
                fill="currentColor"
              />
            </svg>
          </button>

          {isSettingsOpen ? (
            <div className="window-settings__panel">
              <label className="window-settings__field">
                <span className="window-settings__label">Title size</span>
                <input
                  className="window-settings__range"
                  type="range"
                  min="0.5"
                  max="1.4"
                  step="0.02"
                  value={titleFontSize}
                  onChange={(event) => setTitleFontSize(Number(event.target.value))}
                />
                <span className="window-settings__value">{titleFontSize.toFixed(2)}rem</span>
              </label>

              <label className="window-settings__field">
                <span className="window-settings__label">Content size</span>
                <input
                  className="window-settings__range"
                  type="range"
                  min="0.7"
                  max="1.4"
                  step="0.02"
                  value={contentFontSize}
                  onChange={(event) => setContentFontSize(Number(event.target.value))}
                />
                <span className="window-settings__value">{contentFontSize.toFixed(2)}rem</span>
              </label>

              <label className="window-settings__field">
                <span className="window-settings__label">Transparency</span>
                <input
                  className="window-settings__range"
                  type="range"
                  min="0.35"
                  max="1"
                  step="0.01"
                  value={windowOpacity}
                  onChange={(event) => setWindowOpacity(Number(event.target.value))}
                />
                <span className="window-settings__value">{Math.round(windowOpacity * 100)}%</span>
              </label>
            </div>
          ) : null}
        </div>
      </header>

      <header className="app-header">
        <div
          ref={searchRef}
          className="app-search-wrap"
          onFocus={() => setIsSearchFocused(true)}
          onBlur={(event) => {
            if (!searchRef.current?.contains(event.relatedTarget as Node | null)) {
              setIsSearchFocused(false);
            }
          }}
        >
          <input
            ref={searchInputRef}
            className="app-search"
            value={searchQuery}
            onChange={(event) => {
              const nextQuery = event.target.value;
              setSearchQuery(nextQuery);

              if (nextQuery.trim() === '' && document.activeElement === searchInputRef.current) {
                setIsSearchFocused(true);
              }
            }}
            placeholder="Search cards"
          />

          {showTagDropdown ? (
            <div className="app-search-dropdown">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="app-search-tag"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    setSearchQuery(tag);
                    setIsSearchFocused(false);
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      <section className="card-list">
        {listCards.map((card) => (
          <CardItem
            key={card.id}
            card={card}
            isSelected={card.id === selectedCardId}
            isEditing={card.id === editingCardId}
            titleError={titleErrors[card.id]}
            onSelect={() => selectCard(card.id)}
            onStartEditing={() => {
              selectCard(card.id);
              setEditingCardId(card.id);
            }}
            onStopEditing={() => {
              setEditingCardId((currentEditingCardId) => (currentEditingCardId === card.id ? null : currentEditingCardId));
            }}
            onTitleChange={updateCardTitle}
            onTitleBlur={validateCardTitle}
            onTagsChange={updateCardTags}
            onTagClick={setSearchQuery}
            onContentChange={updateCardContent}
            onEditorHeightChange={updateCardEditorHeight}
            onCollapsedChange={updateCardCollapsed}
            onRemove={removeCard}
          />
        ))}

        {poppedCardId ? null : <div ref={loadMoreRef} className="card-list__sentinel" aria-hidden="true" />}
      </section>

      {poppedCard ? (
        <div className="card-popout-layer" onMouseDown={() => selectCard(poppedCard.id)}>
          <div className={`card-popout${poppedCardMode === 'large' ? ' card-popout--large' : ''}`}>
            <button
              type="button"
              className="card-popout__close"
              onClick={closePoppedCard}
              aria-label="Close popped card"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true" className="card-popout__close-icon">
                <path
                  d="M4.22 4.22a.75.75 0 0 1 1.06 0L8 6.94l2.72-2.72a.75.75 0 1 1 1.06 1.06L9.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L8 9.06l-2.72 2.72a.75.75 0 1 1-1.06-1.06L6.94 8 4.22 5.28a.75.75 0 0 1 0-1.06Z"
                  fill="currentColor"
                />
              </svg>
            </button>

            <CardItem
              key={`${poppedCard.id}-popped`}
              card={poppedCard}
              isSelected
              isEditing={editingCardId === poppedCard.id}
              isPoppedOut
              titleError={titleErrors[poppedCard.id]}
              onSelect={() => selectCard(poppedCard.id)}
              onStartEditing={() => {
                selectCard(poppedCard.id);
                setEditingCardId(poppedCard.id);
              }}
              onStopEditing={() => {
                setEditingCardId((currentEditingCardId) =>
                  currentEditingCardId === poppedCard.id ? null : currentEditingCardId,
                );
              }}
              onTitleChange={updateCardTitle}
              onTitleBlur={validateCardTitle}
              onTagsChange={updateCardTags}
              onTagClick={setSearchQuery}
              onContentChange={updateCardContent}
              onEditorHeightChange={updateCardEditorHeight}
              onCollapsedChange={updateCardCollapsed}
              onRemove={removeCard}
            />
          </div>
        </div>
      ) : null}

      {noticeMessage ? <div className="app-notice">{noticeMessage}</div> : null}
    </main>
  );
}
