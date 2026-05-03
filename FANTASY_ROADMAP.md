# Fantasy Feature Roadmap

## Build Order

### 1. Pack Opening (no backend needed, do this first)
- Animated pack opening screen — card flip/reveal sequence
- Rarity odds: 1% elite, 8% gold, 40% silver, 51% bronze
- Pack types (e.g. Standard Pack, Premium Pack, Legend Pack with higher elite odds)
- Coins deducted on purchase, cards added to owned collection
- Duplicate handling — if you pull a card you already own, convert to coins

### 2. Legend Cards + Card Versions
- New rarity tier: **Legend** (above elite) — black/gold card skin, historical drivers only
- Legend roster: Senna, Schumacher, Lauda, Prost, Fangio, Clark, Stewart, Hill, etc.
- Add assets/photos for legend drivers
- Multiple versions per driver:
  - **Base** — standard card
  - **Race Winner** — boosted stats, awarded after a real race win
  - **Champion** — end of season, highest version
  - **Iconic Moment** — special livery or career milestone (e.g. "Senna Monaco 1984")
- Version shown as a badge on the card (bottom-left or top-center)
- Higher versions have higher OVR and market value

### 3. Ad Integration (coin earning)
- Rewarded ads (Google AdMob) — watch ad → earn X coins
- Daily ad limit to prevent abuse
- "Watch Ad" button on the balance/wallet screen
- Coin amounts balanced against pack costs

### 4. User Accounts + Backend (commit to this when ready)
- Auth: email/password or Sign in with Apple/Google
- Backend stores: user profile, card collection, coin balance, transaction history
- Migrate local AsyncStorage data to server on first login
- Card ownership is now per-user, not per-device

### 5. P2P Marketplace (requires backend from step 4)
- Users list owned cards with a coin asking price
- Browse listings filtered by rarity, driver, version, price
- Buy instantly at listed price
- Cancel your own listing to get card back
- Transaction fee (e.g. 5% to sink coins from the economy)
- Price history chart per card

---

## Current State (as of this session)
- Cards: FUT-style driver + constructor cards, 4 rarities, animated hue sweep
- Squad: slot structure, budget cap bar, empty slot placeholders
- Market: featured row, rarity-grouped grid, contract signing modal
- League: podium treatment, rank progress callout
- Card detail modal: stat bars, contract info, sign/terminate action
- All data: local AsyncStorage only, no user accounts

## Notes
- Keep it coins-only, no real money. Marketplace = in-game economy only.
- Pack opening animation is the highest fun-per-effort feature — do it first.
- Legend cards need a distinct card skin designed in Figma before implementing (see card skin workflow in memory).
- Backend choice TBD — Firebase or Supabase are the obvious picks for a solo/small team.
