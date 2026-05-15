import { useEffect, useRef, type RefObject } from 'react';
import { CardItem, type CardItemProps } from '@/components/CardItem';
import type { Card } from '../../shared/models/card';

type BuildCardItemProps = (card: Card, overrides?: Partial<CardItemProps>) => CardItemProps;

type CardListProps = {
  listCards: Card[];
  selectedCardId: string | null;
  loadMoreRef: RefObject<HTMLDivElement>;
  buildCardItemProps: BuildCardItemProps;
};

export function CardList({
  listCards,
  selectedCardId,
  loadMoreRef,
  buildCardItemProps,
}: CardListProps) {
  const listRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const selectedElement = listRef.current?.querySelector<HTMLElement>('.card-item--selected');
    if (!selectedElement) return;

    requestAnimationFrame(() => {
      const selectedRect = selectedElement.getBoundingClientRect();
      const topViewportPadding = 96;
      const bottomViewportPadding = 96;

      if (selectedRect.top < topViewportPadding) {
        window.scrollBy({
          top: selectedRect.top - topViewportPadding,
        });
        return;
      }

      const bottomLimit = window.innerHeight - bottomViewportPadding;
      if (selectedRect.bottom > bottomLimit) {
        window.scrollBy({
          top: selectedRect.bottom - bottomLimit,
        });
      }
    });
  }, [selectedCardId]);

  return (
    <section ref={listRef} className="card-list">
      {listCards.map((card) => (
        <CardItem key={card.id} {...buildCardItemProps(card)} />
      ))}

      <div ref={loadMoreRef} className="card-list__sentinel" aria-hidden="true" />
    </section>
  );
}
