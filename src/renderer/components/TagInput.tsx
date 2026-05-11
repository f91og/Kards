import { useMemo, useRef, useState, type CompositionEvent, type KeyboardEvent, type ReactNode } from 'react';
import { mergeUniqueTags, normalizeTags } from '../../shared/models/card';

type TagInputProps = {
  tags: string[];
  onChange: (tags: string[]) => void;
  onTagClick: (tag: string) => void;
  onFocus?: () => void;
  isEditing?: boolean;
  onActivate?: () => void;
  action?: ReactNode;
};

export function TagInput({ tags, onChange, onTagClick, onFocus, isEditing = true, onActivate, action }: TagInputProps) {
  const [draft, setDraft] = useState('');
  const isComposingRef = useRef(false);
  const normalizedTags = useMemo(() => normalizeTags(tags), [tags]);

  const requestEditModeIfReadonly = () => {
    if (!isEditing) {
      onActivate?.();
      return true;
    }

    return false;
  };

  const commitDraft = () => {
    const nextTags = normalizeTags(draft.split(/\s+/));

    if (nextTags.length === 0) return;

    onChange(mergeUniqueTags(normalizedTags, nextTags));
    setDraft('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (isComposingRef.current || event.nativeEvent.isComposing) {
      return;
    }

    if (event.key === ' ' || event.key === 'Enter' || event.key === 'Tab') {
      if (draft.trim() !== '') {
        event.preventDefault();
        commitDraft();
      }
      return;
    }

    if (event.key === 'Backspace' && draft === '' && normalizedTags.length > 0) {
      onChange(normalizedTags.slice(0, -1));
    }
  };

  const handleCompositionStart = () => {
    isComposingRef.current = true;
  };

  const handleCompositionEnd = (_event: CompositionEvent<HTMLInputElement>) => {
    isComposingRef.current = false;
  };

  return (
    <div
      className={`tag-input${isEditing ? '' : ' tag-input--readonly'}`}
      onClick={() => {
        if (requestEditModeIfReadonly()) {
          return;
        }
        onFocus?.();
      }}
    >
      <div className="tag-input__content">
        {normalizedTags.map((tag) => (
          <button
            key={tag}
            type="button"
            className="tag-pill"
            onClick={() => {
              if (requestEditModeIfReadonly()) {
                return;
              }
              onTagClick(tag);
            }}
          >
            <span className="tag-pill__label">{tag}</span>
          </button>
        ))}

        {isEditing ? (
          <input
            className="tag-input__field"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (isComposingRef.current) return;
              commitDraft();
            }}
            onFocus={onFocus}
            placeholder={normalizedTags.length === 0 ? 'tags separated by space' : ''}
          />
        ) : normalizedTags.length === 0 ? (
          <button type="button" className="tag-input__placeholder" onClick={() => requestEditModeIfReadonly()}>
            Add tags
          </button>
        ) : null}
      </div>

      {action ? <div className="tag-input__action">{action}</div> : null}
    </div>
  );
}
