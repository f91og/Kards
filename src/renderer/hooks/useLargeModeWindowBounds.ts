import { useEffect, useRef } from 'react';

const MINIMUM_LARGE_MODE_WINDOW_WIDTH = 1120;

export type LargeModeDirection = 'left' | 'right';

export function useLargeModeWindowBounds(
  isLargeMode: boolean,
  largeModeDirection: LargeModeDirection,
) {
  const previousWindowBoundsRef = useRef<KardsWindowBounds | null>(null);

  useEffect(() => {
    if (!window.kardsWindow) return;

    const syncLargeModeWindowBounds = async () => {
      if (isLargeMode) {
        const currentBounds = await window.kardsWindow.getBounds();
        if (!currentBounds) return;

        if (!previousWindowBoundsRef.current) {
          previousWindowBoundsRef.current = currentBounds;
        }

        const nextWidth = Math.max(currentBounds.width, MINIMUM_LARGE_MODE_WINDOW_WIDTH);
        if (nextWidth !== currentBounds.width) {
          const deltaWidth = nextWidth - currentBounds.width;
          const nextX = largeModeDirection === 'left' ? currentBounds.x - deltaWidth : currentBounds.x;
          await window.kardsWindow.setBounds({ x: nextX, width: nextWidth, height: currentBounds.height });
        }

        return;
      }

      if (previousWindowBoundsRef.current) {
        const { x, width, height } = previousWindowBoundsRef.current;
        if (largeModeDirection === 'left') {
          await window.kardsWindow.setBounds({ x, width, height });
        } else {
          await window.kardsWindow.setBounds({ width, height });
        }
        previousWindowBoundsRef.current = null;
      }
    };

    void syncLargeModeWindowBounds();
  }, [isLargeMode, largeModeDirection]);
}
