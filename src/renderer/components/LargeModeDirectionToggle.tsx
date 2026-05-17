import type { LargeModeDirection } from '@/lib/largeMode';

type LargeModeDirectionToggleProps = {
  direction: LargeModeDirection;
  onDirectionChange: (direction: LargeModeDirection) => void;
};

function DirectionArrowIcon({ direction }: { direction: LargeModeDirection }) {
  return direction === 'left' ? (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="large-mode-direction-toggle__icon">
      <path
        d="M10.25 3.25a.75.75 0 0 1 0 1.06L7.56 7h4.94a.75.75 0 0 1 0 1.5H7.56l2.69 2.69a.75.75 0 0 1-1.06 1.06L5.22 8.28a.75.75 0 0 1 0-1.06l3.97-3.97a.75.75 0 0 1 1.06 0Z"
        fill="currentColor"
      />
    </svg>
  ) : (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="large-mode-direction-toggle__icon">
      <path
        d="M5.75 3.25a.75.75 0 0 0 0 1.06L8.44 7H3.5a.75.75 0 0 0 0 1.5h4.94l-2.69 2.69a.75.75 0 1 0 1.06 1.06l3.97-3.97a.75.75 0 0 0 0-1.06L6.81 3.25a.75.75 0 0 0-1.06 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function LargeModeDirectionToggle({
  direction,
  onDirectionChange,
}: LargeModeDirectionToggleProps) {
  return (
    <div className="large-mode-direction-toggle" aria-label="Large card expand direction">
      <button
        type="button"
        className={`large-mode-direction-toggle__button${direction === 'left' ? ' large-mode-direction-toggle__button--active' : ''}`}
        onClick={() => onDirectionChange('left')}
        aria-label="Expand large card to the left"
        aria-pressed={direction === 'left'}
      >
        <DirectionArrowIcon direction="left" />
      </button>

      <button
        type="button"
        className={`large-mode-direction-toggle__button${direction === 'right' ? ' large-mode-direction-toggle__button--active' : ''}`}
        onClick={() => onDirectionChange('right')}
        aria-label="Expand large card to the right"
        aria-pressed={direction === 'right'}
      >
        <DirectionArrowIcon direction="right" />
      </button>
    </div>
  );
}
