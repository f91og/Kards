import { useEffect, useState, type CSSProperties, type RefObject } from 'react';
import { useLargeModeWindowBounds, type LargeModeDirection } from '@/hooks/useLargeModeWindowBounds';

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

  const captureRailWidth = () => {
    const nextRailWidth = leftRailRef.current?.getBoundingClientRect().width;
    if (nextRailWidth) {
      setLargeModeRailWidth(nextRailWidth);
    }
  };

  const prepareLargeModeLayout = async () => {
    const nextRailWidth = leftRailRef.current?.getBoundingClientRect().width ?? null;
    let nextDirection: LargeModeDirection = 'right';

    if (window.kardsWindow) {
      const [currentBounds, workArea] = await Promise.all([
        window.kardsWindow.getBounds(),
        window.kardsWindow.getWorkArea(),
      ]);

      if (currentBounds && workArea) {
        const windowCenterX = currentBounds.x + currentBounds.width / 2;
        const workAreaCenterX = workArea.x + workArea.width / 2;
        nextDirection = windowCenterX > workAreaCenterX ? 'left' : 'right';
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

      const gap = 16;
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
    captureRailWidth,
  };
}
