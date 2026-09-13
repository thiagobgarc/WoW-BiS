/**
 * The character screen's contract.
 *
 * Two properties get most of the attention here, because they are Phase 6's
 * exit criterion and neither is visible in a type: **a cached character
 * still renders with no network**, and **switching tabs makes no request**.
 * Both are easy to break with a change that looks harmless.
 *
 * As in SearchScreen.test.tsx, the API client is stubbed rather than the
 * network — @mythos/api-client has its own suite against a stub fetch, so
 * what is unproven here is the screen above it. `render` is async and the
 * queries come off the result, not RNTL's `screen` singleton; see AGENTS.md.
 *
 * @gorhom/bottom-sheet is mocked (see jest.setup.ts): it is a Reanimated
 * component whose real behaviour is gestures and layout, neither of which
 * Jest can observe. What is testable — that tapping a slot puts that slot's
 * item in the sheet — is what is tested; the sheet's own presentation is
 * verified on a device.
 */
import { fireEvent, waitFor } from '@testing-library/react-native';
import { onlineManager } from '@tanstack/react-query';
import { MythosApiError } from '@mythos/api-client';

import { createTestQueryClient, renderWithProviders } from '@/testing/render';
import { CHARACTER_FIXTURE, staleFixture } from '@/testing/characterFixture';
import { META_FIXTURE } from '@/testing/metaFixture';
import { characterQueryKey } from './api/useCharacter';
import CharacterScreen from './CharacterScreen';

// Prefixed `mock` because babel-plugin-jest-hoist lifts jest.mock above the
// imports; only `mock*` bindings may be referenced from the factory.
const mockGetCharacter = jest.fn();
const mockRefreshCharacter = jest.fn();
const mockGetMeta = jest.fn();
let mockParams: Record<string, string> = {};

jest.mock('@/lib/api', () => ({
  get api() {
    return {
      getCharacter: mockGetCharacter,
      refreshCharacter: mockRefreshCharacter,
      // The upgrade board's quick wins need the season's slot rules, so the
      // Gear tab now has a second query behind it — see useMeta.
      getMeta: mockGetMeta,
    };
  },
  apiBaseUrl: 'https://mythos.test',
  appVersion: '0.1.0',
}));

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  // Stack.Screen only configures the native header, which has nothing to
  // assert on and no test renderer behind it.
  Stack: { Screen: () => null },
}));

const ARTHAS = { region: 'us', realm: 'illidan', name: 'Arthas' };

/** How many subtrees are currently hidden from a screen reader. */
function countHidden(node: unknown): number {
  if (Array.isArray(node)) return node.reduce<number>((sum, child) => sum + countHidden(child), 0);
  if (!node || typeof node !== 'object') return 0;
  const element = node as { props?: Record<string, unknown>; children?: unknown };
  const self = element.props?.accessibilityElementsHidden === true ? 1 : 0;
  return self + countHidden(element.children);
}

beforeEach(() => {
  // The manager is module-global and survives between tests; a suite that
  // left it offline would silently put an offline banner on every screen.
  onlineManager.setOnline(true);
  mockParams = { ...ARTHAS };
  mockGetCharacter.mockReset();
  mockRefreshCharacter.mockReset();
  mockGetMeta.mockReset();
  mockGetCharacter.mockResolvedValue(CHARACTER_FIXTURE);
  mockGetMeta.mockResolvedValue(META_FIXTURE);
});

describe('CharacterScreen', () => {
  it('renders the character, its gear and its stats from one request', async () => {
    const { getByText, findByText, getByLabelText, getAllByLabelText } = await renderWithProviders(<CharacterScreen />);

    await findByText('Arthas');
    expect(getByText(/Unholy Death Knight · Illidan \(US\)/)).toBeTruthy();
    expect(getByText('<Scourge>')).toBeTruthy();

    // Three of five tier slots are flagged in the fixture.
    // The label reads as one sentence, not as the value twice: Phase 9's
    // device pass found this announcing "...4pc active: 4/5, 4pc active".
    expect(getByLabelText("Tier set: 3 of 5 pieces, 2pc active")).toBeTruthy();
    expect(getByText('3/5')).toBeTruthy();
    expect(getByText('2pc active')).toBeTruthy();

    // Scoped to the paper doll's own tiles: since Phase 7 the upgrade board
    // below names the equipped item too, so a bare getByText finds two.
    expect(getByLabelText(/^Head: Helm of the Damned/)).toBeTruthy();
    expect(getByLabelText(/^Main Hand: Frostmourne/)).toBeTruthy();

    // Stat priority comes from the seeded BiS entry, not the default order.
    expect(getByText('Mastery > Haste > Critical Strike > Versatility')).toBeTruthy();
    expect(getByText('5120 (34.2%)')).toBeTruthy();

    // An omitted slot is an empty tile, not a missing one.
    expect(getAllByLabelText('Off Hand: empty')).toHaveLength(1);
    expect(mockGetCharacter).toHaveBeenCalledTimes(1);
  });

  it('builds the upgrade board out of the same payload, with no second request', async () => {
    const { findByText, getByLabelText } = await renderWithProviders(<CharacterScreen />);
    await findByText('Arthas');

    // `data.bis` came with the character; the board computes over it on
    // device. UpgradeBoard.test.tsx covers what it computes.
    await findByText('2 of 12 slots');
    fireEvent.press(getByLabelText('Mythic+'));
    await findByText('Cowl of the Deep Delve');

    expect(mockGetCharacter).toHaveBeenCalledTimes(1);
  });

  it('has no Talents tab in v1, because Section 8.10 defers it to 1.1', async () => {
    const { findByText, queryByLabelText } = await renderWithProviders(<CharacterScreen />);
    await findByText('Arthas');

    // Built in Phase 8 and gated off. CharacterScreen.talents.test.tsx
    // proves the flag flip turns it on without a restructure.
    expect(queryByLabelText('Talents')).toBeNull();
  });

  it('switches to Progression without making a second request', async () => {
    const { getByText, findByText, getByLabelText } = await renderWithProviders(<CharacterScreen />);
    await findByText('Arthas');

    fireEvent.press(getByLabelText('Progression'));

    // Both tabs read the one payload — this is api-contract.md's "one round
    // trip", and a spinner here would mean it had been broken.
    await findByText('The Venomous Abyss');
    expect(getByText('Mythic+ score')).toBeTruthy();
    expect(getByText('2412.6')).toBeTruthy();
    expect(getByText('Not run this season')).toBeTruthy();
    expect(mockGetCharacter).toHaveBeenCalledTimes(1);
  });

  it('opens the hardest difficulty with a kill, so the useful list is the open one', async () => {
    const { findByText, getByLabelText, getByText } = await renderWithProviders(<CharacterScreen />);
    await findByText('Arthas');
    fireEvent.press(getByLabelText('Progression'));

    // Heroic is the hardest with kills; Mythic has none.
    await findByText('The Venomous Abyss');
    expect(getByLabelText('Heroic, 2/8 defeated')).toBeTruthy();
    expect(getByText('The Hollow Queen')).toBeTruthy();
  });

  it('renders the cached snapshot with an offline banner when the network is gone', async () => {
    // Exactly the cold-launch-in-airplane-mode shape: MMKV restores the
    // entry, the revalidation behind it fails.
    const fetchedAt = Date.now() - 2 * 60 * 60 * 1000;
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(characterQueryKey('us', 'illidan', 'arthas'), staleFixture(fetchedAt));
    mockGetCharacter.mockRejectedValue(new MythosApiError({ code: 'network', message: 'offline' }));

    const { findByText, getByLabelText, queryByText } = await renderWithProviders(<CharacterScreen />, {
      queryClient,
    });

    await findByText(/You're offline — showing the snapshot from 2 hours ago\./);
    // The character is still there. This is the whole point.
    expect(getByLabelText(/^Main Hand: Frostmourne/)).toBeTruthy();
    expect(queryByText('Something went wrong')).toBeNull();
  });

  it('shows an error screen only when there is no snapshot to fall back on', async () => {
    mockGetCharacter.mockRejectedValue(
      new MythosApiError({ code: 'character_not_found', message: 'nope', status: 404 }),
    );

    const { findByText, queryByText } = await renderWithProviders(<CharacterScreen />);

    await findByText("We couldn't find that character");
    // A retry cannot make a nonexistent character exist, so it isn't offered.
    expect(queryByText('Try again')).toBeNull();
  });

  it('offers a retry for a failure a retry could fix', async () => {
    mockGetCharacter.mockRejectedValue(
      new MythosApiError({ code: 'blizzard_unavailable', message: 'down', status: 503 }),
    );

    const { findByText } = await renderWithProviders(<CharacterScreen />);
    expect(await findByText('Try again')).toBeTruthy();
  });

  it('rejects an unsupported region from a deep link without calling the API', async () => {
    mockParams = { region: 'mars', realm: 'illidan', name: 'Arthas' };

    const { findByText } = await renderWithProviders(<CharacterScreen />);

    await findByText('Unsupported region');
    expect(mockGetCharacter).not.toHaveBeenCalled();
  });

  it('warns that the snapshot is old when the device has no network at all', async () => {
    // Nothing has failed here: the cached entry is inside staleTime, so no
    // request is made. Only the platform knows, which is the whole reason
    // onlineStatus.ts exists — this is the cold-launch-in-airplane-mode case.
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(
      characterQueryKey('us', 'illidan', 'arthas'),
      staleFixture(Date.now() - 3 * 60 * 60 * 1000),
    );
    onlineManager.setOnline(false);

    const { findByText } = await renderWithProviders(<CharacterScreen />, { queryClient });

    await findByText(/You're offline — showing the snapshot from 3 hours ago\./);
    expect(mockGetCharacter).not.toHaveBeenCalled();
  });

  it('says the server is serving samples when it has no credentials', async () => {
    mockGetCharacter.mockResolvedValue({ ...CHARACTER_FIXTURE, mock: true });

    const { findByText } = await renderWithProviders(<CharacterScreen />);
    await findByText(/Sample data/);
  });

  describe('refresh', () => {
    it('writes the refreshed payload into the cache instead of refetching', async () => {
      mockRefreshCharacter.mockResolvedValue({
        ...CHARACTER_FIXTURE,
        character: { ...CHARACTER_FIXTURE.character, equippedItemLevel: 640 },
      });

      const { findByText, getByLabelText } = await renderWithProviders(<CharacterScreen />);
      await findByText('Arthas');

      fireEvent.press(getByLabelText('Refresh this character'));

      await findByText('640');
      // The refresh response *is* the new snapshot — a GET after it would be
      // a second round trip for data we already hold.
      expect(mockGetCharacter).toHaveBeenCalledTimes(1);
    });

    it('starts the cooldown after a successful refresh, before the server can refuse', async () => {
      mockRefreshCharacter.mockResolvedValue(CHARACTER_FIXTURE);

      const { findByText, getByLabelText } = await renderWithProviders(<CharacterScreen />);
      await findByText('Arthas');
      fireEvent.press(getByLabelText('Refresh this character'));

      await findByText(/try again in \d+s\./);
      // Disabled, so the next tap cannot produce a 429 the user has to read.
      await waitFor(() => expect(getByLabelText(/Refresh unavailable for \d+ more seconds/)).toBeTruthy());
    });

    it('turns a 429 into a countdown rather than an error', async () => {
      mockRefreshCharacter.mockRejectedValue(
        new MythosApiError({
          code: 'rate_limited',
          message: 'This character was refreshed a moment ago — try again shortly.',
          status: 429,
          retryAfterSeconds: 45,
        }),
      );

      const { findByText, getByLabelText, queryByText } = await renderWithProviders(<CharacterScreen />);
      await findByText('Arthas');
      fireEvent.press(getByLabelText('Refresh this character'));

      await findByText(/try again in 4[45]s\./);
      expect(queryByText('Something went wrong')).toBeNull();
    });

    it('explains a refresh that failed offline in the banner, and only there', async () => {
      mockRefreshCharacter.mockRejectedValue(new MythosApiError({ code: 'network', message: 'offline' }));

      const { findByText, getByLabelText, queryByText } = await renderWithProviders(<CharacterScreen />);
      await findByText('Arthas');
      fireEvent.press(getByLabelText('Refresh this character'));

      // A mutation's error never reaches the query, so without the hook
      // surfacing it this tap produced no visible reaction at all.
      await findByText(/You're offline — showing the snapshot from/);
      // One message about being offline is information; two is noise.
      expect(queryByText(/Couldn't refresh this character/)).toBeNull();
    });
  });

  describe('slot sheet', () => {
    it('puts the tapped slot in the sheet with the detail the tile has no room for', async () => {
      const { findByText, getByLabelText, getByText } = await renderWithProviders(<CharacterScreen />);
      await findByText('Arthas');

      fireEvent.press(getByLabelText(/^Main Hand: Frostmourne/));

      await findByText('Enchanted: Rune of the Fallen Crusader');
      expect(getByText('1,204 - 1,806 Damage')).toBeTruthy();
      expect(getByText('View on Wowhead ↗')).toBeTruthy();
    });

    it('explains an empty slot rather than opening a blank sheet', async () => {
      const { findByText, getByLabelText } = await renderWithProviders(<CharacterScreen />);
      await findByText('Arthas');

      fireEvent.press(getByLabelText('Off Hand: empty'));

      await findByText('Nothing equipped in this slot.');
    });

    it('hides the screen behind it, so a swipe cannot walk out of the sheet', async () => {
      const { findByText, getByLabelText, toJSON } = await renderWithProviders(<CharacterScreen />);
      await findByText('Arthas');

      const hidden = () => countHidden(toJSON());
      const closed = hidden();

      fireEvent.press(getByLabelText(/^Main Hand: Frostmourne/));
      await findByText('Enchanted: Rune of the Fallen Crusader');

      // The sheet is non-modal by design (see SlotSheet.tsx), so nothing
      // hides the paper doll underneath unless the screen says so. Without
      // this, TalkBack swipes straight out of the sheet into tiles that are
      // not on screen — which is what Phase 9's device pass did.
      expect(hidden()).toBeGreaterThan(closed);
    });

    it('names an unfilled socket in the sheet, not only as a chip', async () => {
      const { findByText, getByLabelText, getByText } = await renderWithProviders(<CharacterScreen />);
      await findByText('Arthas');

      fireEvent.press(getByLabelText(/^Neck: Choker of the Abyss/));

      await findByText('Socket: Culminating Ruby');
      expect(getByText('Empty Socket')).toBeTruthy();
    });
  });

  describe('loading', () => {
    it('announces the wait once and hides the placeholder blocks from a screen reader', async () => {
      // Never resolves: the screen stays in the state this test is about.
      mockGetCharacter.mockReturnValue(new Promise(() => {}));

      const { findByLabelText, queryByLabelText } = await renderWithProviders(<CharacterScreen />);

      // One element carries the whole announcement. The sixteen grey tiles
      // behind it are decoration and must not be focus stops — a skeleton
      // that announces block by block is worse than a spinner.
      const region = await findByLabelText('Loading Arthas');
      expect(region.props.accessibilityState).toEqual({ busy: true });

      // Nothing real has arrived, so nothing real may be claimed: the paper
      // doll's own label belongs to the loaded screen.
      expect(queryByLabelText('Equipped gear')).toBeNull();
    });
  });
});
