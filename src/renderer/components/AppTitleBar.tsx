import type { RefObject } from 'react';

type SettingsField = {
  label: string;
  min: string;
  max: string;
  step: string;
  value: number;
  onChange: (value: number) => void;
  formatValue: (value: number) => string;
};

type AppTitleBarProps = {
  areAllLoadedCardsCollapsed: boolean;
  themeMode: 'light' | 'dark';
  isPinned: boolean;
  isSettingsOpen: boolean;
  settingsFields: readonly SettingsField[];
  settingsRef: RefObject<HTMLDivElement>;
  onAddCard: () => void;
  onToggleCollapseAllCards: () => void;
  onToggleThemeMode: () => void;
  onTogglePin: () => Promise<void>;
  onToggleSettingsOpen: () => void;
};

export function AppTitleBar({
  areAllLoadedCardsCollapsed,
  themeMode,
  isPinned,
  isSettingsOpen,
  settingsFields,
  settingsRef,
  onAddCard,
  onToggleCollapseAllCards,
  onToggleThemeMode,
  onTogglePin,
  onToggleSettingsOpen,
}: AppTitleBarProps) {
  return (
    <header className="window-titlebar">
      <button type="button" className="window-titlebar__add" onClick={onAddCard} aria-label="Add card">
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
        onClick={onToggleCollapseAllCards}
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
        onClick={onToggleThemeMode}
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
        onClick={() => {
          void onTogglePin();
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
          onClick={onToggleSettingsOpen}
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
            {settingsFields.map((field) => (
              <label key={field.label} className="window-settings__field">
                <span className="window-settings__label">{field.label}</span>
                <input
                  className="window-settings__range"
                  type="range"
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  value={field.value}
                  onChange={(event) => field.onChange(Number(event.target.value))}
                />
                <span className="window-settings__value">{field.formatValue(field.value)}</span>
              </label>
            ))}
          </div>
        ) : null}
      </div>
    </header>
  );
}
