# Fantasy Driver Ratings — Research & Methodology

## The Core Problem

Current stats in `lib/fantasy.ts` are manually assigned gut-feel numbers.
This doc defines how to replace them with numbers derived from real data,
and how to handle the legend driver simulation problem.

---

## The Car Problem (Most Important Concept)

Before anything else: **~86-88% of race outcome variance is explained by the car, not the driver.**

This means Schumacher's wins are partly Ferrari, Senna's wins are partly McLaren MP4/4,
and Hamilton's wins are partly Mercedes. You cannot use raw points or wins to rate a driver
without first isolating their contribution from the car's contribution.

Every methodology below is essentially a different way of solving this one problem.

**The cleanest solution:** teammate comparison.
Same car, same team, same strategy — only the driver differs.
The gap between teammates is the purest signal of driver skill.

---

## Data Sources

| Source | What it covers | Link |
|--------|---------------|-------|
| **Jolpica-F1** | Ergast API replacement, 2003–now, race results, qualifying | github.com/jolpica/jolpica-f1 |
| **F1DB** | Full history 1950–now, SQLite, open source | github.com/f1db/f1db |
| **FastF1** | Python lib, telemetry + sector data, 2018+ only | github.com/theOehrly/Fast-F1 |
| **OpenF1 API** | Real-time + historical, overtake events, DRS data | openf1.org |
| **STATS F1** | Positions gained/lost per race, DNF rates | statsf1.com |
| **f1pace.com** | Qualifying delta between teammates, current seasons | f1pace.com |

> **Note:** There is no official FIA overtaking database.
> OpenF1 tracks position exchanges (proxy for overtakes) but DRS inflates these since 2011.

---

## How to Calculate Each Stat

### PAC — Pace (Qualifying Speed)

**What it measures:** Raw one-lap speed, independent of race incidents or luck.

**Formula:**
```
PAC = mean qualifying gap to teammate (%) across full career
      normalized to 0–100 within era
      then cross-era adjusted via teammate chain
```

**Why qualifying:** It removes race strategy, safety cars, tyre deg, and luck.
One lap, same car — the cleanest possible signal.

**The AWS approach (official F1):**
Formula 1 partnered with AWS to build a machine learning model that
chains teammate comparisons across decades. Rules:
- Minimum 5 qualifying sessions as teammates before comparison is valid
- Age-adjusted (drivers peak ~28-32)
- Result: Senna 0.114s ahead of Schumacher, 0.275s ahead of Hamilton (in equivalent car)

**Era normalisation:** Use percentage gap to teammate, not absolute seconds.
A 0.3s gap in 1988 means the same thing as a 0.3s gap in 2023 proportionally.
Do NOT compare raw times across eras — modern cars are 5+ seconds per lap faster.

**Data:** Jolpica-F1 for 2003+, F1DB for pre-2003 (less granular).

---

### RAC — Racecraft (Wheel-to-Wheel Ability)

**What it measures:** Net skill in wheel-to-wheel combat — overtaking minus being overtaken.

**Formula:**
```
RAC = (positions gained in race - positions lost in race) / races started
      averaged over career, normalized per era
```

**Data source:** STATS F1 tracks positions gained/lost per driver per race.

**DRS caveat:** Since 2011, DRS made overtaking significantly easier.
A driver with 3.5 net positions gained/race in 2008 is more impressive
than the same number in 2014. Apply a decay factor of ~20-25% for DRS-era overtakes.

**Pre-DRS (pre-2011):** Use net positions gained from lap 1 to finish as proxy.

---

### CON — Consistency (Avoiding Mistakes)

**What it measures:** Reliability of performance — showing up, finishing, not throwing points away.

**Formula:**
```
CON = (championship points per race) × (race completion rate)
      adjusted for era DNF baseline
```

**Era DNF adjustment:** In the 1980s, 35–40% of all drivers DNFed per race due to
mechanical failures. Senna's DNF rate of ~30% doesn't mean he was inconsistent —
everyone was DNFing. Adjust by subtracting the era's average DNF rate before scoring.

**Modern benchmark:** 2023 completion rate is ~95%. A 2023 driver who DNFs 10% of races
is genuinely unreliable. A 1988 driver who DNFs 25% of races is roughly average for that era.

**Data:** Race results from Jolpica-F1 / F1DB.

---

### EXP — Experience

**What it measures:** Career depth and accumulated knowledge of tracks, tyres, pressure situations.

**Formula:**
```
EXP = total race starts (not seasons)
      scaled: 300+ starts = 99, 200 = ~85, 100 = ~65, 50 = ~45, <20 = <30
```

**Why race starts not seasons:** A driver who raced 16 seasons part-time
has less real experience than one who raced 10 full seasons.

**Note:** This is the only stat that doesn't need era normalisation.
Experience accumulates the same way regardless of decade.

---

### DEF — Defence (Holding Position Under Pressure)

**The hard one.** There is no official "times defended" database.

**Best available proxy:**
```
DEF = inverse of positions lost per race when starting in points positions
      (i.e. drivers who hold what they start with score higher)
```

**Alternative approach:** Treat DEF as a derived stat:
```
DEF = 100 - ATK (as a baseline)
      then manually adjust +/- based on known driver tendencies
```

Senna was notoriously aggressive in defence (Prost at 1989 Suzuka). Prost was calculated
and clean in defence. These manual adjustments should be documented per driver.

**Data gap warning:** This stat will have the least rigorous backing until
FIA publishes detailed overtake/defend event data (they don't, currently).

---

### ATK — Attack (Overtaking Ability)

**What it measures:** Ability to pass other cars on track.

**Formula:**
```
ATK = overtakes made per race
      DRS-adjusted for 2011+ era
      cross-era normalised
```

**DRS adjustment:** Post-2011, overtakes inflated by ~20-25% due to DRS.
Scale down DRS-era overtake counts before comparison:
```
adjusted_overtakes = raw_overtakes × 0.78   (for 2011–present)
```

**Pre-DRS proxy:** Use positions gained from qualifying to finish
(net of positions lost) as a separate overtaking signal.

**Data:** OpenF1 API for recent seasons. STATS F1 for historical positions gained.
Clip the Apex database has pre-DRS overtake estimates but is unofficial.

---

## Era Normalisation — The Full Method

Raw stats across eras aren't comparable. These three steps make them comparable:

### Step 1: Z-score within era
```
z = (driver_stat - era_mean) / era_std_deviation
```
This tells you how far above or below average a driver was in their own era.

### Step 2: Map z-scores to 0–100 scale
```
score = 50 + (z × 15)    capped at [1, 99]
```
Average driver in any era = 50. Two standard deviations above = ~80.

### Step 3: Apply era depth multiplier
The F1 grid in 1950 had ~20 drivers, many amateurs. In 2024 it has 20 top-level
professionals from a global talent pool. Beating the 1950 field is inherently
easier than beating the 2024 field.

**Suggested multipliers (approximate):**
- 1950–1965: × 0.90 (shallow talent pool, dangerous cars distort data)
- 1966–1983: × 0.93
- 1984–2000: × 0.96 (professionalisation of sport, still wide skill range)
- 2001–2013: × 0.98
- 2014–present: × 1.00 (baseline)

---

## Academic Methodologies Worth Using

### Bayesian Multilevel Regression (Ingram et al., 2022)
**Paper:** "Bayesian analysis of Formula One race results: disentangling driver skill
and constructor advantage" — Journal of Quantitative Analysis in Sports.

**What it does:** Takes every race finishing position and simultaneously estimates:
- A `driver_skill` coefficient for each driver
- A `car_performance` coefficient for each constructor per season
- A `DNF_risk` factor

**Result:** Clean separation of driver vs. car. Ingram's model found:
- Constructor explains ~88% of race outcome variance
- Driver explains the remaining ~12%
- But that 12% is everything in a fantasy game

**Recommendation:** Use Ingram's driver coefficients as a constraint.
If Verstappen's coefficient = 0.47 and Hamilton's = 0.44, the sum of all
their card stats should reflect that ~7% gap in overall rating.

**Code:** https://martiningram.github.io/f1-model/

### Elo Ratings (FiveThirtyEight / Multiple Implementations)
Treats each race as a round-robin tournament of pairwise outcomes.
Produces comparable ratings across all eras.

**Historical Elo estimates (various implementations):**
- Senna: ~2186
- Hamilton: ~2151
- Schumacher: ~2100
- Fangio: ~2049
- Prost: ~2040
- Verstappen: ~2120 (still active, rising)

These can be used as OVR anchors — Senna OVR 99, Fangio OVR 98, etc.

**Implementation:** github.com/joemarlo/F1-Elo

### EA Sports F1 Game Ratings
EA rates current drivers on four axes: Pace, Racecraft, Awareness, Experience.
Their methodology uses:
- Pace: Best lap vs. race fastest lap ratio
- Racecraft: Positions gained/lost vs. grid slot average
- Awareness: Incident and penalty avoidance rate
- Experience: Career race count

Useful as a sanity check for current drivers.
**Ratings:** ea.com/games/f1/ratings

---

## The Legend Simulation Problem

When Senna "races" Verstappen in the fantasy game, how do you determine the outcome?

### The issue
Senna's stats are calibrated to his era. Verstappen's are calibrated to 2024.
You cannot directly compare their PAC scores because the PAC formula uses
era-normalised data — both score 99 in PAC, but that means different things
in absolute lap time terms.

### Recommended simulation approach

**Step 1: Convert card stats back to Bayesian skill coefficients**
```
skill_coefficient = (OVR - 50) / 50 × max_coefficient
```
This gives each driver a single floating-point skill number on the same scale.

**Step 2: Apply track profile weighting**
Different tracks favour different stats. Define track profiles:

| Track Type | PAC weight | RAC weight | CON weight | ATK weight |
|-----------|-----------|-----------|-----------|-----------|
| Low-speed technical (Monaco) | 0.25 | 0.30 | 0.25 | 0.20 |
| High-speed (Monza, Spa) | 0.40 | 0.25 | 0.20 | 0.15 |
| Street circuit (Baku, Singapore) | 0.20 | 0.25 | 0.35 | 0.20 |
| Balanced (Bahrain, Silverstone) | 0.28 | 0.26 | 0.23 | 0.23 |

```
track_adjusted_skill = Σ(stat[i] × track_weight[i])
```

**Step 3: Add controlled randomness**
Real races have variance — rain, safety cars, mechanical issues.
```
simulated_score = track_adjusted_skill + random_noise(mean=0, std=5)
```
Rank all drivers by simulated_score → finishing positions.

**Step 4: Apply contract multiplier**
Long contracts (1.35×) should amplify the simulated earnings, not the skill score.
```
race_earnings = RACE_REWARDS[position] × contract.multiplier
```

### Why this is fair
- Both legend and modern drivers are evaluated on the same skill scale
- The track profile prevents pure PAC dominance (Senna wins everywhere)
- Randomness means upsets are possible but statistically unlikely for top cards
- Contract length rewards commitment without distorting driver rankings

---

## Proposed Stat Recalculation Priority

These are the stats most wrong in the current data, in order of urgency:

1. **CON** — currently reflects gut feeling. Should use points-per-race × completion rate.
2. **PAC** — currently reflects reputation. Should use qualifying-gap-to-teammate z-scores.
3. **ATK** — currently reflects reputation. Should use STATS F1 positions-gained data.
4. **RAC** — currently overlaps too much with ATK. Recalculate as net positions (gained minus lost).
5. **DEF** — hardest to calculate. Keep as derived stat for now (100 - ATK ± manual adjust).
6. **EXP** — easiest. Just race start counts from F1DB, mapped to 0–99 scale.

---

## What To Do Next

1. Pull driver career data from **F1DB** (race starts, points, DNFs) for all legend drivers
2. Pull teammate qualifying deltas from **Jolpica-F1** for 2003+ drivers
3. Run Ingram's Bayesian model (or use his published coefficients) as OVR anchors
4. Recalculate all 6 stats per the formulas above
5. Build the track profile table for the simulation
6. Implement `simulateRace(drivers[], trackProfile)` in `lib/fantasy.ts`

---

## Sources

- Ingram, M. (2022). Bayesian analysis of Formula One race results. *Journal of Quantitative Analysis in Sports.* https://pmc.ncbi.nlm.nih.gov/articles/PMC10660124/
- Formula 1 + AWS. "Machine learning reveals the fastest F1 driver of all time." https://www.formula1.com/en/latest/article/hamilton-schumacher-senna-machine-learning-reveals-the-fastest-f1-driver-of.3DwwPLW4glCmlunjciH1Cz
- FiveThirtyEight. "In Formula One, Does The Driver Or Car Matter More?" https://fivethirtyeight.com/features/in-formula-one-does-the-driver-or-car-matter-more/
- Bell, A., Smith, J., Sabel, C.E., Jones, K. (2016). Formula for success: Multilevel modelling of Formula One Driver and Constructor performance, 1950-2014. *Journal of Quantitative Analysis in Sports.*
- EA Sports F1 25 Driver Ratings. https://www.ea.com/games/f1/ratings
- OpenF1 API Documentation. https://openf1.org/
- F1DB Open Source Database. https://github.com/f1db/f1db
- Ingram, M. Blog implementation. https://martiningram.github.io/f1-model/
- STATS F1 — Driver Statistics. https://www.statsf1.com/en/statistiques/pilote.aspx
- f1pace.com — Qualifying deltas between teammates. https://f1pace.com/
