import type { QuickWin } from '@/lib/bis/deriveActionGroups';

const ICON: Record<QuickWin['type'], string> = {
  enchant: '✨',
  socket: '💎',
  embellishment: '🔧',
};

export function QuickWinsPanel({ quickWins }: { quickWins: QuickWin[] }) {
  if (quickWins.length === 0) return null;

  return (
    <div className="rounded-xl border border-severity-close/20 bg-severity-close/5 p-4">
      <div className="text-sm font-bold mb-3">⚙️ Quick Wins <span className="text-text-dim font-normal">— free ilvl-equivalent power</span></div>
      <ul className="space-y-2">
        {quickWins.map((w, i) => (
          <li key={i} className="text-xs text-text-muted flex items-center gap-2">
            <span aria-hidden="true">{ICON[w.type]}</span>
            {w.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
