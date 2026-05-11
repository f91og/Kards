import StarterKit from '@tiptap/starter-kit';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import { useEditor } from '@tiptap/react';

type UseCardEditorParams = {
  cardId: string;
  content: string;
  isEditing: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onRequestEdit: () => void;
  onCloseMenu: () => void;
  onContentChange: (content: string) => void;
};

export function useCardEditor({
  cardId,
  content,
  isEditing,
  isSelected,
  onSelect,
  onRequestEdit,
  onCloseMenu,
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
    ],
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
      },
    },
    content,
    onUpdate: ({ editor: currentEditor }) => {
      onContentChange(currentEditor.getHTML());
    },
  }, [cardId, isEditing, isSelected]);
}
