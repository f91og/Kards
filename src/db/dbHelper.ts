import Database, { type Database as DatabaseInstance } from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import {
  cardRowToModel,
  cardRowsToModels,
  type Card,
  type CardRow,
  type CardUpdate,
  type NewCard,
} from '../shared/models/card.js';

const DB_NAME = 'memcards.db';

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
    sort_order INTEGER DEFAULT 0
  );`;
  database.prepare(createStmt).run();
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
  const stmt = d.prepare(
    'INSERT INTO cards (id,title,content,tags,created_at,updated_at,is_hidden,sort_order) VALUES (?,?,?,?,?,?,?,?)',
  );
  try {
    stmt.run(
      generatedId,
      card.title,
      card.content,
      card.tags ?? '',
      createdAt,
      card.updatedAt ?? null,
      card.isHidden ? 1 : 0,
      card.sortOrder ?? 0,
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
  const stmt = d.prepare(
    'UPDATE cards SET title = ?, content = ?, tags = ?, created_at = ?, updated_at = ?, is_hidden = ?, sort_order = ? WHERE id = ?',
  );
  const info = stmt.run(
    card.title,
    card.content,
    card.tags,
    card.createdAt,
    card.updatedAt ?? null,
    card.isHidden ? 1 : 0,
    card.sortOrder,
    card.id,
  );
  return info.changes;
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
