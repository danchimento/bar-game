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
- Layout metrics: import from `js/constants/layout.js`
- Zone layout: import from `js/constants.js` (the zone-weight system)
- Never hardcode depth values or sprite offsets inline

### Station Actions
- Station tap handlers live in the `STATION_TAP_HANDLERS` dispatch table at the bottom of `StationActions.js`
- To add a new station: add entry to `STATIONS` array in `constants.js`, add handler to the dispatch table, add sprite in `generate-sprites.js`

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
1. Add to `STATIONS` array in `constants.js`
2. Add sprite generation in `scripts/generate-sprites.js`
3. Add placement type in `StationLayer.js` `STATION_PLACEMENT`
4. Add handler in `STATION_TAP_HANDLERS` in `StationActions.js`

## Development

```bash
# Start dev server
npx http-server . -p 8080

# Generate sprites
node scripts/generate-sprites.js
```
