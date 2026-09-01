import type { ActionGroups } from '@/lib/bis/deriveActionGroups';

function Panel({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/8 bg-panel p-4">
      <div className="text-sm font-bold mb-3">
        <span aria-hidden="true">{icon}</span> {title}
      </div>
      <div className="space-y-0">{children}</div>
    </div>
  );
}

function Row({ count, children }: { count: string; children: React.ReactNode }) {
  return (
    <div className="text-xs py-2 border-b border-white/4 last:border-none text-text-muted">
      <span className="text-link font-semibold">{count}</span> {children}
    </div>
  );
}

export function ActionPanels({ groups }: { groups: ActionGroups }) {
  const hasAnything =
    groups.raidTargets.length || groups.dungeonTargets.length || groups.craftTargets.length || groups.catalystTargets.length;

  if (!hasAnything) {
    return (
      <div className="rounded-xl border border-severity-bis/20 bg-severity-bis/5 p-6 text-center text-sm text-text-muted">
        No upgrades found for this content type — you're fully BiS here. 🎉
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {groups.raidTargets.length > 0 && (
        <Panel title="Bosses to Prioritize" icon="📍">
          {groups.raidTargets.map((b) => (
            <Row key={`${b.boss}-${b.instance}`} count={`${b.slots.length} upgrade${b.slots.length > 1 ? 's' : ''}`}>
              {b.boss} ({b.slots.join(', ')})
            </Row>
          ))}
        </Panel>
      )}

      {groups.dungeonTargets.length > 0 && (
        <Panel title="Dungeons to Farm" icon="🗡️">
          {groups.dungeonTargets.map((d) => (
            <Row key={d.dungeon} count={`${d.slots.length} upgrade${d.slots.length > 1 ? 's' : ''}`}>
              {d.dungeon}
            </Row>
          ))}
        </Panel>
      )}

      {groups.craftTargets.length > 0 && (
        <Panel title="Craft These" icon="🔨">
          {groups.craftTargets.map((c) => (
            <Row key={c.slot} count={`${c.slot}${c.craftQuality ? ` (Q${c.craftQuality})` : ''}`}>
              {c.itemName}
            </Row>
          ))}
        </Panel>
      )}

      {groups.catalystTargets.length > 0 && (
        <Panel title="Catalyst This" icon="⚙️">
          {groups.catalystTargets.map((c) => (
            <Row key={c.slot} count={c.slot}>
              {c.itemName}
            </Row>
          ))}
        </Panel>
      )}
    </div>
  );
}
