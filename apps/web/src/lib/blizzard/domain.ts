/**
 * Internal domain types the rest of the app works with — decoupled from
 * Blizzard's raw response shape. `mapEquipment` etc. below are the only
 * places that translate between the two, so a Blizzard schema drift only
 * ever requires editing this file.
 *
 * The output *types* live in packages/core — see docs/architecture.md
 * Section 1 — and are re-exported here so every existing
 * `@/lib/blizzard/domain` import in this app keeps working unchanged.
 * Phase 2 moved the character/equipment types; Phase 3 moved the talent-tree
 * and progression types too, once `/v1/character/...` needed them in
 * packages/api-contract.
 *
 * The mapper functions below that *produce* these shapes from Blizzard's raw
 * response stay here: they consume `./schemas` types, which are
 * Blizzard-specific and must not end up in packages/core (a candidate for
 * bundling into the mobile binary — packages/core never depends on anything
 * Blizzard-shaped).
 */
import type {
  BlizzardEquippedItem,
  CharacterEquipment,
  CharacterProfile,
  CharacterRaids,
  CharacterSpecializations,
  CharacterStatistics,
  MythicKeystoneProfileIndex,
  MythicKeystoneSeason,
  TalentNode,
  TalentTree,
} from './schemas';
import {
  EQUIPMENT_SLOTS,
  type EquipmentSlot,
  type DomainItemStat,
  type DomainItemSet,
  type DomainItem,
  type EquippedSlotEmpty,
  type EquippedSlot,
  type EquipmentBySlot,
  type DomainCharacter,
  type SecondaryStats,
} from '@mythos/core/character';
import {
  type TalentSelection,
  type TalentOption,
  type DomainTalentNode,
  type DomainHeroTree,
  type DomainTalentTree,
} from '@mythos/core/talents';
import {
  RAID_DIFFICULTIES,
  type RaidDifficulty,
  type DomainBossKill,
  type DomainRaidDifficultyProgress,
  type DomainRaidProgress,
  type DomainMythicPlusRun,
  type DomainDungeonProgress,
  type DomainMythicPlusProfile,
} from '@mythos/core/progression';
import { upgradeTrackFor } from '@/lib/season/upgradeTrack';

export {
  EQUIPMENT_SLOTS,
  RAID_DIFFICULTIES,
  type EquipmentSlot,
  type DomainItemStat,
  type DomainItemSet,
  type DomainItem,
  type EquippedSlotEmpty,
  type EquippedSlot,
  type EquipmentBySlot,
  type DomainCharacter,
  type SecondaryStats,
  type TalentSelection,
  type TalentOption,
  type DomainTalentNode,
  type DomainHeroTree,
  type DomainTalentTree,
  type RaidDifficulty,
  type DomainBossKill,
  type DomainRaidDifficultyProgress,
  type DomainRaidProgress,
  type DomainMythicPlusRun,
  type DomainDungeonProgress,
  type DomainMythicPlusProfile,
};

const SLOT_TYPE_MAP: Record<string, EquipmentSlot> = {
  HEAD: 'head',
  NECK: 'neck',
  SHOULDER: 'shoulder',
  BACK: 'back',
  CHEST: 'chest',
  WRIST: 'wrist',
  HANDS: 'hands',
  WAIST: 'waist',
  LEGS: 'legs',
  FEET: 'feet',
  FINGER_1: 'finger_1',
  FINGER_2: 'finger_2',
  TRINKET_1: 'trinket_1',
  TRINKET_2: 'trinket_2',
  MAIN_HAND: 'main_hand',
  OFF_HAND: 'off_hand',
};

export function mapProfile(raw: CharacterProfile, region: string): DomainCharacter {
  return {
    name: raw.name,
    realmSlug: raw.realm.slug,
    realmName: raw.realm.name,
    region,
    className: raw.character_class.name,
    classSlug: raw.character_class.name.toLowerCase().replace(/\s+/g, '-'),
    specName: raw.active_spec?.name ?? null,
    specId: raw.active_spec?.id ?? null,
    faction: raw.faction.name,
    guildName: raw.guild?.name ?? null,
    level: raw.level,
    averageItemLevel: raw.average_item_level,
    equippedItemLevel: raw.equipped_item_level,
    lastLoginTimestamp: raw.last_login_timestamp ?? null,
  };
}

/** Blizzard's {r,g,b,a} tooltip color, verbatim — matches in-game exactly. */
function cssColor(color: { r: number; g: number; b: number; a: number } | undefined): string {
  if (!color) return 'inherit';
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a})`;
}

/**
 * Removes the game's inline texture tags, e.g. the crafting-quality icon a
 * profession enchant ends with ("|A:Professions-ChatIcon-Quality-Tier3:20:20|a"),
 * which Blizzard leaves in display strings and the client renders as an icon.
 */
export function stripAtlasMarkup(text: string | undefined): string {
  return (text ?? '').replace(/\|A:[^|]*\|a/g, '').trim();
}

function mapOneItem(raw: BlizzardEquippedItem, iconUrl: string | null): DomainItem | null {
  const slot = SLOT_TYPE_MAP[raw.slot.type];
  if (!slot) return null; // shirt/tabard/ranged — not part of the BiS comparison

  // "Miscellaneous" is Blizzard's subclass for rings/necks/trinkets/etc. — in
  // game those don't get an armor-type label next to the slot name, only
  // actual armor pieces (cloth/leather/mail/plate) do.
  const armorTypeLabel =
    raw.armor && raw.item_subclass && raw.item_subclass.name !== 'Miscellaneous' ? raw.item_subclass.name : null;

  const setItems = raw.set?.items ?? [];

  return {
    slot,
    itemId: raw.item.id,
    name: raw.name,
    quality: raw.quality.type.toLowerCase(),
    itemLevel: raw.level.value,
    iconUrl,
    isTierPiece: Boolean(raw.set),
    isEmbellishment: Boolean(raw.is_embellishment),
    sockets: (raw.sockets ?? []).map((s) => ({
      filled: Boolean(s.item),
      gemName: s.item?.name,
    })),
    enchantText: stripAtlasMarkup(raw.enchantments?.[0]?.display_string) || null,
    wowheadUrl: `https://www.wowhead.com/item=${raw.item.id}`,
    bindingText: raw.binding?.name ?? null,
    armorTypeLabel,
    armorLine: raw.armor
      ? { text: raw.armor.display?.display_string ?? `${raw.armor.value} Armor`, color: cssColor(raw.armor.display?.color) }
      : null,
    weaponLines: raw.weapon
      ? [raw.weapon.damage?.display_string, raw.weapon.attack_speed?.display_string, raw.weapon.dps?.display_string].filter(
          (s): s is string => Boolean(s),
        )
      : [],
    stats: (raw.stats ?? [])
      .filter((s) => s.display)
      .map((s) => ({ text: s.display!.display_string, color: cssColor(s.display!.color) })),
    procs: (raw.spells ?? []).map((s) => s.description?.trim()).filter((s): s is string => Boolean(s)),
    requiredLevelText: raw.requirements?.level?.display_string ?? null,
    classesText: raw.requirements?.playable_classes?.display_string ?? null,
    upgradeTrack: upgradeTrackFor(raw.bonus_list),
    setInfo: raw.set
      ? {
          name: raw.set.item_set.name,
          ownedCount: setItems.filter((i) => i.is_equipped).length,
          totalCount: setItems.length,
          effects: (raw.set.effects ?? []).map((e) => ({
            text: e.display_string.replace(/\r\n/g, ' ').trim(),
            requiredCount: e.required_count,
            active: Boolean(e.is_active),
          })),
        }
      : null,
  };
}

/**
 * Maps raw equipment to a slot -> item lookup. `iconUrls` is a pre-fetched
 * map of itemId -> media URL, since icons come from a separate endpoint
 * per item (see client.ts's batched media fetch). (EquipmentBySlot itself
 * is imported/re-exported at the top of this file — see this file's header.)
 */
export function mapEquipment(raw: CharacterEquipment, iconUrls: Map<number, string>): EquipmentBySlot {
  const result: EquipmentBySlot = {};
  for (const item of raw.equipped_items) {
    const mapped = mapOneItem(item, iconUrls.get(item.item.id) ?? null);
    if (mapped) result[mapped.slot] = mapped;
  }
  return result;
}

function ratingToPercent(rating: number): number {
  // Retail-era approximation: ~2200 rating per 32% at level 80 content.
  // Only used for versatility, which the API doesn't return a `value` for.
  return Math.round((rating / 2200) * 32 * 10) / 10;
}

export function mapStatistics(raw: CharacterStatistics): SecondaryStats {
  const zero = { rating_normalized: 0, value: 0 };
  const haste = raw.melee_haste ?? raw.spell_haste ?? raw.ranged_haste ?? zero;
  const crit = raw.melee_crit ?? raw.spell_crit ?? raw.ranged_crit ?? zero;
  const mastery = raw.mastery ?? zero;
  const versatility = raw.versatility ?? 0;
  const versatilityPercent = raw.versatility_damage_done_bonus ?? ratingToPercent(versatility);

  return {
    haste: { rating: haste.rating_normalized, percent: Math.round(haste.value * 10) / 10 },
    crit: { rating: crit.rating_normalized, percent: Math.round(crit.value * 10) / 10 },
    mastery: { rating: mastery.rating_normalized, percent: Math.round(mastery.value * 10) / 10 },
    versatility: { rating: versatility, percent: Math.round(versatilityPercent * 10) / 10 },
  };
}

// --- Talent trees -------------------------------------------------------

function mapTalentNode(raw: TalentNode, iconUrls: Map<number, string>): DomainTalentNode {
  const lastRank = raw.ranks[raw.ranks.length - 1];
  const rawOptions = lastRank?.choice_of_tooltips ?? (lastRank?.tooltip ? [lastRank.tooltip] : []);

  return {
    id: raw.id,
    type: raw.node_type.type.toLowerCase() as DomainTalentNode['type'],
    row: raw.display_row,
    col: raw.display_col,
    maxRank: lastRank?.rank ?? 1,
    prerequisiteIds: raw.locked_by ?? [],
    options: rawOptions.map((opt) => {
      const spellId = opt.spell_tooltip?.spell.id ?? null;
      return {
        talentId: opt.talent.id,
        name: opt.talent.name,
        spellId,
        description: opt.spell_tooltip?.description ?? undefined,
        iconUrl: spellId !== null ? (iconUrls.get(spellId) ?? null) : null,
      };
    }),
  };
}

/**
 * `iconUrls` is keyed by spellId, pre-fetched in a batch (see
 * getCharacterTalents.ts). `specId` drops hero subtrees this spec can't
 * pick (Blizzard bundles the whole class's hero subtrees regardless of
 * spec) and strips every hero subtree's node ids back out of the class and
 * spec node lists. Blizzard embeds them there a second time: the spec list
 * carries every hero subtree's nodes, playable or not (a Havoc tree came
 * back with 56 of them), and the class list sometimes carries one too, far
 * off to the side of the real grid (verified against live API data).
 */
export function mapTalentTree(raw: TalentTree, iconUrls: Map<number, string>, specId: number): DomainTalentTree {
  // A node with no ranks has no talent to show (see TalentNodeSchema).
  const real = (nodes: TalentNode[]) => nodes.filter((n) => n.ranks.length > 0);
  const allHeroNodeIds = new Set((raw.hero_talent_trees ?? []).flatMap((h) => h.hero_talent_nodes.map((n) => n.id)));
  const notHero = (nodes: TalentNode[]) => real(nodes).filter((n) => !allHeroNodeIds.has(n.id));
  const heroTrees = (raw.hero_talent_trees ?? [])
    .filter((h) => !h.playable_specializations || h.playable_specializations.some((s) => s.id === specId))
    .map((h) => ({
      id: h.id,
      name: h.name,
      nodes: real(h.hero_talent_nodes).map((n) => mapTalentNode(n, iconUrls)),
    }));

  return {
    classNodes: notHero(raw.class_talent_nodes).map((n) => mapTalentNode(n, iconUrls)),
    specNodes: notHero(raw.spec_talent_nodes).map((n) => mapTalentNode(n, iconUrls)),
    heroTrees,
  };
}

export interface CurrentTalentBuild {
  /** Class + spec selections combined, as before. */
  selections: TalentSelection[];
  /** Which of `tree.heroTrees` this character picked, or null if none
   * selected yet (e.g. too low level for hero talents). */
  heroTree: DomainHeroTree | null;
  heroSelections: TalentSelection[];
}

/**
 * Reads the character's current talent build for the given spec. Returns
 * null when the character has no active loadout for that spec at all (e.g.
 * very low level, never opened the talent UI) — a real case, not an error.
 * `tree` is used to resolve which side of a CHOICE node was picked: the
 * Specializations API tells us the specific talent id chosen (via
 * `tooltip.talent.id`) but not its index into the node's option list, so we
 * look it up against the tree's node data.
 */
export function mapTalentSelections(raw: CharacterSpecializations, specId: number, tree: DomainTalentTree): CurrentTalentBuild | null {
  const spec = raw.specializations.find((s) => s.specialization.id === specId);
  const loadout = spec?.loadouts?.find((l) => l.is_active);
  if (!loadout) return null;

  const allNodes = [...tree.classNodes, ...tree.specNodes, ...tree.heroTrees.flatMap((h) => h.nodes)];
  const nodesById = new Map(allNodes.map((n) => [n.id, n]));

  const fromList = (list: { id: number; rank?: number; tooltip?: { talent: { id: number } } }[] | undefined) =>
    (list ?? []).map((t) => {
      const node = nodesById.get(t.id);
      const optionIndex = t.tooltip ? (node?.options.findIndex((o) => o.talentId === t.tooltip!.talent.id) ?? 0) : 0;
      return { nodeId: t.id, rank: t.rank ?? 1, optionIndex: Math.max(0, optionIndex) };
    });

  const selections = [...fromList(loadout.selected_class_talents), ...fromList(loadout.selected_spec_talents)];
  const heroSelections = fromList(loadout.selected_hero_talents);
  const heroTreeId = loadout.selected_hero_talent_tree?.id;
  const heroTree = heroTreeId !== undefined ? (tree.heroTrees.find((h) => h.id === heroTreeId) ?? null) : null;

  if (selections.length === 0 && heroSelections.length === 0) return null;
  return { selections, heroTree, heroSelections };
}

// --- Raid progression -----------------------------------------------------

/**
 * Builds this season's raid progress from the raw encounters/raids payload,
 * scoped to `raidName` (this app only shows the current season's raid, not
 * the character's whole raiding history) and ordered by `bossOrder` (kill
 * order, from seasonConfig) rather than whatever order Blizzard returns.
 * Always returns all four modern difficulties and the full boss list, even
 * for difficulties/bosses the character has no kills on yet — an empty
 * progress state is a real, common thing to render, not an absence of data.
 */
export function mapRaidProgress(raw: CharacterRaids, raidName: string, bossOrder: string[]): DomainRaidProgress {
  const instance = raw.expansions.flatMap((e) => e.instances).find((i) => i.instance.name === raidName);
  const modesByType = new Map((instance?.modes ?? []).map((m) => [m.difficulty.type, m]));

  const difficulties = RAID_DIFFICULTIES.map(({ type, label }) => {
    const mode = modesByType.get(type);
    const encountersByName = new Map((mode?.progress.encounters ?? []).map((e) => [e.encounter.name, e]));

    const bosses: DomainBossKill[] = bossOrder.map((name) => {
      const encounter = encountersByName.get(name);
      const killCount = encounter?.completed_count ?? 0;
      return {
        name,
        killed: killCount > 0,
        killCount,
        lastKillTimestamp: encounter?.last_kill_timestamp ?? null,
      };
    });

    return {
      difficulty: type,
      label,
      killed: bosses.filter((b) => b.killed).length,
      total: bossOrder.length,
      bosses,
    };
  });

  return { instanceName: raidName, difficulties };
}

// --- Mythic+ progression ----------------------------------------------

/**
 * `season` is null when the character has no Mythic+ runs at all this
 * season (Blizzard 404s that endpoint rather than returning an empty
 * array — see client.ts) — a real, common case, not an error.
 */
export function mapMythicPlusProfile(
  index: MythicKeystoneProfileIndex,
  season: MythicKeystoneSeason | null,
  dungeonOrder: string[],
): DomainMythicPlusProfile {
  const rating = season?.mythic_rating?.rating ?? index.current_mythic_rating?.rating ?? null;
  const bestRunByDungeon = new Map((season?.best_runs ?? []).map((r) => [r.dungeon.name, r]));

  const dungeons: DomainDungeonProgress[] = dungeonOrder.map((name) => {
    const run = bestRunByDungeon.get(name);
    if (!run) return { dungeon: name, run: null };
    return {
      dungeon: name,
      run: {
        level: run.keystone_level,
        timed: run.is_completed_within_time,
        score: run.mythic_rating?.rating ?? null,
        durationMs: run.duration,
        completedAt: run.completed_timestamp,
      },
    };
  });

  return { rating, dungeons };
}
