import { useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';

type TagInputProps = {
  tags: string[];
  onChange: (tags: string[]) => void;
  onTagClick: (tag: string) => void;
  onFocus?: () => void;
  isEditing?: boolean;
  onActivate?: () => void;
  action?: ReactNode;
};

function normalizeTag(tag: string): string {
  return tag.trim();
}

export function TagInput({ tags, onChange, onTagClick, onFocus, isEditing = true, onActivate, action }: TagInputProps) {
  const [draft, setDraft] = useState('');
  const normalizedTags = useMemo(() => tags.map(normalizeTag).filter(Boolean), [tags]);

  const commitDraft = () => {
    const nextTags = draft
      .split(/\s+/)
      .map(normalizeTag)
      .filter(Boolean);

    if (nextTags.length === 0) return;

    const mergedTags = [...normalizedTags];
    nextTags.forEach((tag) => {
      if (!mergedTags.some((existingTag) => existingTag.toLocaleLowerCase() === tag.toLocaleLowerCase())) {
        mergedTags.push(tag);
      }
    });

    onChange(mergedTags);
    setDraft('');
  };

  const removeTag = (tagToRemove: string) => {
    onChange(normalizedTags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
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

  return (
    <div
      className={`tag-input${isEditing ? '' : ' tag-input--readonly'}`}
      onClick={() => {
        if (!isEditing) {
          onActivate?.();
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
              if (!isEditing) {
                onActivate?.();
                return;
              }
              onTagClick(tag);
            }}
          >
            <span className="tag-pill__label">{tag}</span>
            {isEditing ? (
              <span
                className="tag-pill__remove"
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation();
                  removeTag(tag);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    event.stopPropagation();
                    removeTag(tag);
                  }
                }}
              >
                x
              </span>
            ) : null}
          </button>
        ))}

        {isEditing ? (
          <input
            className="tag-input__field"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={commitDraft}
            onFocus={onFocus}
            placeholder={normalizedTags.length === 0 ? 'tags separated by space' : ''}
          />
        ) : normalizedTags.length === 0 ? (
          <button type="button" className="tag-input__placeholder" onClick={onActivate}>
            Add tags
          </button>
        ) : null}
      </div>

      {action ? <div className="tag-input__action">{action}</div> : null}
    </div>
  );
}
