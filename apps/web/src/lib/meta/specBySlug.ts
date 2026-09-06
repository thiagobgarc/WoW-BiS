/** Resolves a Meta build page's URL params (e.g. "druid"/"restoration") back to real class/spec names + Blizzard spec id. */
import { SPEC_IDS, urlSlug } from './specIds';

export interface SpecRef {
  className: string;
  specName: string;
  specId: number;
}

const BY_SLUG = new Map<string, SpecRef>();
for (const [key, specId] of Object.entries(SPEC_IDS)) {
  const [className, specName] = key.split('::') as [string, string];
  BY_SLUG.set(`${urlSlug(className)}/${urlSlug(specName)}`, { className, specName, specId });
}

export function findSpecBySlug(classSlug: string, specSlug: string): SpecRef | null {
  return BY_SLUG.get(`${classSlug.toLowerCase()}/${specSlug.toLowerCase()}`) ?? null;
}
