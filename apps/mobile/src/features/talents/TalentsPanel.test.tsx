/**
 * The talents tab's contract.
 *
 * The phase's exit criterion is "the diff view is complete and usable on
 * its own", so most of these are about states rather than happy paths: a
 * character with no loadout, a spec with no seeded build, a payload whose
 * `talents` field came back null. Any of those could reasonably be an empty
 * screen, and none of them is.
 *
 * The panel is rendered directly. It takes two props, holds no query, and
 * the screen's own test covers the only thing that isn't a function of
 * them — that the tab exists once `FEATURES.talents` flips.
 */
import { fireEvent } from '@testing-library/react-native';

import { renderWithProviders } from '@/testing/render';
import {
  NO_LOADOUT_TALENTS,
  RECOMMENDED_TALENTS_FIXTURE,
  TALENTS_FIXTURE,
} from '@/testing/talentsFixture';

import { TalentsPanel } from './TalentsPanel';

function panel(
  talents = TALENTS_FIXTURE as Parameters<typeof TalentsPanel>[0]['talents'],
  recommended = RECOMMENDED_TALENTS_FIXTURE as Parameters<typeof TalentsPanel>[0]['recommended'],
) {
  return renderWithProviders(<TalentsPanel talents={talents} recommended={recommended} />);
}

describe('TalentsPanel', () => {
  it('leads with how close the build is, in picks rather than a percentage', async () => {
    const { findByText, getByLabelText } = await panel();

    await findByText('5 of 9 picks match');
    expect(getByLabelText(/Against the Mythic\+ build, 5 of 9 picks match/)).toBeTruthy();
    // The number is honest about what it covers.
    expect(
      getByLabelText(/Against the Mythic\+ build/),
    ).toBeTruthy();
  });

  it('names the content type the build is for rather than assuming', async () => {
    const { findByText } = await panel(TALENTS_FIXTURE, {
      ...RECOMMENDED_TALENTS_FIXTURE,
      contentType: 'raid',
    });

    await findByText(/Against the Raid build/);
  });

  it('opens on the differences, with the two actionable groups already expanded', async () => {
    const { findByText, getByText } = await panel();

    await findByText('Blinding Sleet');
    expect(getByText("Death's Reach")).toBeTruthy();
    // The detail shares a Text node with the tree label: "Class · You took …".
    expect(getByText(/You took Grip of the Dead/)).toBeTruthy();
  });

  it('keeps the two context groups folded behind their counts', async () => {
    const { findByText, getByLabelText, queryByText } = await panel();
    await findByText('Blinding Sleet');

    // Folded, but the header still says how many.
    expect(queryByText('Unholy Ground')).toBeNull();
    fireEvent.press(getByLabelText('Not in the build, 1 item'));
    await findByText('Unholy Ground');

    fireEvent.press(getByLabelText('Fewer points, 1 item'));
    await findByText(/You have 1 of 2; the build takes 2/);
  });

  it('states each difference as one sentence rather than a row of fragments', async () => {
    const { findByLabelText } = await panel();

    await findByLabelText("Death's Reach. Class talent. Different choice. You took Grip of the Dead");
  });

  it('shows the build itself on the second segment, grouped like the three trees', async () => {
    const { findByText, getByLabelText, getByText } = await panel();
    await findByText('Blinding Sleet');

    fireEvent.press(getByLabelText('This build'));

    await findByText('Class talents');
    expect(getByText('Deathbringer')).toBeTruthy();
    expect(getByText('Spec talents')).toBeTruthy();
    // The hero picks appear here, where they are information — never in the
    // diff, where they would be a verdict against nothing.
    expect(getByText("Reaper's Mark")).toBeTruthy();
  });

  it('says which way a choice node went', async () => {
    const { findByText, getByLabelText } = await panel();
    await findByText('Blinding Sleet');

    fireEvent.press(getByLabelText('This build'));

    await findByText("Choice of Death's Reach / Grip of the Dead");
  });

  it('congratulates an exact match instead of rendering an empty list', async () => {
    // Every recommended pick, at the recommended rank, and nothing else.
    const exact = {
      ...TALENTS_FIXTURE,
      current: [
        { nodeId: 100, rank: 2, optionIndex: 0 },
        { nodeId: 101, rank: 1, optionIndex: 0 },
        { nodeId: 102, rank: 1, optionIndex: 0 },
        { nodeId: 103, rank: 1, optionIndex: 0 },
        { nodeId: 200, rank: 1, optionIndex: 0 },
        { nodeId: 201, rank: 2, optionIndex: 0 },
        { nodeId: 202, rank: 1, optionIndex: 0 },
        { nodeId: 203, rank: 1, optionIndex: 0 },
      ],
    };

    const { findByText } = await panel(exact, {
      ...RECOMMENDED_TALENTS_FIXTURE,
      // Drop the stale node so the build is genuinely reachable.
      classSelections: RECOMMENDED_TALENTS_FIXTURE.classSelections.filter(
        (pick) => pick.nodeId !== 999,
      ),
    });

    await findByText(/matches the recommended one exactly/);
  });

  it('offers the build view when no recommended build is seeded', async () => {
    const { findByText, getByLabelText } = await panel(TALENTS_FIXTURE, null);

    await findByText(/No recommended talent build has been seeded/);
    // The tab is still worth opening: it can show what the character has.
    fireEvent.press(getByLabelText('This build'));
    await findByText('Class talents');
  });

  it('explains an empty loadout rather than showing an empty build', async () => {
    const { findByText, getByLabelText } = await panel(NO_LOADOUT_TALENTS, null);

    fireEvent.press(getByLabelText('This build'));
    await findByText(/No talents are selected on this character/);
  });

  it('treats a null talents payload as a normal state, not an error', async () => {
    // Nullable by contract for the same reason `progression` is.
    const { findByText, queryByLabelText } = await panel(null, RECOMMENDED_TALENTS_FIXTURE);

    await findByText(/Talents aren't available for this character right now/);
    expect(queryByLabelText('Differences')).toBeNull();
  });

  it('keeps the build notes available without spending the first screen on them', async () => {
    const { findByText, getByLabelText, queryByText } = await panel();
    await findByText('Blinding Sleet');

    expect(queryByText(/heavy single-target weeks/)).toBeNull();
    fireEvent.press(getByLabelText('Build notes, 1 item'));
    await findByText(/heavy single-target weeks/);
  });
});
