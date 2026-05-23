import { EditorContent } from '@tiptap/react';
import { useEffect, useRef, useState, type FocusEvent as ReactFocusEvent, type MouseEvent as ReactMouseEvent } from 'react';
import { TagInput } from '@/components/TagInput';
import { useCardEditor } from '@/hooks/useCardEditor';
import { useResizableEditorHeight } from '@/hooks/useResizableEditorHeight';
import { copyCardContentToClipboard } from '@/lib/clipboard';
import { htmlToPlainText, type Card } from '../../shared/models/card';

const CONTEXT_MENU_WIDTH = 80;
const CONTEXT_MENU_HEIGHT = 170;

type CardContextMenuItem = {
  label: string;
  action: () => void;
  tone?: 'danger';
};

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
  const articleRef = useRef<HTMLElement | null>(null);
  const cardBodyRef = useRef<HTMLDivElement | null>(null);
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const pendingManualFocusRef = useRef(false);
  const pointerDownInsideCardRef = useRef(false);
  const didFocusDefaultTitleRef = useRef(false);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);

  const closeMenu = () => {
    setContextMenuPosition(null);
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
    onCollapsedChange(card.id, !isDisplayedCollapsed);
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

  const startEditing = (focusTarget?: () => void) => {
    if (!isSelected || isEditing) return;

    pendingManualFocusRef.current = true;
    onStartEditing();
    requestAnimationFrame(() => {
      focusTarget?.();
      pendingManualFocusRef.current = false;
    });
  };

  const activateTitleEditing = (event: ReactMouseEvent<HTMLInputElement>) => {
    if (event.button !== 0) return;

    if (!ensureSelected()) {
      event.preventDefault();
      return;
    }
    startEditing(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.setSelectionRange(titleInputRef.current.value.length, titleInputRef.current.value.length);
    });
  };

  const handleCardPointerDown = (event: ReactMouseEvent<HTMLElement>) => {
    if (event.button !== 0) return;

    pointerDownInsideCardRef.current = true;
    requestAnimationFrame(() => {
      pointerDownInsideCardRef.current = false;
    });

    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest('.card-context-menu, .card-resize-handle')) return;

    if (!isSelected) {
      onSelect();
      return;
    }

    if (!isEditing && !isDisplayedCollapsed) {
      startEditing();
    }
  };

  const handleContextMenu = (event: ReactMouseEvent<HTMLElement>) => {
    event.preventDefault();
    stopResize();
    onSelect();
    setContextMenuPosition({
      x: Math.max(0, Math.min(event.clientX, window.innerWidth - CONTEXT_MENU_WIDTH)),
      y: Math.max(0, Math.min(event.clientY, window.innerHeight - CONTEXT_MENU_HEIGHT)),
    });
  };

  const handleTitleBlur = (event: ReactFocusEvent<HTMLInputElement>) => {
    onTitleBlur(card.id);

    const nextFocusedElement = event.relatedTarget;
    if (nextFocusedElement instanceof Node && articleRef.current?.contains(nextFocusedElement)) {
      return;
    }

    if (pointerDownInsideCardRef.current) {
      return;
    }

    onStopEditing();
  };

  const activateTagEditing = () => {
    startEditing(() => {
      const tagInput = cardBodyRef.current?.querySelector<HTMLInputElement>('.tag-input__field');
      tagInput?.focus();
    });
  };

  const activateContentEditing = () => {
    startEditing(() => {
      if (!editor || editor.isDestroyed) return;
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
  const contextMenuItems: CardContextMenuItem[] = [
    ...(!isPoppedOut
      ? [
          {
            label: isDisplayedCollapsed ? '展开' : '收起',
            action: toggleCollapsed,
          },
        ]
      : []),
    {
      label: '复制',
      action: () => {
        void copyCardContent();
      },
    },
    {
      label: card.isContentMasked ? '取消' : '遮挡',
      action: toggleContentMasked,
    },
    {
      label: '删除',
      tone: 'danger',
      action: () => {
        closeMenu();
        onRemove(card.id);
      },
    },
  ];

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
    if (!editor || editor.isDestroyed) return;
    editor.setEditable(isEditing);
  }, [editor, isEditing]);

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (editor.getHTML() === card.content) return;
    editor.commands.setContent(card.content, { emitUpdate: false });
  }, [card.content, editor]);

  useEffect(() => {
    if (!isEditing || !isSelected || card.title !== 'Untitled') {
      didFocusDefaultTitleRef.current = false;
      return;
    }

    if (didFocusDefaultTitleRef.current) return;
    didFocusDefaultTitleRef.current = true;
    requestAnimationFrame(() => {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    });
  }, [card.title, isEditing, isSelected]);

  useEffect(() => {
    if (!editor || editor.isDestroyed || !isEditing || !isSelected || isDisplayedCollapsed || card.isContentMasked) return;
    if (pendingManualFocusRef.current) return;
    if (card.title === 'Untitled') return;

    const activeElement = document.activeElement;
    if (
      activeElement instanceof HTMLElement &&
      (activeElement === titleInputRef.current || cardBodyRef.current?.contains(activeElement))
    ) {
      return;
    }

    requestAnimationFrame(() => {
      if (editor.isDestroyed) return;
      editor.commands.focus('end');
    });
  }, [card.isContentMasked, editor, isDisplayedCollapsed, isEditing, isSelected]);

  useEffect(() => {
    if (!isSelected) {
      closeMenu();
    }
  }, [isSelected]);

  useEffect(() => {
    if (!contextMenuPosition) return;

    const closeContextMenu = () => {
      closeMenu();
    };

    window.addEventListener('mousedown', closeContextMenu);
    window.addEventListener('scroll', closeContextMenu, true);
    window.addEventListener('resize', closeContextMenu);
    return () => {
      window.removeEventListener('mousedown', closeContextMenu);
      window.removeEventListener('scroll', closeContextMenu, true);
      window.removeEventListener('resize', closeContextMenu);
    };
  }, [contextMenuPosition]);

  useEffect(() => {
    if (!contextMenuPosition) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      closeMenu();
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [contextMenuPosition]);

  return (
    <article
      ref={articleRef}
      className={`card-item${titleError ? ' card-item--error' : ''}${isSelected ? ' card-item--selected' : ''}${isEditing ? ' card-item--editing' : ''}${isPoppedOut ? ' card-item--popped' : ''}`}
      onMouseDown={handleCardPointerDown}
      onContextMenu={handleContextMenu}
    >
      {contextMenuPosition ? (
        <div
          className="card-context-menu"
          style={{
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
          }}
          role="menu"
          onMouseDown={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          {contextMenuItems.map((item) => (
            <button
              key={item.label}
              className={`card-context-menu__item${item.tone === 'danger' ? ' card-context-menu__item--danger' : ''}`}
              type="button"
              role="menuitem"
              onClick={item.action}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      <input
        ref={titleInputRef}
        className={`card-field card-field--title${titleError ? ' card-field--error' : ''}`}
        value={card.title}
        readOnly={!isEditing || isDisplayedCollapsed}
        onMouseDown={activateTitleEditing}
        onChange={(event) => onTitleChange(card.id, event.target.value)}
        onBlur={handleTitleBlur}
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
              isSelected && !isPoppedOut ? (
                <div className="card-footer-actions">
                  <button
                    type="button"
                    className="card-footer-action card-collapse-handle"
                    aria-label="Collapse card"
                    onClick={toggleCollapsed}
                  >
                    <svg viewBox="0 0 16 16" aria-hidden="true" className="card-footer-action__icon">
                      <path
                        d="M8 12.75a.75.75 0 0 1-.75-.75V6.81L5.53 8.53a.75.75 0 0 1-1.06-1.06l3-3a.75.75 0 0 1 1.06 0l3 3a.75.75 0 1 1-1.06 1.06L8.75 6.81V12a.75.75 0 0 1-.75.75Z"
                        fill="currentColor"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="card-footer-action card-resize-handle"
                    aria-label="Resize card height"
                    onMouseDown={startResize}
                  >
                    <svg viewBox="0 0 16 16" aria-hidden="true" className="card-footer-action__icon">
                      <path d="M4 5.25A.75.75 0 0 1 4.75 4.5h6.5a.75.75 0 0 1 0 1.5h-6.5A.75.75 0 0 1 4 5.25Z" fill="currentColor" />
                      <path d="M4 10.75A.75.75 0 0 1 4.75 10h6.5a.75.75 0 0 1 0 1.5h-6.5A.75.75 0 0 1 4 10.75Z" fill="currentColor" />
                    </svg>
                  </button>
                </div>
              ) : null
            }
          />
        ) : null}
      </div>
    </article>
  );
}
