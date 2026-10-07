import type { Severity } from '@mythos/core/bis';

/**
 * Colorblind-safe by design: every severity pairs a color with a distinct
 * icon AND a text label, per the product spec — never color alone. All four
 * values clear 6.2:1 as text on both the ground and raised surfaces, so the
 * label can carry the color directly and the tinted pill it used to sit in
 * is gone — one less box.
 */
const SEVERITY_META: Record<Severity, { label: string; icon: string; fg: string }> = {
  bis: { label: 'Best in slot', icon: '✓', fg: 'text-severity-bis' },
  close: { label: 'Close', icon: '~', fg: 'text-severity-close' },
  upgrade: { label: 'Upgrade', icon: '⬆', fg: 'text-severity-upgrade' },
  'major-gap': { label: 'Major gap', icon: '⬤', fg: 'text-severity-gap' },
};

/**
 * `upgradable` marks a row where the player already has the BiS item, just
 * not its best copy: the color still says how far off it is, but "Upgrade"
 * would read as "go get a different item".
 */
export function SeverityChip({ severity, upgradable = false }: { severity: Severity; upgradable?: boolean }) {
  const meta = SEVERITY_META[severity];
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold [font-stretch:92%] ${meta.fg}`}>
      <span aria-hidden="true">{upgradable ? '⬆' : meta.icon}</span>
      {upgradable ? 'Upgradable' : meta.label}
    </span>
  );
}

export const SEVERITY_RULE: Record<Severity, string> = {
  bis: 'bg-severity-bis',
  close: 'bg-severity-close',
  upgrade: 'bg-severity-upgrade',
  'major-gap': 'bg-severity-gap',
};
