/**
 * Decoder for WoW's in-game talent loadout export string — the one the
 * talent UI's Export button produces and every guide site publishes.
 *
 * Bit packing is Blizzard's ExportUtil (Blizzard_SharedXMLBase/ExportUtil.lua):
 * standard base64 alphabet, 6 bits per character, values read LSB-first and
 * free to span characters. Layout (version 2):
 *
 *   version 8 | specId 16 | tree hash 128
 *   then, for every node of the class's trait tree in serialization order:
 *     selected 1
 *     if selected: purchased 1       (0 = granted free by the game)
 *       if purchased: partiallyRanked 1, [ranks 6]
 *                     choiceNode 1, [choiceIndex 2]
 *
 * The serialization order is the whole class tree — every spec's nodes plus
 * hero and sub-tree selection nodes — which no Blizzard endpoint publishes,
 * so callers pass it in (Raidbots' talents.json `fullNodeOrder`). A wrong
 * order shows up as misalignment: leftover bits or nonzero padding, which
 * this reports rather than hides.
 */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export interface LoadoutPick {
  nodeId: number;
  /** False for nodes the game grants for free (entry nodes). */
  purchased: boolean;
  /** Set only when the node was partially ranked; otherwise the node is at max rank. */
  partialRank: number | null;
  /** Set only for choice nodes; index into the node's options in client order. */
  choiceIndex: number | null;
}

export interface DecodedLoadout {
  version: number;
  specId: number;
  picks: LoadoutPick[];
  /** Bits left after the last node; the encoder pads to a whole character, so this is < 6 when aligned. */
  leftoverBits: number;
  /** Whether those leftover bits are all zero, as real padding is. */
  paddingClean: boolean;
}

export class LoadoutDecodeError extends Error {}

function bitReader(str: string) {
  const values = Array.from(str, (ch) => {
    const v = ALPHABET.indexOf(ch);
    if (v < 0) throw new LoadoutDecodeError(`invalid character "${ch}" in export string`);
    return v;
  });
  const total = values.length * 6;
  let pos = 0;
  return {
    read(width: number): number {
      if (pos + width > total) throw new LoadoutDecodeError('export string ended before every node was read');
      let out = 0;
      for (let i = 0; i < width; i++, pos++) {
        out |= ((values[Math.floor(pos / 6)]! >> (pos % 6)) & 1) << i;
      }
      return out;
    },
    remaining: () => total - pos,
  };
}

/** Reads just the header, e.g. to find which spec's node order to decode with. */
export function readLoadoutHeader(str: string): { version: number; specId: number } {
  const r = bitReader(str.trim());
  return { version: r.read(8), specId: r.read(16) };
}

export function decodeLoadout(str: string, fullNodeOrder: readonly number[]): DecodedLoadout {
  const r = bitReader(str.trim());
  const version = r.read(8);
  if (version !== 2) throw new LoadoutDecodeError(`unsupported export string version ${version}`);
  const specId = r.read(16);
  for (let i = 0; i < 16; i++) r.read(8); // tree hash — the client tolerates a zeroed one, and so do we

  const picks: LoadoutPick[] = [];
  for (const nodeId of fullNodeOrder) {
    if (!r.read(1)) continue;
    const purchased = r.read(1) === 1;
    let partialRank: number | null = null;
    let choiceIndex: number | null = null;
    if (purchased) {
      if (r.read(1)) partialRank = r.read(6);
      if (r.read(1)) choiceIndex = r.read(2);
    }
    picks.push({ nodeId, purchased, partialRank, choiceIndex });
  }

  const leftoverBits = r.remaining();
  const paddingClean = leftoverBits < 6 && r.read(leftoverBits) === 0;
  return { version, specId, picks, leftoverBits, paddingClean };
}
