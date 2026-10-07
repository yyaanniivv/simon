# Simon Memory Game — Project Plan

## 🔜 Next steps
1. Merge chain: **#39 → #40** (auto-retargets to `main`); CD deploys automatically.
2. **Play-test #40 in a real browser** — press/hold/release feel, rapid two-color clicks, simon sync, press→sound latency (perception is the acceptance criterion).
3. Click-highlight clarity + responsive/mobile layout (PR D below).

### Working agreement
- **Every change must be tested** — each PR adds/updates tests covering its behavior (CI runs them via `ci.yml`).

## Changelog (done)
- **PR #38 — Sound toggle** ✅ merged: starts muted; accessible speaker button; persists in `localStorage` (`simon:soundOn`); fixed latent `playSound(0)` crash; 8 tests.
- **PR #39 — Board.jsx hygiene** (stacked): timer cleanup StrictMode-safe; stable `key={id}`; audio via refs + promise handling; input validation moved into reducer; TODOs resolved; reducer unit tests + fake-timer gameplay tests.
- **PR #40 — Sound on press-down via Web Audio** (open, stacked on #39): all sounds decoded once at mount; `AudioBufferSourceNode` started synchronously in the pointer handler; stopped on release/drag-off/cancel; `<audio>` elements removed; simon's ticks play exactly on the 450 ms beat; autoplay policy handled; 29 tests.
  - **Follow-up (same PR):** remaining press→sound latency was **in the mp3 files** — LAME encoder padding at 22/11 kHz baked in **76–151 ms of leading silence** (`decodeAudioData` doesn't skip gapless metadata). Trimmed silence + converted to **WAV** (zero codec delay, ~6–13 KB each); imports updated. Build + 29 tests green.

## Remaining

### PR D — UI responsiveness & feedback
- [ ] Click feedback clarity: the 200 ms highlight with pale `-clicked` colors may be too subtle/fast — tune duration/contrast, add CSS transitions. (Press is visually instant since highlight + sound share pointerdown.)
- [ ] Responsive layout: `.App` is fixed 480 px with 200 px buttons — make it mobile-friendly (relative units, media queries, viewport-based board sizing).

### PR C — Game-logic tests
- [ ] Extract reducer + sequence generation into a testable module; unit-test: sequence playback order/timing, correct input advances, wrong input resets + records top score, high score persistence across resets. (Reducer already exported by #39.)
- [ ] Component tests with Testing Library + user-event for a full play-through.

### Later
- [ ] Accessibility: clickable `<div>`s need roles, `tabIndex`, keyboard handlers, aria-labels (start button + game buttons; sound toggle already done).
- [ ] Consider React `StrictMode` in `index.jsx` — effects are cleanup-safe after #39.

### Housekeeping
- [ ] Play-test the live site once after deploy.
