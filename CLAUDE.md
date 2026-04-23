# Bar Rush — Claude Code Guidelines

## Project Overview

Bar Rush is a Phaser 3 bar management game (vanilla JS, ES modules). The player
controls a bartender serving guests: taking orders, making drinks, and processing
payments.

**Mobile-first.** Primary target is phones in portrait orientation. Always
verify layout changes against the `portrait` preset (not just `landscape`).
UI controls must be ≥44px tap targets.

## Key References

- `docs/ARCHITECTURE.md` — System architecture, directory structure, patterns
- `docs/GAME_DESIGN.md` — Authoritative game design spec
- `docs/STATIONS_AND_ITEMS.md` — Station definitions and item data
- `docs/GUEST_LIFECYCLE.md` — Guest state machine
- `docs/LEVELS.md` — Level design spec
- `docs/UI_AND_VISUALS.md` — Visual design and layout spec

## Architecture Rules

### Sprite System — CRITICAL
- All sprites are **procedural placeholders** — drawn pixel-by-pixel in Node.js
  scripts, not hand-drawn image files. To change a sprite's appearance or size,
  edit the JavaScript draw code and regenerate. When replacing with final art,
  drop PNGs directly into `assets/sprites/` and remove the generation scripts.
- Sprites are authored as **pixel art** using art-pixel coordinates in the
  generation scripts. Each art pixel becomes a block of screen pixels, where
  the block size is the sprite's **scale** (baked into the PNG at generation time).
- **Phaser renders PNGs at native size — no `setScale()`.** What the PNG
  contains is exactly what appears on screen. The scaling happens once,
  at generation time, not at render time.
- **Never add `setScale()` to fix sprite sizing.** If a sprite is the wrong
  size on screen, change its art-pixel dimensions (or pick a different scale
  tier) in the generation script and regenerate.

#### Scale tiers
Two scale tiers keep sprites proportional:
- **`SCALE = 6`** — the default. Humans (guests, bartender), stations, stool,
  door, tile textures, indicators, radial icons, service mat. Everything that's
  "human-proportional" or structural.
- **`ITEM_SCALE = 3`** — small hand-held items that should stay small relative
  to humans: glasses (pint, wine, cup), cash bills, tap handles, spills.
  Passed as the 5th argument to `createSprite(w, h, draw, filename, ITEM_SCALE)`.

If a sprite feels wrong-sized, the fix is either:
1. Change its **art-pixel dimensions** (e.g., glass_rack was shrunk from 84×24
   to 42×24 so it doesn't dominate the counter).
2. Move it to a different **scale tier** (the wrong scale would put it in the
   other tier — reconsider).

#### Sprite generation scripts (6 total)
After changing **ANY** sprite, run **ALL 6** scripts — mismatched scales
cause characters/items to render at inconsistent sizes.
  - `scripts/generate-sprites.js` — stations, humans, items, tiles, door, etc.
    (supports `ITEM_SCALE` override via `createSprite` 5th arg)
  - `scripts/generate-bartender-sprite.js` — bartender standing (6×)
  - `scripts/generate-bartender-carry-sprite.js` — bartender carrying (6×)
  - `scripts/generate-animations.js` — walk cycles, drink animation (6×)
  - `scripts/generate-indicators.js` — status indicators above guests (6×)
  - `scripts/generate-radial-icons.js` — radial menu icons + tap handles (6×)

#### BootScene frame sizes
Spritesheet frame dimensions in `BootScene.js` **must** match generated output.
Frame dimensions = `art pixels × scale`. Humans at 6× produce 24→144, 32→192,
48→288. Update `frameWidth`/`frameHeight` whenever art dimensions change.

### Tile Grid & Screen Layout
- **Tile size: 32px** (`TILE` exported from `js/layout/BarLayout.js`)
- **Bar extends full canvas width** — no side margins or U-legs
- The scene is a **side-view diorama** of structures on a ground plane
- Station footprints and structure dimensions are always tile multiples

#### Two layout presets (BOTH must be kept in sync)
`LAYOUT_PRESETS` in `BarLayout.js` defines `landscape` and `portrait`. When
tuning proportions, **update BOTH presets** — users on mobile hit `portrait`,
users on desktop hit `landscape`. A change to one without the other creates
platform-specific regressions.

- **Landscape — 18 tiles tall (576px)**, width adapts to device:
  - Wall (1T), Customer (9T), Bar surface (3T) + cabinet (1T),
    Bartender (2T), Back counter (2T)
- **Portrait — 32 tiles tall (1024px)**, width fixed to 576px:
  - Wall (9T), Customer (9T), Bar surface (3T) + cabinet (4T),
    Bartender (3T declared, stretches on tall devices), Back counter (4T)

Portrait exists for mobile; the canvas is tall and narrow, so the customer
area expands to give guests queue room. Landscape is wider and shorter with
tighter vertical zones.

#### Structure anchoring (CRITICAL — device aspect ratios vary)
Canvas height is **not always `tiles × TILE`**. On mobile the canvas height
is `CANVAS_W × device aspect`, which usually exceeds the preset's tile sum
(e.g. portrait preset totals 32T = 1024px but an iPhone canvas is ~1244px).
To keep the game looking right on every device:

- **Wall anchors to canvas TOP** (y=0)
- **Back counter anchors to canvas BOTTOM** (`bottom = canvasH`)
- **Bar counter** uses its declared tile position (floats in the middle)
- **Derived gaps** (customer area above bar, bartender area below bar)
  **stretch** to absorb any extra canvas height

This means on a tall device the bartender area grows beyond its declared
4T (portrait) — which is fine, bartender just gets more walk room.

#### Don't fix layout bugs in the rendering layer
If you see a visual gap (e.g. "I can see the floor below the back counter")
and you're tempted to stretch/clip/offset a sprite in a layer file to cover
it — **stop**. That's a symptom of BarLayout's logical bounds not matching
the actual canvas. Fix the bounds in BarLayout so rendering reads the right
geometry. Rendering layers should reflect the model, not patch around it.

Red flags that you're patching instead of fixing:
- Using `canvasH - someY` as a render height in a layer file
- Hardcoded offsets that drift the sprite away from where `barLayout` says
  it should be
- Visual size differs from the logical zone size reported by `DebugLayer`

### BarLayout (spatial positioning)
- **`BarLayout`** (`js/layout/BarLayout.js`) is the **single source of truth** for all spatial positions
- Station positions, seat positions, bar bounds, zone coordinates, walk track Y — all come from BarLayout
- Created once per level in `GamePlayScene.create()`, passed to every layer and system
- **Never import position constants** (BAR_LEFT, WALK_TRACK_Y, etc.) from `constants.js` — read from `barLayout` instead
- Stations and seats have a `t` parameter (0–1) along the bar path, enabling future curved bar layouts
- To add a seat count or station list, modify the level definition — BarLayout computes positions

### Modals
- All modals **must** extend `BaseModal` (`js/phaser/modals/BaseModal.js`)
- Override `_build()` to populate content, `_onUpdate(dt)` for per-frame logic
- Use `_requestClose(eventName)` to close — never call `hide()` from within the modal
- Animated modals (zoom) use LOCAL coords (0,0 = center); non-animated use SCREEN-ABSOLUTE coords

#### Derive layout from game data — never hardcode positions
Modal layout positions (sprite Y, bar Y, item zones) **must** be derived
from the game's spatial constants (`GUEST_SIT_SCREEN_H`,
`GUEST_BAR_OVERLAP_PX`, bar tile counts) and a declared zoom factor —
never hardcoded as magic numbers. This ensures modals stay correct when
art dimensions or layout rules change.

**Pattern** (see `GuestModal.js` for the canonical example):
1. Declare `SPRITE_ZOOM` — the display multiplier applied to the 6× PNG
2. Compute all Y positions from sprite geometry + bar overlap rules
3. Import constants from `js/constants/layout.js` — don't redefine them
4. The anchor relationship is: guest hands Y === bar surface top Y

If a position looks wrong, fix the derivation chain — don't adjust a
constant by eye. A single screenshot with debug on will reveal whether
the computed positions match the visual.

#### Debug indicators (REQUIRED for all modals and UI components)
Every modal and interactive UI **must** include a `_drawDebug()` method that
renders diagnostic overlays when the debug toggle is active. This is not
optional — new UI without debug indicators will need them added before shipping.

**Pattern:**
1. Create `this._debugGfx = scene.add.graphics()` in `_build()`, add to `_content`
2. Call `this._drawDebug()` in `_onUpdate(dt)` (every frame)
3. Check `this._debugEnabled` (inherited from BaseModal, reads `localStorage`)
4. Clean up `this._debugGfx = null` in `_onTeardown()`

**What to draw (color conventions):**
- **Cyan** (0x00ffff, 0.8): panel/content bounds
- **Yellow** (0xffff00, 0.7): interactive tap zones
- **Red** (0xff4444, 0.8): cancel/negative button bounds
- **Green** (0x44ff44, 0.8): confirm/positive button bounds
- **Orange** (0xffaa00, 0.5): reference Y-lines (shelves, bar surface, spouts)
- **Lime** (0xaaff00, 0.4): item position guides
- **Magenta** (0xff33cc, 0.9): animation paths, sprite bounds

See `DrinkModal._drawDebug()` and `GlassModal._drawDebug()` for examples.

#### Portrait modal layout (CRITICAL for mobile)
Station modals (GlassModal, DrinkModal) use a **single centered panel** with a
**standard button pair** at the bottom — NOT a side-by-side split-panel:

```
┌─────────────────────────────────────┐
│          GRAPHICS AREA              │  ~85% canvas width, centered
│     (glass shelf / tap handles /    │
│      pour animation / etc.)         │
├──────────────────┬──────────────────┤
│   ✕ Step Away    │   ✓ Action       │  always exactly 2 buttons
│   (red, left)    │   (green, right) │  red = cancel, green = confirm
└──────────────────┴──────────────────┘
```

**Button rules:**
- **Left (negative, red)**: always active, always closes the modal
- **Right (positive, green)**: starts **disabled** (gray). Enables when the
  player has made a selection (GlassModal: glass tapped) or performed an
  action (DrinkModal: beer poured into glass)
- Disabled state: `0x2a2a2a` fill, `#666666` text, `disableInteractive()`
- Enabled state: `0x3a6a3a` fill, `#ffffff` text, green border, interactive

**Do NOT use split-panel layouts** (left content + right buttons). Those were
designed for landscape and break on portrait mobile.

### Animations
- Always use **time-based** animation (`dt` or `scene.time.now`), never frame-based
- For smooth lerps: `1 - Math.pow(0.001, dt)` instead of fixed `0.2` per frame
- Easing: cubic ease-out for opens, cubic ease-in for closes
- No Phaser Tweens — all animation is manual in update loops

### Constants
- Depths: import from `js/constants/depths.js` (`DEPTH.MODAL`, `DEPTH.GUESTS`, etc.)
- Sprite metrics: import from `js/constants/layout.js` (carry offsets, zone sizes, etc.)
- Canvas dimensions + game logic: import from `js/constants.js`
- **Position/layout values: read from `barLayout`** — not from constants.js
- **Depth ordering**: `BAR_SURFACE (5) < GUESTS (6) < BAR_ITEMS (7) < ... <
  MODAL (70) < DebugLayer (~102)`. Guests sit above bar surface so their
  hands on the bar are visible. DebugLayer sits above everything, even modals.
- **Guest-bar overlap rule**: only the guest's **hands** (sitting sprite art
  rows 18–19) should cross the bar surface. `GUEST_BAR_OVERLAP_PX = 108`
  (= row 18 × 6). Torso, arms, head all sit above the bar. If you see the
  forearms crossing the bar, the overlap value drifted toward row 15 (90).

### Station Actions
- Station tap handlers live in the `STATION_TAP_HANDLERS` dispatch table at the bottom of `StationActions.js`
- To add a new station: add template to `STATION_TEMPLATES` in `levels.js`, add placement rule in `BarLayout.js`, add handler to dispatch table, add sprite in `generate-sprites.js`

### Station placements
`STATION_PLACEMENT` in `BarLayout.js` controls a station's Y position and
X-distribution group. Stations within the same placement are distributed
evenly across the bar; different placements don't share horizontal space.
- `on_counter` — sits on the back counter (TAPS, POS, MENU, WINE, PREP).
  Origin `(0.5, 1)` — sprite bottom anchors at the counter surface.
- `in_counter` — embedded in back counter (SINK). Origin `(0.5, 0.5)`.
- `under_bar` — behind the bar at floor level (GLASS_RACK, DISHWASHER).
  Origin `(0.5, 0)` — sprite TOP anchors at `cabinetTop` and extends down
  into the bartender area. This keeps tall under-bar sprites from crossing
  the bar surface into customer view.
- `floor_left` — pinned to bottom-left of bartender area (TRASH). Uses
  `pinnedX` to skip even distribution — keeps its corner position regardless
  of other stations. Origin `(0.5, 1)`.

**Origins must match between `StationLayer` and `DebugLayer`** — the debug
overlay computes sprite bounds from the placement's origin, so a change
in one must be mirrored in the other.

### Debug Overlay — use this instead of guessing
A `DebugLayer` (`js/phaser/layers/DebugLayer.js`) draws on top of everything
when toggled. Tap the **green "D" button** in the top-right corner (56×56
tap target, persists via `localStorage['bar-game-debug']`).

When on, it shows:
- Tile grid (32px)
- Zone bands with Y-range + tile count labels
- For each station: **declared width footprint (yellow dashed) vs actual
  rendered sprite bounds (red solid)** — overlaps show up instantly
- Seat positions, door, walk track, service mat Y
- Info strip: canvas size, tile size, bar width, counts

**Visual-iteration workflow** (use this for positioning/sizing issues):
1. Ask the user to enable debug, screenshot, and share the image
2. Read coordinates directly off the overlay — don't calculate
3. Make the fix
4. Ask for a second screenshot to verify, or take one yourself if a
   screenshot pipeline is available

Do **not** guess coordinates or iterate blind. A single screenshot with
debug on usually beats 5 rounds of math.

### Events
- Modals emit close events (e.g., `glass-modal-close`, `pos-close`)
- GamePlayScene handles events and sets `*ModalState.visible = false`
- The `_syncModal()` helper polls state flags in the update loop

## Common Tasks

### Adding a new modal
1. Create `js/phaser/modals/NewModal.js` extending `BaseModal`
2. Set `closeEvent` in the super constructor
3. Override `_build()` with content
4. Add state object in `GamePlayScene.create()` (e.g., `this.newModalState = { visible: false }`)
5. Create the modal instance: `this.newModal = new NewModal(this)`
6. Add `_syncModal()` call in the update loop
7. Add event handler for the close event

### Adding a new station
1. Add to `STATION_TEMPLATES` in `js/data/levels.js` (with width)
2. Add placement type in `STATION_PLACEMENT` in `js/layout/BarLayout.js`
3. Add sprite generation in `scripts/generate-sprites.js`
4. Add handler in `STATION_TAP_HANDLERS` in `js/systems/StationActions.js`
5. Include the station ID in a level's `stations` list

### Adding seats
- Set `seats: N` in the level definition in `js/data/levels.js`
- BarLayout distributes them evenly across the bar width

### Git Workflow
- **Always develop on `main`** — do not create feature branches unless explicitly asked
- If a task creates a feature branch (e.g., from an external tool), merge it back to `main` and push before finishing
- Commit frequently with descriptive messages
- Push to `main` after each logical milestone so changes are immediately visible

## Development

```bash
# Start dev server
npx http-server . -p 8080

# Generate ALL sprites (run all 6 — they share `SCALE = 6` by default;
# `generate-sprites.js` also has `ITEM_SCALE = 3` for small handheld items)
node scripts/generate-sprites.js
node scripts/generate-bartender-sprite.js
node scripts/generate-bartender-carry-sprite.js
node scripts/generate-animations.js
node scripts/generate-indicators.js
node scripts/generate-radial-icons.js
```
