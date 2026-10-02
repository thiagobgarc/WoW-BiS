/**
 * The upgrade board's contract.
 *
 * Phase 7's exit criterion is "tab switching is instant and works offline",
 * and the two halves of that are tested differently. *Offline* is tested by
 * never resolving the only query the board has (`/v1/meta`) and asserting
 * the board is still complete without it. *Instant* is not a timing
 * assertion — it is the absence of a request, so the tests that switch
 * segments assert that nothing was fetched, which is the property that
 * makes it instant.
 *
 * The board is rendered directly rather than through `CharacterScreen`:
 * everything below is a function of two props, and the screen's own test
 * covers the one thing that isn't — that the Gear tab passes them.
 */
import { fireEvent } from '@testing-library/react-native';
import type { CharacterBis } from '@mythos/api-contract';

import { renderWithProviders } from '@/testing/render';
import { CHARACTER_FIXTURE } from '@/testing/characterFixture';
import { BIS_ENTRIES } from '@/testing/bisFixture';
import { META_FIXTURE, META_WITHOUT_SEASON_SLOTS } from '@/testing/metaFixture';

import { UpgradeBoard } from './UpgradeBoard';

const mockGetMeta = jest.fn();

jest.mock('@/lib/api', () => ({
  get api() {
    return { getMeta: mockGetMeta };
  },
  apiBaseUrl: 'https://mythos.test',
  appVersion: '0.1.0',
}));

const EQUIPMENT = CHARACTER_FIXTURE.equipment;
const SEEDED: CharacterBis = CHARACTER_FIXTURE.bis;

function board(bis: CharacterBis = SEEDED) {
  return renderWithProviders(<UpgradeBoard equipment={EQUIPMENT} bis={bis} />);
}

beforeEach(() => {
  mockGetMeta.mockReset();
  mockGetMeta.mockResolvedValue(META_FIXTURE);
});

describe('UpgradeBoard', () => {
  it('opens on Raid and reports how much of that list is done', async () => {
    const { findByText, getByLabelText } = await board();

    // Two of twelve rows are exact matches in the fixture: the tier helm,
    // and the ring the 2x2 assignment has to credit in the slot holding it.
    await findByText('2 of 12 slots');
    expect(getByLabelText(/Raid BiS completion, 2 of 12 slots/)).toBeTruthy();
  });

  it('states each row as one sentence rather than a grid of fragments', async () => {
    const { findByLabelText } = await board();

    await findByLabelText(
      'Main Hand. Upgrade. Equipped: Frostmourne, item level 636. Target: Edge of the Abyss, item level 648, BiS rank 1, from Heroic — The Hollow Queen, The Venomous Abyss. +12 iLvl.',
    );
  });

  it('does not print a negative upgrade for a slot that already out-levels the list', async () => {
    const { findByLabelText } = await board();

    // The vault neck is 630 against a 636 equipped. "+-6 iLvl" is what a
    // naive template produces here.
    const row = await findByLabelText(/^Neck\. Close\./);
    expect(row).toBeTruthy();
    expect(row.props.accessibilityLabel).toContain('At or above');
  });

  it('switches content type without fetching anything', async () => {
    const { findByText, getByLabelText, queryByText } = await board();
    await findByText('2 of 12 slots');

    fireEvent.press(getByLabelText('Mythic+'));

    // A different list entirely — not the raid rows relabelled.
    await findByText('Cowl of the Deep Delve');
    expect(queryByText('Edge of the Abyss')).toBeNull();
    // One call, from the first render. Switching made none.
    expect(mockGetMeta).toHaveBeenCalledTimes(1);
  });

  it('says which segment is empty instead of hiding it', async () => {
    const { findByText, getByLabelText } = await board();
    await findByText('2 of 12 slots');

    // Nothing is seeded for PvP, which is what most seed files look like.
    fireEvent.press(getByLabelText('PvP'));

    await findByText(
      'No PvP BiS list has been seeded for this spec for The War Within Season 2.',
    );
  });

  it('leaves a dual slot with no second target saying so', async () => {
    const { findByText, getByLabelText } = await board();
    await findByText('2 of 12 slots');

    fireEvent.press(getByLabelText('Mythic+'));

    // One ring is seeded for Mythic+, so the other slot has no target.
    await findByText('No BiS target for this slot this season.');
  });

  it('keeps alternatives behind a disclosure and closes them on a segment change', async () => {
    const { findByText, getByLabelText, queryByText } = await board();
    await findByText('2 of 12 slots');

    expect(queryByText(/Signet of Whispers/)).toBeNull();
    fireEvent.press(getByLabelText('1 alternative for Finger 2'));
    await findByText(/Rank 3: Signet of Whispers \(642\)/);

    // Awaited between presses on purpose: two `fireEvent.press` calls in
    // one synchronous block overlap RNTL's act scopes, which wedges the
    // renderer for the rest of the file rather than failing here.
    fireEvent.press(getByLabelText('Mythic+'));
    await findByText('Cowl of the Deep Delve');
    fireEvent.press(getByLabelText('Raid'));
    await findByText('Edge of the Abyss');

    // Reopening over a different slot's list is worse than reopening shut.
    expect(queryByText(/Signet of Whispers/)).toBeNull();
  });

  it('groups the actionable rows by what the player would go and do', async () => {
    const { findByText, getByLabelText } = await board();
    await findByText('2 of 12 slots');

    // Collapsed by default, with the count in the header — see
    // CollapsibleSection for why these three are not open and quick wins is.
    fireEvent.press(getByLabelText('Bosses to prioritise, 2 items'));
    await findByText('The Hollow Queen · The Venomous Abyss (Main Hand, Trinket 1)');

    fireEvent.press(getByLabelText('Craft these, 1 item'));
    await findByText('Girdle of Woven Fangs');

    fireEvent.press(getByLabelText('Catalyst these, 1 item'));
    await findByText('Mantle of the Consecrated');
  });

  it('puts the quick wins above the rows, already open', async () => {
    const { findByText } = await board();

    // Five unenchanted enchantable slots, one empty socket, two
    // un-embellished slots — open, because they are the cheapest thing on
    // the board to act on.
    await findByText('Add an enchant to Chest (free ilvl-equivalent power)');
    expect(await findByText('Socket Neck (1 empty socket)')).toBeTruthy();
    expect(await findByText('Add an Embellishment to Shoulder')).toBeTruthy();
  });

  it('still derives the socket quick wins when the server sends no season slots', async () => {
    // A server older than the `seasonSlots` field. The enchant and
    // embellishment hints need it; sockets come off the character's own
    // equipment, so they must survive.
    mockGetMeta.mockResolvedValue(META_WITHOUT_SEASON_SLOTS);

    const { findByText, queryByText } = await board();

    await findByText('Socket Neck (1 empty socket)');
    expect(queryByText(/Add an enchant to/)).toBeNull();
    expect(queryByText(/Add an Embellishment to/)).toBeNull();
  });

  it('renders the whole board with the meta query never resolving', async () => {
    // Airplane mode on a launch that has never fetched /v1/meta. Everything
    // except the two season-scoped kinds of quick win is computed from the
    // character payload, which is already on the device.
    mockGetMeta.mockRejectedValue(new Error('offline'));

    const { findByText, getByText, queryByText } = await board();

    await findByText('2 of 12 slots');
    expect(getByText('Edge of the Abyss')).toBeTruthy();
    expect(getByText('Socket Neck (1 empty socket)')).toBeTruthy();
    expect(queryByText(/Add an enchant to/)).toBeNull();
  });

  it('says a spec has no list rather than showing an empty board', async () => {
    const { findByText, queryByLabelText } = await board({ entries: [], seeded: false });

    await findByText(/No BiS list has been published for this class and spec yet/);
    // No segments either — there is nothing behind any of them.
    expect(queryByLabelText('Raid')).toBeNull();
  });

  it('opens on the first segment that has a list', async () => {
    const mythicPlusOnly = BIS_ENTRIES.filter((entry) => entry.contentType === 'mythic-plus');

    const { findByText } = await board({ ...SEEDED, entries: mythicPlusOnly });

    // Not the empty Raid board, which looks broken.
    await findByText('Cowl of the Deep Delve');
  });

  describe('action panels', () => {
    /**
     * The seeded fixture deliberately has no unrouted upgrade: its one
     * vault target is a neck the character already out-levels. So this
     * builds the case rather than borrowing it — a PvP target, above the
     * equipped item, which no panel groups and which is therefore exactly
     * the row Phase 8's device pass saw go missing.
     */
    const withPvpTarget: CharacterBis = {
      ...SEEDED,
      entries: SEEDED.entries.map((entry) =>
        entry.slot === 'neck' && entry.contentType === 'raid'
          ? { ...entry, itemName: "Gladiator's Chain", itemLevel: 660, source: { type: 'pvp' as const } }
          : entry,
      ),
    };

    it('names the upgrades no panel can route you to instead of dropping them', async () => {
      const { findByText } = await board(withPvpTarget);

      await findByText(/Neck has an upgrade with no farm route/);
    });

    it('never claims everything is BiS while an upgrade is still listed', async () => {
      const { findByText, queryByText } = await board(withPvpTarget);

      await findByText(/no farm route/);
      // The exact sentence Phase 8's device pass caught sitting underneath
      // a screen of Major-gap rows.
      expect(queryByText(/every slot with a target is already best in slot/)).toBeNull();
    });

    it('stays quiet when every upgrade on the board is routed', async () => {
      const { findByText, queryByText } = await board();

      await findByText('Bosses to prioritise');
      expect(queryByText(/no farm route/)).toBeNull();
    });
  });
});
