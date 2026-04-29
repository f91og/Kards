import StarterKit from '@tiptap/starter-kit';
import { EditorContent, useEditor } from '@tiptap/react';
import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { TagInput } from '@/components/TagInput';
import type { Card } from '../../shared/models/card';

type CardItemProps = {
  card: Card;
  isSelected: boolean;
  isEditing: boolean;
  isPoppedOut?: boolean;
  titleError?: string;
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
  onRemove: (id: string) => void;
};

const MIN_EDITOR_HEIGHT_PX = 48;
const LEGACY_DEFAULT_EDITOR_HEIGHT_PX = 160;

function normalizeEditorHeight(editorHeight: number): number {
  if (editorHeight === LEGACY_DEFAULT_EDITOR_HEIGHT_PX) return MIN_EDITOR_HEIGHT_PX;
  return Math.max(MIN_EDITOR_HEIGHT_PX, editorHeight);
}

export function CardItem({
  card,
  isSelected,
  isEditing,
  isPoppedOut = false,
  titleError,
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
  onRemove,
}: CardItemProps) {
  const menuRef = useRef<HTMLDetailsElement | null>(null);
  const cardBodyRef = useRef<HTMLDivElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const [editorHeight, setEditorHeight] = useState(() => normalizeEditorHeight(card.editorHeight));
  const [isCollapsed, setIsCollapsed] = useState(card.isCollapsed);
  const resizeStateRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const editorHeightRef = useRef(card.editorHeight);

  const closeMenu = () => {
    if (menuRef.current) {
      menuRef.current.open = false;
    }
  };

  const stopResize = () => {
    const nextEditorHeight = editorHeightRef.current;
    resizeStateRef.current = null;
    window.removeEventListener('mousemove', handleResize);
    window.removeEventListener('mouseup', stopResize);
    onEditorHeightChange(card.id, nextEditorHeight);
  };

  const handleResize = (event: MouseEvent) => {
    const resizeState = resizeStateRef.current;
    if (!resizeState) return;

    const nextHeight = resizeState.startHeight + (event.clientY - resizeState.startY);
    const normalizedHeight = Math.max(MIN_EDITOR_HEIGHT_PX, nextHeight);
    editorHeightRef.current = normalizedHeight;
    setEditorHeight(normalizedHeight);
  };

  const startResize = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    closeMenu();

    resizeStateRef.current = {
      startY: event.clientY,
      startHeight: editorHeight,
    };

    window.addEventListener('mousemove', handleResize);
    window.addEventListener('mouseup', stopResize);
  };

  const toggleCollapsed = () => {
    closeMenu();
    stopResize();
    setIsCollapsed((currentState) => {
      const nextState = !currentState;
      onCollapsedChange(card.id, nextState);
      return nextState;
    });
  };

  const copyCardContent = async () => {
    closeMenu();

    const plainText = card.content
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (plainText === '') return;

    try {
      await navigator.clipboard.writeText(plainText);
    } catch {
      // Ignore clipboard failures for now.
    }
  };

  const activateTitleEditing = (event: ReactMouseEvent<HTMLInputElement>) => {
    if (!isSelected) {
      event.preventDefault();
      onSelect();
      return;
    }
    if (isEditing) return;
    onStartEditing();
    requestAnimationFrame(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.setSelectionRange(titleInputRef.current.value.length, titleInputRef.current.value.length);
    });
  };

  const activateTagEditing = () => {
    if (!isSelected) {
      onSelect();
      return;
    }
    if (isEditing) return;
    onStartEditing();
    requestAnimationFrame(() => {
      const tagInput = cardBodyRef.current?.querySelector<HTMLInputElement>('.tag-input__field');
      tagInput?.focus();
    });
  };

  const activateContentEditing = () => {
    if (isEditing) return;
    onStartEditing();
    requestAnimationFrame(() => {
      editor?.commands.focus('end');
    });
  };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit],
    editable: isEditing,
    editorProps: {
      attributes: {
        class: `editor-content${isEditing ? ' editor-content--editing' : ' editor-content--readonly'}`,
      },
      handleDOMEvents: {
        mousedown: () => {
          if (!isSelected) {
            onSelect();
            return true;
          }
          if (!isEditing) {
            activateContentEditing();
            return true;
          }
          return false;
        },
        focus: () => {
          onSelect();
          closeMenu();
          return false;
        },
      },
    },
    content: card.content,
    onUpdate: ({ editor: currentEditor }) => {
      onContentChange(card.id, currentEditor.getHTML());
    },
  });

  useEffect(() => {
    const normalizedEditorHeight = normalizeEditorHeight(card.editorHeight);
    editorHeightRef.current = normalizedEditorHeight;
    setEditorHeight(normalizedEditorHeight);
  }, [card.editorHeight]);

  useEffect(() => {
    editor?.setEditable(isEditing);
  }, [editor, isEditing]);

  useEffect(() => {
    setIsCollapsed(card.isCollapsed);
  }, [card.isCollapsed]);

  useEffect(() => {
    if (!isSelected) {
      closeMenu();
    }
  }, [isSelected]);

  return (
    <article
      className={`card-item${titleError ? ' card-item--error' : ''}${isSelected ? ' card-item--selected' : ''}${isEditing ? ' card-item--editing' : ''}${isPoppedOut ? ' card-item--popped' : ''}`}
      onMouseDown={() => onSelect()}
    >
      <div className="card-item__menu">
        <details ref={menuRef} className="card-menu">
          <summary className="card-menu__trigger" aria-label="Card actions">
            <svg viewBox="0 0 16 16" aria-hidden="true" className="card-menu__icon">
              <circle cx="3" cy="8" r="1.2" fill="currentColor" />
              <circle cx="8" cy="8" r="1.2" fill="currentColor" />
              <circle cx="13" cy="8" r="1.2" fill="currentColor" />
            </svg>
          </summary>

          <div className="card-menu__dropdown">
            <button
              className="card-menu__item card-menu__item--neutral"
              type="button"
              aria-label="Copy card content"
              onClick={() => {
                void copyCardContent();
              }}
            >
              <svg viewBox="0 0 16 16" aria-hidden="true" className="card-menu__item-icon">
                <path
                  d="M5.75 2A1.75 1.75 0 0 0 4 3.75v6.5C4 11.22 4.78 12 5.75 12h4.5A1.75 1.75 0 0 0 12 10.25v-6.5A1.75 1.75 0 0 0 10.25 2h-4.5Zm0 1.5h4.5a.25.25 0 0 1 .25.25v6.5a.25.25 0 0 1-.25.25h-4.5a.25.25 0 0 1-.25-.25v-6.5a.25.25 0 0 1 .25-.25ZM3.75 5A.75.75 0 0 1 4.5 5.75v6.5c0 .14.11.25.25.25h5.5a.75.75 0 0 1 0 1.5h-5.5A1.75 1.75 0 0 1 3 12.25v-6.5A.75.75 0 0 1 3.75 5Z"
                  fill="currentColor"
                />
              </svg>
            </button>

            <button
              className="card-menu__item card-menu__item--neutral"
              type="button"
              aria-label={isCollapsed ? 'Expand card' : 'Collapse card'}
              onClick={toggleCollapsed}
            >
              <svg viewBox="0 0 16 16" aria-hidden="true" className="card-menu__item-icon">
                {isCollapsed ? (
                  <path
                    d="M3.25 8a.75.75 0 0 1 .75-.75h5.19L7.47 5.53a.75.75 0 0 1 1.06-1.06l3 3a.75.75 0 0 1 0 1.06l-3 3a.75.75 0 0 1-1.06-1.06l1.72-1.72H4A.75.75 0 0 1 3.25 8Z"
                    fill="currentColor"
                  />
                ) : (
                  <path
                    d="M8 3.25a.75.75 0 0 1 .75.75v5.19l1.72-1.72a.75.75 0 0 1 1.06 1.06l-3 3a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 0 1 1.06-1.06l1.72 1.72V4A.75.75 0 0 1 8 3.25Z"
                    fill="currentColor"
                  />
                )}
              </svg>
            </button>
            <button className="card-menu__item" type="button" aria-label="Delete card" onClick={() => onRemove(card.id)}>
              <svg viewBox="0 0 16 16" aria-hidden="true" className="card-menu__item-icon">
                <path
                  d="M6 2.5h4l.5 1H13a.75.75 0 0 1 0 1.5h-.6l-.55 7.05A1.5 1.5 0 0 1 10.35 13.5h-4.7a1.5 1.5 0 0 1-1.5-1.45L3.6 5H3a.75.75 0 0 1 0-1.5h2.5l.5-1Zm-.9 2.5.53 6.93h4.74L10.9 5H5.1ZM6.75 6.5a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3a.75.75 0 0 1 .75-.75Zm2.5 0a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3a.75.75 0 0 1 .75-.75Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </div>
        </details>
      </div>

      <input
        ref={titleInputRef}
        className={`card-field card-field--title${titleError ? ' card-field--error' : ''}`}
        value={card.title}
        readOnly={!isEditing}
        onMouseDown={activateTitleEditing}
        onChange={(event) => onTitleChange(card.id, event.target.value)}
        onBlur={() => {
          onTitleBlur(card.id);
          onStopEditing();
        }}
        onFocus={() => {
          onSelect();
          closeMenu();
        }}
        placeholder="Card title"
      />

      {titleError ? <div className="card-error">{titleError}</div> : null}

      <div ref={cardBodyRef} className={`card-item__body${isCollapsed ? ' card-item__body--collapsed' : ''}`}>
        {isCollapsed ? (
          <div className="card-collapsed-preview">
            <span className="card-collapsed-preview__text">......</span>
          </div>
        ) : (
          <div className="single-pane-editor" style={isPoppedOut ? undefined : { minHeight: `${editorHeight}px` }}>
            <EditorContent editor={editor} />
          </div>
        )}

        {!isCollapsed ? (
          <TagInput
            tags={card.tags}
            onChange={(tags) => onTagsChange(card.id, tags)}
            onTagClick={(tag) => {
              closeMenu();
              onTagClick(tag);
            }}
            onFocus={() => {
              onSelect();
              closeMenu();
            }}
            isEditing={isEditing}
            onActivate={activateTagEditing}
            action={
              isEditing ? (
                <button
                  type="button"
                  className="card-resize-handle"
                  aria-label="Resize card"
                  onMouseDown={startResize}
                >
                  <span className="card-resize-handle__grip" aria-hidden="true" />
                </button>
              ) : null
            }
          />
        ) : null}
      </div>
    </article>
  );
}
