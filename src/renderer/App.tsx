import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/useAppStore';

export default function App() {
  const { clicks, title, increment, reset, setTitle } = useAppStore();

  return (
    <div className="min-h-screen bg-stone-950 px-6 py-10 text-stone-50">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 rounded-3xl border border-stone-800 bg-stone-900/80 p-8 shadow-2xl shadow-black/30">
        <div className="flex flex-col gap-3">
          <span className="text-xs uppercase tracking-[0.3em] text-stone-400">
            Zustand Store
          </span>
          <h1 className="text-4xl font-semibold tracking-tight">{title}</h1>
          <p className="max-w-xl text-sm text-stone-300">
            The current skeleton app now uses a single Zustand store for local UI state.
          </p>
        </div>

        <label className="flex flex-col gap-2 text-sm text-stone-300">
          App Title
          <input
            className="rounded-xl border border-stone-700 bg-stone-950 px-4 py-3 text-base text-stone-50 outline-none transition focus:border-emerald-500"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Rename the app"
          />
        </label>

        <div className="rounded-2xl border border-stone-800 bg-stone-950/80 p-5">
          <div className="text-sm text-stone-400">Button clicks</div>
          <div className="mt-2 text-5xl font-semibold text-emerald-400">{clicks}</div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={increment}>Increment</Button>
          <Button variant="outline" onClick={reset}>
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}
