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
          await window.kardsWindow.setBounds({ x: nextX, width: nextWidth, height: currentBounds.height });
        }

        return;
      }

      const previousWindowBounds = previousWindowBoundsRef.current;
      if (previousWindowBounds) {
        const { x, width, height } = previousWindowBounds;
        if (isStale()) return;
        await window.kardsWindow.setBounds({ x, width, height });
        if (isStale()) return;
        previousWindowBoundsRef.current = null;
      }
    };

    void syncLargeModeWindowBounds();

    return () => {
      isCancelled = true;
    };
  }, [isLargeMode, largeModeDirection]);
}
