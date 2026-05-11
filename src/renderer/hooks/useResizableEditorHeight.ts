import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';

const MIN_EDITOR_HEIGHT_PX = 48;
const LEGACY_DEFAULT_EDITOR_HEIGHT_PX = 160;

function normalizeEditorHeight(editorHeight: number): number {
  if (editorHeight === LEGACY_DEFAULT_EDITOR_HEIGHT_PX) return MIN_EDITOR_HEIGHT_PX;
  return Math.max(MIN_EDITOR_HEIGHT_PX, editorHeight);
}

type UseResizableEditorHeightParams = {
  cardId: string;
  editorHeight: number;
  onEditorHeightChange: (id: string, editorHeight: number) => void;
  onBeforeResize?: () => void;
};

export function useResizableEditorHeight({
  cardId,
  editorHeight,
  onEditorHeightChange,
  onBeforeResize,
}: UseResizableEditorHeightParams) {
  const [height, setHeight] = useState(() => normalizeEditorHeight(editorHeight));
  const resizeStateRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const heightRef = useRef(normalizeEditorHeight(editorHeight));

  const stopResize = () => {
    if (!resizeStateRef.current) return;

    const nextEditorHeight = heightRef.current;
    resizeStateRef.current = null;
    window.removeEventListener('mousemove', handleResize);
    window.removeEventListener('mouseup', stopResize);
    onEditorHeightChange(cardId, nextEditorHeight);
  };

  const handleResize = (event: MouseEvent) => {
    const resizeState = resizeStateRef.current;
    if (!resizeState) return;

    const nextHeight = resizeState.startHeight + (event.clientY - resizeState.startY);
    const normalizedHeight = Math.max(MIN_EDITOR_HEIGHT_PX, nextHeight);
    heightRef.current = normalizedHeight;
    setHeight(normalizedHeight);
  };

  const startResize = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    onBeforeResize?.();

    resizeStateRef.current = {
      startY: event.clientY,
      startHeight: height,
    };

    window.addEventListener('mousemove', handleResize);
    window.addEventListener('mouseup', stopResize);
  };

  useEffect(() => {
    const normalizedEditorHeight = normalizeEditorHeight(editorHeight);
    heightRef.current = normalizedEditorHeight;
    setHeight(normalizedEditorHeight);
  }, [editorHeight]);

  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleResize);
      window.removeEventListener('mouseup', stopResize);
    };
  }, []);

  return {
    editorHeight: height,
    startResize,
    stopResize,
  };
}
