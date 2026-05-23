export type LargeModeDirection = 'left' | 'right';

export function getLargeModeDirectionForRail(
  railRect: DOMRect,
  workArea: KardsWindowBounds | null,
): LargeModeDirection {
  const screen = window.screen as Screen & { availLeft?: number };
  const screenLeft = workArea?.x ?? screen.availLeft ?? 0;
  const screenWidth = workArea?.width ?? screen.availWidth ?? screen.width;
  const screenCenterX = screenLeft + screenWidth / 2;
  const windowLeft = window.screenX ?? window.screenLeft ?? 0;
  const railCenterX = windowLeft + railRect.left + railRect.width / 2;

  return railCenterX < screenCenterX ? 'right' : 'left';
}
