# OpenF1 Paid Features — Implementation Guide

OpenF1 is funded by the community. Sponsoring the project (via Stripe on their website) unlocks
real-time data during live sessions via MQTT and WebSocket, plus doubled rate limits.

**Sponsor page:** https://openf1.org/auth.html  
**Docs:** https://openf1.org/docs/

---

## What the paid tier unlocks

| Feature | Free tier | Paid tier |
|---|---|---|
| Historical data (2023+) | ✅ All endpoints | ✅ All endpoints |
| Live data during sessions | ❌ | ✅ MQTT / WebSocket push |
| Rate limit | ~30 req/min | ~60 req/min |
| Auth | None | OAuth2 bearer token |

---

## 1. Live Timing Screen

**What it enables:** Real-time race positions, gaps, lap times, and sector times pushed to the
app as the race happens — essentially what the official F1 app timing screen shows.

**OpenF1 endpoints used:**
- `wss://api.openf1.org/v1/live` — WebSocket connection (paid)
- `/intervals` — gap to leader and next car, ~4-second updates
- `/position` — live position changes
- `/laps` — lap-by-lap timing as laps complete

**Implementation plan:**

```typescript
// lib/openf1Live.ts

import { OPENF1_TOKEN } from '../config/secrets'; // store in env, not in git

export function connectLiveTiming(sessionKey: number, onUpdate: (data: any) => void) {
  const ws = new WebSocket(
    `wss://api.openf1.org/v1/live?session_key=${sessionKey}&token=${OPENF1_TOKEN}`
  );
  ws.onmessage = (e) => onUpdate(JSON.parse(e.data));
  ws.onerror   = (e) => console.warn('OpenF1 WS error', e);
  return () => ws.close(); // return cleanup function for useEffect
}
```

**React Native note:** React Native's built-in `WebSocket` works — no extra library needed.

**New screen needed:** `app/races/live.tsx`
- Full-screen dark layout during race weekends
- Position tower (P1–P20 with gaps)
- Flashes on position changes
- Red/yellow/green flag indicator at the top
- Only render this screen when `isThisWeekend(race.date)` is true

---

## 2. Live Car Telemetry

**What it enables:** Per-car speed, throttle %, brake, RPM, gear, and DRS status at 3.7 Hz.
Great for a "Car Data" card during a race or after a session ends (free tier has historical).

**OpenF1 endpoint:** `/car_data`

```
GET https://api.openf1.org/v1/car_data?session_key={key}&driver_number={num}
```

Response per record:
```json
{
  "date": "2024-03-02T12:34:56.123456",
  "driver_number": 4,
  "rpm": 11234,
  "speed": 287,
  "n_gear": 7,
  "throttle": 94,
  "brake": 0,
  "drs": 10
}
```

**DRS values:** 0 = off, 8 = eligible, 10/12/14 = open

**Implementation:** Best used as a "last lap" snapshot card on the driver detail page, showing
peak speed, average throttle, and whether DRS was available. Full live telemetry is very
data-heavy — recommend sampling once per lap rather than streaming at 3.7 Hz.

---

## 3. Live Car Positions (Track Map)

**What it enables:** X/Y/Z coordinates of every car at 3.7 Hz — allows rendering a live
track map with moving car dots.

**OpenF1 endpoint:** `/location`

```
GET https://api.openf1.org/v1/location?session_key={key}&driver_number={num}
```

**Implementation plan:**
1. Bundle circuit GeoJSON from https://github.com/bacinger/f1-circuits (MIT license, free)
2. Use `react-native-svg` to render the SVG track outline
3. Map OpenF1 X/Y coordinates to SVG viewport coordinates using a linear transform
4. Animate car positions with `Animated.ValueXY` or Reanimated

**Coordinate transform:**
OpenF1 uses a circuit-specific coordinate system. You'll need to find the bounding box of the
coordinates for each circuit and normalise to your SVG viewport. Example:

```typescript
function toSvgCoords(x: number, y: number, bounds: BoundingBox, svgWidth: number, svgHeight: number) {
  const nx = (x - bounds.minX) / (bounds.maxX - bounds.minX);
  const ny = (y - bounds.minY) / (bounds.maxY - bounds.minY);
  return { svgX: nx * svgWidth, svgY: (1 - ny) * svgHeight }; // flip Y axis
}
```

---

## 4. MQTT Integration (Lowest Latency)

For the absolute lowest latency (sub-second updates), OpenF1 supports MQTT over WebSocket.
This is what they recommend over the REST WebSocket for live race data.

**Library:** `mqtt` (pure JS, works in React Native with some setup)

```bash
npm install mqtt
```

**Connection:**
```typescript
import mqtt from 'mqtt';

const client = mqtt.connect('wss://api.openf1.org/mqtt', {
  username: 'token',
  password: OPENF1_TOKEN,
});

client.subscribe(`openf1/sessions/${sessionKey}/intervals`);
client.on('message', (topic, payload) => {
  const data = JSON.parse(payload.toString());
  // update your state here
});
```

**Available MQTT topics:**
- `openf1/sessions/{key}/intervals` — gaps
- `openf1/sessions/{key}/position` — positions
- `openf1/sessions/{key}/car_data/{driver_number}` — telemetry
- `openf1/sessions/{key}/race_control` — flags, safety car
- `openf1/sessions/{key}/laps` — lap completions
- `openf1/sessions/{key}/pit` — pit stop entries/exits

**React Native caveat:** The `mqtt` npm package uses Node.js `net` module internally. You may
need to configure Metro to handle this. The alternative is `react-native-mqtt` or
`async-mqtt`. Test before committing to this approach.

---

## 5. AI Team Radio Transcripts (F1 Live Pulse)

OpenF1 provides MP3 URLs for team radio clips but **no transcripts**. For transcripts,
F1 Live Pulse (via RapidAPI) provides AI-generated text for radio clips.

**API:** https://www.f1livepulse.com (check RapidAPI for pricing)

This could power the "Radio of the Day" feature in APEX automatically — no manual curation.

**Implementation:**
1. Query F1 Live Pulse for radio clips for the latest session
2. Display clip transcript + audio player in the home screen hero card
3. Link to MP3 for playback using `expo-av`

---

## 6. Token Storage

Never hardcode your OpenF1 token. Store it safely:

```bash
# .env (never commit this file)
OPENF1_TOKEN=your_token_here
```

```typescript
// lib/config.ts
import Constants from 'expo-constants';
export const OPENF1_TOKEN = Constants.expoConfig?.extra?.openf1Token ?? '';
```

```javascript
// app.config.js
export default {
  extra: {
    openf1Token: process.env.OPENF1_TOKEN,
  },
};
```

Add `.env` to `.gitignore` if not already there.

---

## Summary: what to build first when you subscribe

| Priority | Feature | Effort | Impact |
|---|---|---|---|
| 1 | Live position tower (P1–P20 + gaps) | Medium | Very High |
| 2 | Race control live feed (flags, SC) | Low | High |
| 3 | Track map with live car dots | High | Very High |
| 4 | Live lap times per driver | Medium | Medium |
| 5 | Car telemetry "last lap" snapshot | Medium | Medium |
