import { app, BrowserWindow, ipcMain, screen, shell } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  closeDB,
  deleteCard,
  getCardById,
  getCardSortMode,
  getCardsPage,
  getWindowBounds,
  insertCard,
  saveCardSortMode,
  saveWindowBounds,
  updateCard,
} from './db/dbHelper.js';
import { type CardSortMode, type CardUpdate, type NewCard } from './shared/models/card.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;
const WINDOW_BOUNDS_SAVE_DELAY_MS = 200;
const DEFAULT_EDITOR_HEIGHT = 48;

let mainWindow: BrowserWindow | null;
let windowBoundsSaveTimeout: NodeJS.Timeout | null = null;

function emitWindowBoundsChanged(window: BrowserWindow): void {
  if (window.isDestroyed()) return;
  const { x, y, width, height } = window.getBounds();
  window.webContents.send('window:bounds-changed', { x, y, width, height });
}

function emitWindowFocusChanged(window: BrowserWindow): void {
  if (window.isDestroyed()) return;
  window.webContents.send('window:focus-changed', window.isFocused());
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

function isExternalNavigationUrl(url: string): boolean {
  try {
    const targetUrl = new URL(url);
    if (isDev && targetUrl.origin === 'http://localhost:5173') return false;
    if (!isDev && targetUrl.protocol === 'file:') return false;
    return ['http:', 'https:', 'mailto:'].includes(targetUrl.protocol);
  } catch {
    return false;
  }
}

function createWindow(): void {
  const savedBounds = getWindowBounds();
  mainWindow = new BrowserWindow({
    width: savedBounds?.width ?? 860,
    height: savedBounds?.height ?? 800,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.platform === 'darwin') {
    mainWindow.setWindowButtonVisibility(false);
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isExternalNavigationUrl(url)) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isExternalNavigationUrl(url)) return;
    event.preventDefault();
    void shell.openExternal(url);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow) return;
    emitWindowFocusChanged(mainWindow);
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
    emitWindowBoundsChanged(mainWindow);
    scheduleWindowBoundsSave(mainWindow);
  });

  mainWindow.on('move', () => {
    if (!mainWindow || mainWindow.isMinimized() || mainWindow.isMaximized()) return;
    emitWindowBoundsChanged(mainWindow);
  });

  mainWindow.on('focus', () => {
    if (!mainWindow) return;
    emitWindowFocusChanged(mainWindow);
  });

  mainWindow.on('blur', () => {
    if (!mainWindow) return;
    emitWindowFocusChanged(mainWindow);
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

ipcMain.handle('window:get-bounds', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window) return null;

  const { x, y, width, height } = window.getBounds();
  return { x, y, width, height };
});

ipcMain.handle('window:get-work-area', (event) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window) return null;

  const targetDisplay = screen.getDisplayMatching(window.getBounds());
  const { x, y, width, height } = targetDisplay.workArea;
  return { x, y, width, height };
});

ipcMain.handle('window:set-opacity', (event, opacity: number) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window) return 1;

  const nextOpacity = Math.min(Math.max(opacity, 0.35), 1);
  window.setOpacity(nextOpacity);
  return window.getOpacity();
});

ipcMain.handle('window:set-bounds', (event, bounds: { width: number; height: number; x?: number; y?: number }) => {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (!window) return null;

  const currentBounds = window.getBounds();
  const targetDisplay = screen.getDisplayMatching(currentBounds);
  const { x: workX, y: workY, width: workWidth, height: workHeight } = targetDisplay.workArea;
  const explicitX = bounds.x;
  const explicitY = bounds.y;
  const hasExplicitX = typeof explicitX === 'number';
  const hasExplicitY = typeof explicitY === 'number';
  const requestedX = hasExplicitX ? Math.round(explicitX) : currentBounds.x;
  const requestedY = hasExplicitY ? Math.round(explicitY) : currentBounds.y;
  const clampedX = Math.min(Math.max(requestedX, workX), workX + workWidth);
  const clampedY = Math.min(Math.max(requestedY, workY), workY + workHeight);
  const nextWidth = Math.max(1, Math.round(bounds.width));
  const nextHeight = Math.min(Math.round(bounds.height), workHeight);
  const nextX = clampedX;
  const nextY = hasExplicitY
    ? Math.min(Math.max(clampedY, workY), workY + workHeight - nextHeight)
    : clampedY;

  window.setBounds({
    x: nextX,
    y: nextY,
    width: nextWidth,
    height: nextHeight,
  });

  if (!window.isMinimized() && !window.isMaximized()) {
    scheduleWindowBoundsSave(window);
  }

  return window.getBounds();
});

ipcMain.handle('cards:list', (_event, options?: { limit?: number; offset?: number; keyword?: string | null; sortMode?: CardSortMode }) => {
  return getCardsPage(options?.limit ?? 20, options?.offset ?? 0, options?.keyword, options?.sortMode ?? 'created');
});

ipcMain.handle('settings:get-card-sort-mode', () => {
  return getCardSortMode();
});

ipcMain.handle('settings:set-card-sort-mode', (_event, sortMode: CardSortMode) => {
  const nextSortMode = sortMode === 'recent-opened' ? 'recent-opened' : 'created';
  saveCardSortMode(nextSortMode);
  return nextSortMode;
});

ipcMain.handle('cards:create', (_event, card?: NewCard) => {
  if (!card) return null;

  const id = insertCard({
    ...card,
    position: card.position ?? 0,
    editorHeight: card.editorHeight ?? DEFAULT_EDITOR_HEIGHT,
    isCollapsed: card.isCollapsed ?? false,
  });

  return getCardById(id);
});

ipcMain.handle('cards:update', (_event, card: CardUpdate) => {
  const changes = updateCard(card);
  if (changes === 0) return null;
  return getCardById(card.id);
});

ipcMain.handle('cards:delete', (_event, id: string) => {
  deleteCard(id);
  return null;
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
