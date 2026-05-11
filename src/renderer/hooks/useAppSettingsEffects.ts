import { useEffect, type RefObject } from 'react';

type UseAppSettingsEffectsParams = {
  themeMode: 'light' | 'dark';
  titleFontSize: number;
  contentFontSize: number;
  windowOpacity: number;
  isSettingsOpen: boolean;
  settingsRef: RefObject<HTMLDivElement>;
  closeSettings: () => void;
};

export function useAppSettingsEffects({
  themeMode,
  titleFontSize,
  contentFontSize,
  windowOpacity,
  isSettingsOpen,
  settingsRef,
  closeSettings,
}: UseAppSettingsEffectsParams) {
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
        closeSettings();
      }
    };

    window.addEventListener('mousedown', handlePointerDown);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
    };
  }, [closeSettings, isSettingsOpen, settingsRef]);
}
