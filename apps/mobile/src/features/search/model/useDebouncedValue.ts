/**
 * Trails a fast-changing value by `delay` ms.
 *
 * Only the realm autocomplete needs this — every keystroke would otherwise
 * be a request against a 60/60s rate limit, and a fast typist would spend
 * their whole budget on prefixes they never see. 150ms matches the web's
 * RealmCombobox so the two feel the same.
 *
 * It lives under features/search rather than src/lib because search is its
 * only consumer today, and src/lib is infrastructure (architecture.md
 * Section 2) rather than a place for loose helpers. Promote it when
 * something else needs it.
 */
import { useEffect, useState } from 'react';

export function useDebouncedValue<T>(value: T, delay = 150): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    // Nothing to catch up to. Without this the hook arms a timer on mount
    // and again after every value it settles on — timers that only ever set
    // the state to what it already holds. Harmless on device, but they are
    // also state updates that land after a test has finished, which is an
    // "update not wrapped in act(...)" warning on every screen test.
    if (value === debounced) return;

    const handle = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handle);
  }, [value, debounced, delay]);

  return debounced;
}
