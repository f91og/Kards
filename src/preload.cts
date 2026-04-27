import { contextBridge, ipcRenderer } from 'electron';
import type { Card, CardUpdate } from './shared/models/card.js';

contextBridge.exposeInMainWorld('kardsWindow', {
  togglePin: (): Promise<boolean> => ipcRenderer.invoke('window:toggle-pin') as Promise<boolean>,
  getPinState: (): Promise<boolean> => ipcRenderer.invoke('window:get-pin-state') as Promise<boolean>,
});

contextBridge.exposeInMainWorld('kardsCards', {
  list: (): Promise<Card[]> => ipcRenderer.invoke('cards:list') as Promise<Card[]>,
  create: (): Promise<Card | null> => ipcRenderer.invoke('cards:create') as Promise<Card | null>,
  update: (card: CardUpdate): Promise<Card | null> => ipcRenderer.invoke('cards:update', card) as Promise<Card | null>,
  delete: (id: string): Promise<Card[]> => ipcRenderer.invoke('cards:delete', id) as Promise<Card[]>,
});
