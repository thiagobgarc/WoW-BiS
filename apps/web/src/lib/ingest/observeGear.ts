/**
 * Reads the current gear of sampled top players from Blizzard and turns it
 * into Observations for popularity.ts.
 *
 * A player is only counted while they are still in the spec they were
 * ranked as: someone ranked as Fury who has since swapped to Arms is wearing
 * Arms gear, and counting it would leak one spec's choices into another.
 */
import type { BisSlot } from '@mythos/core/bis';
import { getCharacterEquipment, getCharacterProfile } from '@/lib/blizzard/client';
import type { BlizzardEquippedItem } from '@/lib/blizzard/schemas';
import type { Observation, ObservedItem } from './popularity';
import type { SpecProfile } from './specCatalogue';
import type { TopPlayer } from './topPlayers';

const SLOT_BY_EQUIPMENT_SLOT: Record<string, BisSlot> = {
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
  FINGER_1: 'finger',
  FINGER_2: 'finger',
  TRINKET_1: 'trinket',
  TRINKET_2: 'trinket',
  MAIN_HAND: 'main_hand',
  OFF_HAND: 'off_hand',
};

/** How many players a sample is capped at. Archon-scale samples are bigger, but 30 already settles rank 1. */
export const SAMPLE_SIZE = 30;
const CONCURRENCY = 20;

/** Slots the Catalyst turns into tier look-alikes with no set bonus. */
const CATALYST_APPEARANCE_SLOTS = new Set<BisSlot>(['back', 'wrist', 'waist', 'feet']);

function toObserved(item: BlizzardEquippedItem): ObservedItem | null {
  const slot = SLOT_BY_EQUIPMENT_SLOT[item.slot.type];
  if (!slot) return null; // shirt, tabard
  const description = item.name_description?.display_string ?? '';
  return {
    slot,
    itemId: item.item.id,
    name: item.name,
    crafted: /crafted/i.test(description),
    // In Season 2 a Catalyst-converted cloak, wrist, belt or boots is a
    // class-locked tier look-alike that keeps the stats of whatever went in
    // (Method, Icy Veins). It is not itself an item to chase, and the input
    // is unknowable, so it is recognised here and not counted.
    catalystAppearance:
      CATALYST_APPEARANCE_SLOTS.has(slot) && Boolean(item.requirements?.playable_classes) && !item.set,
  };
}

async function observeOne(player: TopPlayer, spec: SpecProfile): Promise<Observation | null> {
  const key = { region: player.region, realmSlug: player.realmSlug, name: player.name };
  try {
    const { data: profile } = await getCharacterProfile(key);
    if (profile.active_spec?.name !== spec.spec) return null;
    const { data: equipment } = await getCharacterEquipment(key);
    return equipment.equipped_items.map(toObserved).filter((i): i is ObservedItem => i !== null);
  } catch {
    // Renamed, transferred, deleted or private: skip, the next player fills in.
    return null;
  }
}

/** Walks the ranked list in order until SAMPLE_SIZE players are observed. */
export async function observeGear(players: TopPlayer[], spec: SpecProfile): Promise<Observation[]> {
  const observed: Observation[] = [];
  for (let i = 0; i < players.length && observed.length < SAMPLE_SIZE; i += CONCURRENCY) {
    const batch = await Promise.all(players.slice(i, i + CONCURRENCY).map((p) => observeOne(p, spec)));
    for (const gear of batch) if (gear && observed.length < SAMPLE_SIZE) observed.push(gear);
  }
  return observed;
}
