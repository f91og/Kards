import { CardItem, type CardItemProps } from '@/components/CardItem';
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
          className="card-popout__close"
          onClick={onClose}
          aria-label="Close large editor"
          tabIndex={visible ? 0 : -1}
        >
          <svg viewBox="0 0 16 16" aria-hidden="true" className="card-popout__close-icon">
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
