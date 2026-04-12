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

# Generate sprites
node scripts/generate-sprites.js
```
