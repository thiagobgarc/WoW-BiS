/**
 * URLs for the per-spec guide pages, and the full spec roster grouped by
 * class — one place so the sitemap, the /bis hub and cross-links between
 * pages can't drift apart.
 */
import { SPEC_IDS, urlSlug } from './specIds';

export function talentBuildPath(className: string, specName: string): string {
  return `/meta/${urlSlug(className)}/${urlSlug(specName)}`;
}

export function bisPath(className: string, specName: string): string {
  return `/bis/${urlSlug(className)}/${urlSlug(specName)}`;
}

export interface ClassSpecs {
  className: string;
  specs: string[];
}

/** Every class with its specs, both alphabetical. */
export function specsByClass(): ClassSpecs[] {
  const byClass = new Map<string, string[]>();
  for (const key of Object.keys(SPEC_IDS)) {
    const [className, specName] = key.split('::') as [string, string];
    byClass.set(className, [...(byClass.get(className) ?? []), specName]);
  }
  return [...byClass.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([className, specs]) => ({ className, specs: specs.sort((a, b) => a.localeCompare(b)) }));
}
