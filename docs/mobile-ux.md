# Mythos Mobile — Web → Mobile UX Mapping

Companion to `architecture.md` and `api-contract.md`. This is a redesign for
touch, not a port — a 1440px paper doll does not become a 390pt paper doll by
shrinking. Two web surfaces (`meta.astro`, the progression panels on the
character page) are added to the original brief's mapping table below, since
the code has them and the original brief didn't.

## Navigation shape

Per `architecture.md` Section 8.10, **v1 ships Gear + Progression only** —
`meta` and the Talents tab are deferred to 1.1. Two navigation shapes below:
what actually ships in v1, and the 1.1 shape it grows into. Building the tab
bar with a Meta slot from day one (even disabled/hidden) avoids a nav
restructure at 1.1. **Phase 4 decided this: the slot exists and is hidden** —
the route file `app/(tabs)/meta.tsx` and its `Tabs.Screen` entry are both
there, with `href: null` while `FEATURES.meta` is false
(`architecture.md` Section 9.4).

**v1 — bottom tabs, two primary destinations plus settings:**

- **Search** (`index.tsx`) — the app's home. Full-screen search + recent
  characters. This is where a cold launch lands.
- **Character** (`character/[region]/[realm]/[name].tsx`) — not a persistent
  tab; pushed from Search or from a deep link. Top tab/segmented navigator
  for **Gear / Progression** only (see "Character screen structure" below —
  no Talents tab in v1).
- **Settings** — About/disclaimer, clear recent characters. No light/dark
  toggle in v1 (dark-only, `architecture.md` Section 8.9).

**1.1 — adds:**

- **Meta** (`meta/index.tsx`, `meta/[class]/[spec].tsx`) — the tier list,
  browsable with zero prior character lookup. Justified because `/meta` is a
  real, independent context (see `architecture.md` Section 3); backed by the
  two `meta/*` endpoints in `api-contract.md`, both already specced.
- A **Talents** tab on the character screen (diff-first list; the pannable
  tree stays out of scope even at 1.1 per the original brief's
  recommendation).

## Mapping table

| Web surface | Mobile treatment |
|---|---|
| `SearchForm` + `RealmCombobox` (popover autocomplete) | **Built in Phase 5.** Full-screen search, native keyboard-aware list; region as a segmented control (four regions — `cn` is excluded, `architecture.md` Section 10.6); recent characters as a persisted list (`useRecentCharacters`'s localStorage → MMKV, max 8). Suggestions render inline below the field rather than in a popover, which is what removes the web component's click-outside handling. The shape and dedup rule are the web's with two deliberate changes — case-insensitive name dedup and an optional `className` — both recorded in `architecture.md` Section 10.5. The web's `NameCombobox` popover is folded into the always-visible recents list, which narrows as you type: same behaviour, one fewer surface. |
| `PaperDoll` (two flanking columns + center render) | **Built in Phase 6.** Responsive grid of slot tiles (2 cols portrait, 3–4 landscape/tablet). Tapping a slot opens a **bottom sheet**: equipped vs. target, gems, enchant, source, Wowhead link — replaces the hover `Tooltip`, which has no touch equivalent. `DomainItem`'s full-tooltip fields (armor line, weapon lines, stat lines, procs, set info) render in the sheet exactly as composed server-side — no re-derivation needed, it's already display-ready text. |
| `StatsPanel` bar chart | **Built in Phase 6.** Compact horizontal bars, stat-priority order preserved (from `bis.statPriority` when seeded), values as text — never color alone. |
| `UpgradeBoard` `Tabs` (Raid / M+ / PvP) | **Built in Phase 7**, as the third block of the Gear tab. Segmented control (the same `SegmentedControl` primitive as Gear/Progression); content per segment computed on-device via `compareGear`/`deriveActionGroups` from `packages/core`, so switching is instant and works offline — the whole reason those functions are pure and shared. It opens on the first segment that has entries, and a segment with none says so rather than disappearing: two of three content types seeded is what a real seed file looks like. |
| `CompletionMeter` (`role="progressbar"`) | **Built in Phase 7**, as the shared `Meter` (`accessibilityRole="progressbar"` + `accessibilityValue`, count always rendered as text) inside a panel. One fix in translation: the web's label reads "Raid BiS completion" on all three of its tabs; the mobile label follows the segment. |
| `ComparisonRow` + `SeverityChip` | **Built in Phase 7 — as plain views, not FlashList.** See `architecture.md` Section 12.2: the list is bounded by a closed 14-entry union at sixteen rows, and nesting a same-axis `FlashList` in the screen's `ScrollView` does not virtualise anyway. The web's three columns become a vertical stack with the delta as a labelled divider — three columns at phone width give each item name about eleven characters. **The colorblind-safe construction is kept** (color + distinct icon + text label, never color alone), and a test asserts the four glyphs are four different shapes rather than one shape in four colors. |
| `ActionPanels` / `QuickWinsPanel` | **Built in Phase 7.** Collapsible sections with their item count in the header; quick wins (missing enchants/gems/embellishments) surface first — highest value, lowest effort, deserves the first screen on a phone — and are the only section open by default. Their season-scoped half comes from `/v1/meta`'s `seasonSlots`, never from a list compiled into the app. |
| **`RaidProgressionPanel`** *(not in original brief)* | **Built in Phase 6.** A "Progression" tab alongside Gear: per-difficulty boss checklist (LFR/Normal/Heroic/Mythic), boss name + killed/total + last-kill relative time. Renders even when all-empty ("no kills yet this tier" is a real, common state per `mapRaidProgress`'s doc comment — not an error). |
| **`MythicPlusPanel`** *(not in original brief)* | **Built in Phase 6.** Same "Progression" tab: current M+ rating + per-dungeon best-run cards (level, timed y/n, score, duration). A dungeon with `run: null` renders as an empty card, not omitted — matches the web's "always show the full dungeon list" behavior. |
| `TalentTree` (large pannable 2D grid) | **Built in Phase 8, gated off** behind `FEATURES.talents` (`architecture.md` Section 8.10 defers the surface to 1.1). Two segments: **Differences** (default) and **This build**. The differences are grouped into four kinds — not taken, different choice, fewer points, not in the build — because `diffTalents`' single "missing" bucket merges a real gap with a deliberate choice. **The pannable tree was not built, as this row already said it would not be**: a class tree is ~20x10 cells of 40px icons, so on a phone it is either unreadable or a two-axis pan, and the thing a player would pan it for — changing a talent — can only be done in the game. "This build" is a grouped list that replaces it rather than falling back from it; see `architecture.md` Section 13. |
| `RefreshButton` | **Built in Phase 6.** Pull-to-refresh + an explicit header button for discoverability; on `429` show the cooldown countdown from `retryAfterSeconds`, never a bare error. |
| `ErrorState` | **Built in Phase 6.** Per-error-code screens driven by the `code` field in the error envelope (`api-contract.md`): not found, private profile, Blizzard unavailable (render the stale snapshot if one exists instead of an error page), offline, update required. |
| OG image route | Native share sheet sharing the **web character URL** — the existing OG route renders the preview wherever it lands. Free parity, zero new mobile work. |
| Layout disclaimer footer | Blizzard IP disclaimer in Settings/About — required, not optional (App Store Guideline 5.2 risk, per the original brief's Section 10). |
| **`meta.astro`** (tier list) *(not in original brief; deferred to 1.1)* | Meta tab, top level: segmented Raid/M+ tier list, S/A/B/C grouped sections, each row a class/spec with role icon. Tapping a row pushes the spec-build screen. |
| **`meta/[class]/[spec].astro`** (spec build) *(not in original brief; deferred to 1.1)* | Spec-build detail screen: recommended talent build (diff-first list, same component as the character talents tab, seeded from `/v1/meta/spec-build`'s `mythicPlusBuild`/`raidBuild` instead of a diff against a live character), plus both tier badges. Reachable from Meta tab or, on the character screen's Talents tab, via a "see the meta build" link. |

## Character screen structure

**v1:** top-level segmented/tab navigator inside the character route:
**Gear** (paper doll + stats + upgrade board — default tab) · **Progression**
(raid + M+ panels). Both render from the single `/v1/character/...` payload —
no per-tab network call, matching the "one round trip" rule in
`api-contract.md`. Switching tabs never shows a spinner; it's all already on
the device.

**1.1:** adds a third **Talents** tab — a diff against the recommended build
and the character's own build as a list, no tree. It reads
`talents`/`recommendedTalents` off the same already-fetched
`/v1/character/...` payload; those fields ship in v1's response shape
specifically so this is a client-only addition at 1.1, not a schema change
(`api-contract.md`'s note on the character endpoint). **Built in Phase 8 and
gated off**, so 1.1 is a `FEATURES.talents` flip and nothing else — a test
file asserts the tab is absent with the flag off, and another asserts it
appears after Progression with the flag on and the two v1 tabs untouched.

## Accessibility parity (requirement, not a phase-10 nicety)

> **Phase 9 measured every item below on a device.** Four held as written;
> two did not, and one of those was wrong everywhere. The results are in
> `architecture.md` Section 14, and the individual claims further down this
> document have been corrected where the measurement contradicted them.
> Read that section before trusting a "≥44pt" or "announces correctly" in
> here — several were true of the source and false of the screen.


The web app ships keyboard nav, visible focus, `aria-label`s, a skip link,
colorblind-safe severity, and `prefers-reduced-motion` respect. Mobile
equivalents:

- `accessibilityLabel`/`accessibilityRole` on every interactive element,
  including the new Progression screen's cards/rows (and, at 1.1, Meta's).
- VoiceOver/TalkBack passes on the character screen (both v1 tabs; add the
  Talents tab and the Meta tier-list screen to the pass at 1.1).
- Dynamic Type support — no fixed font sizes that clip, especially in the
  paper-doll slot tiles and tier-list rows, which are the most space-
  constrained layouts.
- ≥44×44pt touch targets throughout, including slot tiles and severity chips.
  **Measured at 38.5dp in Phase 9 and fixed.** Every target was written
  `min-h-11`, which reads as 44 and is not: NativeWind's `inlineRem`
  defaults to 14, not 16. Touch targets are now `min-h-[44px]` — a
  measurement, not a scale step. See `architecture.md` 14.1.
- `AccessibilityInfo.isReduceMotionEnabled` gating any tab-switch or
  bottom-sheet animation.
- Item-quality colors remain **borders only**; item-name text stays in the
  default high-contrast color, matching the web app's WCAG AA rationale
  (epic purple fails 4.5:1 on the dark panel) — do not "fix" this back to
  quality-colored text on mobile.

## Decisions applied from `architecture.md` Section 8

- **v1 scope (8.10):** Gear + Progression. Meta and Talents rows above are
  marked deferred to 1.1 throughout this document.
- **Theme (8.9):** dark-only for v1 — no light/dark toggle in Settings until
  a later release; applies uniformly across every screen in the mapping
  table above, not decided per-screen.

## What the search screen settled (Section 10)

The first screen actually built, so it set precedents the rest inherit:

- **Offline is the design, not a fallback.** Nothing on the search screen
  requires the network. The recents come from MMKV, the search button is
  never gated on autocomplete, and the season line is simply absent when
  `/v1/meta` is unreachable rather than becoming an error. The two
  degraded autocomplete states — offline, and the server serving sample
  realms — are one line of hint text each. Later screens should reach for
  this shape before reaching for an error state.
- **Recents are recorded on the character screen, not the search form**, so
  deep links count and the stored name is Blizzard's spelling
  (`architecture.md` Section 10.4).
- **Accessibility is built in, not deferred to Phase 9.** Every field has a
  real visible label that doubles as its accessibility label — a placeholder
  is not a substitute for the web's `<label>`; the region control is a
  `radiogroup` of `radio`s so it announces "2 of 4"; every target is ≥44pt
  (**believed, not measured — it was 38.5dp until Phase 9 fixed it**);
  and the class color on a recent row is decoration, with the class also
  spelled out in the row's label. Phase 9's pass should be confirming this,
  not retrofitting it.

## What the character screen settled (Section 11)

The second screen built, and the one that turned the snapshot model in
`architecture.md` Section 5 into pixels:

- **The v1 tab shell is complete.** Gear and Progression both exist and both
  render, from the one `/v1/character/...` payload — switching tabs makes no
  request and shows no spinner, which is the property the "Character screen
  structure" section above asks for by name. Talents slots in at 1.1 as a
  third entry in the tabs array plus its content, not a restructure.
- **Offline is a *state*, not a failed request.** The search screen's rule
  ("offline is the design, not a fallback") is stronger here, because this
  screen does need the network. The resolution: the platform's own
  connectivity is read directly, so the banner can be honest before anything
  has been tried, and a failed request over an existing snapshot is a banner
  rather than the `ErrorState` row above. The error screen is reserved for a
  character this device has never successfully loaded.
- **The refresh cooldown counts down.** The web shows a fixed "On cooldown
  (60s)"; this shows the remaining seconds, both on the button and in a line
  beneath it, and pull-to-refresh is disabled while it runs so the gesture
  cannot produce a failure the user has to read. The countdown is announced
  once, on entry, rather than as a live region — a live region on a 1Hz
  counter interrupts a screen reader sixty times in a row.
- **Colorblind-safe construction held everywhere it was tested.** Every
  boss check, every timed/depleted glyph and every tier-set bonus carries a
  word as well as a color, and item quality stays on icon borders in the
  slot sheet as well as the tiles — including where the web's own tooltip
  breaks that rule (see `architecture.md` Section 11.6).
- **The `metaTier` badge is deferred with the rest of Meta.** It is a rank
  within a list this release does not ship; see Section 11.7.

## What the upgrade board settled (Section 12)

The third screen built, and the one the rest of the app exists to reach.

- **The whole board is a pure function of data already on the device.** It
  makes no request: `data.bis` came with the character in the one round trip,
  `compareGear`/`deriveActionGroups` run on device, and the season's slot
  rules come from the `/v1/meta` the launch screen already fetched. That is
  what makes segment switching instant, and it is why the test for
  "instant" asserts an absence of requests rather than a duration.
- **The mapping table's `FlashList` was not used, on purpose.** Sixteen rows
  is the schema's own ceiling, and a same-axis virtualised list nested in the
  screen's `ScrollView` does not virtualise anyway. `architecture.md` Section
  12.3 has the full reasoning; the row above has been amended so the table
  and the code do not disagree.
- **Section order is the mobile order, not the web's.** Meter, quick wins,
  comparison rows, action panels — the quick wins are lifted above the rows
  because this document asks for them on the first screen, and they are the
  only section open by default.
- **Colorblind-safe survived the port, and is now tested.** Every severity is
  a color *and* a distinct glyph *and* a word, and a unit test asserts the
  four glyphs are four different shapes rather than one shape in four fills —
  which is the failure mode a "keep the icons" instruction actually produces.
- **A row announces as a sentence.** The accessibility parity section above
  asks for `accessibilityLabel`s on every interactive element; a comparison
  row is not interactive, and eleven separate labels for its fragments would
  have satisfied the letter of that and been useless. One composed sentence
  per row, one separate stop for the alternatives disclosure.
- **Empty is a state with copy, in three places.** A spec with no BiS list, a
  content type with no entries, and a dual slot with only one seeded target
  each say what is true. None of them is an error, and none of them is a
  blank.

## What the talents tab settled (Section 13)

The fourth surface built, the first built for a release it does not ship in,
and the one that declined the hardest port in this document on purpose.

- **The pannable tree was not built, and this document is why.** The mapping
  row above has said "the pannable tree stays out of scope even at 1.1" since
  Phase 1, and Phase 8 held to it rather than quietly reinstating it. What
  replaced it is a grouped list of the character's picks — one scroll axis,
  readable by a screen reader, and an answer to the question the tree was
  being read to answer. It is a replacement, not a fallback; calling it a
  fallback would imply something better is still coming.
- **The diff is grouped by *why* a pick differs, not just *that* it does.**
  `diffTalents` merges "never took it" with "took the other side of a choice
  node", and those are different sentences to read on a phone. Four groups,
  each with its count in a collapsible header, the two actionable ones open.
- **Nothing on this screen grades the player.** A recommended build is one
  seeded opinion about one content type. The group titles are descriptive
  ("Different choice", "Fewer points"), the headline is a count rather than a
  percentage, and a test asserts the copy contains neither "wrong" nor
  "should". This is a UX decision with a test, which is the right shape for
  a rule that is easy to erode a word at a time.
- **The accessibility rules from the last two screens held without
  restatement.** A difference row is one composed sentence, not five
  fragments; every group is colour *and* glyph *and* word; every target is
  ≥44pt because it is the same `CollapsibleSection` and `SegmentedControl`
  the other screens use — which also meant every screen inherited the same
  38.5dp mistake, and one fix in the primitives corrected all of them. That
  the rules cost nothing to apply here is the return on having built them as
  primitives — and that one miss propagated everywhere is the cost.
- **Every empty state has copy.** No loadout on the character, no seeded
  build for the spec, a `talents` field that came back null, and a build that
  matches exactly — four states that could each be a blank screen, and none
  of them is.

## What the polish pass settled (Section 14)

The first phase with no new screen in it, and the first whose findings came
from a device rather than from a test.

- **Loading has a shape.** The character screen's spinner is now a skeleton
  that traces the real layout, so the data arriving changes what is in the
  blocks and not where the blocks are. It is one announcement — "Loading
  Arthas, busy" — over forty silent placeholders, because a screen reader
  reading out sixteen grey rectangles is worse than a spinner. With reduce
  motion on, the pulse stops and the shapes stay.
- **Dynamic Type reshapes the paper doll, it does not only stretch it.**
  Above roughly 1.9× the grid drops to a single column, and the item name's
  two-line clamp lifts above 1.3×. The rule is one line —
  `width / fontScale` — and it covers large text, narrow phones and tablets
  together rather than as three special cases.
- **Haptics are three named events, and the list is closed.** The segmented
  control on an actual change, and pull-to-refresh succeeding or failing.
  Nothing with a visible, immediate result gets one: a tile that opens a
  sheet, a link, a text field. An app that buzzes at everything teaches
  people to ignore the buzz, so the bar for a fourth is the bar these three
  cleared — *a state change you cannot see coming, or a selection made
  without looking.*
- **Icons are decoration, app-wide and by construction.** Every icon in the
  app goes through `components/Icon.tsx`, which hides it from the
  accessibility tree. The tab bar was announcing ", Search" before this —
  an icon font's glyph is a `<Text>` with no spoken form, and it contributes
  an empty fragment to every merged description it sits inside.
- **A label is composed once, or it says everything twice.** The tier tile
  announced "Tier set: 4 of 5 pieces, 4pc active: 4/5, 4pc active" because
  its caller passed a hint that already contained the value. Where the
  readable form and the speakable form differ — "4/5" against "4 of 5
  pieces" — they are now two props, not one string doing both jobs.
- **An empty panel set is not an empty board.** The upgrade board no longer
  claims everything is BiS when it merely has nothing to route you to; it
  names the upgrades whose targets come from the vault, PvP, world drops or
  professions, both as the empty state and as a line under the panels when
  they render without covering everything.
- **Dark-only is confirmed for v1.** The question this phase was asked to
  settle — whether light mode exists at all — is answered no, and the token
  structure that would make it additive is unchanged.
- **Open, and on the record: the slot sheet does not contain screen-reader
  focus on Android.** A swipe walks out of the open sheet into the tiles
  behind it. The containment is written and works on iOS; Android's
  `importantForAccessibility="no-hide-descendants"` had no effect under RN
  0.86's New Architecture, through three different attempts. See
  `architecture.md` 14.2 — it is the phase's one unfixed defect, and it has
  a named set of options rather than a shrug.
