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

export function parseStoredTags(tags: string | null | undefined): string[] {
  if (!tags) return [];

  try {
    const parsed = JSON.parse(tags) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((tag) => String(tag).trim()).filter(Boolean);
    }
  } catch {
    // Fall back to legacy comma-separated tags.
  }

  return tags
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function serializeTags(tags: string[]): string {
  return JSON.stringify(tags.map((tag) => tag.trim()).filter(Boolean));
}

export function buildCardExcerpt(content: string, maxLength: number = DEFAULT_EXCERPT_LENGTH): string {
  const plainText = content
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

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
    editorHeight: row.editor_height ?? 160,
    isCollapsed: Boolean(row.is_collapsed),
  };
}

export function cardRowsToModels(rows: CardRow[]): Card[] {
  return rows.map((row) => cardRowToModel(row)).filter((card): card is Card => card !== null);
}
