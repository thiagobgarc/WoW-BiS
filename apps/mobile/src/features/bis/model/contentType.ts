/**
 * The board's Raid | Mythic+ | PvP segments, and the copy for a segment
 * that has nothing behind it.
 *
 * An empty segment is the *normal* case, not an error: the seed files are
 * hand-authored per spec, and a spec seeded for raid and Mythic+ but not
 * PvP is what most of them look like. So all three segments always render
 * — a control that changes shape as you tap through it is worse than one
 * that sometimes says "nothing here yet" — and each one that is empty says
 * which season it is empty for.
 */
import { CONTENT_TYPES, type BisEntry, type ContentType } from '@mythos/core/bis';

import type { Segment } from '@/components/SegmentedControl';

const LABELS: Record<ContentType, string> = {
  raid: 'Raid',
  'mythic-plus': 'Mythic+',
  pvp: 'PvP',
};

export function contentTypeLabel(contentType: ContentType): string {
  return LABELS[contentType];
}

/**
 * Which content types the payload actually carries entries for.
 *
 * Used to hint the empty segments in the control rather than to remove
 * them: a screen reader gets "PvP, no list this season" before the tap,
 * which is the one place the information is cheap to give.
 */
export function seededContentTypes(entries: readonly BisEntry[]): Set<ContentType> {
  return new Set(entries.map((entry) => entry.contentType));
}

export function contentSegments(entries: readonly BisEntry[]): Segment<ContentType>[] {
  const seeded = seededContentTypes(entries);

  return CONTENT_TYPES.map((contentType) => ({
    id: contentType,
    label: LABELS[contentType],
    ...(seeded.has(contentType) ? {} : { accessibilityHint: 'No BiS list this season' }),
  }));
}

/**
 * The default segment: the first one with entries, so a spec seeded only
 * for Mythic+ does not open on an empty Raid board. Falls back to 'raid'
 * when nothing is seeded at all, which is the state the board replaces
 * wholesale with its not-seeded notice anyway.
 */
export function defaultContentType(entries: readonly BisEntry[]): ContentType {
  const seeded = seededContentTypes(entries);
  return CONTENT_TYPES.find((contentType) => seeded.has(contentType)) ?? 'raid';
}

export function emptyBoardMessage(contentType: ContentType, seasonName?: string): string {
  const season = seasonName ? ` for ${seasonName}` : ' this season';
  return `No ${LABELS[contentType]} BiS list has been seeded for this spec${season}.`;
}
