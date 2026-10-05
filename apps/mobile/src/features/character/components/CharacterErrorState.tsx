/**
 * The whole-screen failure, for the case where there is no snapshot to fall
 * back to. Copy comes from `errorCopy.ts`, keyed on the contract's error
 * code; this file is only the arrangement of it.
 *
 * "Try again" appears only when retrying could change the answer — the
 * contract's own `retryable` flag decides, and the client reads it off the
 * response rather than re-deriving it (see `errors.ts` in `@mythos/api-client`).
 * A button that re-runs a lookup for a character that does not exist is a
 * button that wastes the user's rate-limit budget on their behalf.
 */
import { Text, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { Button } from '@/components/Button';
import { colors } from '@/theme';

import type { ErrorCopy } from '../model/errorCopy';

interface CharacterErrorStateProps {
  copy: ErrorCopy;
  onRetry: () => void;
}

export function CharacterErrorState({ copy, onRetry }: CharacterErrorStateProps) {
  return (
    <View accessible accessibilityRole="alert" className="mt-10 items-center gap-3 px-2">
      <Icon name="alert-circle-outline" size={40} color={colors['text-dim']} />
      <Text accessibilityRole="header" className="text-center text-lg font-semibold text-text">
        {copy.title}
      </Text>
      <Text className="text-center text-sm leading-5 text-text-muted">{copy.body}</Text>
      {copy.canRetry ? (
        <View className="mt-2 w-full max-w-xs">
          <Button label="Try again" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}
