export type CardInteractionEvent = 'escape' | 'enter' | 'space';

export type CardInteractionAction =
  | 'none'
  | 'expand-card'
  | 'collapse-card'
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
    if (state.isLargeMode && state.hasSelectedCard) return 'close-large-card';
    return 'none';
  }

  if (event === 'enter') {
    if (!state.hasSelectedCard || state.isEditing) return 'none';
    if (state.isCollapsed) return 'expand-card';
    return 'start-editing';
  }

  if (event === 'space') {
    if (!state.hasSelectedCard || state.isEditing || state.isLargeMode) return 'none';
    return state.isCollapsed ? 'expand-card' : 'collapse-card';
  }

  return 'none';
}
