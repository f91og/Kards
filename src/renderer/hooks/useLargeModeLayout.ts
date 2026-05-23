import { useEffect, useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react';
import { useLargeModeWindowBounds } from '@/hooks/useLargeModeWindowBounds';
import { getLargeModeDirectionForRail, type LargeModeDirection } from '@/lib/largeMode';

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

  useLayoutEffect(() => {
    if (!isLargeMode) return;

    let isCancelled = false;

    const syncLargeModeDirection = async () => {
      const leftRail = leftRailRef.current;
      if (!leftRail) return;

      const fallbackDirection = getLargeModeDirectionForRail(leftRail.getBoundingClientRect(), null);
      setLargeModeDirection((currentDirection) =>
        currentDirection === fallbackDirection ? currentDirection : fallbackDirection,
      );

      const workArea = window.kardsWindow ? await window.kardsWindow.getWorkArea() : null;
      if (isCancelled) return;

      const nextDirection = getLargeModeDirectionForRail(leftRail.getBoundingClientRect(), workArea);
      setLargeModeDirection((currentDirection) =>
        currentDirection === nextDirection ? currentDirection : nextDirection,
      );
    };

    void syncLargeModeDirection();
    window.addEventListener('resize', syncLargeModeDirection);
    const unsubscribeBoundsChanged = window.kardsWindow?.onBoundsChanged(() => {
      void syncLargeModeDirection();
    });
    const resizeObserver =
      leftRailRef.current && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            void syncLargeModeDirection();
          })
        : null;

    if (leftRailRef.current) {
      resizeObserver?.observe(leftRailRef.current);
    }

    return () => {
      isCancelled = true;
      window.removeEventListener('resize', syncLargeModeDirection);
      unsubscribeBoundsChanged?.();
      resizeObserver?.disconnect();
    };
  }, [isLargeMode, leftRailRef]);

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
