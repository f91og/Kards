import { EditorContent } from '@tiptap/react';
import { useEffect, useRef, type MouseEvent as ReactMouseEvent } from 'react';
import { TagInput } from '@/components/TagInput';
import { useCardEditor } from '@/hooks/useCardEditor';
import { useResizableEditorHeight } from '@/hooks/useResizableEditorHeight';
import { copyCardContentToClipboard } from '@/lib/clipboard';
import { htmlToPlainText, type Card } from '../../shared/models/card';

export type CardItemProps = {
  card: Card;
  isSelected: boolean;
  isEditing: boolean;
  isPoppedOut?: boolean;
  forceCollapsed?: boolean;
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
  onContentMaskedToggle: (id: string) => void;
  onRemove: (id: string) => void;
};

export function CardItem({
  card,
  isSelected,
  isEditing,
  isPoppedOut = false,
  forceCollapsed = false,
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
  onContentMaskedToggle,
  onRemove,
}: CardItemProps) {
  const menuRef = useRef<HTMLDetailsElement | null>(null);
  const cardBodyRef = useRef<HTMLDivElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);

  const closeMenu = () => {
    if (menuRef.current) {
      menuRef.current.open = false;
    }
  };

  const { editorHeight, startResize, stopResize } = useResizableEditorHeight({
    cardId: card.id,
    editorHeight: card.editorHeight,
    onEditorHeightChange,
    onBeforeResize: closeMenu,
  });

  const toggleCollapsed = () => {
    closeMenu();
    stopResize();
    onCollapsedChange(card.id, !card.isCollapsed);
  };

  const copyCardContent = async () => {
    closeMenu();
    await copyCardContentToClipboard(card.content);
  };

  const ensureSelected = (): boolean => {
    if (isSelected) return true;
    onSelect();
    return false;
  };

  const startEditing = (focusTarget: () => void) => {
    if (!ensureSelected() || isEditing) return;

    onStartEditing();
    requestAnimationFrame(focusTarget);
  };

  const activateTitleEditing = (event: ReactMouseEvent<HTMLInputElement>) => {
    if (!ensureSelected()) {
      event.preventDefault();
      return;
    }
    startEditing(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.setSelectionRange(titleInputRef.current.value.length, titleInputRef.current.value.length);
    });
  };

  const activateTagEditing = () => {
    startEditing(() => {
      const tagInput = cardBodyRef.current?.querySelector<HTMLInputElement>('.tag-input__field');
      tagInput?.focus();
    });
  };

  const activateContentEditing = () => {
    startEditing(() => {
      editor?.commands.focus('end');
    });
  };

  const toggleContentMasked = () => {
    closeMenu();
    if (card.isContentMasked) {
      onContentMaskedToggle(card.id);
      return;
    }

    onStopEditing();
    onContentMaskedToggle(card.id);
  };

  const maskedContent = htmlToPlainText(card.content).replace(/\S/g, '*');
  const isDisplayedCollapsed = isPoppedOut ? false : forceCollapsed ? true : card.isCollapsed;

  const editor = useCardEditor({
    cardId: card.id,
    content: card.content,
    isEditing,
    isSelected,
    onSelect,
    onRequestEdit: activateContentEditing,
    onCloseMenu: closeMenu,
    onContentChange: (content) => onContentChange(card.id, content),
  });

  useEffect(() => {
    editor?.setEditable(isEditing);
  }, [editor, isEditing]);

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() === card.content) return;
    editor.commands.setContent(card.content, { emitUpdate: false });
  }, [card.content, editor]);

  useEffect(() => {
    if (!editor || !isEditing || !isSelected || isDisplayedCollapsed || card.isContentMasked) return;

    const activeElement = document.activeElement;
    if (
      activeElement instanceof HTMLElement &&
      (activeElement === titleInputRef.current || cardBodyRef.current?.contains(activeElement))
    ) {
      return;
    }

    requestAnimationFrame(() => {
      editor.commands.focus('end');
    });
  }, [card.isContentMasked, editor, isDisplayedCollapsed, isEditing, isSelected]);

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
        {isDisplayedCollapsed ? (
          <button className="card-menu__trigger" type="button" aria-label="Expand card" onClick={toggleCollapsed}>
            <svg viewBox="0 0 16 16" aria-hidden="true" className="card-menu__icon">
              <path
                d="M8 3.25a.75.75 0 0 1 .75.75v5.19l1.72-1.72a.75.75 0 0 1 1.06 1.06l-3 3a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 0 1 1.06-1.06l1.72 1.72V4A.75.75 0 0 1 8 3.25Z"
                fill="currentColor"
              />
            </svg>
          </button>
        ) : (
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

              <button className="card-menu__item card-menu__item--neutral" type="button" aria-label="Collapse card" onClick={toggleCollapsed}>
                <svg viewBox="0 0 16 16" aria-hidden="true" className="card-menu__item-icon">
                  <path
                    d="M8 3.25a.75.75 0 0 1 .75.75v5.19l1.72-1.72a.75.75 0 0 1 1.06 1.06l-3 3a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 0 1 1.06-1.06l1.72 1.72V4A.75.75 0 0 1 8 3.25Z"
                    fill="currentColor"
                  />
                </svg>
              </button>
              <button
                className="card-menu__item card-menu__item--neutral"
                type="button"
                aria-label={card.isContentMasked ? 'Unmask content' : 'Mask content'}
                onClick={toggleContentMasked}
              >
                <svg viewBox="0 0 16 16" aria-hidden="true" className="card-menu__item-icon">
                  {card.isContentMasked ? (
                    <path
                      d="M2.22 2.22a.75.75 0 0 1 1.06 0l10.5 10.5a.75.75 0 1 1-1.06 1.06l-1.64-1.64A7.6 7.6 0 0 1 8 12.75c-3.3 0-5.68-2.2-6.87-4.3a.9.9 0 0 1 0-.9A13.44 13.44 0 0 1 4 4.23L2.22 3.28a.75.75 0 0 1 0-1.06Zm2.99 3.05A11.58 11.58 0 0 0 2.66 8c1.02 1.62 2.91 3.25 5.34 3.25.79 0 1.54-.17 2.21-.49l-1.2-1.2a2.5 2.5 0 0 1-3.57-3.57L5.21 5.27Zm2.33 2.33 1.86 1.86A1 1 0 0 0 7.54 7.6Zm.46-3.85c3.3 0 5.68 2.2 6.87 4.3a.9.9 0 0 1 0 .9 13.29 13.29 0 0 1-2.73 3.2l-1.08-1.08A11.37 11.37 0 0 0 13.34 8c-1.02-1.62-2.91-3.25-5.34-3.25-.5 0-.99.07-1.46.2l-.98-.98c.76-.29 1.58-.47 2.44-.47Zm0 1.75a2.5 2.5 0 0 1 2.47 2.89l-2.86-2.86c.13-.02.26-.03.39-.03Z"
                      fill="currentColor"
                    />
                  ) : (
                    <path
                      d="M8 3.25c3.3 0 5.68 2.2 6.87 4.3a.9.9 0 0 1 0 .9c-1.19 2.1-3.57 4.3-6.87 4.3s-5.68-2.2-6.87-4.3a.9.9 0 0 1 0-.9c1.19-2.1 3.57-4.3 6.87-4.3Zm0 8c2.43 0 4.32-1.63 5.34-3.25C12.32 6.38 10.43 4.75 8 4.75S3.68 6.38 2.66 8C3.68 9.62 5.57 11.25 8 11.25Zm0-5a1.75 1.75 0 1 1 0 3.5 1.75 1.75 0 0 1 0-3.5Z"
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
        )}
      </div>

      <input
        ref={titleInputRef}
        className={`card-field card-field--title${titleError ? ' card-field--error' : ''}`}
        value={card.title}
        readOnly={!isEditing || isDisplayedCollapsed}
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

      <div ref={cardBodyRef} className={`card-item__body${isDisplayedCollapsed ? ' card-item__body--collapsed' : ''}`}>
        {isDisplayedCollapsed ? null : (
          <div className="single-pane-editor" style={isPoppedOut ? undefined : { height: `${editorHeight}px` }}>
            {card.isContentMasked ? (
              <div className="card-masked-content" onMouseDown={() => onSelect()}>
                {maskedContent || '******'}
              </div>
            ) : (
              <EditorContent editor={editor} />
            )}
          </div>
        )}

        {!isDisplayedCollapsed ? (
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
              isSelected ? (
                <button
                  type="button"
                  className="card-resize-handle"
                  aria-label="Resize card height"
                  onMouseDown={startResize}
                >
                  <svg viewBox="0 0 16 16" aria-hidden="true" className="card-resize-handle__icon">
                    <path d="M4 5.25A.75.75 0 0 1 4.75 4.5h6.5a.75.75 0 0 1 0 1.5h-6.5A.75.75 0 0 1 4 5.25Z" fill="currentColor" />
                    <path d="M4 10.75A.75.75 0 0 1 4.75 10h6.5a.75.75 0 0 1 0 1.5h-6.5A.75.75 0 0 1 4 10.75Z" fill="currentColor" />
                  </svg>
                </button>
              ) : null
            }
          />
        ) : null}
      </div>
    </article>
  );
}
