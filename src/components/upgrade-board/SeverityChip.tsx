import type { Severity } from '@/lib/bis/compareGear';

/**
 * Colorblind-safe by design: every severity pairs a color with a distinct
 * icon AND a text label, per the product spec — never color alone.
 */
const SEVERITY_META: Record<Severity, { label: string; icon: string; bg: string; fg: string }> = {
  bis: { label: 'BiS', icon: '✓', bg: 'bg-severity-bis/20', fg: 'text-severity-bis' },
  close: { label: 'Close', icon: '~', bg: 'bg-severity-close/20', fg: 'text-severity-close' },
  upgrade: { label: 'Upgrade', icon: '⬆', bg: 'bg-severity-upgrade/20', fg: 'text-severity-upgrade' },
  'major-gap': { label: 'Major gap', icon: '⬤', bg: 'bg-severity-gap/20', fg: 'text-severity-gap' },
};

export function SeverityChip({ severity }: { severity: Severity }) {
  const meta = SEVERITY_META[severity];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded ${meta.bg} ${meta.fg}`}>
      <span aria-hidden="true">{meta.icon}</span>
      {meta.label}
    </span>
  );
}
