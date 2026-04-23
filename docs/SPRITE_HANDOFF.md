# Sprite Art Handoff Spec

Reference for integrating new art into the game. Every measurement here
ties sprite anatomy to game mechanics — if art changes, the corresponding
constants must be updated or positioning will break.

## Scale System

Two scale tiers. All sprites are generated at final screen size — Phaser
renders PNGs at 1:1, no runtime `setScale()` (except intentional zoom in
modals).

| Tier | Scale | Used for |
|------|-------|----------|
| Default | 6× | Humans, stations, stool, door, tiles, indicators, radial icons |
| Item | 3× | Glasses, cash bills, tap handles, spills |

Formula: `screen_pixels = art_pixels × scale`

## Guest Sprites

### Sitting Guest (at bar)
- **Art dimensions**: 24×20 pixels → **144×120 screen** at 6×
- **Key anatomy**: rows 0-17 = head through torso. Rows 18-19 = **hands on bar**
- **Bar overlap**: Only rows 18-19 cross the bar surface

| Constant | File | Value | Derivation |
|----------|------|-------|------------|
| `GUEST_SIT_SCREEN_H` | `constants/layout.js:34` | 120 | 20 art × 6 |
| `GUEST_BAR_OVERLAP_PX` | `constants/layout.js:35` | 108 | art row 18 × 6 |
| BAR_OVERLAP_OFFSET | `GuestLayer.js:14` | 12 | 120 − 108 |

**If the artist changes hand position**: update `GUEST_BAR_OVERLAP_PX` to
`new_hand_row × 6`. Everything downstream (GuestLayer positioning,
GuestModal layout, DebugLayer bounds) derives from this.

**If sitting sprite height changes**: update `GUEST_SIT_SCREEN_H` and
`BootScene.js` frame dimensions.

### Standing Guest
- **Art dimensions**: 24×32 pixels → **144×192 screen** at 6×
- Not in `constants/layout.js` — hardcoded in GuestLayer.js:169

| Value | Location | Notes |
|-------|----------|-------|
| 144×192 | `BootScene.js:34` (frameWidth/frameHeight) | Walk animation frames |
| 192 | `GuestLayer.js:169` | Standing height for icon positioning |

**Needed**: Add `GUEST_STANDING_SCREEN_H = 192` to `constants/layout.js`.

### Walking Guest Animation
- **Spritesheet frames**: 144×192 per frame, 4 frames
- Walk bob: 1.5px amplitude, 8 rad/s frequency (hardcoded in GuestLayer)
- **File**: `BootScene.js:34`

### Guest Appearance Variants
Each appearance ID loads three sprites:
- `guest_{id}.png` — standing (144×192)
- `guest_sitting_{id}.png` — sitting (144×120)
- `guest_walk_{id}` — walk spritesheet (144×192 frames)

**All variants must share the same dimensions** or layer positioning breaks.

## Bartender Sprites

- **Art dimensions**: 32×48 pixels → **192×288 screen** at 6×
- Walk animation: 4 frames at 192×288 per frame

| Constant | File | Value | Derivation |
|----------|------|-------|------------|
| `BARTENDER_CARRY_OFFSET_X` | `constants/layout.js:27` | 84 | 14 art × 6 |
| `BARTENDER_CARRY_OFFSET_Y` | `constants/layout.js:28` | 66 | 11 art × 6 |
| `BARTENDER_BUSY_BAR_OFFSET_Y` | `constants/layout.js:29` | 80 | hardcoded |

Sprites loaded in `BootScene.js:25-29`:
- `bartender_back.png` — idle (back-facing)
- `bartender_carry.png` — carrying pose
- `bartender_walk` — walk spritesheet (192×288 frames, 4 frames at 6fps)

**Carry item position**: rendered at `(bartender.x ± 84, walkTrackY − 66)`
at 2.0× glass scale. If arm position changes, update carry offsets.

## Glass Shapes (GlassRenderer)

Art-pixel dimensions in `GlassRenderer.js:6-10`. The `scale` parameter
in `drawGlass()` multiplies these.

| Glass | Art W | Art H | Notes |
|-------|-------|-------|-------|
| PINT | 18 | 28 | Tapered, wider at top |
| WINE_GLASS | 14 | 30 | Bowl (16) + stem (10) + base |
| PLASTIC_CUP | 16 | 22 | Slight taper |

### Glass render scales by context

| Context | Scale | File |
|---------|-------|------|
| Drinks at seats (game) | 1.8× | `BarItemsLayer.js:98` |
| Service mat | 1.6× | `BarItemsLayer.js:117` |
| Bartender carry (game) | 2.0× | `BartenderLayer.js:92` |
| GuestModal (both sides) | 1.8× | `GuestModal.js` |
| GlassModal shelf | 1.5× | `GlassModal.js:288` |
| Sip animation | 0.96× | `GuestLayer.js:309` |
| DrinkModal pour preview | 2.0× | `DrinkModal.js:372` |

## Tap Frame & Handles

Tap frame: 60×40 art → **360×240 screen** at 6×

| Measurement | Art value | Screen value | Purpose |
|-------------|-----------|-------------|---------|
| Tap mount X positions | 15, 30, 45 | −90, 0, +90 | Tap handle centers |
| Crossbar Y | row 3 | +18 from frame top | Handle mount point |
| Spout Y | row 12 | +72 from frame top | Pour stream origin |
| Frame bottom | row 32 | +192 from frame top | Glass rest position |

Handles: ~8×20 art → **48×120 screen** at 6×. Zone padding: 56×128.

All positions computed in `DrinkModal.js:96-162` from `ART_SCALE = 6`.

## Station Sprites

All generated at 6× scale. Placement type determines Y anchoring:

| Placement | Stations | Origin | Anchors to |
|-----------|----------|--------|------------|
| on_counter | TAPS, POS, MENU, WINE, PREP | (0.5, 1) | Counter surface top |
| in_counter | SINK | (0.5, 0.5) | Counter center |
| under_bar | GLASS_RACK, DISHWASHER | (0.5, 0) | Cabinet top |
| floor_left | TRASH | (0.5, 1) | Bartender area floor |

Counter sinking (how far sprite extends below counter surface):

| Station | COUNTER_BASE_ROWS | File |
|---------|-------------------|------|
| TAPS | 24px | `constants/layout.js:21` |
| WINE | 24px | |
| PREP | 18px | |
| POS | 36px | |
| MENU | 24px | |

## Structural Elements

| Element | Art dimensions | Screen size | File |
|---------|---------------|-------------|------|
| Tile texture | varies | 32×32 | `BarLayout.js:53` |
| Stool | 16×? art | 96px wide | `constants/layout.js:50` |
| Door | ? | generated at 6× | `generate-sprites.js` |

Bar surface: **3 tiles = 96px** in both layout presets.

## Icons & Indicators

State icons above guest heads (generated at 6×):

| Icon | Scale in game | Purpose |
|------|--------------|---------|
| icon_hourglass | 0.96× | Waiting |
| icon_eyes | 0.96× | Ready to order |
| icon_money | 0.96× | Ready to pay |
| icon_angry | 0.84× / 0.96× | Frustrated / angry state |
| icon_beer | 0.96× | Wants another |
| icon_receipt | 0.96× | Reviewing check |
| icon_heart | 0.84× | Mood boost |
| icon_dirty_glass | 0.96× | Dirty glass carry |

Radial menu icons: 1.2× for single option, 0.9× for multiple.

## BootScene Frame Dimensions

Spritesheets that must match generated output:

| Spritesheet | frameWidth | frameHeight | Line |
|-------------|-----------|------------|------|
| bartender_walk | 192 | 288 | `BootScene.js:26` |
| guest_walk_{id} | 144 | 192 | `BootScene.js:34` |
| guest_drink | 144 | 120 | `BootScene.js:38` |

## Integration Checklist

When replacing sprites with new art:

### 1. Measure the new art
For each sprite, record:
- Art-pixel width and height
- Which art row the hands start (sitting guest)
- Which art row the carry arm extends to (bartender)
- Any anatomy landmarks that affect game mechanics

### 2. Update constants
- `constants/layout.js`: `GUEST_SIT_SCREEN_H`, `GUEST_BAR_OVERLAP_PX`,
  `BARTENDER_CARRY_OFFSET_X/Y`, `STOOL_SPRITE_W`
- `GlassRenderer.js`: `GLASS_SHAPES` dimensions if glass art changes
- `BootScene.js`: `frameWidth`/`frameHeight` for any spritesheet

### 3. Update modals
- `GuestModal.js`: `PNG_W`, `PNG_H` if sitting sprite dimensions change.
  Layout recomputes automatically from constants.
- `DrinkModal.js`: tap positions if tap frame art changes

### 4. Regenerate or replace
- If using procedural generation: run all 6 scripts
- If dropping in final PNGs: place in `assets/sprites/`, remove gen scripts
- PNGs must be at final screen size (art × scale) — no runtime scaling

### 5. Verify with debug overlay
- Toggle "D" button → check all debug bounds match new sprites
- GuestModal: green hands-Y line must align with bar top
- DebugLayer: station footprints (yellow dashed) vs sprite bounds (red solid)

## Known Discrepancies to Fix

| Issue | Location | Notes |
|-------|----------|-------|
| Drink spacing: 20 vs 26 vs 40px | `layout.js:45`, `BarItemsLayer:93`, `GuestModal` | Unify or document per-context |
| Seat zone: 120×120 vs 70×80 | `layout.js:46-47`, `BarItemsLayer:24` | Align |
| Standing height not in constants | `GuestLayer.js:169` | Add to `layout.js` |
| DebugLayer hardcodes sprite dims | `DebugLayer.js:310, 328` | Import from constants |
