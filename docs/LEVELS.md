# Level Progression

## Overview

The game has a 5-day campaign. Each day introduces new mechanics and increases difficulty through more guests, faster mood decay, shorter grace periods, and more drink variety.

## Difficulty Scaling

| Parameter | Day 1 | Day 2 | Day 3 | Day 4 | Day 5 |
|-----------|-------|-------|-------|-------|-------|
| Duration | 240s | 270s | 300s | 300s | 300s |
| Seats | 3 | 3 | 4 | 4 | 5 |
| Guests | 6 | 8 | 10 | 11 | 14 |
| Mood decay multiplier | 0.7 | 0.8 | 0.9 | 1.0 | 1.1 |
| Grace period | 90s | 75s | 60s | 45s | 30s |
| Drinks available | 1 | 2 | 3 | 4 | 4 |

## Day 1: Opening Night

**Theme:** Tutorial-like. One beer, simple flow.

- **Duration:** 240 seconds (4 minutes)
- **Seats:** 3
- **Stations:** DISHWASHER, GLASS_RACK, TAPS, POS, TRASH
- **Drinks:** GOLD_LAGER only
- **Star thresholds:** 1★=$25, 2★=$50, 3★=$80
- **Settings:** moodDecay 0.7x, grace 90s, spawn interval 1.0

**Spawn Schedule:**
| Time | Type | Drink Prefs |
|------|------|-------------|
| 5s | regular | GOLD_LAGER |
| 30s | quick | GOLD_LAGER |
| 60s | regular | GOLD_LAGER |
| 100s | quick | GOLD_LAGER |
| 140s | regular | GOLD_LAGER |
| 180s | regular | GOLD_LAGER |

## Day 2: Word Gets Around

**Theme:** Second beer introduced. Sink added for dump/correction.

- **Duration:** 270 seconds (4.5 minutes)
- **Seats:** 3
- **Stations:** DISHWASHER, SINK, GLASS_RACK, TAPS, POS, TRASH
- **Drinks:** GOLD_LAGER, HAZY_IPA
- **Star thresholds:** 1★=$35, 2★=$70, 3★=$110
- **Settings:** moodDecay 0.8x, grace 75s, spawn interval 1.0

**Spawn Schedule:**
| Time | Type | Drink Prefs |
|------|------|-------------|
| 3s | regular | GOLD_LAGER |
| 20s | quick | HAZY_IPA |
| 45s | regular | GOLD_LAGER, HAZY_IPA |
| 75s | regular | HAZY_IPA |
| 110s | quick | GOLD_LAGER |
| 140s | regular | GOLD_LAGER, HAZY_IPA |
| 175s | quick | HAZY_IPA |
| 210s | regular | GOLD_LAGER |

## Day 3: Happy Hour

**Theme:** More seats, more guests, third beer. Things get busy.

- **Duration:** 300 seconds (5 minutes)
- **Seats:** 4
- **Stations:** DISHWASHER, SINK, GLASS_RACK, TAPS, POS, TRASH
- **Drinks:** GOLD_LAGER, HAZY_IPA, DARK_PORTER
- **Star thresholds:** 1★=$45, 2★=$90, 3★=$140
- **Settings:** moodDecay 0.9x, grace 60s, spawn interval 1.0

**Spawn Schedule:**
| Time | Type | Drink Prefs |
|------|------|-------------|
| 2s | regular | GOLD_LAGER, HAZY_IPA |
| 15s | quick | DARK_PORTER |
| 35s | regular | HAZY_IPA |
| 55s | regular | GOLD_LAGER, DARK_PORTER |
| 80s | quick | GOLD_LAGER |
| 105s | regular | DARK_PORTER, HAZY_IPA |
| 130s | quick | HAZY_IPA |
| 160s | regular | GOLD_LAGER |
| 190s | regular | DARK_PORTER |
| 225s | quick | GOLD_LAGER, HAZY_IPA |

## Day 4: Regulars Night

**Theme:** Prep station unlocked. Harvest Moon (requires orange garnish) introduced. Garnish mechanic is the new challenge.

- **Duration:** 300 seconds
- **Seats:** 4
- **Stations:** DISHWASHER, SINK, GLASS_RACK, TAPS, PREP, POS, TRASH
- **Drinks:** GOLD_LAGER, HAZY_IPA, DARK_PORTER, HARVEST_MOON
- **Star thresholds:** 1★=$55, 2★=$110, 3★=$170
- **Settings:** moodDecay 1.0x, grace 45s, spawn interval 1.0

**Spawn Schedule:**
| Time | Type | Drink Prefs |
|------|------|-------------|
| 2s | regular | GOLD_LAGER, HARVEST_MOON |
| 15s | regular | HAZY_IPA |
| 35s | quick | DARK_PORTER |
| 55s | regular | HARVEST_MOON |
| 80s | regular | GOLD_LAGER, HAZY_IPA |
| 100s | quick | HARVEST_MOON |
| 125s | regular | DARK_PORTER, HARVEST_MOON |
| 150s | regular | HAZY_IPA |
| 180s | quick | GOLD_LAGER |
| 210s | regular | HARVEST_MOON, DARK_PORTER |
| 245s | regular | HAZY_IPA, GOLD_LAGER |

## Day 5: Friday Rush

**Theme:** Maximum chaos. 5 seats, 14 guests in tight schedule. Everything unlocked. Short grace period and amplified mood decay.

- **Duration:** 300 seconds
- **Seats:** 5
- **Stations:** Same as Day 4
- **Drinks:** Same as Day 4
- **Star thresholds:** 1★=$65, 2★=$130, 3★=$200
- **Settings:** moodDecay 1.1x, grace 30s, spawn interval 1.0

**Spawn Schedule:**
| Time | Type | Drink Prefs |
|------|------|-------------|
| 1s | regular | GOLD_LAGER |
| 12s | quick | HAZY_IPA |
| 25s | regular | DARK_PORTER, HARVEST_MOON |
| 40s | regular | GOLD_LAGER, HAZY_IPA |
| 55s | quick | HARVEST_MOON |
| 70s | regular | DARK_PORTER |
| 90s | regular | HAZY_IPA, HARVEST_MOON |
| 110s | quick | GOLD_LAGER |
| 130s | regular | HARVEST_MOON |
| 150s | regular | DARK_PORTER, HAZY_IPA |
| 170s | quick | GOLD_LAGER |
| 195s | regular | HARVEST_MOON, DARK_PORTER |
| 220s | regular | HAZY_IPA |
| 250s | quick | GOLD_LAGER, HARVEST_MOON |

## Level Complete Screen

Displayed after all guests have left and bar is clean:

- Level name
- Star rating (0-3 stars, animated)
- Stats breakdown:
  - Drinks served (correct / issues / rejected)
  - Guests served / angry
  - Total tips earned
  - Average wait time
- **Retry** button (replay same level)
- **Next** button (advance to next level, only if >= 1 star)

## Future Level Ideas (Not Yet Implemented)
- Wine station introduction (Day 6?)
- Mixed drinks / cocktails
- VIP guests with special requirements
- Happy hour pricing events
- Rush hour with compressed spawn schedule
