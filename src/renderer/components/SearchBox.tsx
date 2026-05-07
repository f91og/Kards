import type { RefObject } from 'react';

type SearchBoxProps = {
  searchRef: RefObject<HTMLDivElement>;
  searchInputRef: RefObject<HTMLInputElement>;
  searchQuery: string;
  allTags: string[];
  showTagDropdown: boolean;
  onFocusChange: (isFocused: boolean) => void;
  onSearchQueryChange: (query: string) => void;
  onTagSelect: (tag: string) => void;
};

export function SearchBox({
  searchRef,
  searchInputRef,
  searchQuery,
  allTags,
  showTagDropdown,
  onFocusChange,
  onSearchQueryChange,
  onTagSelect,
}: SearchBoxProps) {
  return (
    <header className="app-header">
      <div
        ref={searchRef}
        className="app-search-wrap"
        onFocus={() => onFocusChange(true)}
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

        {showTagDropdown ? (
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
    </header>
  );
}
