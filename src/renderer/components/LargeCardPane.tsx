import { CardItem, type CardItemProps } from '@/components/CardItem';
import { copyCardContentToClipboard } from '@/lib/clipboard';
import type { CSSProperties } from 'react';

type LargeCardPaneProps = {
  visible: boolean;
  style?: CSSProperties;
  cardItemProps: CardItemProps | null;
  onClose: () => void;
};

export function LargeCardPane({
  visible,
  style,
  cardItemProps,
  onClose,
}: LargeCardPaneProps) {
  const copyCardContent = () => {
    if (!cardItemProps) return;
    void copyCardContentToClipboard(cardItemProps.card.content);
  };

  return (
    <section
      className={`app-workspace__editor${visible ? '' : ' app-workspace__editor--hidden'}`}
      style={style}
      onMouseDown={() => cardItemProps?.onSelect()}
      aria-hidden={visible ? undefined : 'true'}
    >
      <div className="app-workspace__editor-frame">
        <button
          type="button"
          className="card-popout__action card-popout__copy"
          onClick={copyCardContent}
          aria-label="Copy card content"
          tabIndex={visible ? 0 : -1}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" className="card-popout__action-icon">
            <path
              d="M5.75 2A1.75 1.75 0 0 0 4 3.75v6.5C4 11.22 4.78 12 5.75 12h4.5A1.75 1.75 0 0 0 12 10.25v-6.5A1.75 1.75 0 0 0 10.25 2h-4.5Zm0 1.5h4.5a.25.25 0 0 1 .25.25v6.5a.25.25 0 0 1-.25.25h-4.5a.25.25 0 0 1-.25-.25v-6.5a.25.25 0 0 1 .25-.25ZM3.75 5A.75.75 0 0 1 4.5 5.75v6.5c0 .14.11.25.25.25h5.5a.75.75 0 0 1 0 1.5h-5.5A1.75 1.75 0 0 1 3 12.25v-6.5A.75.75 0 0 1 3.75 5Z"
              fill="currentColor"
            />
          </svg>
        </button>

        <button
          type="button"
          className="card-popout__action card-popout__close"
          onClick={onClose}
          aria-label="Close large editor"
          tabIndex={visible ? 0 : -1}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" className="card-popout__action-icon">
            <path
              d="M4.22 4.22a.75.75 0 0 1 1.06 0L8 6.94l2.72-2.72a.75.75 0 1 1 1.06 1.06L9.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L8 9.06l-2.72 2.72a.75.75 0 1 1-1.06-1.06L6.94 8 4.22 5.28a.75.75 0 0 1 0-1.06Z"
              fill="currentColor"
            />
          </svg>
        </button>

        {cardItemProps ? <CardItem {...cardItemProps} /> : null}
      </div>
    </section>
  );
}
