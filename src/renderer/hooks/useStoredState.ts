import { useEffect, useState } from 'react';

type UseStoredStateOptions<T> = {
  deserialize?: (rawValue: string) => T;
  serialize?: (value: T) => string;
};

export function useStoredState<T>(
  key: string,
  fallback: T,
  options: UseStoredStateOptions<T> = {},
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const { deserialize, serialize } = options;

  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return fallback;

    const rawStoredValue = window.localStorage.getItem(key);
    if (rawStoredValue === null) return fallback;

    try {
      return deserialize ? deserialize(rawStoredValue) : (JSON.parse(rawStoredValue) as T);
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    const nextValue = serialize ? serialize(value) : JSON.stringify(value);
    window.localStorage.setItem(key, nextValue);
  }, [key, serialize, value]);

  return [value, setValue];
}
