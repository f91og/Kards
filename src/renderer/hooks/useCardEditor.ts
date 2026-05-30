import StarterKit from '@tiptap/starter-kit';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
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
        mousedown: () => {
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
