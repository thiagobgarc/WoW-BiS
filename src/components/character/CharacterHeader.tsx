import type { DomainCharacter, EquipmentBySlot, EquipmentSlot } from '@/lib/blizzard/domain';
import { classColor } from '@/lib/utils/classColors';

const TIER_SLOTS: EquipmentSlot[] = ['head', 'shoulder', 'chest', 'hands', 'legs'];

interface Props {
  character: DomainCharacter;
  equipment: EquipmentBySlot;
  avatarUrl: string | null;
}

function tierBonusLabel(count: number): string {
  if (count >= 4) return '4pc active';
  if (count >= 2) return '2pc active';
  return 'no bonus active';
}

export function CharacterHeader({ character, equipment, avatarUrl }: Props) {
  const tierCount = TIER_SLOTS.filter((slot) => equipment[slot]?.isTierPiece).length;
  const accent = classColor(character.className);

  return (
    <div
      className="flex flex-col sm:flex-row gap-6 items-start p-5 rounded-xl border"
      style={{
        background: `linear-gradient(135deg, ${accent}14 0%, rgba(10,14,39,0.5) 100%)`,
        borderColor: `${accent}26`,
      }}
    >
      <div className="w-28 h-28 rounded-lg border-2 shrink-0 bg-panel flex items-center justify-center overflow-hidden" style={{ borderColor: accent }}>
        {avatarUrl ? (
          <img src={avatarUrl} alt={`${character.name}'s character render`} className="w-full h-full object-cover" />
        ) : (
          <span className="text-4xl" aria-hidden="true">⚔️</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h1 className="text-2xl font-bold mb-1" style={{ color: accent }}>
          {character.name}
        </h1>
        <div className="text-sm text-text-muted">
          {character.specName ? `${character.specName} ` : ''}
          {character.className} • {character.realmName} ({character.region.toUpperCase()})
        </div>
        {character.guildName && <div className="text-sm text-text-muted mt-1">Guild: {character.guildName}</div>}

        <div className="flex flex-wrap gap-4 mt-3 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-text-muted">iLvl (equipped):</span>
            <span className="px-2 py-0.5 rounded bg-white/8 text-link font-semibold">{character.equippedItemLevel}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-text-muted">Avg iLvl:</span>
            <span className="px-2 py-0.5 rounded bg-white/8 text-link font-semibold">{character.averageItemLevel}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-text-muted">Tier set:</span>
            <span className="px-2 py-0.5 rounded bg-white/8 text-link font-semibold">
              {tierCount}/5 pieces — {tierBonusLabel(tierCount)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
