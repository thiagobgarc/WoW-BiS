import type { DomainCharacter, EquipmentBySlot, EquipmentSlot } from '@/lib/blizzard/domain';
import type { MetaTier } from '@/lib/meta/types';
import { classColor } from '@mythos/core/utils';
import { TierBadge } from '@/components/meta/TierBadge';

const TIER_SLOTS: EquipmentSlot[] = ['head', 'shoulder', 'chest', 'hands', 'legs'];

interface Props {
  character: DomainCharacter;
  equipment: EquipmentBySlot;
  avatarUrl: string | null;
  metaTier: MetaTier | null;
}

function tierBonusLabel(count: number): string {
  if (count >= 4) return 'Tier set, 4pc active';
  if (count >= 2) return 'Tier set, 2pc active';
  return 'Tier set, no bonus yet';
}

export function CharacterHeader({ character, equipment, avatarUrl, metaTier }: Props) {
  const tierCount = TIER_SLOTS.filter((slot) => equipment[slot]?.isTierPiece).length;
  const accent = classColor(character.className);

  return (
    /* The spine carries this character's class color down the page. It is a
       3px rule rather than the gradient wash this header used to have, for
       the reason in global.css: as non-text, every one of the 13 class colors
       clears 3:1 — as a fill behind text, ten of them do not. */
    <header className="border-l-[3px] pl-6 sm:pl-10" style={{ borderColor: accent }}>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        <div
          className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[3px] border-2 bg-sunken"
          style={{ borderColor: accent }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={`${character.name}'s character render`} className="h-full w-full object-cover" />
          ) : (
            <span className="text-3xl" aria-hidden="true">
              ⚔️
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          {/* Display size is the one place the class color becomes type: at
              this scale the 3:1 large-text bar applies, which all 13 pass. */}
          <h1 className="display text-[clamp(2rem,5.5vw,3.25rem)]" style={{ color: accent }}>
            {character.name}
          </h1>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
            <p className="text-base text-text">
              {character.specName ? `${character.specName} ${character.className}` : character.className}
            </p>
            {metaTier && (
              <a href="/meta" className="inline-flex no-underline" title={`${metaTier}-tier for Mythic+ — see the full meta list`}>
                <TierBadge tier={metaTier} />
              </a>
            )}
          </div>

          <p className="mt-1 text-sm text-text-dim">
            {character.realmName}, {character.region.toUpperCase()}
          </p>
          {character.guildName && <p className="mt-0.5 text-sm text-text-dim">{character.guildName}</p>}
        </div>
      </div>

      {/* Three figures, right-aligned within their columns and set in tabular
          numerals, so they line up with every other number on the page. */}
      <dl className="mt-7 grid grid-cols-3 border-t border-rule-strong pt-4">
        <div>
          <dt className="label">Item level</dt>
          <dd className="figure mt-1 text-2xl font-bold">{character.equippedItemLevel}</dd>
        </div>
        <div>
          <dt className="label">Average</dt>
          <dd className="figure mt-1 text-2xl font-bold">{character.averageItemLevel}</dd>
        </div>
        <div>
          <dt className="label">{tierBonusLabel(tierCount)}</dt>
          <dd className="figure mt-1 text-2xl font-bold">
            {tierCount}
            <span className="text-text-dim">/5</span>
          </dd>
        </div>
      </dl>
    </header>
  );
}
