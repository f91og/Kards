import { useEffect, useRef } from 'react';

const MINIMUM_LARGE_MODE_WINDOW_WIDTH = 1280;

export function useLargeModeWindowBounds(isLargeMode: boolean) {
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
          await window.kardsWindow.setBounds({ width: nextWidth, height: currentBounds.height });
        }

        return;
      }

      if (previousWindowBoundsRef.current) {
        const { width, height } = previousWindowBoundsRef.current;
        await window.kardsWindow.setBounds({ width, height });
        previousWindowBoundsRef.current = null;
      }
    };

    void syncLargeModeWindowBounds();
  }, [isLargeMode]);
}
