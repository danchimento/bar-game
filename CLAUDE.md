# Bar Rush — Claude Code Guidelines

## Project Overview

Bar Rush is a Phaser 3 bar management game (vanilla JS, ES modules). The player
controls a bartender serving guests: taking orders, making drinks, and processing
payments.

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
  generation scripts. The scripts output PNGs at **2× art pixels** (each art
  pixel becomes a 3×3 block). The 3× is baked into the PNG file itself.
- **Phaser renders PNGs at native size — no `setScale()`.** What the PNG
  contains is exactly what appears on screen. The scaling happens once,
  at generation time, not at render time.
- **Never add `setScale()` to fix sprite sizing.** If a sprite is the wrong
  size on screen, change its art-pixel dimensions in the generation script
  and regenerate. Screen size = art pixels × 3.
- **There are 6 sprite generation scripts** — they ALL share `SCALE = 3` / `PIXEL = 3`:
  - `scripts/generate-sprites.js` (stations, guests, items, tiles, door)
  - `scripts/generate-bartender-sprite.js` (bartender standing)
  - `scripts/generate-bartender-carry-sprite.js` (bartender carrying)
  - `scripts/generate-animations.js` (walk cycles, drink animation spritesheets)
  - `scripts/generate-indicators.js` (icons, status indicators)
  - `scripts/generate-radial-icons.js` (radial menu icons, tap handles)
- **After changing ANY sprite, run ALL 6 scripts.** Mismatched scales between
  scripts cause characters to appear different sizes.
- **Spritesheet frame sizes in BootScene.js must match generated output.**
  Frame dimensions = art pixels × 3. If you change art dimensions, update
  `frameWidth`/`frameHeight` in BootScene.js to match.

### Tile Grid & Screen Layout
- **Tile size: 16px** (`TILE` exported from `js/layout/BarLayout.js`)
- **Canvas: 576px tall** (36 tiles), width is dynamic (device aspect ratio)
- The scene is a **side-view diorama** of structures on a ground plane:
  - **Wall** (tiles 0–4), **Bar counter** (tiles 17–21, surface + cabinet), **Back counter** (tiles 34–35)
  - **Customer area** (tiles 5–16) and **Bartender area** (tiles 22–33) are derived gaps between structures
- Station footprints and structure dimensions are always tile multiples
- See `docs/ARCHITECTURE.md` → "Screen Layout" for the full tile map

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

### Station Actions
- Station tap handlers live in the `STATION_TAP_HANDLERS` dispatch table at the bottom of `StationActions.js`
- To add a new station: add template to `STATION_TEMPLATES` in `levels.js`, add placement rule in `BarLayout.js`, add handler to dispatch table, add sprite in `generate-sprites.js`

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

## Development

```bash
# Start dev server
npx http-server . -p 8080

# Generate ALL sprites (run all 6 — they share the same 2x art-pixel scale)
node scripts/generate-sprites.js
node scripts/generate-bartender-sprite.js
node scripts/generate-bartender-carry-sprite.js
node scripts/generate-animations.js
node scripts/generate-indicators.js
node scripts/generate-radial-icons.js
```
