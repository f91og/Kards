import { create } from 'zustand';

type AppState = {
  clicks: number;
  title: string;
  increment: () => void;
  reset: () => void;
  setTitle: (title: string) => void;
};

export const useAppStore = create<AppState>((set) => ({
  clicks: 0,
  title: 'electron-skeleton',
  increment: () => set((state) => ({ clicks: state.clicks + 1 })),
  reset: () => set({ clicks: 0 }),
  setTitle: (title) => set({ title }),
}));
