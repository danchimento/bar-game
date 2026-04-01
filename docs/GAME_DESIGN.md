# Bar Rush — Game Design Document

> **Purpose:** This is the authoritative reference for how every feature in Bar Rush should behave. All code changes must conform to this spec. If behavior differs from this doc, either the code has a bug or this doc needs updating — never silently diverge.

## Game Overview

Bar Rush is a single-player bar management game. The player controls a bartender serving guests at a bar counter. The core challenge is time management: taking orders, making drinks correctly, serving guests, and processing payments — all while keeping guest mood high enough to earn good tips.

## Core Game Loop

```
1. Guests arrive and sit at stools (or wait in line if full)
2. Guest signals they want attention (👀 icon)
3. Player taps guest → walks over → takes order
4. Order appears on notepad + briefly above guest head
5. Player walks to glass rack → picks up correct glass type
6. Player walks to tap/wine station → holds to pour to correct fill level
7. (Optional) Player adds ice, garnish, or mixer at prep station
8. Player taps guest → serves drink
9. Guest drinks (sipping animation over 20-35s)
10. Guest signals for another round, or asks for the check
11. Player rings up drinks on POS → prints check → delivers check
12. Guest reviews check → leaves cash + tip on bar
13. Player collects cash, buses dirty seat → seat is ready for next guest
```

## Screen Layout (960×540 landscape)

```
Y=0   ┌──────────────────────────────────────────────────┐
      │  [Tips: $XX]              [⏸]        [7:30 PM]  │  HUD
Y=70  │            (waiting guests queue here)            │
      │                                                    │
Y=200 │   👤          👤          👤         👤           │  Guests (seated)
Y=185 │   ╔═╗        ╔═╗        ╔═╗       ╔═╗           │  Stools
Y=225 │ ══════════════════════════════════════════════════ │  Bar top
Y=265 │   [service mat area]                              │
Y=330 │              🧑‍🍳 (bartender walks L↔R)            │  Walk track
      │                                                    │
Y=470 │ [DISH] [SINK] [GLASS] [TAPS] [WINE] [PREP] [POS]│  Stations
Y=540 └──────────────────────────────────────────────────┘
```

- **Bar horizontal bounds:** X 30 → 930
- **Bartender speed:** 280 px/s, only moves when not busy
- **Bartender start position:** X=480 (center)

## Input Model

| Input | Context | Result |
|-------|---------|--------|
| Tap station | No modal open | Bartender walks to station, performs default action |
| Long-press station | No modal open | Radial menu opens with station options |
| Tap guest | No modal open | Radial menu opens with context-sensitive guest options |
| Tap empty bar area | No modal/menu open | Bartender walks to tapped X position |
| Hold tap handle / wine bottle | Drink modal open + carrying glass | Glass slides under tap/bottle, pour starts, glass fills visually |
| Release anywhere | Pour active | Pour stops |
| Release on radial menu | Menu open, finger on option | Executes hovered option, menu closes |
| Release outside radial menu | Menu open | Menu closes, no action |
| Tap outside modal | Modal open | Modal closes |

### Radial Menu Behavior

- Opens centered on the tapped element (clamped to screen edges)
- Donut shape: inner radius 40px (dead zone), outer radius 120px
- Slices divide the ring evenly (2π / option count)
- First slice starts at top (-π/2)
- **Single option:** Full ring, icon and label positioned at TOP of ring (12 o'clock), not at computed midAngle
- **Multiple options:** Icon + label centered in each slice
- Hovered slice: expands 8px outward, turns gold (#ffd54f)
- Disabled options: dark gray, not selectable
- Pointer drag updates hover in real-time
- On release: executes hovered option's action (if not disabled), then closes

## Time & Clock

- Each level has a duration in seconds (240s–300s)
- Clock displays as 6:00 PM → 12:00 AM (6 real-world hours mapped to level duration)
- Clock turns red when < 30 seconds remain
- Level ends when timer expires AND all guests have left AND bar is clean

## Stars & Scoring

Stars are based on total earnings (tips + revenue):

| Stars | Meaning |
|-------|---------|
| 0 | Below threshold 1 |
| 1 | Met minimum |
| 2 | Good performance |
| 3 | Excellent |

Thresholds vary per level (see [LEVELS.md](LEVELS.md)).

## Stats Tracked Per Level

- Drinks served correctly / with issues / rejected / wasted
- Guests served / angry (left due to mood=0)
- Bills correct / overcharged / undercharged
- Anticipated drinks correct / wrong
- Total wait time, total tips, peak simultaneous guests

## Related Specs

- **[GUEST_LIFECYCLE.md](GUEST_LIFECYCLE.md)** — Guest states, mood, sipping, tipping
- **[STATIONS_AND_ITEMS.md](STATIONS_AND_ITEMS.md)** — Stations, glasses, drinks, pouring, validation
- **[UI_AND_VISUALS.md](UI_AND_VISUALS.md)** — Visual specs for every rendered element
- **[LEVELS.md](LEVELS.md)** — Level progression, spawn schedules, difficulty
