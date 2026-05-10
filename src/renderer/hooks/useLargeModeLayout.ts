import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';

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
  const previousWindowBoundsRef = useRef<KardsWindowBounds | null>(null);
  const [largeModeRailWidth, setLargeModeRailWidth] = useState<number | null>(null);
  const [workspaceEditorStyle, setWorkspaceEditorStyle] = useState<CSSProperties | undefined>(undefined);

  const captureRailWidth = () => {
    const nextRailWidth = leftRailRef.current?.getBoundingClientRect().width;
    if (nextRailWidth) {
      setLargeModeRailWidth(nextRailWidth);
    }
  };

  useEffect(() => {
    if (!window.kardsWindow) return;

    const syncWindowBoundsToPopoutState = async () => {
      if (isLargeMode) {
        const currentBounds = await window.kardsWindow.getBounds();
        if (!currentBounds) return;

        if (!previousWindowBoundsRef.current) {
          previousWindowBoundsRef.current = currentBounds;
        }

        const minimumWidth = 1280;
        const nextWidth = Math.max(currentBounds.width, minimumWidth);

        if (nextWidth !== currentBounds.width) {
          await window.kardsWindow.setBounds({ width: nextWidth, height: currentBounds.height });
        }

        return;
      }

      if (previousWindowBoundsRef.current) {
        await window.kardsWindow.setBounds(previousWindowBoundsRef.current);
        previousWindowBoundsRef.current = null;
      }
    };

    void syncWindowBoundsToPopoutState();
  }, [isLargeMode]);

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
      const width = Math.max(320, shellRect.width - left);

      setWorkspaceEditorStyle({
        left: `${left}px`,
        width: `${width}px`,
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
