export type CardInteractionEvent = 'escape' | 'enter';

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
};

export function resolveCardInteractionAction(
  event: CardInteractionEvent,
  state: CardInteractionState,
): CardInteractionAction {
  if (event === 'escape') {
    if (state.isEditing) return 'stop-editing';
    return 'none';
  }

  if (event === 'enter') {
    if (!state.hasSelectedCard || state.isEditing) return 'none';
    if (state.isCollapsed) return 'expand-card';
    return 'start-editing';
  }

  return 'none';
}
