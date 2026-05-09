import type { RefObject } from 'react';
import { CardItem, type CardItemProps } from '@/components/CardItem';
import type { Card } from '../../shared/models/card';

type BuildCardItemProps = (card: Card, overrides?: Partial<CardItemProps>) => CardItemProps;

type CardListProps = {
  listCards: Card[];
  loadMoreRef: RefObject<HTMLDivElement>;
  buildCardItemProps: BuildCardItemProps;
};

export function CardList({
  listCards,
  loadMoreRef,
  buildCardItemProps,
}: CardListProps) {
  return (
    <section className="card-list">
      {listCards.map((card) => (
        <CardItem key={card.id} {...buildCardItemProps(card)} />
      ))}

      <div ref={loadMoreRef} className="card-list__sentinel" aria-hidden="true" />
    </section>
  );
}
