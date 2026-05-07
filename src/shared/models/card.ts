export interface CardRow {
  id: string;
  title: string;
  content: string;
  tags: string | null;
  created_at: string;
  updated_at: string | null;
  is_hidden: number;
  sort_order: number | null;
  editor_height: number | null;
  is_collapsed: number | null;
}

export type CardContentFormat = 'html';

export interface Card {
  id: string;
  title: string;
  content: string;
  contentFormat: CardContentFormat;
  tags: string[];
  excerpt: string;
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
  position: number;
  editorHeight: number;
  isCollapsed: boolean;
}

export type NewCard = {
  id?: string;
  title: string;
  content: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  isArchived?: boolean;
  position?: number;
  editorHeight?: number;
  isCollapsed?: boolean;
};

export type CardUpdate = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  updatedAt?: string;
  isArchived: boolean;
  position: number;
  editorHeight: number;
  isCollapsed: boolean;
};

export interface WindowBoundsState {
  width: number;
  height: number;
}

const DEFAULT_EXCERPT_LENGTH = 180;

export function normalizeTag(tag: string): string {
  return tag.trim();
}

export function normalizeTagKey(tag: string): string {
  return normalizeTag(tag).toLocaleLowerCase();
}

export function normalizeTags(tags: string[]): string[] {
  return tags.map(normalizeTag).filter(Boolean);
}

export function mergeUniqueTags(existingTags: string[], nextTags: string[]): string[] {
  const mergedTags = [...normalizeTags(existingTags)];

  normalizeTags(nextTags).forEach((tag) => {
    const normalizedTagKey = normalizeTagKey(tag);
    if (!mergedTags.some((existingTag) => normalizeTagKey(existingTag) === normalizedTagKey)) {
      mergedTags.push(tag);
    }
  });

  return mergedTags;
}

export function collectUniqueTags(tagsByCard: string[][]): string[] {
  const dedupedTags = new Map<string, string>();

  tagsByCard.forEach((tags) => {
    normalizeTags(tags).forEach((tag) => {
      const normalizedTagKey = normalizeTagKey(tag);
      if (!dedupedTags.has(normalizedTagKey)) {
        dedupedTags.set(normalizedTagKey, tag);
      }
    });
  });

  return Array.from(dedupedTags.values()).sort((left, right) => left.localeCompare(right));
}

export function htmlToPlainText(content: string): string {
  return content
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function copyCardContentToClipboard(content: string): Promise<void> {
  const plainText = htmlToPlainText(content);
  if (plainText === '') return;

  try {
    await navigator.clipboard.writeText(plainText);
  } catch {
    // Ignore clipboard failures for now.
  }
}

export function parseStoredTags(tags: string | null | undefined): string[] {
  if (!tags) return [];

  try {
    const parsed = JSON.parse(tags) as unknown;
    if (Array.isArray(parsed)) {
      return normalizeTags(parsed.map((tag) => String(tag)));
    }
  } catch {
    // Fall back to legacy comma-separated tags.
  }

  return normalizeTags(tags.split(','));
}

export function serializeTags(tags: string[]): string {
  return JSON.stringify(normalizeTags(tags));
}

export function buildCardExcerpt(content: string, maxLength: number = DEFAULT_EXCERPT_LENGTH): string {
  const plainText = htmlToPlainText(content);

  if (plainText.length <= maxLength) return plainText;
  return `${plainText.slice(0, maxLength).trimEnd()}...`;
}

export function cardRowToModel(row: CardRow | null | undefined): Card | null {
  if (!row) return null;

  const tags = parseStoredTags(row.tags);
  const updatedAt = row.updated_at ?? row.created_at;

  return {
    id: row.id,
    title: row.title,
    content: row.content,
    contentFormat: 'html',
    tags,
    excerpt: buildCardExcerpt(row.content),
    createdAt: row.created_at,
    updatedAt,
    isArchived: Boolean(row.is_hidden),
    position: row.sort_order ?? 0,
    editorHeight: row.editor_height ?? 48,
    isCollapsed: Boolean(row.is_collapsed),
  };
}

export function cardRowsToModels(rows: CardRow[]): Card[] {
  return rows.map((row) => cardRowToModel(row)).filter((card): card is Card => card !== null);
}
