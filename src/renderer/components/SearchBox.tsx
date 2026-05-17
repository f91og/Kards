import { useEffect, useRef, useState, type RefObject } from 'react';
import type { CardSortMode } from '@/store/cardStoreUtils';

type SearchBoxProps = {
  searchRef: RefObject<HTMLDivElement>;
  searchInputRef: RefObject<HTMLInputElement>;
  searchQuery: string;
  allTags: string[];
  showTagDropdown: boolean;
  sortMode: CardSortMode;
  onFocusChange: (isFocused: boolean) => void;
  onSearchQueryChange: (query: string) => void;
  onSortModeChange: (sortMode: CardSortMode) => void;
  onTagSelect: (tag: string) => void;
};

export function SearchBox({
  searchRef,
  searchInputRef,
  searchQuery,
  allTags,
  showTagDropdown,
  sortMode,
  onFocusChange,
  onSearchQueryChange,
  onSortModeChange,
  onTagSelect,
}: SearchBoxProps) {
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    if (!showTagDropdown || !isSortMenuOpen) return;
    if (sortMenuRef.current) {
      sortMenuRef.current.open = false;
    }
    setIsSortMenuOpen(false);
  }, [isSortMenuOpen, showTagDropdown]);

  return (
    <header className="app-header">
      <div className="app-search-bar">
        <div
          ref={searchRef}
          className="app-search-wrap"
          onFocus={() => {
            if (sortMenuRef.current) {
              sortMenuRef.current.open = false;
            }
            setIsSortMenuOpen(false);
            onFocusChange(true);
          }}
          onBlur={(event) => {
            if (!searchRef.current?.contains(event.relatedTarget as Node | null)) {
              onFocusChange(false);
            }
          }}
        >
          <input
            ref={searchInputRef}
            className="app-search"
            value={searchQuery}
            onChange={(event) => {
              const nextQuery = event.target.value;
              onSearchQueryChange(nextQuery);

              if (nextQuery.trim() === '' && document.activeElement === searchInputRef.current) {
                onFocusChange(true);
              }
            }}
            placeholder="Search cards"
          />

          {showTagDropdown && !isSortMenuOpen ? (
            <div className="app-search-dropdown">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="app-search-tag"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onTagSelect(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <details
          ref={sortMenuRef}
          className="app-search-sort"
          onToggle={(event) => {
            const isOpen = (event.currentTarget as HTMLDetailsElement).open;
            setIsSortMenuOpen(isOpen);
            if (isOpen) {
              onFocusChange(false);
              searchInputRef.current?.blur();
            }
          }}
        >
          <summary className="app-search-sort__trigger" aria-label="排序卡片">
            <svg viewBox="0 0 16 16" aria-hidden="true" className="app-search-sort__icon">
              <path
                d="M4 4.75A.75.75 0 0 1 4.75 4h6.5a.75.75 0 0 1 0 1.5h-6.5A.75.75 0 0 1 4 4.75Zm1.5 3.25A.75.75 0 0 1 6.25 7h5a.75.75 0 0 1 0 1.5h-5A.75.75 0 0 1 5.5 8Zm2 3.25a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 0 1.5h-3a.75.75 0 0 1-.75-.75Z"
                fill="currentColor"
              />
            </svg>
          </summary>

          <div className="app-search-sort__menu">
            <button
              type="button"
              className={`app-search-sort__option${sortMode === 'created' ? ' app-search-sort__option--active' : ''}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onSortModeChange('created');
                if (sortMenuRef.current) {
                  sortMenuRef.current.open = false;
                }
                setIsSortMenuOpen(false);
              }}
            >
              创建时间
            </button>
            <button
              type="button"
              className={`app-search-sort__option${sortMode === 'recent-opened' ? ' app-search-sort__option--active' : ''}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onSortModeChange('recent-opened');
                if (sortMenuRef.current) {
                  sortMenuRef.current.open = false;
                }
                setIsSortMenuOpen(false);
              }}
            >
              最近打开
            </button>
          </div>
        </details>
      </div>
    </header>
  );
}
