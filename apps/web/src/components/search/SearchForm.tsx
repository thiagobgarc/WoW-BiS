import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { NameCombobox } from './NameCombobox';
import { RealmCombobox } from './RealmCombobox';
import { useRecentCharacters, type RecentCharacter } from '@/lib/hooks/useRecentCharacters';
import { realmSlug } from '@mythos/core/realm';

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
      {/* The name is the primary identifier, so it gets its own row at display
          size; realm and region are qualifiers and sit beneath it at UI size.
          The field itself is the hero of this page — there is nothing more
          characteristic of a character lookup than typing the name. */}
      <form
        className="max-w-2xl"
        onSubmit={(e) => {
          e.preventDefault();
          navigateToCharacter(name, realm, region);
        }}
      >
        <NameCombobox
          id="character-name-search"
          value={name}
          onChange={setName}
          onSelect={(c: RecentCharacter) => navigateToCharacter(c.name, c.realmName, c.region)}
          recent={recent}
        />

        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <RealmCombobox id="realm-search" region={region.toLowerCase()} value={realm} onChange={setRealm} />
          <select
            aria-label="Region"
            value={region}
            onChange={(e) => setRegion(e.target.value as (typeof REGIONS)[number])}
            className="min-h-[44px] min-w-[96px] rounded-[4px] border border-rule-strong bg-sunken px-4 text-sm text-text transition-colors duration-150 focus-visible:border-text focus-visible:outline-none"
          >
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <Button type="submit" disabled={!name.trim() || !realm.trim()} className="sm:px-8">
            Search
          </Button>
        </div>
      </form>

      {recent.length > 0 && (
        <section className="mt-12 max-w-2xl" aria-labelledby="recent-heading">
          <h2 id="recent-heading" className="label border-b border-rule pb-2 text-text-muted">
            Recently viewed
          </h2>
          {/* Ruled columns, not dot-joined pills: name, realm and region are
              three comparable fields, so they get three aligned columns. */}
          <ul>
            {recent.map((c) => (
              <li key={`${c.region}-${c.realmSlug}-${c.name}`}>
                <button
                  onClick={() => navigateToCharacter(c.name, c.realmName, c.region)}
                  className="group grid w-full min-h-[44px] grid-cols-[1fr_auto] items-center gap-x-4 gap-y-0.5 border-b border-rule py-2.5 text-left transition-colors duration-150 hover:bg-white/4 sm:grid-cols-[1fr_12rem_3rem]"
                >
                  <span className="truncate text-sm font-semibold">{c.name}</span>
                  <span className="truncate text-sm text-text-dim sm:order-2">{c.realmName}</span>
                  <span className="figure col-start-2 row-start-1 text-right text-xs text-text-dim sm:order-3 sm:col-start-auto sm:row-start-auto">
                    {c.region.toUpperCase()}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
