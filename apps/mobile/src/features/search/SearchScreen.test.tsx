/**
 * The search screen's contract, with the offline path treated as a
 * first-class case rather than an edge one — Phase 5's exit criterion is
 * that this screen is searchable and navigable with no server at all.
 *
 * The API client is stubbed rather than the network: @mythos/api-client has
 * its own suite against a stub fetch, so what is unproven here is the screen
 * above it. The roster store is real, backed by jest.setup.ts's in-memory
 * MMKV, because the persistence is half of what this screen does.
 *
 * Queries come off the render result rather than RNTL's `screen` singleton,
 * which this version does not populate, and `render` is async — see
 * AGENTS.md.
 */
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { MythosApiError } from '@mythos/api-client';

import { renderWithProviders } from '@/testing/render';
import { DEFAULT_REGION, useRosterStore } from '@/features/roster/store';
import type { RecentCharacter } from '@/features/roster/model/recentCharacters';
import SearchScreen from './SearchScreen';

// Prefixed `mock` because babel-plugin-jest-hoist lifts jest.mock above the
// imports; only `mock*` bindings may be referenced from the factory.
const mockGetMeta = jest.fn();
const mockGetRealms = jest.fn();
const mockSearchCharacters = jest.fn();
const mockPush = jest.fn();

jest.mock('@/lib/api', () => ({
  get api() {
    return { getMeta: mockGetMeta, getRealms: mockGetRealms, searchCharacters: mockSearchCharacters };
  },
  apiBaseUrl: 'https://mythos.test',
  appVersion: '0.1.0',
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const META = {
  season: { id: 'midnight-s2', displayName: 'Midnight Season 2', raidName: 'The Venomous Abyss' },
  seededSpecs: [{ class: 'Mage', spec: 'Fire', armorType: 'cloth' }],
  minimumSupportedClientVersion: '0.0.0',
  notice: null,
};

const ARTHAS: RecentCharacter = {
  name: 'Arthas',
  realmName: 'Illidan',
  realmSlug: 'illidan',
  region: 'us',
  className: 'Death Knight',
};

const JAINA: RecentCharacter = {
  name: 'Jaina',
  realmName: 'Stormrage',
  realmSlug: 'stormrage',
  region: 'us',
  className: 'Mage',
};

/**
 * What a query hands back. Derived from the render result rather than
 * imported: RNTL re-exports this type from its own `test-renderer`
 * dependency, which is not a package this app depends on, and
 * `react-test-renderer`'s similarly-named type is a different shape.
 */
type Queried = Awaited<
  ReturnType<Awaited<ReturnType<typeof renderWithProviders>>['findByLabelText']>
>;

/**
 * Types into the realm field and waits for the autocomplete it schedules, so
 * a test asserts against a settled screen rather than a mid-debounce one.
 *
 * This suite still prints "update not wrapped in act(...)" warnings: the
 * debounce timer fires between `waitFor` polls and therefore outside any act
 * scope. Two tidier-looking fixes were tried and both are worse — holding an
 * act scope open across a real 150ms sleep breaks every test after the first
 * one to use it, and Jest fake timers break more still, since RNTL's async
 * `render`/`waitFor` want real ones here. The warnings are harness noise
 * rather than a defect in the screen, and are preferable to a test setup
 * that is quietly broken.
 */
async function typeRealm(field: Queried, realm: string) {
  const before = mockGetRealms.mock.calls.length;
  fireEvent.changeText(field, realm);
  await waitFor(() => expect(mockGetRealms.mock.calls.length).toBeGreaterThan(before));
  await act(async () => {});
}

/** The whole server being unreachable, which is the offline case. */
function offline() {
  const error = new MythosApiError({ code: 'network', message: 'Could not reach Mythos.' });
  mockGetMeta.mockRejectedValue(error);
  mockGetRealms.mockRejectedValue(error);
  mockSearchCharacters.mockRejectedValue(error);
}

beforeEach(() => {
  mockGetMeta.mockReset();
  mockGetRealms.mockReset();
  mockPush.mockReset();
  mockGetMeta.mockResolvedValue(META);
  mockGetRealms.mockResolvedValue({ realms: [], mock: false });
  mockSearchCharacters.mockReset();
  mockSearchCharacters.mockResolvedValue({ characters: [] });
  useRosterStore.setState({ recent: [], region: DEFAULT_REGION });
});

describe('SearchScreen', () => {
  it('shows the season the BiS data describes once /v1/meta resolves', async () => {
    const { findByText } = await renderWithProviders(<SearchScreen />);
    expect(await findByText('Midnight Season 2 · The Venomous Abyss')).toBeTruthy();
  });

  it('renders the roster from storage with the whole API unreachable', async () => {
    offline();
    useRosterStore.setState({ recent: [ARTHAS, JAINA] });

    const { findByText, getByText, queryByText } = await renderWithProviders(<SearchScreen />);

    expect(await findByText('Arthas')).toBeTruthy();
    expect(getByText('Jaina')).toBeTruthy();
    // The season line is simply absent, not an error state.
    expect(queryByText(/Midnight Season 2/)).toBeNull();
  });

  it('narrows the roster as a name is typed', async () => {
    useRosterStore.setState({ recent: [ARTHAS, JAINA] });
    const { findByLabelText, getByText, queryByText } = await renderWithProviders(<SearchScreen />);

    fireEvent.changeText(await findByLabelText('Character'), 'jai');

    await waitFor(() => expect(queryByText('Arthas')).toBeNull());
    expect(getByText('Jaina')).toBeTruthy();
  });

  it('suggests characters by name without accents and opens the one picked', async () => {
    mockSearchCharacters.mockResolvedValue({
      characters: [
        { name: 'Zóe', realmName: 'Eredar', realmSlug: 'eredar', region: 'us', className: 'Priest', avatarUrl: null },
      ],
    });
    const { findByLabelText } = await renderWithProviders(<SearchScreen />);

    fireEvent.changeText(await findByLabelText('Character'), 'zoe');
    const suggestion = await findByLabelText('Zóe, Eredar, US, Priest');
    await act(async () => {});

    expect(mockSearchCharacters).toHaveBeenCalledWith({ q: 'zoe', region: 'us' }, expect.anything());
    fireEvent.press(suggestion);
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/character/[region]/[realm]/[name]',
      params: { region: 'us', realm: 'eredar', name: 'zóe' },
    });
  });

  it('says so when a typed name matches no recent character', async () => {
    useRosterStore.setState({ recent: [ARTHAS] });
    const { findByLabelText, findByText } = await renderWithProviders(<SearchScreen />);

    fireEvent.changeText(await findByLabelText('Character'), 'zzz');

    expect(await findByText('No recent character matches that name.')).toBeTruthy();
  });

  it('keeps Search disabled until both fields have content', async () => {
    const { findByLabelText, getByRole } = await renderWithProviders(<SearchScreen />);

    const button = getByRole('button', { name: 'Search' });
    expect(button).toBeDisabled();

    fireEvent.changeText(await findByLabelText('Character'), 'Arthas');
    expect(button).toBeDisabled();

    await typeRealm(await findByLabelText('Realm'), 'Illidan');
    await waitFor(() => expect(button).toBeEnabled());
  });

  it('pushes the slugged character route on search', async () => {
    const { findByLabelText, getByRole } = await renderWithProviders(<SearchScreen />);

    fireEvent.changeText(await findByLabelText('Character'), '  THRALL  ');
    await typeRealm(await findByLabelText('Realm'), 'Kel\'Thuzad');

    // The button is disabled until both fields have content, and a press on a
    // disabled Pressable is a no-op — so wait for the enabled render first.
    const button = getByRole('button', { name: 'Search' });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.press(button);

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/character/[region]/[realm]/[name]',
      params: { region: 'us', realm: 'kelthuzad', name: 'thrall' },
    });
  });

  it('searches with the server down, since autocomplete never gated it', async () => {
    offline();
    const { findByLabelText, getByRole } = await renderWithProviders(<SearchScreen />);

    fireEvent.changeText(await findByLabelText('Character'), 'Arthas');
    await typeRealm(await findByLabelText('Realm'), 'Illidan');

    const button = getByRole('button', { name: 'Search' });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.press(button);

    expect(mockPush).toHaveBeenCalledWith(
      expect.objectContaining({ params: { region: 'us', realm: 'illidan', name: 'arthas' } }),
    );
  });

  it('opens a recent character by its stored slug, not by what is typed', async () => {
    useRosterStore.setState({ recent: [ARTHAS] });
    const { findByText } = await renderWithProviders(<SearchScreen />);

    fireEvent.press(await findByText('Arthas'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/character/[region]/[realm]/[name]',
      params: { region: 'us', realm: 'illidan', name: 'arthas' },
    });
  });

  it('offers realm suggestions and fills the field from one', async () => {
    mockGetRealms.mockResolvedValue({ realms: ['Area 52', 'Arathor'], mock: false });
    const { findByLabelText, findByText } = await renderWithProviders(<SearchScreen />);

    const field = await findByLabelText('Realm');
    await typeRealm(field, 'Ar');

    expect(mockGetRealms).toHaveBeenCalledWith(
      expect.objectContaining({ region: 'us', q: 'Ar' }),
      expect.anything(),
    );

    fireEvent.press(await findByText('Area 52'));

    // Picking a suggestion fills the field, which is what makes the list
    // disappear — the screen tracks no separate "open" flag.
    await waitFor(() => expect(field.props.value).toBe('Area 52'));
    await act(async () => {});
  });

  it('degrades autocomplete to a hint rather than an error', async () => {
    offline();
    const { findByLabelText, findByText } = await renderWithProviders(<SearchScreen />);

    await typeRealm(await findByLabelText('Realm'), 'Ill');

    expect(
      await findByText('Realm suggestions are offline. Type the realm name and search anyway.'),
    ).toBeTruthy();
  });

  it('surfaces that the server is serving sample realms', async () => {
    mockGetRealms.mockResolvedValue({ realms: ['Illidan'], mock: true });
    const { findByLabelText, findByText } = await renderWithProviders(<SearchScreen />);

    await typeRealm(await findByLabelText('Realm'), 'Ill');

    expect(await findByText(/Showing sample realms/)).toBeTruthy();
  });

  it('changes region and remembers it for the next launch', async () => {
    const { findByLabelText } = await renderWithProviders(<SearchScreen />);

    fireEvent.press(await findByLabelText('EU'));

    expect(useRosterStore.getState().region).toBe('eu');
  });

  it('queries realms for the selected region', async () => {
    mockGetRealms.mockResolvedValue({ realms: ['Draenor'], mock: false });
    const { findByLabelText } = await renderWithProviders(<SearchScreen />);

    fireEvent.press(await findByLabelText('EU'));
    await typeRealm(await findByLabelText('Realm'), 'Dra');

    await waitFor(() =>
      expect(mockGetRealms).toHaveBeenCalledWith(
        expect.objectContaining({ region: 'eu' }),
        expect.anything(),
      ),
    );
  });
});
