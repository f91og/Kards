import { useEffect, useMemo, useRef, useState } from 'react';
import { useStoredState } from '@/hooks/useStoredState';
import { useAppSettingsEffects } from '@/hooks/useAppSettingsEffects';
import type { SettingsField } from '@/components/AppTitleBar';

type ThemeMode = 'light' | 'dark';

const DEFAULT_TITLE_FONT_SIZE_REM = 0.7;
const DEFAULT_CONTENT_FONT_SIZE_REM = 0.94;
const DEFAULT_WINDOW_OPACITY = 1;
const CARD_FONT_SIZE_MIN_REM = '0.5';
const CARD_FONT_SIZE_MAX_REM = '1.4';
const CARD_FONT_SIZE_STEP_REM = '0.02';
const THEME_STORAGE_KEY = 'kards-theme';
const TITLE_FONT_SIZE_STORAGE_KEY = 'kards-title-font-size';
const CONTENT_FONT_SIZE_STORAGE_KEY = 'kards-content-font-size';
const WINDOW_OPACITY_STORAGE_KEY = 'kards-window-opacity-v2';
const AUTO_COLLAPSE_STORAGE_KEY = 'kards-auto-collapse-large-card';

function createNumberStoredStateOptions(fallback: number) {
  return {
    deserialize: (rawValue: string) => {
      const storedValue = Number(rawValue);
      return Number.isFinite(storedValue) ? storedValue : fallback;
    },
    serialize: (value: number) => String(value),
  };
}

export function useAppSettings() {
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const [isPinned, setIsPinned] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [themeMode, setThemeMode] = useStoredState<ThemeMode>(THEME_STORAGE_KEY, 'light', {
    deserialize: (rawValue) => (rawValue === 'dark' ? 'dark' : 'light'),
    serialize: (value) => value,
  });
  const [titleFontSize, setTitleFontSize] = useStoredState<number>(
    TITLE_FONT_SIZE_STORAGE_KEY,
    DEFAULT_TITLE_FONT_SIZE_REM,
    createNumberStoredStateOptions(DEFAULT_TITLE_FONT_SIZE_REM),
  );
  const [contentFontSize, setContentFontSize] = useStoredState<number>(
    CONTENT_FONT_SIZE_STORAGE_KEY,
    DEFAULT_CONTENT_FONT_SIZE_REM,
    createNumberStoredStateOptions(DEFAULT_CONTENT_FONT_SIZE_REM),
  );
  const [windowOpacity, setWindowOpacity] = useStoredState<number>(
    WINDOW_OPACITY_STORAGE_KEY,
    DEFAULT_WINDOW_OPACITY,
    createNumberStoredStateOptions(DEFAULT_WINDOW_OPACITY),
  );
  const [autoCollapse, setAutoCollapse] = useStoredState<boolean>(AUTO_COLLAPSE_STORAGE_KEY, false);
  const [pinAcrossWorkspaces, setPinAcrossWorkspacesState] = useState(true);

  useEffect(() => {
    if (!window.kardsWindow) {
      setIsPinned(false);
      return;
    }

    Promise.all([
      window.kardsWindow.getPinState(),
      window.kardsWindow.getPinAcrossWorkspaces(),
    ])
      .then(([nextPinnedState, nextPinAcrossWorkspaces]) => {
        setIsPinned(nextPinnedState);
        setPinAcrossWorkspacesState(nextPinAcrossWorkspaces);
      })
      .catch((error) => {
        console.error('Failed to load pin settings', error);
        setIsPinned(false);
      });
  }, []);

  const closeSettings = () => {
    setIsSettingsOpen(false);
  };

  useAppSettingsEffects({
    themeMode,
    titleFontSize,
    contentFontSize,
    windowOpacity,
    isSettingsOpen,
    settingsRef,
    closeSettings,
  });

  const settingsFields: readonly SettingsField[] = useMemo(
    () => [
      {
        label: 'Title size',
        min: CARD_FONT_SIZE_MIN_REM,
        max: CARD_FONT_SIZE_MAX_REM,
        step: CARD_FONT_SIZE_STEP_REM,
        value: titleFontSize,
        onChange: setTitleFontSize,
        formatValue: (nextValue: number) => `${nextValue.toFixed(2)}rem`,
      },
      {
        label: 'Content size',
        min: CARD_FONT_SIZE_MIN_REM,
        max: CARD_FONT_SIZE_MAX_REM,
        step: CARD_FONT_SIZE_STEP_REM,
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
    ],
    [contentFontSize, setContentFontSize, setTitleFontSize, setWindowOpacity, titleFontSize, windowOpacity],
  );

  const toggleThemeMode = () => {
    setThemeMode((currentMode) => (currentMode === 'light' ? 'dark' : 'light'));
  };

  const toggleSettingsOpen = () => {
    setIsSettingsOpen((currentState) => !currentState);
  };

  const togglePin = async () => {
    if (!window.kardsWindow) return;

    try {
      const nextState = await window.kardsWindow.togglePin(pinAcrossWorkspaces);
      setIsPinned(nextState);
    } catch (error) {
      console.error('Failed to toggle window pin', error);
    }
  };

  const setPinAcrossWorkspaces = async (enabled: boolean) => {
    if (!window.kardsWindow) return;

    const previousValue = pinAcrossWorkspaces;
    setPinAcrossWorkspacesState(enabled);

    try {
      const nextValue = await window.kardsWindow.setPinAcrossWorkspaces(enabled);
      setPinAcrossWorkspacesState(nextValue);
    } catch (error) {
      console.error('Failed to update cross-workspace pin setting', error);
      setPinAcrossWorkspacesState(previousValue);
    }
  };

  return {
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
  };
}
