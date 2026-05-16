import { useEffect, useState, type CSSProperties, type RefObject } from 'react';
import {
  resolveLargeModeDirection,
  useLargeModeWindowBounds,
  type LargeModeDirection,
} from '@/hooks/useLargeModeWindowBounds';

const MINIMUM_LARGE_CARD_PANE_WIDTH = 620;

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
  const [largeModeDirection, setLargeModeDirection] = useState<LargeModeDirection>('right');
  const [workspaceEditorStyle, setWorkspaceEditorStyle] = useState<CSSProperties | undefined>(undefined);

  useLargeModeWindowBounds(isLargeMode, largeModeDirection);

  const prepareLargeModeLayout = async () => {
    const nextRailWidth = leftRailRef.current?.getBoundingClientRect().width ?? null;
    let nextDirection: LargeModeDirection = 'right';

    if (window.kardsWindow) {
      const [currentBounds, workArea] = await Promise.all([
        window.kardsWindow.getBounds(),
        window.kardsWindow.getWorkArea(),
      ]);

      if (currentBounds && workArea) {
        nextDirection = resolveLargeModeDirection(currentBounds, workArea);
      }
    }

    if (nextRailWidth) {
      setLargeModeRailWidth(nextRailWidth);
    }
    setLargeModeDirection(nextDirection);
  };

  useEffect(() => {
    if (!isLargeMode) {
      setWorkspaceEditorStyle(undefined);
      setLargeModeRailWidth(null);
      setLargeModeDirection('right');
      return;
    }

    const updateWorkspaceEditorStyle = () => {
      const shellRect = appShellRef.current?.getBoundingClientRect();
      if (!shellRect || !largeModeRailWidth) return;

      const gap = 8;
      const left = largeModeRailWidth + gap;
      const availableWidth = Math.max(0, shellRect.width - largeModeRailWidth - gap);
      const width = Math.max(MINIMUM_LARGE_CARD_PANE_WIDTH, availableWidth);
      const positionStyle =
        largeModeDirection === 'left'
          ? { right: `${left}px` }
          : { left: `${left}px` };

      setWorkspaceEditorStyle({
        ...positionStyle,
        width: `${width}px`,
        minWidth: `${width}px`,
      });
    };

    updateWorkspaceEditorStyle();
    window.addEventListener('resize', updateWorkspaceEditorStyle);
    return () => {
      window.removeEventListener('resize', updateWorkspaceEditorStyle);
    };
  }, [appShellRef, isLargeMode, largeModeDirection, largeModeRailWidth]);

  return {
    largeModeRailWidth,
    largeModeDirection,
    workspaceEditorStyle,
    prepareLargeModeLayout,
  };
}
