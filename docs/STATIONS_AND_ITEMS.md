# Stations & Items

## Stations

There are 7 stations along the back counter (Y=470). Not all are available on every level.

### Station Layout

Stations are positioned dynamically using `layoutStations(ids)` — evenly distributed across 900px with 30px left margin. The X positions below are for the full 7-station layout:

| Station | ID | Typical X | Unlocked |
|---------|----|-----------|----------|
| Dishwasher | DISHWASHER | 60 | Day 1 |
| Sink | SINK | 150 | Day 2 |
| Glass Rack | GLASS_RACK | 250 | Day 1 |
| Beer Taps | TAPS | 380 | Day 1 |
| Wine | WINE | 510 | *Not yet in levels* |
| Prep | PREP | 650 | Day 4 |
| POS | POS | 850 | Day 1 |

*Trash station exists in data but is not currently in any level.*

### Station Interactions

Each station has two interaction modes:
- **Tap** → Performs the default/primary action
- **Long-press** → Opens a radial menu with all available options

---

### Glass Rack
**Tap behavior:** If bartender's hands are empty, walk to station → open Glass Selection modal.
**Radial options:** One option per glass type (Pint Glass, Wine Glass, Plastic Cup). Selecting one triggers a 0.4s "Grabbing glass..." action, then bartender carries `GLASS_<type>` and `barState.carriedGlass` is set to a new empty GlassState.
**If hands full:** HUD shows "Hands full!"

### Beer Taps
**Tap behavior:** Walk to station → open Drink Modal (beer mode).
**Radial options:** One option per available beer (e.g., Boors Light, Hazy IPA, Dark Porter). Each option has `pourKey` and `pourRate`.
**Hold-to-pour:** See [Pouring System](#pouring-system) below.

### Wine Station
**Tap behavior:** Walk to station → open Drink Modal (wine mode).
**Radial options:** One option per available wine.
**Hold-to-pour:** Same as beer taps but with wine pour rate.

### Prep Station
**Tap behavior:** Walk to station → open Prep Modal.
**Radial options:**
- **Ice** — Disabled if glass already has ice. Instant action, adds 0.3 volume of ice.
- **Orange / Lime / Lemon / Cherry** — Disabled if garnish already added. 0.6s action.
- **Water** — Mixer pour (same hold-to-pour mechanic as taps).

### Dishwasher
**Tap behavior:** If carrying DIRTY_GLASS → walk to station → 0.8s "Loading..." → clears carrying state. Otherwise shows "Need dirty glasses".
**Radial options:** Single "Load" option (disabled if not carrying dirty glass).

### Sink
**Tap behavior:** If carrying a glass (any state) → walk to station → 0.4s "Dumping..." → destroys glass, clears carrying, tracks as `drinksWasted`.
**Radial options:** Single "Dump" option (disabled if not carrying).

### POS (Point of Sale)
**Tap behavior:** Walk to POS → open POS Modal in seat-select mode.
**See [POS System](#pos-system) below.**

### Trash
**Tap behavior:** If carrying anything → walk to station → 0.3s "Tossing..." → destroys item, clears carrying.
**Radial options:** Single "Trash" option.

---

## Glasses

Three glass types, each associated with a drink category:

| Glass | Key | For Type | Sprite Key | Capacity |
|-------|-----|----------|------------|----------|
| Pint Glass | PINT | beer | glass_pint | 1.0 |
| Wine Glass | WINE_GLASS | wine | glass_wine | 1.0 |
| Plastic Cup | PLASTIC_CUP | water | glass_cup | 1.0 |

### GlassState Properties
- **layers** — Array of `{ drinkKey, color, amount }`. Multiple drinks can be layered (contamination).
- **ice** — Volume occupied by ice (0–0.3). Takes up fill capacity.
- **garnishes** — Array of garnish keys added.
- **overflow** — Amount spilled past capacity 1.0.
- **totalFill** — `ice + sum(layer amounts)`
- **remainingCapacity** — `max(0, 1.0 - totalFill)`
- **primaryDrink** — The drink key with the most volume (used for validation and carry label)

### Glass Visual Rendering
Glasses are drawn programmatically using `GlassRenderer.drawGlass()`:
- **Pint:** Tapered rectangle, wider at top. Foam head appears when fill > 10%.
- **Wine glass:** Bowl shape on a stem with a base. Liquid fills the bowl from bottom.
- **Plastic cup:** Slight taper, simple rectangle shape.

All glasses show:
- Glass outline (light blue/white stroke)
- Liquid fill at correct level with drink color
- The same glass shape is used everywhere: bartender carry, bar counter, drink modal preview, service mat

---

## Drinks

| Key | Name | Type | Price | Glass | Fill Range | Garnish | Ice | Color |
|-----|------|------|-------|-------|------------|---------|-----|-------|
| GOLD_LAGER | Boors Light | beer | $7 | PINT | 85–100% | — | — | #f0c040 |
| HAZY_IPA | Hazy IPA | beer | $8 | PINT | 85–100% | — | — | #e8b830 |
| DARK_PORTER | Dark Porter | beer | $8 | PINT | 85–100% | — | — | #3a1a0a |
| HARVEST_MOON | Harvest Moon | beer | $9 | PINT | 85–100% | ORANGE | — | #d4882a |
| RED_WINE | Red Wine | wine | $10 | WINE_GLASS | 40–60% | — | — | #6b1a2a |
| WHITE_WINE | White Wine | wine | $10 | WINE_GLASS | 40–60% | — | — | #e8e0a0 |
| WATER | Water | water | $0 | PLASTIC_CUP | 80–100% | — | **Yes** | #c0e8f0 |

---

## Pouring System

### How Pouring Works

1. Player opens drink modal (via station tap or radial menu)
2. Drink modal shows available taps/bottles
3. Player **holds down** on a tap handle → `drink-pour-start` event fires
4. `barState.startPour(drinkKey, pourRate)` is called
   - **Requires `carriedGlass` to exist.** If no glass, pour silently fails.
   - Drink modal shows "Pick up a glass first!" warning when no glass carried.
5. Each frame, `barState.updatePour(dt)` adds liquid: `glass.pour(drinkKey, pourRate * dt)`
6. Player **releases** anywhere → `stopPour()` is called via global pointerup
7. Glass fill level updates in real-time in the drink modal preview

### Pour Rates
- **Beer:** `1.0 / 1.8` = ~0.556 per second (full pour takes 1.8s)
- **Wine:** `1.0 / 1.2` = ~0.833 per second (full pour takes 1.2s)
- **Water/mixer:** Same rate as beer

### Overfilling
- If glass reaches capacity (1.0), excess is tracked as `overflow`
- Overflow > 0.01 = "overfilled" validation issue
- Glass keeps accepting pour but tracks spillage

### Drink Modal Visual (Beer Mode)
- Panel background: dark brown (#2a1a0a), gold border
- Title: "Draft Beers"
- Subtitle: "Hold to pour, release to stop"
- **Always 3 taps** shown, centered in the modal regardless of how many beers are available
- **Tap structure (all 3 taps):**
  - Chrome bar across all taps
  - Chrome pipe from bar
  - Chrome spout/nozzle
  - Drip tray below each tap
- **Active taps** (taps with an available beer) additionally have:
  - Colored handle (beer's color) with white stroke
  - Knob (circle) at top
  - **Beer name on the handle** (first word, e.g., "Boors", 7px white bold text)
  - Beer name + price label below the drip tray
  - Interactive zone for hold-to-pour
- **Inactive taps** (no beer assigned) show only the pipe/spout/tray — no handle
- **Glass behavior:**
  - Glass starts to the **left of all taps** in a resting position at 1.15x scale
  - When player holds down on a tap: glass **slides under that tap** with a quick tween (~150ms)
  - While pouring, glass stays tilted at the appropriate angle under the active spout
  - Pour stream animates from spout down into the glass
  - Fill percentage label shown below glass
  - When player releases: pour stops, glass stays at last position
  - If player holds a different tap: glass slides to new tap position
  - "Pick up a glass first!" warning in red if no glass carried
- **Interactive zones:** Cover entire tap area, cursor becomes pointer
- **Visual feedback:** Handle border turns gold while pressed

### Drink Modal Visual (Wine Mode)
- Panel background: dark red (#2a1020), burgundy border
- Title: "Wines"
- Subtitle: "Hold to pour, release to stop"
- **Wine bottles:** Rendered as tall colored bottles with labels
  - Dark bottle body with colored label band
  - Bottle neck narrowing at top
  - Wine type color visible through bottle
- **Glass behavior:**
  - Wine glass starts to the **left of all bottles** in a resting position
  - When player holds down on a bottle: wine glass **slides under that bottle** (~150ms tween)
  - Bottle tilts to pouring angle, pour stream flows into glass
  - Fill level updates in real-time
  - When released: pour stops, bottle returns upright
- Same "no glass" warning behavior as beer mode

### Drink Modal Visual (Mixer/Soda Mode)
- Panel background: dark blue (#0a1a2a), blue border
- Soda gun nozzle buttons
- Same glass-slide behavior as beer/wine

---

## Drink Validation

When serving a drink to a guest, `GlassState.validate(drinkKey)` checks:

| Check | Issue Key | Severity | Mood Penalty | Result |
|-------|-----------|----------|--------------|--------|
| Wrong glass type | `wrong_glass` | **Reject** | -25 | Drink refused, returned to bartender |
| Wrong primary liquid | `wrong_drink` | **Reject** | -25 | Drink refused |
| Other liquids > 5% | `contaminated` | **Reject** | -15 | Drink refused |
| Liquid < minFill | `underfilled` | Accept | -5 | Served with complaint |
| Total fill > maxFill+0.15 or overflow | `overfilled` | Accept | -10 | Served with complaint |
| Missing required garnish | `missing_garnish` | Accept | -5 | Served with complaint |
| Missing required ice | `missing_ice` | Accept | -5 | Served with complaint |

- **Perfect serve:** No issues → mood unchanged, `drinksServedCorrect++`
- **Minor issues:** Accepted but with mood penalty, `drinksServedWithIssues++`
- **Rejected:** Drink stays with bartender, `drinksRejected++`

### Serving Flow
1. Player taps guest while carrying a drink
2. Radial menu shows "Serve" option
3. Bartender walks to guest seat → 0.3s "Serving..." action
4. Validation runs against guest's wanted drink
5. If accepted: glass placed at seat (`drinksAtSeats`), carrying cleared
6. If rejected: glass stays in bartender's hands, mood penalized

### Anticipated Serve
If guest is in WANTS_ANOTHER state and player serves without being asked:
- If drink matches guest's preference → +25 mood, `anticipatedCorrect++`
- If wrong → -15 mood, `anticipatedWrong++`

---

## POS System

### Flow
1. Player taps POS station → walks to POS → POS Modal opens
2. **Seat Select mode:** Shows numbered seat buttons. Tap a seat to view its tab.
3. **Seat View mode:** Shows current tab items with prices, Add/Remove buttons
4. Player adds drinks to tab matching what was served
5. "Print Check" button → 1.5s action → bartender carries `CHECK_<seatId>`
6. Player delivers check to guest (via radial menu "Give Check" option)

### Check Validation
When check is given to guest:
```
tabTotal = sum of all items on POS tab for this seat
servedTotal = guest.totalSpent (actual drinks served)

if tabTotal > servedTotal: OVERCHARGED → guest.overcharged = true (no tip!)
if tabTotal < servedTotal: UNDERCHARGED → lost revenue
if tabTotal == servedTotal: CORRECT
```

---

## Service Mat

The service mat (Y=265) is an area where the bartender can temporarily place drinks.

- **Put down:** If carrying a glass/drink, bartender places it on the mat
- **Pick up:** Tap a drink on the mat → bartender walks to it → picks it up
- Drinks on the mat show the same glass graphic with fill level as everywhere else

---

## Seat Cleanup

After a guest leaves (LEAVING/ANGRY_LEAVING → DONE):
1. `seatDirty` flag set on guest entity
2. Dirty seat added to `barState.dirtySeats` set
3. Cash appears at seat position (if guest left a tip)
4. **Player taps dirty seat or cash:**
   - Bartender walks to seat
   - If cash present: 0.4s collect action → tip added to HUD
   - Then: 0.5s bus action → seat cleaned, ready for next guest
5. Spill sprite shown on dirty seats
