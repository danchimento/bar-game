# Guest Lifecycle

## Guest Types

| Type | Patience | Max Drinks | Tip Multiplier | Behavior |
|------|----------|------------|----------------|----------|
| **quick** | 0.6–0.9 | 1 | 1.0x | One drink and out |
| **regular** | 0.8–1.4 | 2–3 | 1.2x | Multiple rounds, 25% chance wants water too |

- **knowsOrder:** 40% of guests walk in already knowing what they want (shorter settle time)
- **wantsWater:** 25% of regular guests order water alongside their first drink

## State Machine

```
WAITING_FOR_SEAT ──→ ARRIVING ──→ SEATED ──→ LOOKING ──→ READY_TO_ORDER
                                    │                          │
                                    │ (knowsOrder: shorter)    │
                                    └──────────────────────────┘
                                                               │
                                                  ┌── acknowledgeGuest()
                                                  ▼
                                            ORDER_TAKEN (0.5s)
                                                  │
                                                  ▼
                                         WAITING_FOR_DRINK
                                                  │
                                          ┌── serveDrink()
                                          ▼
                                        ENJOYING (20-35s × patience)
                                          │
                              ┌───────────┴───────────┐
                    (wants more)                  (at maxDrinks)
                              │                       │
                              ▼                       ▼
                 LOOKING (reason:'another')    LOOKING (reason:'check')
                              │                       │
                    acknowledgeGuest()       acknowledgeGuest()
                              │                       │
                     WANTS_ANOTHER (1.5s)        READY_TO_PAY
                              │                       │
                     WAITING_FOR_DRINK          giveCheck()
                              │                       │
                        (repeat)              REVIEWING_CHECK (6s)
                                                      │
                                                   LEAVING
                                                      │
                                              (Y moves off-screen)
                                                      │
                                                    DONE
```

**Angry path:** From ANY state (except LEAVING/DONE/REVIEWING_CHECK), if mood reaches 0 → ANGRY_LEAVING → DONE (no tip, no cash).

## State Details

### WAITING_FOR_SEAT
- Queued guests are **NOT rendered as sprites** in the bar area
- A badge at top-center of the bar shows "[N] queued" when guests are waiting
- Mood decays at 0.25/s
- Auto-seats when a clean, empty seat becomes available

### ARRIVING
- Guest slides down from Y=-30 to Y=200 at 120 px/s
- No mood decay
- Transitions to SEATED on arrival

### SEATED
- Guest is settling in, deciding what to order
- Timer: `settleTime × patience` (default ~4s, shorter if knowsOrder: 0.5–1.5s)
- Mood decays at 0.15/s
- When timer expires → sets `lookingReason = 'first_order'` → LOOKING
- **Visual:** Guest sprite at seat, no indicator icon

### LOOKING
- Guest wants bartender's attention
- Mood decays at 0.5/s (fast — attend quickly!)
- `lookingReason` is one of: `'first_order'`, `'another'`, `'check'`
- **Visual:** Eyes icon (icon_eyes) above head
- **Player action:** Tap guest → radial menu with "Check In" option

### READY_TO_ORDER
- Brief transitional state — guest has decided
- Mood decays at 0.6/s
- `chooseDrink()` is called here (picks from drinkPrefs)
- **Visual:** Eyes icon above head

### ORDER_TAKEN
- Bartender acknowledged the order
- Timer: 0.5s, then → WAITING_FOR_DRINK
- `orderRevealTimer` set to 8s (order text shows above head)
- No mood decay
- **On entry:** `notepad.addOrder()` is called, HUD shows "Order: [drink name]"

### WAITING_FOR_DRINK
- Guest waiting for their drink to arrive
- Mood decays at 0.75/s (fastest decay — prioritize!)
- `waitStartTime` accumulates for stats
- **Visual:** Hourglass icon (icon_hourglass) above head
- **Player action:** Tap guest → "Serve" (if carrying drink) + "Ask Again"

### ENJOYING
- Guest has drink, sipping it over time
- Mood RECOVERS at +3/s
- +15 mood boost on entry
- Timer: random(20s, 35s) × patience
- Sipping system active (see below)
- **Visual:** No indicator icon. Glass visible on counter in front of guest.
- **Player action:** Tap guest → "Check In" (mood +8, tip +10%)

### WANTS_ANOTHER
- Guest finished drink, wants another round
- Timer: 1.5s → WAITING_FOR_DRINK
- Mood decays at 0.5/s
- **Visual:** Beer icon (icon_beer) above head
- **Player action:** Tap guest → "Serve" (if carrying anticipated drink)

### READY_TO_PAY
- Guest done drinking, wants the check
- Mood decays at 0.5/s
- **Visual:** Money icon (icon_money) above head
- **Player action:** Tap guest → "Give Check" (if carrying printed check for this seat)

### REVIEWING_CHECK
- Guest reviewing their bill
- Timer: 6s → LEAVING
- No mood decay
- **Visual:** Receipt icon (icon_receipt) above head

### LEAVING
- Guest walks off-screen (Y -= 100 px/s)
- `calculateTip()` is called
- `cashOnBar` flag set → cash appears on bar at their seat
- `seatDirty` flag set
- Transitions to DONE when Y < -40
- **Visual:** Guest sprite at 50% opacity, moving upward

### ANGRY_LEAVING
- Same as LEAVING but triggered by mood=0
- No tip, `wasAngry = true`
- **Visual:** Angry icon (icon_angry) above head, 50% opacity, moving upward

### DONE
- Guest has left the screen, removed from active list
- Stats recorded (guestsServed or guestsAngry)
- Notepad entry removed

## Mood System

### Constants
- **Max mood:** 100
- **Starting mood:** 100

### Decay Rates (per second)

| State | Rate | Notes |
|-------|------|-------|
| WAITING_FOR_SEAT | 0.25 | Slow — they expect to wait |
| ARRIVING | 0 | No decay while walking in |
| SEATED | 0.15 | Slow — just arrived |
| LOOKING | 0.5 | Wants attention |
| READY_TO_ORDER | 0.6 | Wants to order NOW |
| ORDER_TAKEN | 0 | Just ordered, patient |
| WAITING_FOR_DRINK | 0.75 | Highest decay — urgent! |
| ENJOYING | -3.0 | **Recovers** mood |
| WANTS_ANOTHER | 0.5 | Waiting again |
| READY_TO_PAY | 0.5 | Wants to leave |
| REVIEWING_CHECK | 0 | Reading bill |

### Modifiers
- **Patience multiplier:** `1 / patience` — patient guests decay slower
- **Level decay multiplier:** 0.7 (Day 1) → 1.1 (Day 5)
- **Grace period:** First N seconds of level, decay scales from 0% → 100%
  - Day 1: 90s, Day 2: 75s, Day 3: 60s, Day 4: 45s, Day 5: 30s
- **Empty glass annoyance:** If guest has 2+ empty glasses at seat, mood penalty of -1.5/s per empty glass

### Mood Thresholds (display labels)

| Range | Label |
|-------|-------|
| 80–100 | ENTERTAINED |
| 60–79 | CONTENT |
| 40–59 | IDLE |
| 20–39 | LOOKING |
| 10–19 | FRUSTRATED |
| 0–9 | LEAVING |

### Mood Bar Visual
- 32px wide bar below guest sprite
- Green (>60%), Yellow (30-60%), Red (<30%)

## Sipping System

While in ENJOYING state with drinks at their seat:

1. **Sip timer** counts down (interval: 2.5–6 seconds, random per guest)
2. When timer fires:
   - Deplete `sipAmount` (0.05–0.13) from current glass
   - All layers in the glass scale proportionally
   - Set `sipping = true`, `sipAnimTimer = 1.0`
   - Advance `sipDrinkIndex` (alternates if multiple glasses)
3. **Sip animation** (1.0 second total):
   - 0.0–0.3s: Glass lifts from counter (Y=225) toward guest mouth (Y≈195)
   - 0.3–0.7s: Glass at mouth position
   - 0.7–1.0s: Glass returns to counter
4. When all glasses are empty:
   - If `drinksHad < maxDrinks` AND level not ending → `lookingReason = 'another'` → LOOKING
   - If at max drinks → `lookingReason = 'check'` → LOOKING

## Tipping

```
baseTip = totalSpent × 20%
tip = baseTip × (mood / 100) × tipMultiplier
if checkedIn: tip × 1.1
if overcharged: tip = 0 (no tip at all)
```

- **checkedIn** is set by the "Check In" action during ENJOYING state
- **overcharged** is set if POS tab total > actual drinks served total
- Cash appears on bar at the guest's seat position after LEAVING transition
- Player must walk to seat and tap cash to collect

## Guest Interactions (Radial Menu Options)

| Guest State | Available Options |
|-------------|------------------|
| SEATED | Check In |
| LOOKING | Check In |
| WAITING_FOR_DRINK | Serve (if carrying drink), Ask Again |
| ENJOYING | Check In |
| WANTS_ANOTHER | Serve (if carrying matching drink) |
| READY_TO_PAY | Give Check (if carrying printed check for this seat) |
| *Any state* | Take Glass (if empty glass at seat and hands free or carrying dirty glass) |
