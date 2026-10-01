import type { QuickWin } from '@mythos/core/bis';

/**
 * Enchants, gems and embellishments. The per-type emoji that used to prefix
 * each row is gone: it duplicated what the label already said, and an icon
 * font glyph with no spoken form only adds noise to a screen reader.
 */
export function QuickWinsPanel({ quickWins }: { quickWins: QuickWin[] }) {
  if (quickWins.length === 0) return null;

  return (
    <section aria-labelledby="quick-wins-heading" className="border-l-2 border-severity-close pl-5">
      <h3 id="quick-wins-heading" className="text-sm font-semibold">
        Quick wins
      </h3>
      <p className="mt-1 max-w-[60ch] text-sm text-text-muted">
        Enchants, gems and embellishments you haven't applied yet. Cheapest power on the board.
      </p>
      <ul className="mt-3">
        {quickWins.map((w, i) => (
          <li key={i} className="border-b border-rule py-2 text-sm text-text last:border-none">
            {w.label}
          </li>
        ))}
      </ul>
    </section>
  );
}
