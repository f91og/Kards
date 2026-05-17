export type CardInteractionEvent = 'escape' | 'enter' | 'space';

export type CardInteractionAction =
  | 'none'
  | 'expand-card'
  | 'open-large-card'
  | 'close-large-card'
  | 'start-editing'
  | 'stop-editing';

export type CardInteractionState = {
  hasSelectedCard: boolean;
  isCollapsed: boolean;
  isEditing: boolean;
  isLargeMode: boolean;
  isContentMasked: boolean;
};

export function resolveCardInteractionAction(
  event: CardInteractionEvent,
  state: CardInteractionState,
): CardInteractionAction {
  if (event === 'escape') {
    if (state.isEditing) return 'stop-editing';
    if (state.isLargeMode && state.hasSelectedCard) return 'close-large-card';
    return 'none';
  }

  if (event === 'enter') {
    if (state.isLargeMode && state.hasSelectedCard && !state.isEditing) return 'start-editing';
    return 'none';
  }

  if (state.isEditing || !state.hasSelectedCard) return 'none';

  if (state.isLargeMode) return 'close-large-card';
  if (state.isCollapsed) return 'expand-card';
  return 'open-large-card';
}
