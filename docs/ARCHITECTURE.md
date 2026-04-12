# Architecture Overview

## Directory Structure

```
js/
  constants.js              # Canvas dimensions, game state, timers, gameplay tuning
  constants/
    depths.js               # Centralized depth registry for all display objects
    layout.js               # Sprite metrics and UI layout constants
  data/
    levels.js               # Level definitions (stations, drinks, spawn schedules)
    menu.js                 # Drink/glass/garnish definitions
    guestAppearances.js     # Guest sprite appearance IDs
  layout/
    BarLayout.js            # Single source of truth for all spatial positions
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
      PrepModal.js          # Ice, garnishes, mixers (extends BaseModal)
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

### BarLayout — Single Source of Truth (`layout/BarLayout.js`)

**All spatial positions flow from BarLayout.** Created once per level in
`GamePlayScene.create()`, passed by reference to every layer, entity, and system.

BarLayout owns:
- **Zone computation** — proportional weights (wall 14%, guest area 34%, etc.)
  resolve to pixel Y-ranges via the same `resolveZones()` algorithm
- **All Y-coordinates** — `barSurfaceY`, `walkTrackY`, `counterSurfaceY`, etc.
- **Station positions** — distributed evenly from a level's station list, each
  with an `x` coordinate and a parametric `t ∈ [0, 1]` along the bar path
- **Seat positions** — distributed evenly from the level's seat count, each
  with `x` and `t`
- **Bar bounds** — `barLeft`, `barRight`, used by Bartender for movement clamping
- **Bar path functions** — `counterPathAt(t)` and `barPathAt(t)` map t to
  `{ x, y, angle }`. Currently straight lines; designed for future curved bars.

**Rule: never import position constants from `constants.js`.** Read from
`barLayout` instead. `constants.js` only exports canvas dimensions, game state
enums, and gameplay tuning values.

### Modal System (`BaseModal.js`)

All modals extend `BaseModal`, which provides:
- Container at depth 70 with dim overlay
- `show()` / `hide()` / `visible` lifecycle
- Optional zoom animation (if `origin` passed to `show()`)
- `_requestClose(eventName, data)` — animated or instant close with event emission
- `_build()` / `_onUpdate(dt)` / `_onTeardown()` hooks for subclasses

**Coordinate systems:**
- Animated modals (GlassModal, DrinkModal beer, GuestModal): content container
  at screen center, LOCAL coords (0,0 = center)
- Non-animated modals (wine, mixer, prep, POS): content at (0,0),
  SCREEN-ABSOLUTE coords

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
      → Bartender walks to X (clamped to barLayout.walkBounds)
      → On arrival: callback fires (modal opens, action starts)
        → Modal emits events (glass-selected, drink-pour-start, etc.)
          → GamePlayScene handler updates game state
```

## Data Flow for Positions

```
Level definition (stationIds, seatCount)
  → BarLayout constructor
    → resolveZones() → all Y-coordinates
    → _layoutStations() → station positions (x, t)
    → _layoutSeats() → seat positions (x, t)
  → Passed to:
    → Bartender (walkBounds, walkTrackY)
    → BarLayer (barSurfaceY, barLeft/Right, seats)
    → StationLayer (stationScreenPos per station)
    → BartenderLayer (walkTrackY)
    → GuestLayer (barSurfaceY, guestY, barY helper)
    → BarItemsLayer (seats, seatY, barY helper)
    → StationActions (stationScreenPos for modal origins)
```
