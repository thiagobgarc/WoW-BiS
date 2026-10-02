import type { ActionGroups } from '@mythos/core/bis';

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="border-b border-rule-strong pb-2 text-sm font-semibold">{title}</h3>
      <ul>{children}</ul>
    </section>
  );
}

/** The count sits in its own right-aligned column, like every other figure. */
function Row({ count, children }: { count: string; children: React.ReactNode }) {
  return (
    <li className="flex items-baseline justify-between gap-4 border-b border-rule py-2 text-sm last:border-none">
      <span className="min-w-0 text-text">{children}</span>
      <span className="figure shrink-0 text-xs text-text-dim">{count}</span>
    </li>
  );
}

export function ActionPanels({ groups }: { groups: ActionGroups }) {
  const hasAnything =
    groups.raidTargets.length || groups.dungeonTargets.length || groups.craftTargets.length || groups.catalystTargets.length;

  if (!hasAnything) {
    return (
      <div className="border-l-2 border-severity-bis pl-5">
        <p className="text-sm font-semibold">Nothing left to chase here.</p>
        <p className="mt-1 text-sm text-text-muted">Every slot is at best in slot for this content type.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-x-12 gap-y-10 md:grid-cols-2">
      {groups.raidTargets.length > 0 && (
        <Group title="Bosses worth prioritising">
          {groups.raidTargets.map((b) => (
            <Row key={`${b.boss}-${b.instance}`} count={`${b.slots.length} upgrade${b.slots.length > 1 ? 's' : ''}`}>
              <span className="font-medium">{b.boss}</span>
              <span className="text-text-dim"> {b.slots.join(', ')}</span>
            </Row>
          ))}
        </Group>
      )}

      {groups.dungeonTargets.length > 0 && (
        <Group title="Dungeons to farm">
          {groups.dungeonTargets.map((d) => (
            <Row key={d.dungeon} count={`${d.slots.length} upgrade${d.slots.length > 1 ? 's' : ''}`}>
              {d.dungeon}
            </Row>
          ))}
        </Group>
      )}

      {groups.craftTargets.length > 0 && (
        <Group title="Worth crafting">
          {groups.craftTargets.map((c) => (
            <Row key={c.slot} count={`${c.slot}${c.craftQuality ? `, Q${c.craftQuality}` : ''}`}>
              {c.itemName}
            </Row>
          ))}
        </Group>
      )}

      {groups.catalystTargets.length > 0 && (
        <Group title="Worth a catalyst charge">
          {groups.catalystTargets.map((c) => (
            <Row key={c.slot} count={c.slot}>
              {c.itemName}
            </Row>
          ))}
        </Group>
      )}
    </div>
  );
}
