import { useState, useRef, type CSSProperties } from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';

const MIN_CARD_IMAGE_WIDTH = 120;

export function CardImageNodeView({ node, selected, updateAttributes, editor }: NodeViewProps) {
  const resizeStateRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const [naturalWidth, setNaturalWidth] = useState<number | null>(null);
  const width = typeof node.attrs.width === 'number' ? node.attrs.width : null;

  const startResize = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!editor.isEditable) return;

    event.preventDefault();
    event.stopPropagation();

    const imageElement = (event.currentTarget.closest('.card-content-image') as HTMLElement | null)?.querySelector('img');
    const currentWidth = width ?? imageElement?.getBoundingClientRect().width ?? MIN_CARD_IMAGE_WIDTH;
    resizeStateRef.current = {
      startX: event.clientX,
      startWidth: currentWidth,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const resizeState = resizeStateRef.current;
      if (!resizeState) return;

      const deltaX = moveEvent.clientX - resizeState.startX;
      updateAttributes({
        width: Math.max(MIN_CARD_IMAGE_WIDTH, Math.round(resizeState.startWidth + deltaX)),
      });
    };

    const handleMouseUp = () => {
      resizeStateRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <NodeViewWrapper
      as="figure"
      className={`card-content-image${selected ? ' card-content-image--selected' : ''}`}
      data-card-image="true"
      data-width={width ?? undefined}
      style={
        {
          width: width ? `${width}px` : undefined,
          ['--card-image-natural-width' as string]: naturalWidth ?? undefined,
        } as CSSProperties
      }
    >
      <img
        src={node.attrs.src}
        alt={node.attrs.alt ?? ''}
        title={node.attrs.title ?? undefined}
        draggable={false}
        onLoad={(event) => {
          const nextNaturalWidth = event.currentTarget.naturalWidth;
          if (nextNaturalWidth > 0) {
            setNaturalWidth(nextNaturalWidth);
          }
        }}
      />
      {editor.isEditable ? (
        <button
          type="button"
          className="card-content-image__resize-zone"
          aria-label="Resize image"
          onMouseDown={startResize}
        />
      ) : null}
    </NodeViewWrapper>
  );
}
