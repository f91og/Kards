import { CardItem } from '@/components/CardItem';
import type { Card } from '../../shared/models/card';
import type { CSSProperties } from 'react';

type LargeCardPaneProps = {
  style?: CSSProperties;
  card: Card;
  titleError?: string;
  isEditing: boolean;
  onClose: () => void;
  onSelect: () => void;
  onStartEditing: () => void;
  onStopEditing: () => void;
  onTitleChange: (id: string, title: string) => void;
  onTitleBlur: (id: string) => void;
  onTagsChange: (id: string, tags: string[]) => void;
  onTagClick: (tag: string) => void;
  onContentChange: (id: string, content: string) => void;
  onEditorHeightChange: (id: string, editorHeight: number) => void;
  onCollapsedChange: (id: string, isCollapsed: boolean) => void;
  onContentMaskedToggle: (id: string) => void;
  onRemove: (id: string) => void;
};

export function LargeCardPane({
  style,
  card,
  titleError,
  isEditing,
  onClose,
  onSelect,
  onStartEditing,
  onStopEditing,
  onTitleChange,
  onTitleBlur,
  onTagsChange,
  onTagClick,
  onContentChange,
  onEditorHeightChange,
  onCollapsedChange,
  onContentMaskedToggle,
  onRemove,
}: LargeCardPaneProps) {
  return (
    <section className="app-workspace__editor" style={style} onMouseDown={onSelect}>
      <div className="app-workspace__editor-frame">
        <button
          type="button"
          className="card-popout__close"
          onClick={onClose}
          aria-label="Close large editor"
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" className="card-popout__close-icon">
            <path
              d="M4.22 4.22a.75.75 0 0 1 1.06 0L8 6.94l2.72-2.72a.75.75 0 1 1 1.06 1.06L9.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L8 9.06l-2.72 2.72a.75.75 0 1 1-1.06-1.06L6.94 8 4.22 5.28a.75.75 0 0 1 0-1.06Z"
              fill="currentColor"
            />
          </svg>
        </button>

        <CardItem
          card={card}
          isSelected
          isEditing={isEditing}
          isPoppedOut
          titleError={titleError}
          onSelect={onSelect}
          onStartEditing={onStartEditing}
          onStopEditing={onStopEditing}
          onTitleChange={onTitleChange}
          onTitleBlur={onTitleBlur}
          onTagsChange={onTagsChange}
          onTagClick={onTagClick}
          onContentChange={onContentChange}
          onEditorHeightChange={onEditorHeightChange}
          onCollapsedChange={onCollapsedChange}
          onContentMaskedToggle={onContentMaskedToggle}
          onRemove={onRemove}
        />
      </div>
    </section>
  );
}
