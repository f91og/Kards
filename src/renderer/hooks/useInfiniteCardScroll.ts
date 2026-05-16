import { useEffect, type RefObject } from 'react';

type UseInfiniteCardScrollParams = {
  loadMoreRef: RefObject<HTMLDivElement>;
  cardsCount: number;
  hasMoreCards: boolean;
  isHydratingCards: boolean;
  isLoadingMoreCards: boolean;
  loadMoreCards: () => Promise<void>;
};

export function useInfiniteCardScroll({
  loadMoreRef,
  cardsCount,
  hasMoreCards,
  isHydratingCards,
  isLoadingMoreCards,
  loadMoreCards,
}: UseInfiniteCardScrollParams) {
  useEffect(() => {
    const loadMoreNode = loadMoreRef.current;
    const scrollRoot = loadMoreNode?.closest('.app-rail');
    if (!loadMoreNode || !hasMoreCards || isHydratingCards || isLoadingMoreCards) return;

    const observer = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (!entry?.isIntersecting) return;
      void loadMoreCards();
    }, {
      root: scrollRoot,
    });

    observer.observe(loadMoreNode);
    return () => {
      observer.disconnect();
    };
  }, [cardsCount, hasMoreCards, isHydratingCards, isLoadingMoreCards, loadMoreCards, loadMoreRef]);
}
