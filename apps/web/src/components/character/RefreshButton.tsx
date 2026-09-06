import { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface Props {
  region: string;
  realm: string;
  name: string;
  onRefreshed: () => Promise<void>;
}

export function RefreshButton({ region, realm, name, onRefreshed }: Props) {
  const [state, setState] = useState<'idle' | 'loading' | 'cooldown'>('idle');

  async function handleClick() {
    setState('loading');
    try {
      const res = await fetch('/api/character/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ region, realm, name }),
      });
      if (res.ok) {
        await onRefreshed();
        setState('idle');
        return;
      }
      setState('cooldown');
      setTimeout(() => setState('idle'), 5000);
    } catch {
      setState('idle');
    }
  }

  return (
    <Button variant="secondary" size="sm" onClick={handleClick} disabled={state !== 'idle'}>
      {state === 'loading' ? 'Refreshing…' : state === 'cooldown' ? 'On cooldown (60s)' : '🔄 Refresh'}
    </Button>
  );
}
