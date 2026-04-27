import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  closeDB,
  deleteCard,
  getAllCards,
  getCardById,
  getWindowBounds,
  insertCard,
  saveWindowBounds,
  updateCard,
} from './db/dbHelper.js';
import type { Card, CardUpdate } from './shared/models/card.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;
const WINDOW_BOUNDS_SAVE_DELAY_MS = 200;

let mainWindow: BrowserWindow | null;
let windowBoundsSaveTimeout: NodeJS.Timeout | null = null;

function createDefaultCard(position: number = 1): Card | null {
  const id = insertCard({
    title: 'Untitled',
    content: '',
    tags: [],
    position,
    editorHeight: 160,
    isCollapsed: false,
  });
  return getCardById(id);
}

function getOrCreateCards(): Card[] {
  const cards = getAllCards();
  if (cards.length > 0) return cards;

  const defaultCards = [
    createDefaultCard(2),
    (() => {
      const id = insertCard({
        title: 'React Tips',
        content: '',
        tags: ['react', 'frontend'],
        position: 1,
        editorHeight: 160,
        isCollapsed: false,
      });
      return getCardById(id);
    })(),
  ].filter((card): card is Card => card !== null);

  return defaultCards;
}

function getNextCardPosition(): number {
  const cards = getAllCards();
  const maxPosition = cards.reduce((currentMax, card) => Math.max(currentMax, card.position), 0);
  return maxPosition + 1;
}

function flushWindowBounds(window: BrowserWindow): void {
  const { width, height } = window.getBounds();
  saveWindowBounds({ width, height });
}

function scheduleWindowBoundsSave(window: BrowserWindow): void {
  if (windowBoundsSaveTimeout) {
    clearTimeout(windowBoundsSaveTimeout);
  }

  windowBoundsSaveTimeout = setTimeout(() => {
    windowBoundsSaveTimeout = null;
    if (window.isDestroyed() || window.isMinimized() || window.isMaximized()) return;
    flushWindowBounds(window);
  }, WINDOW_BOUNDS_SAVE_DELAY_MS);
}

function createWindow(): void {
  const savedBounds = getWindowBounds();
  mainWindow = new BrowserWindow({
    width: savedBounds?.width ?? 1200,
    height: savedBounds?.height ?? 800,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist-renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (windowBoundsSaveTimeout) {
      clearTimeout(windowBoundsSaveTimeout);
      windowBoundsSaveTimeout = null;
    }
  });

  mainWindow.on('resize', () => {
    if (!mainWindow || mainWindow.isMinimized() || mainWindow.isMaximized()) return;
    scheduleWindowBoundsSave(mainWindow);
  });

  mainWindow.on('close', () => {
    if (!mainWindow || mainWindow.isDestroyed() || mainWindow.isMinimized() || mainWindow.isMaximized()) return;
    flushWindowBounds(mainWindow);
  });
}

ipcMain.handle('window:toggle-pin', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window) return false;

  const nextPinnedState = !window.isAlwaysOnTop();
  window.setAlwaysOnTop(nextPinnedState, nextPinnedState ? 'floating' : 'normal');

  if (nextPinnedState) {
    window.moveTop();
  }

  return window.isAlwaysOnTop();
});

ipcMain.handle('window:get-pin-state', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window) return false;
  return window.isAlwaysOnTop();
});

ipcMain.handle('cards:list', () => {
  return getOrCreateCards();
});

ipcMain.handle('cards:create', () => {
  return createDefaultCard(getNextCardPosition());
});

ipcMain.handle('cards:update', (_event, card: CardUpdate) => {
  const changes = updateCard(card);
  if (changes === 0) return null;
  return getCardById(card.id);
});

ipcMain.handle('cards:delete', (_event, id: string) => {
  deleteCard(id);
  const nextCards = getAllCards();
  return nextCards.length > 0 ? nextCards : [createDefaultCard(1)].filter((card): card is Card => card !== null);
});

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('before-quit', () => {
  closeDB();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
