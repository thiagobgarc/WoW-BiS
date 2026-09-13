/**
 * "Last updated 3 minutes ago" + the explicit refresh control.
 *
 * mobile-ux.md maps the web's `RefreshButton` to "pull-to-refresh **and** an
 * explicit header button for discoverability". Both exist and both call the
 * same controller: pull-to-refresh is the gesture people who know it will
 * use, and a visible button is the only way everyone else finds out the
 * feature is there at all.
 *
 * On cooldown the button is disabled and *says why* — the countdown is
 * rendered next to it rather than left to a toast that has already gone by
 * the time the user looks. "On cooldown (60s)", which is what the web shows,
 * is a fixed string; this one counts down, because a number that doesn't
 * move reads as a stuck app.
 */
import { useEffect } from 'react';
import { AccessibilityInfo, Pressable, Text, View } from 'react-native';
import { timeAgo } from '@mythos/core/utils';

import { Icon } from '@/components/Icon';
import { colors } from '@/theme';

import type { RefreshController } from '../api/useRefreshCharacter';

interface RefreshBarProps {
  fetchedAt: number;
  refresh: RefreshController;
}

export function RefreshBar({ fetchedAt, refresh }: RefreshBarProps) {
  const disabled = refresh.isRefreshing || refresh.isOnCooldown;

  // Announced once, on the transition into cooldown. The countdown text
  // below is deliberately NOT a live region: it changes every second, and a
  // live region would interrupt the screen reader sixty times in a row.
  const { isOnCooldown, secondsLeft } = refresh;
  useEffect(() => {
    if (isOnCooldown) {
      AccessibilityInfo.announceForAccessibility(`Available again in ${secondsLeft} seconds.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the entry into cooldown, not each tick
  }, [isOnCooldown]);

  return (
    <View className="gap-1.5">
      <View className="flex-row items-center justify-between gap-3">
        <Text className="flex-1 text-xs text-text-dim">Last updated {timeAgo(fetchedAt)}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled, busy: refresh.isRefreshing }}
          accessibilityLabel={
            refresh.isOnCooldown
              ? `Refresh unavailable for ${refresh.secondsLeft} more seconds`
              : 'Refresh this character'
          }
          accessibilityHint="Asks Blizzard for a new copy of this character"
          disabled={disabled}
          onPress={refresh.refresh}
          className={`min-h-[44px] flex-row items-center gap-1.5 rounded-lg border border-border px-3 ${
            disabled ? 'bg-panel' : 'bg-panel active:bg-panel-hover'
          }`}
        >
          <Icon
            name="refresh"
            size={14}
            color={disabled ? colors['text-faint'] : colors.text}
          />
          <Text className={`text-sm font-semibold ${disabled ? 'text-text-faint' : 'text-text'}`}>
            {refresh.isRefreshing ? 'Refreshing…' : refresh.isOnCooldown ? `${refresh.secondsLeft}s` : 'Refresh'}
          </Text>
        </Pressable>
      </View>

      {refresh.message ? (
        // A failure gets a live region; the ticking countdown does not — see above.
        <Text
          accessibilityLiveRegion={refresh.isOnCooldown ? 'none' : 'polite'}
          className="text-xs text-text-muted"
        >
          {refresh.message}
        </Text>
      ) : null}
    </View>
  );
}
