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
      const scrollContainer = listRef.current?.closest<HTMLElement>('.app-rail');
      if (!scrollContainer) return;

      const selectedRect = selectedElement.getBoundingClientRect();
      const containerRect = scrollContainer.getBoundingClientRect();
      const topViewportPadding = 96;
      const bottomViewportPadding = 96;
      const topLimit = containerRect.top + topViewportPadding;
      const bottomLimit = containerRect.bottom - bottomViewportPadding;

      if (selectedRect.top < topLimit) {
        scrollContainer.scrollBy({
          top: selectedRect.top - topLimit,
        });
        return;
      }

      if (selectedRect.bottom > bottomLimit) {
        scrollContainer.scrollBy({
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
