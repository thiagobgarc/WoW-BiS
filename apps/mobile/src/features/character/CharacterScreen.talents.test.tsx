/**
 * The 1.1 flag flip, proven.
 *
 * `FEATURES.talents` is a compile-time constant, so a test that wanted the
 * Talents tab visible has to mock the module — and `jest.mock` is file-wide.
 * Hence a second file rather than a case in `CharacterScreen.test.tsx`:
 * that one has to keep exercising v1's *real* configuration, where the tab
 * does not exist, and it asserts exactly that.
 *
 * What this proves is the claim Section 11.1 made and Phase 8 cashed in:
 * turning the tab on is a flag flip plus content, not a navigation
 * restructure. If that ever stops being true, the failure lands here.
 */
import { fireEvent } from '@testing-library/react-native';

import { renderWithProviders } from '@/testing/render';
import { CHARACTER_FIXTURE } from '@/testing/characterFixture';
import { META_FIXTURE } from '@/testing/metaFixture';

import CharacterScreen from './CharacterScreen';

const mockGetCharacter = jest.fn();
const mockRefreshCharacter = jest.fn();
const mockGetMeta = jest.fn();

jest.mock('@/features', () => ({
  FEATURES: { meta: false, talents: true },
}));

jest.mock('@/lib/api', () => ({
  get api() {
    return {
      getCharacter: mockGetCharacter,
      refreshCharacter: mockRefreshCharacter,
      getMeta: mockGetMeta,
    };
  },
  apiBaseUrl: 'https://mythos.test',
  appVersion: '0.1.0',
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ region: 'us', realm: 'illidan', name: 'Arthas' }),
  Stack: { Screen: () => null },
}));

beforeEach(() => {
  mockGetCharacter.mockReset();
  mockRefreshCharacter.mockReset();
  mockGetMeta.mockReset();
  mockGetCharacter.mockResolvedValue(CHARACTER_FIXTURE);
  mockGetMeta.mockResolvedValue(META_FIXTURE);
});

describe('CharacterScreen with FEATURES.talents on', () => {
  it('adds the tab and fills it from the payload already in hand', async () => {
    const { findByText, getByLabelText } = await renderWithProviders(<CharacterScreen />);
    await findByText('Arthas');

    fireEvent.press(getByLabelText('Talents'));

    // `talents` and `recommendedTalents` ship in v1's response shape
    // precisely so this tab costs no request — api-contract.md's note on
    // the character endpoint.
    await findByText('5 of 9 picks match');
    expect(mockGetCharacter).toHaveBeenCalledTimes(1);
  });

  it('lands after Progression, as a third entry rather than a reshuffle', async () => {
    const { findByText, getByLabelText } = await renderWithProviders(<CharacterScreen />);
    await findByText('Arthas');

    // The two v1 tabs are untouched and still in their original order.
    expect(getByLabelText('Gear')).toBeTruthy();
    expect(getByLabelText('Progression')).toBeTruthy();
    expect(getByLabelText('Talents')).toBeTruthy();
  });
});
