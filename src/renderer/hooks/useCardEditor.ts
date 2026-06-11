import StarterKit from '@tiptap/starter-kit';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import type { Node as ProseMirrorNode, ResolvedPos } from '@tiptap/pm/model';
import { Selection } from '@tiptap/pm/state';
import type { Mappable } from '@tiptap/pm/transform';
import { useEditor } from '@tiptap/react';
import { CardImage } from '@/lib/tiptapCardImage';

type UseCardEditorParams = {
  cardId: string;
  title?: string;
  content: string;
  isEditing: boolean;
  isSelected: boolean;
  isDocumentMode?: boolean;
  onSelect: () => void;
  onRequestEdit: () => void;
  onCloseMenu: () => void;
  onTitleChange?: (title: string) => void;
  onTitleBlur?: () => void;
  onContentChange: (content: string) => void;
};

class DocumentBodySelection extends Selection {
  constructor($anchor: ResolvedPos, $head: ResolvedPos) {
    super($anchor, $head);
  }

  eq(selection: Selection): boolean {
    return (
      selection instanceof DocumentBodySelection &&
      selection.anchor === this.anchor &&
      selection.head === this.head
    );
  }

  map(doc: ProseMirrorNode, mapping: Mappable): Selection {
    const anchor = Math.min(mapping.map(this.anchor, 1), doc.content.size);
    const head = Math.min(mapping.map(this.head, -1), doc.content.size);
    if (anchor >= head) {
      return Selection.near(doc.resolve(anchor));
    }

    return DocumentBodySelection.create(doc, anchor, head);
  }

  toJSON(): { type: string; anchor: number; head: number } {
    return {
      type: 'document-body',
      anchor: this.anchor,
      head: this.head,
    };
  }

  static create(doc: ProseMirrorNode, anchor: number, head: number): DocumentBodySelection {
    return new DocumentBodySelection(doc.resolve(anchor), doc.resolve(head));
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildDocumentEditorContent(title: string, content: string): string {
  return `<h1>${escapeHtml(title)}</h1>${content}`;
}

export function splitDocumentEditorContent(html: string): { title: string; content: string } {
  const container = document.createElement('div');
  container.innerHTML = html;

  const titleElement = container.firstElementChild;
  const title = titleElement?.textContent ?? '';
  titleElement?.remove();

  return {
    title,
    content: container.innerHTML,
  };
}

export function useCardEditor({
  cardId,
  title = '',
  content,
  isEditing,
  isSelected,
  isDocumentMode = false,
  onSelect,
  onRequestEdit,
  onCloseMenu,
  onTitleChange,
  onTitleBlur,
  onContentChange,
}: UseCardEditorParams) {
  return useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      CardImage,
    ],
    editable: isEditing,
    editorProps: {
      attributes: {
        class: `editor-content${isDocumentMode ? ' editor-content--document' : ''}${isEditing ? ' editor-content--editing' : ' editor-content--readonly'}`,
      },
      handleDOMEvents: {
        keydown: (view, event) => {
          const isSelectAll =
            (event.metaKey || event.ctrlKey) &&
            !event.altKey &&
            !event.shiftKey &&
            event.key.toLocaleLowerCase() === 'a';

          if (!isDocumentMode || !isSelectAll) {
            return false;
          }

          const titleNode = view.state.doc.firstChild;
          if (!titleNode) {
            return false;
          }

          const contentStart = titleNode.nodeSize;
          const contentEnd = view.state.doc.content.size;

          event.preventDefault();
          view.dispatch(
            view.state.tr.setSelection(
              DocumentBodySelection.create(view.state.doc, contentStart, contentEnd),
            ),
          );
          return true;
        },
        mousedown: (_view, event) => {
          if (event.button !== 0 || event.ctrlKey) {
            return false;
          }

          if (!isSelected) {
            onSelect();
            return true;
          }
          if (!isEditing) {
            onRequestEdit();
            return true;
          }
          return false;
        },
        focus: () => {
          onSelect();
          onCloseMenu();
          return false;
        },
        blur: () => {
          if (isDocumentMode) {
            onTitleBlur?.();
          }
          return false;
        },
      },
    },
    content: isDocumentMode ? buildDocumentEditorContent(title, content) : content,
    onUpdate: ({ editor: currentEditor }) => {
      if (isDocumentMode) {
        const nextDocument = splitDocumentEditorContent(currentEditor.getHTML());
        onTitleChange?.(nextDocument.title);
        onContentChange(nextDocument.content);
        return;
      }

      onContentChange(currentEditor.getHTML());
    },
  }, [cardId, isEditing, isSelected, isDocumentMode]);
}
