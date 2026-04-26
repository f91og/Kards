export interface CardRow {
  id: string;
  title: string;
  content: string;
  tags: string | null;
  created_at: string;
  updated_at: string | null;
  is_hidden: number;
  sort_order: number | null;
}

export interface Card {
  id: string;
  title: string;
  content: string;
  tags: string;
  createdAt: string;
  updatedAt: string | null;
  isHidden: boolean;
  sortOrder: number;
}

export type NewCard = {
  id?: string;
  title: string;
  content: string;
  tags?: string;
  createdAt?: string;
  updatedAt?: string | null;
  isHidden?: boolean;
  sortOrder?: number;
};

export type CardUpdate = Card;

export function cardRowToModel(row: CardRow | null | undefined): Card | null {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    tags: row.tags ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isHidden: Boolean(row.is_hidden),
    sortOrder: row.sort_order ?? 0,
  };
}

export function cardRowsToModels(rows: CardRow[]): Card[] {
  return rows.map((row) => cardRowToModel(row)).filter((card): card is Card => card !== null);
}
