import { useEffect, useRef } from 'react';

const MINIMUM_LARGE_MODE_WINDOW_WIDTH = 1120;

export type LargeModeDirection = 'left' | 'right';

export function resolveLargeModeDirection(
  currentBounds: KardsWindowBounds,
  workArea: KardsWindowBounds,
): LargeModeDirection {
  const windowCenterX = currentBounds.x + currentBounds.width / 2;
  const workAreaCenterX = workArea.x + workArea.width / 2;
  return windowCenterX > workAreaCenterX ? 'left' : 'right';
}

export function useLargeModeWindowBounds(
  isLargeMode: boolean,
  largeModeDirection: LargeModeDirection,
) {
  const previousWindowBoundsRef = useRef<KardsWindowBounds | null>(null);
  const lastLargeModeBoundsRef = useRef<KardsWindowBounds | null>(null);
  const syncRequestIdRef = useRef(0);

  useEffect(() => {
    if (!window.kardsWindow) return;

    const requestId = ++syncRequestIdRef.current;
    let isCancelled = false;
    const isStale = () => isCancelled || syncRequestIdRef.current !== requestId;

    const syncLargeModeWindowBounds = async () => {
      if (isLargeMode) {
        const currentBounds = await window.kardsWindow.getBounds();
        if (!currentBounds || isStale()) return;

        if (!previousWindowBoundsRef.current) {
          previousWindowBoundsRef.current = currentBounds;
        }

        const nextWidth = Math.max(currentBounds.width, MINIMUM_LARGE_MODE_WINDOW_WIDTH);
        if (nextWidth !== currentBounds.width) {
          const deltaWidth = nextWidth - currentBounds.width;
          const nextX = largeModeDirection === 'left' ? currentBounds.x - deltaWidth : currentBounds.x;
          if (isStale()) return;
          const nextBounds = await window.kardsWindow.setBounds({ x: nextX, width: nextWidth, height: currentBounds.height });
          if (!nextBounds || isStale()) return;
          lastLargeModeBoundsRef.current = nextBounds;
          return;
        }

        lastLargeModeBoundsRef.current = currentBounds;

        return;
      }

      const previousWindowBounds = previousWindowBoundsRef.current;
      if (previousWindowBounds) {
        const { x, width, height } = previousWindowBounds;
        const currentBounds = await window.kardsWindow.getBounds();
        if (!currentBounds || isStale()) return;
        if (currentBounds.x === x && currentBounds.width === width && currentBounds.height === height) {
          previousWindowBoundsRef.current = null;
          return;
        }
        if (isStale()) return;
        await window.kardsWindow.setBounds({ x, width, height });
        if (isStale()) return;
        previousWindowBoundsRef.current = null;
        lastLargeModeBoundsRef.current = null;
      }
    };

    void syncLargeModeWindowBounds();

    const unsubscribeBoundsChanged = window.kardsWindow.onBoundsChanged((nextBounds) => {
      if (!isLargeMode) return;

      const previousWindowBounds = previousWindowBoundsRef.current;
      const lastLargeModeBounds = lastLargeModeBoundsRef.current;
      if (!previousWindowBounds || !lastLargeModeBounds) {
        lastLargeModeBoundsRef.current = nextBounds;
        return;
      }

      const deltaX = nextBounds.x - lastLargeModeBounds.x;
      const deltaY = nextBounds.y - lastLargeModeBounds.y;

      if (deltaX !== 0 || deltaY !== 0) {
        previousWindowBoundsRef.current = {
          ...previousWindowBounds,
          x: previousWindowBounds.x + deltaX,
          y: previousWindowBounds.y + deltaY,
        };
      }

      lastLargeModeBoundsRef.current = nextBounds;
    });

    return () => {
      isCancelled = true;
      unsubscribeBoundsChanged();
    };
  }, [isLargeMode, largeModeDirection]);
}
