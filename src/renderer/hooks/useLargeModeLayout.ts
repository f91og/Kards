import { useEffect, useState, type CSSProperties, type RefObject } from 'react';
import { useLargeModeWindowBounds } from '@/hooks/useLargeModeWindowBounds';

const MINIMUM_LARGE_CARD_PANE_WIDTH = 720;

type UseLargeModeLayoutParams = {
  isLargeMode: boolean;
  appShellRef: RefObject<HTMLElement>;
  leftRailRef: RefObject<HTMLDivElement>;
};

export function useLargeModeLayout({
  isLargeMode,
  appShellRef,
  leftRailRef,
}: UseLargeModeLayoutParams) {
  const [largeModeRailWidth, setLargeModeRailWidth] = useState<number | null>(null);
  const [workspaceEditorStyle, setWorkspaceEditorStyle] = useState<CSSProperties | undefined>(undefined);

  useLargeModeWindowBounds(isLargeMode);

  const captureRailWidth = () => {
    const nextRailWidth = leftRailRef.current?.getBoundingClientRect().width;
    if (nextRailWidth) {
      setLargeModeRailWidth(nextRailWidth);
    }
  };

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
      const availableWidth = Math.max(0, shellRect.width - largeModeRailWidth - gap);
      const width = Math.max(MINIMUM_LARGE_CARD_PANE_WIDTH, availableWidth);

      setWorkspaceEditorStyle({
        left: `${left}px`,
        width: `${width}px`,
        minWidth: `${width}px`,
      });
    };

    updateWorkspaceEditorStyle();
    window.addEventListener('resize', updateWorkspaceEditorStyle);
    return () => {
      window.removeEventListener('resize', updateWorkspaceEditorStyle);
    };
  }, [appShellRef, isLargeMode, largeModeRailWidth]);

  return {
    largeModeRailWidth,
    workspaceEditorStyle,
    captureRailWidth,
  };
}
