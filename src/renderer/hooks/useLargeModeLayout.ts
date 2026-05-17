import { useEffect, useState, type CSSProperties, type RefObject } from 'react';
import {
  resolveLargeModeDirection,
  useLargeModeWindowBounds,
  type LargeModeDirection,
} from '@/hooks/useLargeModeWindowBounds';

const MINIMUM_LARGE_CARD_PANE_WIDTH = 620;
const LARGE_MODE_GAP = 8;

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

  useEffect(() => {
    const syncRailWidth = () => {
      const nextRailWidth = leftRailRef.current?.getBoundingClientRect().width ?? null;
      setLargeModeRailWidth((currentRailWidth) => {
        if (currentRailWidth === nextRailWidth) return currentRailWidth;
        return nextRailWidth;
      });
    };

    syncRailWidth();

    const leftRail = leftRailRef.current;
    if (!leftRail || typeof ResizeObserver === 'undefined') return;

    const resizeObserver = new ResizeObserver(() => {
      syncRailWidth();
    });

    resizeObserver.observe(leftRail);
    return () => {
      resizeObserver.disconnect();
    };
  }, [leftRailRef]);

  useEffect(() => {
    if (!window.kardsWindow) return;

    let isCancelled = false;

    const syncDirection = async () => {
      const [currentBounds, workArea] = await Promise.all([
        window.kardsWindow.getBounds(),
        window.kardsWindow.getWorkArea(),
      ]);

      if (isCancelled || !currentBounds || !workArea) return;
      setLargeModeDirection(resolveLargeModeDirection(currentBounds, workArea));
    };

    void syncDirection();
    window.addEventListener('resize', syncDirection);

    return () => {
      isCancelled = true;
      window.removeEventListener('resize', syncDirection);
    };
  }, []);

  useEffect(() => {
    const updateWorkspaceEditorStyle = () => {
      const shellRect = appShellRef.current?.getBoundingClientRect();
      if (!shellRect || !largeModeRailWidth) return;

      const anchorOffset = largeModeRailWidth + LARGE_MODE_GAP;
      const availableWidth = Math.max(0, shellRect.width - largeModeRailWidth - LARGE_MODE_GAP);
      const width = Math.max(MINIMUM_LARGE_CARD_PANE_WIDTH, availableWidth);
      const positionStyle =
        largeModeDirection === 'left'
          ? { right: `${anchorOffset}px` }
          : { left: `${anchorOffset}px` };

      setWorkspaceEditorStyle((currentStyle) => {
        const nextStyle: CSSProperties = {
          ...positionStyle,
          width: `${width}px`,
          minWidth: `${width}px`,
        };

        if (
          currentStyle?.left === nextStyle.left &&
          currentStyle?.right === nextStyle.right &&
          currentStyle?.width === nextStyle.width &&
          currentStyle?.minWidth === nextStyle.minWidth
        ) {
          return currentStyle;
        }

        return nextStyle;
      });
    };

    updateWorkspaceEditorStyle();
    window.addEventListener('resize', updateWorkspaceEditorStyle);
    return () => {
      window.removeEventListener('resize', updateWorkspaceEditorStyle);
    };
  }, [appShellRef, largeModeDirection, largeModeRailWidth]);

  return {
    largeModeRailWidth,
    largeModeDirection,
    workspaceEditorStyle,
  };
}
