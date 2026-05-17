import { contextBridge, ipcRenderer } from 'electron';
import type { Card, CardUpdate } from './shared/models/card.js';

contextBridge.exposeInMainWorld('kardsWindow', {
  togglePin: (): Promise<boolean> => ipcRenderer.invoke('window:toggle-pin') as Promise<boolean>,
  getPinState: (): Promise<boolean> => ipcRenderer.invoke('window:get-pin-state') as Promise<boolean>,
  getBounds: (): Promise<{ x: number; y: number; width: number; height: number } | null> =>
    ipcRenderer.invoke('window:get-bounds') as Promise<{ x: number; y: number; width: number; height: number } | null>,
  getWorkArea: (): Promise<{ x: number; y: number; width: number; height: number } | null> =>
    ipcRenderer.invoke('window:get-work-area') as Promise<{ x: number; y: number; width: number; height: number } | null>,
  setOpacity: (opacity: number): Promise<number> => ipcRenderer.invoke('window:set-opacity', opacity) as Promise<number>,
  setBounds: (bounds: { width: number; height: number; x?: number; y?: number }): Promise<{ x: number; y: number; width: number; height: number } | null> =>
    ipcRenderer.invoke('window:set-bounds', bounds) as Promise<{ x: number; y: number; width: number; height: number } | null>,
  onBoundsChanged: (listener: (bounds: { x: number; y: number; width: number; height: number }) => void): (() => void) => {
    const wrappedListener = (_event: unknown, bounds: { x: number; y: number; width: number; height: number }) => {
      listener(bounds);
    };
    ipcRenderer.on('window:bounds-changed', wrappedListener);
    return () => {
      ipcRenderer.removeListener('window:bounds-changed', wrappedListener);
    };
  },
});

contextBridge.exposeInMainWorld('kardsCards', {
  list: (options?: { limit?: number; offset?: number; keyword?: string | null }): Promise<Card[]> =>
    ipcRenderer.invoke('cards:list', options) as Promise<Card[]>,
  create: (): Promise<Card | null> => ipcRenderer.invoke('cards:create') as Promise<Card | null>,
  update: (card: CardUpdate): Promise<Card | null> => ipcRenderer.invoke('cards:update', card) as Promise<Card | null>,
  delete: (id: string): Promise<Card | null> => ipcRenderer.invoke('cards:delete', id) as Promise<Card | null>,
});
