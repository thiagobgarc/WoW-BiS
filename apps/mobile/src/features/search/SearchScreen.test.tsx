/**
 * The scaffold's exit test: the home screen mounts, runs a query through the
 * shared client, and renders a contract-shaped response.
 *
 * The client is stubbed rather than the network, because @mythos/api-client
 * already has its own suite against a stub fetch — what is unproven here is
 * the wiring above it: Query provider, NativeWind classNames on RN
 * components, and the screen's three states.
 *
 * Queries come off the render result rather than RNTL's `screen` singleton,
 * which this version does not populate.
 */
import { MythosApiError } from '@mythos/api-client';

import { renderWithProviders } from '@/testing/render';
import SearchScreen from './SearchScreen';

// Prefixed `mock` because babel-plugin-jest-hoist lifts jest.mock above the
// imports; only `mock*` bindings may be referenced from the factory.
const mockGetMeta = jest.fn();

jest.mock('@/lib/api', () => ({
  get api() {
    return { getMeta: mockGetMeta };
  },
  apiBaseUrl: 'https://mythos.test',
  appVersion: '0.1.0',
}));

const META = {
  season: { id: 'midnight-s2', displayName: 'Midnight Season 2', raidName: 'The Venomous Abyss' },
  seededSpecs: [{ class: 'Mage', spec: 'Fire', armorType: 'cloth' }],
  minimumSupportedClientVersion: '0.0.0',
  notice: null,
};

beforeEach(() => {
  mockGetMeta.mockReset();
});

describe('SearchScreen', () => {
  it('shows the season once /v1/meta resolves', async () => {
    mockGetMeta.mockResolvedValue(META);
    const { findByText, getByText } = await renderWithProviders(<SearchScreen />);

    expect(await findByText('Midnight Season 2')).toBeTruthy();
    expect(getByText('The Venomous Abyss')).toBeTruthy();
    expect(getByText('1 seeded spec')).toBeTruthy();
  });

  it('surfaces the error code rather than a generic failure', async () => {
    mockGetMeta.mockRejectedValue(
      new MythosApiError({ code: 'blizzard_unavailable', message: 'Blizzard is down.', retryable: true }),
    );
    const { findByText } = await renderWithProviders(<SearchScreen />);

    expect(await findByText('Blizzard is down.')).toBeTruthy();
    expect(await findByText('code: blizzard_unavailable')).toBeTruthy();
  });

  it('shows the resolved API base URL, so a misconfigured build is visible', async () => {
    mockGetMeta.mockResolvedValue(META);
    const { findByText } = await renderWithProviders(<SearchScreen />);

    expect(await findByText('https://mythos.test')).toBeTruthy();
  });
});
