/**
 * Paper-doll slot ordering and the labels the tiles announce.
 *
 * The order is `apps/web`'s `PaperDoll` SLOT_ORDER verbatim, not
 * `EQUIPMENT_SLOTS` from `@mythos/core/character` — that list is the
 * contract's canonical set (and its order is Blizzard's), while this one is
 * the reading order a person expects: armor top-to-bottom, then the
 * accessories, then weapons. Two lists with different jobs; keeping them
 * separate is why the tile grid can be re-ordered without touching a schema.
 */
import { EQUIPMENT_SLOTS, type DomainItem, type EquipmentSlot } from '@mythos/core/character';
import { slotLabel } from '@mythos/core/utils';

export const PAPER_DOLL_SLOTS = [
  'head',
  'neck',
  'shoulder',
  'chest',
  'waist',
  'legs',
  'feet',
  'wrist',
  'hands',
  'finger_1',
  'finger_2',
  'trinket_1',
  'trinket_2',
  'back',
  'main_hand',
  'off_hand',
] as const satisfies readonly EquipmentSlot[];

/**
 * Guards the list above against a slot being added to the contract and
 * silently never rendering. Called by the unit test rather than at module
 * load: a mismatch is a build-time authoring mistake, not something a
 * running app should throw over.
 */
export function missingFromPaperDoll(): EquipmentSlot[] {
  const rendered = new Set<string>(PAPER_DOLL_SLOTS);
  return EQUIPMENT_SLOTS.filter((slot) => !rendered.has(slot));
}

/**
 * What a screen reader reads for one tile.
 *
 * Everything the tile shows visually has to be in here, because the visual
 * tile leans on position and color: the socket chips are colored, and the
 * quality is carried by the icon's border, which announces as nothing at
 * all. Sockets are spelled out for the same reason the web spells them out
 * in text — an empty socket is a to-do item, and a to-do item that only
 * exists as a yellow chip is invisible to half the people using this.
 */
export function slotTileLabel(slot: EquipmentSlot, item: DomainItem | null): string {
  if (!item) return `${slotLabel(slot)}: empty`;

  const parts = [`${slotLabel(slot)}: ${item.name}`, `item level ${item.itemLevel}`];
  if (item.isTierPiece) parts.push('tier piece');
  if (item.isEmbellishment) parts.push('embellished');

  const emptySockets = item.sockets.filter((socket) => !socket.filled).length;
  if (emptySockets > 0) {
    parts.push(`${emptySockets} empty socket${emptySockets === 1 ? '' : 's'}`);
  }

  return parts.join(', ');
}
