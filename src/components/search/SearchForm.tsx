import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { RealmCombobox } from './RealmCombobox';
import { useRecentCharacters } from '@/lib/hooks/useRecentCharacters';
import { realmSlug } from '@/lib/realmSlug';

const REGIONS = ['US', 'EU', 'KR', 'TW'] as const;

export function SearchForm() {
  const [name, setName] = useState('');
  const [realm, setRealm] = useState('');
  const [region, setRegion] = useState<(typeof REGIONS)[number]>('US');
  const { recent, addRecent } = useRecentCharacters();

  function navigateToCharacter(charName: string, realmName: string, regionCode: string) {
    if (!charName.trim() || !realmName.trim()) return;
    addRecent({ name: charName.trim(), realmName: realmName.trim(), realmSlug: realmSlug(realmName), region: regionCode.toLowerCase() });
    window.location.href = `/character/${regionCode.toLowerCase()}/${realmSlug(realmName)}/${encodeURIComponent(charName.trim().toLowerCase())}`;
  }

  return (
    <div>
      <form
        className="flex flex-col sm:flex-row gap-3 mb-6"
        onSubmit={(e) => {
          e.preventDefault();
          navigateToCharacter(name, realm, region);
        }}
      >
        <Input
          aria-label="Character name"
          placeholder="Character name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1"
        />
        <select
          aria-label="Region"
          value={region}
          onChange={(e) => setRegion(e.target.value as (typeof REGIONS)[number])}
          className="h-11 rounded-md border border-white/12 bg-panel px-4 text-sm text-text min-w-[100px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {REGIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <RealmCombobox id="realm-search" region={region.toLowerCase()} value={realm} onChange={setRealm} />
        <Button type="submit" disabled={!name.trim() || !realm.trim()}>
          Search
        </Button>
      </form>

      {recent.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-text-dim uppercase tracking-wide mb-3">Recently viewed</div>
          <div className="flex gap-2 flex-wrap">
            {recent.map((c) => (
              <button
                key={`${c.region}-${c.realmSlug}-${c.name}`}
                onClick={() => navigateToCharacter(c.name, c.realmName, c.region)}
                className="px-3 py-2 rounded-md bg-accent-soft border border-accent/30 text-sm text-text hover:bg-accent/25 transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {c.name} • {c.realmName} • {c.region.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
