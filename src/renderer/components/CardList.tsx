import type { RefObject } from 'react';
import { CardItem, type CardItemProps } from '@/components/CardItem';
import type { Card } from '../../shared/models/card';

type PoppedCardMode = 'medium' | 'large';

type BuildCardItemProps = (card: Card, overrides?: Partial<CardItemProps>) => CardItemProps;

type CardListProps = {
  listCards: Card[];
  poppedCard: Card | null;
  poppedCardMode: PoppedCardMode | null;
  poppedCardId: string | null;
  editingCardId: string | null;
  loadMoreRef: RefObject<HTMLDivElement>;
  buildCardItemProps: BuildCardItemProps;
  onSelectCard: (cardId: string) => void;
  onClosePoppedCard: () => void;
};

export function CardList({
  listCards,
  poppedCard,
  poppedCardMode,
  poppedCardId,
  editingCardId,
  loadMoreRef,
  buildCardItemProps,
  onSelectCard,
  onClosePoppedCard,
}: CardListProps) {
  return (
    <>
      <section className="card-list">
        {listCards.map((card) => (
          <CardItem key={card.id} {...buildCardItemProps(card)} />
        ))}

        {poppedCardId ? null : <div ref={loadMoreRef} className="card-list__sentinel" aria-hidden="true" />}
      </section>

      {poppedCard ? (
        <div className="card-popout-layer" onMouseDown={() => onSelectCard(poppedCard.id)}>
          <div className={`card-popout${poppedCardMode === 'large' ? ' card-popout--large' : ''}`}>
            <button
              type="button"
              className="card-popout__close"
              onClick={onClosePoppedCard}
              aria-label="Close popped card"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true" className="card-popout__close-icon">
                <path
                  d="M4.22 4.22a.75.75 0 0 1 1.06 0L8 6.94l2.72-2.72a.75.75 0 1 1 1.06 1.06L9.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L8 9.06l-2.72 2.72a.75.75 0 1 1-1.06-1.06L6.94 8 4.22 5.28a.75.75 0 0 1 0-1.06Z"
                  fill="currentColor"
                />
              </svg>
            </button>

            <CardItem
              key={`${poppedCard.id}-popped`}
              {...buildCardItemProps(poppedCard, {
                isSelected: true,
                isEditing: editingCardId === poppedCard.id,
                isPoppedOut: true,
              })}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
