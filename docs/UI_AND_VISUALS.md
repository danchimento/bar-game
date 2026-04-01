# UI & Visuals

> This spec defines what every visual element should look like and where it appears. Use this as the reference when building or modifying any rendering code.

## Rendering Architecture

The game uses **Phaser 3** loaded from CDN as a UMD global. The visual layer is split into:

- **Layers** (background → foreground): BarLayer, StationLayer, BartenderLayer, GuestLayer, BarItemsLayer
- **UI overlays**: HudUI, RadialMenuUI, PauseUI
- **Modals** (depth 70+): GlassModal, DrinkModal, PrepModal, POSModal

All game logic modules (Bartender, Guest, BarState, GuestManager, etc.) are **unchanged** — the Phaser layers read from them each frame and sync visuals.

## Depth Map

| Depth | Element |
|-------|---------|
| 0 | Wall background, floor |
| 1 | Back counter, bar top tiles, stools |
| 2 | Dirty seat markers, cash, service mat items |
| 3 | Drinks at seats (glass graphics) |
| 4 | Interactive zones (dirty seats, cash, mat drinks) |
| 5 | Guest sprites |
| 6 | Mood bars, waiting badge |
| 8 | Sip animation glass |
| 10 | Bartender sprite |
| 11 | Bartender busy bar, carry label |
| 12 | Bartender carried glass graphic |
| 15 | Guest state indicator icons |
| 50 | HUD elements |
| 60 | Radial menu |
| 61 | Radial menu labels/icons |
| 70 | Modal containers (glass, drink, prep, POS) |
| 71 | Pour stream animation |
| 72 | Glass preview in drink modal |
| 73 | Fill label, no-glass warning |
| 80 | Pause overlay |

---

## Bar Scene (BarLayer)

### Wall
- Full-width rectangle from Y=0 to Y=170
- Color: #2a1a3e (dark purple)
- Brick pattern: subtle grid of lighter rectangles

### Floor
- Full-width rectangle from Y=400 to Y=540
- Color: #3d2b1b (dark wood)

### Bar Top
- Tiled bar_top sprite across full width at Y=225
- Height: ~12px (sprite is 64×12 at 3x scale)
- Brown wood surface (#8B4513) with wood grain highlights

### Stools
- One stool sprite per seat at (seat.x, SEAT_Y=185)
- Sprite: stool.png (16×20 at 3x)
- Brown wooden legs with padded seat top

### Wall Clock
- Position: right side of wall (CANVAS_W - 70, 60)
- Radius: 28px
- Face: cream/off-white (#f5f0e0), dark brown border (#5a3a1a, 3px)
- 12 tick marks around the rim
- **Hour hand**: thick (2.5px), dark, length 14px
- **Minute hand**: thinner (1.5px), dark, length 20px
- Center dot: 2px radius, dark
- Updates every frame: maps game time (6:00 PM → 12:00 AM) to clock hand positions
- Depth 0 (wall element)

---

## Stations (StationLayer)

### Back Counter
- Tiled back_counter sprite from X=0 to X=960 at Y=STATION_Y (470)
- Dark wood surface (#3a2a1a)

### Station Sprites
- Each station rendered as its sprite at (station.x, STATION_Y)
- Scale: 1.2x for visibility
- Station name label below sprite (10px monospace, #aaa)
- Interactive zones for tap and long-press detection
- Long-press threshold: 400ms

### Station Sprites List
| Station | Sprite | Size (px art) | Description |
|---------|--------|---------------|-------------|
| DISHWASHER | station_dishwasher | 28×24 | Gray metal box with door panel, handle, green status light |
| SINK | station_sink | 24×24 | Metal basin with faucet and blue knob |
| GLASS_RACK | station_glass_rack | 28×24 | Dark wood shelves with glass outlines |
| TAPS | station_taps | 40×32 | Chrome tower with 3 colored tap handles + drip tray |
| WINE | station_wine | 24×24 | Dark rack with red and white bottles |
| PREP | station_prep | 28×24 | Cutting board with 4 garnish containers + ice bucket |
| POS | station_pos | 20×24 | Black terminal with green screen on stand |
| TRASH | station_trash | 16×24 | Gray can with lid and handle |

---

## Bartender (BartenderLayer)

### Sprite
- bartender.png at (bartender.x, WALK_TRACK_Y=330)
- Scale: 0.7x
- Flips horizontally based on `facingRight`

### Carried Item
Rendered **above the bartender's head** (Y = WALK_TRACK_Y - 28):

| Carrying | Visual |
|----------|--------|
| Nothing | Hidden |
| GLASS_* or DRINK_* | **Drawn glass** using GlassRenderer at 0.9x scale — correct glass type, fill level, liquid color |
| DIRTY_GLASS | icon_dirty_glass sprite at 0.7x scale |
| CHECK_* | icon_receipt sprite at 0.7x scale |

### Busy Progress Bar
When `bartender.busy` is true:
- Gray background bar (50×5px) at Y=WALK_TRACK_Y+35
- Green fill bar (#4caf50) showing progress
- Action label text below (10px monospace, light gray)

---

## Guests (GuestLayer)

### Guest Sprites
5 color variants, assigned by `guest.id % 5`:
- guest.png (blue shirt)
- guest_red.png
- guest_green.png
- guest_purple.png
- guest_orange.png

All are 24×32 pixel art at 3x scale, rendered at 0.65x.

### Positioning
- Seated: (seat.x, GUEST_Y=200)
- Arriving: slides from Y=-30 to Y=200
- Leaving: slides from Y=200 to Y=-50, at 50% opacity

### State Indicator Icons (with Thought Bubble)
Rendered above guest head at (guest.x, guest.y - 34), scale 0.8x, depth 15.

A **white thought bubble** (depth 14) is drawn behind each indicator icon:
- Rounded rectangle (28×24px) with 8px corner radius, 92% white opacity
- Small triangle pointer at bottom pointing toward guest's head
- Only visible when an icon is shown

| State | Icon Sprite | Size (px art) |
|-------|-------------|---------------|
| LOOKING | icon_eyes | 12×8 |
| READY_TO_ORDER | icon_eyes | 12×8 |
| WAITING_FOR_DRINK | icon_hourglass | 10×14 |
| WANTS_ANOTHER | icon_beer | 10×12 |
| READY_TO_PAY | icon_money | 10×12 |
| REVIEWING_CHECK | icon_receipt | 8×12 |
| ANGRY_LEAVING | icon_angry | 12×12 |
| All other states | *No icon* | — |

### Order Text Above Head
When `guest.orderRevealTimer > 0` and `guest.currentDrink` is set:
- Text showing the drink name (e.g., "Boors Light") appears at (guest.x, guest.y - 52)
- 9px monospace bold, yellow (#ffd54f) on dark semi-transparent background
- Fades when `orderRevealTimer` reaches 0 (default 8 seconds)
- Replaces the old notepad system — orders are shown directly above the guest

### Mood Bar
- Position: (guest.x, guest.y + 18)
- Background: 32×4px dark gray (#333333)
- Fill: 32×4px, left-aligned, width = 32 × (mood/100)
- Color: Green >60%, Yellow 30-60%, Red <30%

### Sipping Animation
During ENJOYING state when `guest.sipping` is true (1.0s duration):
- A small glass graphic (GlassRenderer at 0.55x) animates:
  - Starts at counter position (guest.x + 8, BAR_TOP_Y - 2)
  - Lifts to mouth position (guest.x + 6, guest.y - 5) over 0.3s
  - Holds at mouth for 0.4s
  - Returns to counter over 0.3s
- Glass shows amber liquid fill at ~60%

### Queued Guests
Queued guests (WAITING_FOR_SEAT) are **NOT shown as sprites**. They are invisible — only represented by a count badge:
- Text at (480, 82): "[N] queued"
- Yellow text (#ffc107) on dark semi-transparent background
- 13px monospace bold
- Hidden when queue is empty

---

## Bar Items (BarItemsLayer)

### Dirty Seat Markers
- spill.png sprite at (seat.x, SEAT_Y + 8)
- Interactive zone (50×40px) — tap to clean

### Cash on Bar
- cash.png sprite at (seat.x - 20, BAR_TOP_Y + 10)
- Interactive zone (40×30px) — tap to collect

### Drinks at Seats
- Drawn using GlassRenderer at 0.65x scale
- Position: (seat.x, BAR_TOP_Y - 2) per glass
- Multiple glasses offset horizontally: `(i - (count-1)/2) * 14px`
- Shows correct glass type, fill level, and liquid color
- Updates every frame (fill depletes as guest sips)

### Service Mat Drinks
- Drawn using GlassRenderer at 0.6x scale
- Position: (drink.x, SERVICE_MAT_Y + 10)
- Interactive zones (30×30px) — tap to pick up

---

## HUD (HudUI)

### Tips Display
- Position: top-left (20, 12)
- Format: "Tips: $XX.XX"
- 14px monospace, green (#4caf50)

### Clock
- Position: top-right (CANVAS_W - 20, 12), right-aligned
- Format: "7:30 PM" (mapped from 6PM-midnight)
- 14px monospace, white — turns red (#ff4444) when < 30s remaining

### Floating Messages
- Position: center-top (CANVAS_W/2, 60)
- Yellow text (#ffd54f) on dark semi-transparent background
- 14px monospace bold
- Fades after specified duration (default 2s)

### Pause Button
- Position: top area, "⏸" text
- Tapping opens PauseUI overlay

---

## Notepad (REMOVED)

The notepad system has been removed. Customer orders now appear as text directly above each guest's head (see [Order Text Above Head](#order-text-above-head) in the Guests section).

---

## Radial Menu (RadialMenuUI)

See [GAME_DESIGN.md](GAME_DESIGN.md#radial-menu-behavior) for interaction spec.

### Visual Details
- **Dim overlay:** Black circle (radius = outerRadius + 50) at 35% opacity behind menu
- **Ring slices:** Filled pie slices from innerRadius (40) to outerRadius (120)
  - Normal: #e8c170 (warm gold)
  - Hovered: #ffd54f (bright gold), expanded 8px
  - Disabled: #3a3a3a (dark gray)
- **Center dead zone:** #1a1a2e (dark background), 40px radius, thin gray border
- **Single option special case:**
  - Full ring (no slices)
  - Outer ring stroke only (no filled wedge borders)
  - Icon: 26px serif font, positioned at ring midpoint, 12 o'clock (cx, cy - ringMid)
  - Label: 12px monospace bold, white, positioned just below icon
- **Multiple options:**
  - Icon: 18px serif font, centered in slice at (midAngle, ringMid - 8)
  - Label: 10px monospace bold, dark (#1a1a2e), at (midAngle, ringMid + 10)
  - Long labels (>10 chars): split into 2 lines

---

## Modals

All modals share common patterns:
- Full-screen dim overlay (black, 60% opacity) — tapping outside panel closes modal
- Colored panel centered on screen
- Red close button (X) in top-right of panel
- Depth 70+

### Glass Selection Modal
- Panel: dark gray
- Shows one button per glass type with sprite image and name
- Tapping a glass fires `glass-selected` event

### Drink Modal
See [STATIONS_AND_ITEMS.md](STATIONS_AND_ITEMS.md#drink-modal-visual-beer-mode) for detailed layout.

### Prep Modal
- Panel: dark teal
- Sections for Ice, Garnishes, and Water/Soda
- Ice: single button (disabled if already iced)
- Garnishes: 4 buttons (orange, lime, lemon, cherry), disabled if already added
- Water: hold-to-pour button

### POS Modal
- Panel: dark background with green accent (terminal theme)
- **Seat Select mode:** Grid of numbered seat buttons
- **Seat View mode:** Tab list with drink items, prices, Add/Remove buttons, Print Check button

### Pause Overlay
- Full-screen semi-transparent dark overlay
- "PAUSED" title text
- Resume button (green)
- Quit to Title button (red)

---

## Sprites Summary

All sprites are pixel art generated at 3x scale using the `canvas` Node.js package.

### Characters
| Sprite | Size (px art) | File |
|--------|---------------|------|
| Bartender | 24×48 | bartender.png |
| Guest (blue) | 24×32 | guest.png |
| Guest (red) | 24×32 | guest_red.png |
| Guest (green) | 24×32 | guest_green.png |
| Guest (purple) | 24×32 | guest_purple.png |
| Guest (orange) | 24×32 | guest_orange.png |

### Items
| Sprite | Size | File |
|--------|------|------|
| Pint glass | 12×20 | glass_pint.png |
| Wine glass | 10×22 | glass_wine.png |
| Plastic cup | 10×16 | glass_cup.png |
| Tap handle | 8×24 | tap_handle.png |
| Cash | 12×8 | cash.png |
| Spill | 16×8 | spill.png |
| Bar stool | 16×20 | stool.png |

### Environment
| Sprite | Size | File |
|--------|------|------|
| Bar top (tile) | 64×12 | bar_top.png |
| Back counter (tile) | 64×16 | back_counter.png |
| Service mat | 20×6 | service_mat.png |

### Indicator Icons
| Sprite | Size | File | Used For |
|--------|------|------|----------|
| Hourglass | 10×14 | icon_hourglass.png | WAITING_FOR_DRINK |
| Eyes | 12×8 | icon_eyes.png | LOOKING, READY_TO_ORDER |
| Money | 10×12 | icon_money.png | READY_TO_PAY |
| Angry | 12×12 | icon_angry.png | ANGRY_LEAVING |
| Beer mug | 10×12 | icon_beer.png | WANTS_ANOTHER |
| Receipt | 8×12 | icon_receipt.png | REVIEWING_CHECK, bartender carry |
| Thought bubble | 14×12 | icon_thought.png | (reserved) |
| Dirty glass | 8×12 | icon_dirty_glass.png | bartender carry |

---

## Error Overlay

An inline `<script>` in `<head>` (loads before Phaser) catches:
- `window.onerror` — runtime JS errors
- `window.onunhandledrejection` — promise rejections
- Module import failures (duplicate dynamic import with `.catch()`)

Displays a **red banner** at the top of the screen with white monospace text. Useful for debugging on mobile (GitHub Pages) where dev tools aren't available. Only shows when an actual error occurs.

---

## Phaser Config

```javascript
{
  type: Phaser.AUTO,
  width: 960, height: 540,
  backgroundColor: '#1a1a2e',
  audio: { noAudio: true },
  scale: {
    mode: Phaser.Scale.ENVELOP,       // fills screen, may crop edges
    autoCenter: Phaser.Scale.CENTER_BOTH,
    orientation: Phaser.Scale.Orientation.LANDSCAPE,
  },
  scene: [BootScene, TitleScene, GamePlayScene, LevelCompleteScene],
}
```
