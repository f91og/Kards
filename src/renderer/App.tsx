import { CardItem } from '@/components/CardItem';
import { useAppStore } from '@/store/useAppStore';
import { useEffect, useMemo, useRef, useState } from 'react';

export default function App() {
  const searchRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light';
    return window.localStorage.getItem('kards-theme') === 'dark' ? 'dark' : 'light';
  });
  const {
    cards,
    titleErrors,
    searchQuery,
    setSearchQuery,
    hydrateCards,
    addCard,
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
  const visibleCards =
    normalizedQuery === ''
      ? cards
      : cards.filter((card) => {
          const haystack = [card.title, card.tags.join(' '), card.excerpt].join(' ').toLocaleLowerCase();
          return haystack.includes(normalizedQuery);
        });
  const showTagDropdown = isSearchFocused && normalizedQuery === '' && allTags.length > 0;

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

  useEffect(() => {
    if (isSearchFocused) {
      setSelectedCardId(null);
      setEditingCardId(null);
    }
  }, [isSearchFocused]);

  useEffect(() => {
    if (visibleCards.length === 0) {
      setSelectedCardId(null);
      setEditingCardId(null);
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
  }, [editingCardId, isSearchFocused, selectedCardId, visibleCards]);

  useEffect(() => {
    void hydrateCards();
  }, [hydrateCards]);

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

      if (editingCardId || isSearchFocused || visibleCards.length === 0) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        void copySelectedCardContent();
        return;
      }
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
  }, [editingCardId, isSearchFocused, selectedCardId, visibleCards]);

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
        {visibleCards.map((card) => (
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
      </section>
    </main>
  );
}
