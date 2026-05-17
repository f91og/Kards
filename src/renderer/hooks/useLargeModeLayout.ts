import { useEffect, useState, type CSSProperties, type RefObject } from 'react';
import { useLargeModeWindowBounds } from '@/hooks/useLargeModeWindowBounds';
import type { LargeModeDirection } from '@/lib/largeMode';

const MINIMUM_LARGE_CARD_PANE_WIDTH = 620;
const LARGE_MODE_GAP = 8;

type UseLargeModeLayoutParams = {
  isLargeMode: boolean;
  largeModeDirection: LargeModeDirection;
  appShellRef: RefObject<HTMLElement>;
  leftRailRef: RefObject<HTMLDivElement>;
};

export function useLargeModeLayout({
  isLargeMode,
  largeModeDirection,
  appShellRef,
  leftRailRef,
}: UseLargeModeLayoutParams) {
  const [largeModeRailWidth, setLargeModeRailWidth] = useState<number | null>(null);
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
