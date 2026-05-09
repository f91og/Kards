import Database, { type Database as DatabaseInstance } from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import {
  serializeTags,
  cardRowToModel,
  cardRowsToModels,
  type Card,
  type CardRow,
  type CardUpdate,
  type NewCard,
  type WindowBoundsState,
} from '../shared/models/card.js';

const DB_NAME = 'memcards.db';
const DEFAULT_EDITOR_HEIGHT = 48;

let db: DatabaseInstance | null = null;

function getDbPath(): string {
  // Store DB in userData so desktop and mobile can share if user points to same file
  const userData = app.getPath('userData');
  return path.join(userData, DB_NAME);
}

export function openDB(): DatabaseInstance {
  if (db) return db;
  const dbPath = getDbPath();
  db = new Database(dbPath);
  initSchema(db);
  return db;
}

function initSchema(database: DatabaseInstance): void {
  const createStmt = `
  CREATE TABLE IF NOT EXISTS cards (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    tags TEXT,
    created_at TEXT NOT NULL UNIQUE,
    updated_at TEXT,
    is_hidden INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    editor_height INTEGER DEFAULT 48,
    is_collapsed INTEGER DEFAULT 0,
    is_content_masked INTEGER DEFAULT 0
  );`;
  const settingsStmt = `
  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );`;
  database.prepare(createStmt).run();
  database.prepare(settingsStmt).run();
  ensureColumn(database, 'cards', 'editor_height', `INTEGER DEFAULT ${DEFAULT_EDITOR_HEIGHT}`);
  ensureColumn(database, 'cards', 'is_collapsed', 'INTEGER DEFAULT 0');
  ensureColumn(database, 'cards', 'is_content_masked', 'INTEGER DEFAULT 0');
}

function ensureColumn(
  database: DatabaseInstance,
  tableName: string,
  columnName: string,
  columnDefinition: string,
): void {
  const columns = database.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{ name: string }>;
  const hasColumn = columns.some((column) => column.name === columnName);
  if (hasColumn) return;
  database.prepare(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`).run();
}

export function getAllCards(): Card[] {
  const d = openDB();
  const rows = d
    .prepare('SELECT * FROM cards ORDER BY sort_order DESC, created_at DESC')
    .all() as CardRow[];
  return cardRowsToModels(rows);
}

export function getCardsPage(
  limit: number = 20,
  offset: number = 0,
  keyword?: string | null,
): Card[] {
  const d = openDB();
  if (keyword && String(keyword).trim() !== '') {
    const like = `%${String(keyword).trim()}%`;
    const stmt = d.prepare(
      'SELECT * FROM cards WHERE title LIKE ? OR content LIKE ? OR tags LIKE ? ORDER BY sort_order DESC, created_at DESC LIMIT ? OFFSET ?',
    );
    const rows = stmt.all(like, like, like, limit, offset) as CardRow[];
    return cardRowsToModels(rows);
  }

  const stmt = d.prepare(
    'SELECT * FROM cards ORDER BY sort_order DESC, created_at DESC LIMIT ? OFFSET ?',
  );
  const rows = stmt.all(limit, offset) as CardRow[];
  return cardRowsToModels(rows);
}

export function getCardById(id: string): Card | null {
  const d = openDB();
  const row = d.prepare('SELECT * FROM cards WHERE id = ?').get(id) as CardRow | undefined;
  return cardRowToModel(row);
}

export function insertCard(card: NewCard): string {
  const d = openDB();
  const generatedId = card.id ?? uuidv4();
  const createdAt = card.createdAt ?? new Date().toISOString();
  const updatedAt = card.updatedAt ?? createdAt;
  const stmt = d.prepare(
    'INSERT INTO cards (id,title,content,tags,created_at,updated_at,is_hidden,sort_order,editor_height,is_collapsed,is_content_masked) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
  );
  try {
    stmt.run(
      generatedId,
      card.title,
      card.content,
      serializeTags(card.tags ?? []),
      createdAt,
      updatedAt,
      card.isArchived ? 1 : 0,
      card.position ?? 0,
      card.editorHeight ?? DEFAULT_EDITOR_HEIGHT,
      card.isCollapsed ? 1 : 0,
      card.isContentMasked ? 1 : 0,
    );
    return generatedId;
  } catch (e: any) {
    if (e && e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      throw new Error('创建时间冲突，请稍后再试');
    }
    throw e;
  }
}

export function updateCard(card: CardUpdate): number {
  const d = openDB();
  const existingCard = getCardById(card.id);
  if (!existingCard) return 0;
  if (card.updatedAt && card.updatedAt < existingCard.updatedAt) return 0;

  const stmt = d.prepare(
    'UPDATE cards SET title = ?, content = ?, tags = ?, created_at = ?, updated_at = ?, is_hidden = ?, sort_order = ?, editor_height = ?, is_collapsed = ?, is_content_masked = ? WHERE id = ?',
  );
  const info = stmt.run(
    card.title,
    card.content,
    serializeTags(card.tags),
    existingCard.createdAt,
    card.updatedAt ?? new Date().toISOString(),
    card.isArchived ? 1 : 0,
    card.position,
    card.editorHeight,
    card.isCollapsed ? 1 : 0,
    card.isContentMasked ? 1 : 0,
    card.id,
  );
  return info.changes;
}

export function saveWindowBounds(bounds: WindowBoundsState): void {
  const d = openDB();
  d.prepare(
    'INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  ).run('window_bounds', JSON.stringify(bounds));
}

export function getWindowBounds(): WindowBoundsState | null {
  const d = openDB();
  const row = d.prepare('SELECT value FROM app_settings WHERE key = ?').get('window_bounds') as
    | { value: string }
    | undefined;

  if (!row) return null;

  try {
    const parsed = JSON.parse(row.value) as Partial<WindowBoundsState>;
    if (typeof parsed.width === 'number' && typeof parsed.height === 'number') {
      return {
        width: parsed.width,
        height: parsed.height,
      };
    }
  } catch {
    // Ignore malformed persisted settings and fall back to defaults.
  }

  return null;
}

export function deleteCard(id: string): number {
  const d = openDB();
  const stmt = d.prepare('DELETE FROM cards WHERE id = ?');
  const info = stmt.run(id);
  return info.changes;
}

export function clearAllCards(): boolean {
  const d = openDB();
  d.prepare('DELETE FROM cards').run();
  return true;
}

export function closeDB(): void {
  if (db) {
    db.close();
    db = null;
  }
}
