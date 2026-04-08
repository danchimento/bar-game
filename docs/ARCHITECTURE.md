# Architecture Overview

## Directory Structure

```
js/
  constants.js              # Zone layout, stations, game state, timers
  constants/
    depths.js               # Centralized depth registry for all display objects
    layout.js               # Sprite metrics and UI layout constants
  data/
    levels.js               # Level definitions (stations, drinks, spawn schedules)
    menu.js                 # Drink/glass/garnish definitions
    guestAppearances.js     # Guest sprite appearance IDs
  entities/
    Bartender.js            # Bartender state (position, carrying, actions)
    Guest.js                # Guest state machine (arrival → order → drink → pay → leave)
    GlassState.js           # Glass fill state (layers, pour, overflow)
  systems/
    BarState.js             # Bar world state (dirty seats, cash, service mat, carry)
    GuestManager.js         # Guest lifecycle (spawn, seat assignment, sipping)
    StationActions.js       # Station tap dispatch + modal openers
  ui/
    HUD.js                  # HUD data model (tips, time, messages)
    RadialMenu.js           # Radial menu data model
  phaser/
    BootScene.js            # Asset loading
    GamePlayScene.js        # Main game scene (wires everything together)
    modals/
      BaseModal.js          # Shared modal lifecycle (container, dim, animation)
      GlassModal.js         # Glass cabinet (extends BaseModal, zoom animation)
      DrinkModal.js         # Beer taps / wine bottles (extends BaseModal)
      PrepModal.js           # Ice, garnishes, mixers (extends BaseModal)
      POSModal.js           # Point-of-sale terminal (extends BaseModal)
      GuestModal.js         # Customer interaction (extends BaseModal)
    layers/
      BarLayer.js           # Bar surface, stools, clock
      StationLayer.js       # Back counter stations
      BartenderLayer.js     # Bartender sprite + carry indicator
      GuestLayer.js         # Guest sprites + sip animation
      BarItemsLayer.js      # Drinks at seats, dirty markers, cash, service mat
    ui/
      HudUI.js              # HUD rendering
      RadialMenuUI.js       # Radial menu rendering
      PauseUI.js            # Pause overlay
    utils/
      GlassRenderer.js      # drawGlass() utility
```

## Key Architecture Patterns

### Zone Layout System (`constants.js`)

The screen is divided into 6 proportional zones (wall, guest area, bar top,
bar cabinet, floor, counter). Zone weights resolve to pixel ranges via
`resolveZones()`. All Y-coordinates derive from these zones — change a weight
and everything cascades.

Width adapts to device aspect ratio via `initCanvas()` (called once at boot).
Station X positions scale proportionally from a 960px baseline.

### Modal System (`BaseModal.js`)

All modals extend `BaseModal`, which provides:
- Container at depth 70 with dim overlay
- `show()` / `hide()` / `visible` lifecycle
- Optional zoom animation (if `origin` passed to `show()`)
- `_requestClose(eventName, data)` — animated or instant close with event emission
- `_build()` / `_onUpdate(dt)` / `_onTeardown()` hooks for subclasses

**Coordinate systems:**
- Animated modals (GlassModal): content container at screen center, LOCAL coords
- Non-animated modals (all others): content at (0,0), SCREEN-ABSOLUTE coords

**State management:**
- GamePlayScene owns `*ModalState.visible` flags
- `_syncModal()` helper polls state → show/hide/update in the update loop
- Modals emit close events; GamePlayScene handlers set state.visible = false

### Station Tap Dispatch (`StationActions.js`)

Station taps route through a data-driven dispatch table (`STATION_TAP_HANDLERS`)
instead of a switch statement. Each entry is a function receiving `(actions, station)`.

The common pattern is `walkThenAct(station.x, () => openModal())`.

### Animation Approach

The codebase does NOT use Phaser Tweens. All animation is manual:
- **Time-based** (preferred): uses `dt` from the update loop
  - Bartender movement: `BARTENDER_SPEED * dt`
  - Guest arrival/departure: fixed speed * dt
  - Pour amount: `pourRate * dt`
  - Modal zoom: `scene.time.now` elapsed / duration
  - Glass lift: `1 - Math.pow(0.001, dt)` exponential decay
  - Overflow particles: dt-based gravity, life, spawn
- **Scene clock** (`scene.time.now`): pour stream drip phase, sip timing

### Depth Registry (`constants/depths.js`)

All `setDepth()` values should reference `DEPTH.*` constants. The registry
documents the full rendering order from background (0) to modal overlays (70+).

### Layout Constants (`constants/layout.js`)

Sprite-specific magic numbers (carry offsets, zone sizes, sprite widths) live
here. When regenerating sprites, update these values and all layer code adapts.

## Event Flow

```
User tap → Phaser input → station-tap / seat-zone-tap event
  → StationActions.handleStationTap() or GuestManager
    → walkThenAct(x, callback)
      → Bartender walks to X
      → On arrival: callback fires (modal opens, action starts)
        → Modal emits events (glass-selected, drink-pour-start, etc.)
          → GamePlayScene handler updates game state
```
