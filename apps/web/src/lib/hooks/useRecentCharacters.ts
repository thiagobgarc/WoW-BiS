import { useCallback, useEffect, useState } from 'react';

export interface RecentCharacter {
  name: string;
  realmName: string;
  realmSlug: string;
  region: string;
}

const STORAGE_KEY = 'mythos:recent-characters';
const MAX_RECENT = 8;

function readStorage(): RecentCharacter[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useRecentCharacters() {
  const [recent, setRecent] = useState<RecentCharacter[]>([]);

  useEffect(() => {
    setRecent(readStorage());
  }, []);

  const addRecent = useCallback((entry: RecentCharacter) => {
    setRecent((prev) => {
      const deduped = prev.filter(
        (c) => !(c.name === entry.name && c.realmSlug === entry.realmSlug && c.region === entry.region),
      );
      const next = [entry, ...deduped].slice(0, MAX_RECENT);
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // storage full/unavailable — recent chips are a convenience, not critical
      }
      return next;
    });
  }, []);

  return { recent, addRecent };
}
