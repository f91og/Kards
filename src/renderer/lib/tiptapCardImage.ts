import { mergeAttributes, Node } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { CardImageNodeView } from '@/components/CardImageNodeView';

export const CardImage = Node.create({
  name: 'cardImage',
  group: 'block',
  draggable: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: null,
        parseHTML: (element) => {
          const width = element.getAttribute('data-width') ?? element.getAttribute('width');
          return width ? Number(width) : null;
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'figure[data-card-image]',
        getAttrs: (element) => {
          if (!(element instanceof HTMLElement)) return false;
          const imageElement = element.querySelector('img');
          if (!imageElement) return false;

          const width = element.dataset.width ?? imageElement.getAttribute('width');

          return {
            src: imageElement.getAttribute('src'),
            alt: imageElement.getAttribute('alt'),
            title: imageElement.getAttribute('title'),
            width: width ? Number(width) : null,
          };
        },
      },
      {
        tag: 'img[src]',
        getAttrs: (element) => {
          if (!(element instanceof HTMLElement)) return false;

          const width = element.getAttribute('width');

          return {
            src: element.getAttribute('src'),
            alt: element.getAttribute('alt'),
            title: element.getAttribute('title'),
            width: width ? Number(width) : null,
          };
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const { src, alt, title, width, ...restAttributes } = HTMLAttributes;

    return [
      'figure',
      mergeAttributes(restAttributes, {
        'data-card-image': 'true',
        'data-width': width ?? undefined,
        style: width ? `width: ${width}px;` : undefined,
      }),
      ['img', { src, alt, title, width: width ?? undefined }],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CardImageNodeView);
  },

  addProseMirrorPlugins() {
    const nodeName = this.name;

    return [
      new Plugin({
        props: {
          handlePaste: (view, event) => {
            const imageFile = Array.from(event.clipboardData?.files ?? []).find((file) =>
              file.type.startsWith('image/'),
            );

            if (!imageFile) return false;

            event.preventDefault();

            const reader = new FileReader();
            reader.onload = () => {
              const result = reader.result;
              if (typeof result !== 'string') return;

              const imageNode = view.state.schema.nodes[nodeName]?.create({
                src: result,
                alt: imageFile.name || 'Pasted image',
                title: imageFile.name || undefined,
              });

              if (!imageNode) return;

              const transaction = view.state.tr.replaceSelectionWith(imageNode).scrollIntoView();
              view.dispatch(transaction);
            };
            reader.readAsDataURL(imageFile);

            return true;
          },
        },
      }),
    ];
  },
});
