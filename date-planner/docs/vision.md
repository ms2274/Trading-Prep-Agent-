# Date Night Planner — Project Kickoff

## What We're Building

A mobile-first web app (Next.js) that removes all friction from planning a date night. User inputs preferences → gets a complete, swappable, bookable evening itinerary. Think "AI concierge that knows what's trending and builds your whole night."

**Target audience:** Couples (dating niche first). The persona is a 22–35 year old who discovers restaurants on Instagram/TikTok, not Yelp.

**Stack:** Next.js, TypeScript, Supabase (auth + DB), Anthropic API (Claude Sonnet), Google Places API, Tailwind CSS

---

## Core User Flow

1. **Onboarding (one-time):** Each partner creates a profile — food preferences, vibe preferences (intimate/adventurous/trendy/chill), budget comfort, dietary restrictions, location
2. **Plan request:** User sets date night parameters:
   - Location / neighborhood / "surprise me within X miles"
   - Budget cap (total for the night)
   - Vibe (romantic, adventurous, trendy, low-key)
   - Duration (quick dinner vs. full evening: activity → dinner → drinks/dessert)
3. **AI generates itinerary:** 2–4 stop evening plan with drive/walk times between stops
4. **Interactive browsing:** Each stop is a rich card the user can browse WITHOUT leaving the app:
   - Photo carousel (Google Places photos + Instagram location posts if available)
   - Vibe tags (AI-generated: "intimate," "trendy," "hidden gem," "great for first dates")
   - "Why we picked this" — AI-written blurb explaining the rec
   - Menu highlights — scraped menu with AI-picked "best for date night" dishes
   - Quick stats: price level, travel time from previous stop, dress code, ratings
5. **One-tap swap:** Don't like a stop? Tap swap → see 2–3 alternatives in the same card format, same vibe/budget slot. User never "starts over."
6. **Confirm & go:** Finalized plan with map view, timing, and links to reserve/buy tickets
7. **Post-date review:** Quick 3-question review per stop ("Would you go back?" / "Rate the vibe" / "Rate the food"). This builds a couples-specific dataset that doesn't exist anywhere.

---

## Discovery Source Map — Where Our Target Demo Actually Finds Restaurants

Yelp skews older/tourist-y. Gen Z uses Instagram (55%) and TikTok (44%) for restaurant reviews. TikTok is the #1 restaurant discovery channel for Gen Z at 38%, surpassing word of mouth.

| Source | What It Gives You | How to Tap It |
|---|---|---|
| **Instagram** | Vibe photos, reels, tagged locations | Instagram Graph API — pull top posts per location |
| **TikTok** | Trending spots, "hidden gem" content | TikTok Content Discovery API or scrape trending location tags |
| **The Infatuation** | Curated, opinionated reviews (NYC bible) | Scrape or partner — no public API |
| **Eater** | "Heat maps," new openings, trend pieces | Scrape city-specific lists |
| **Resy / OpenTable** | "Hard to get" signal = hype indicator + real-time availability | Resy API (limited), OpenTable affiliate |
| **Google Places** | Baseline: hours, ratings, photos, reviews | API (your backbone) |
| **Reddit city subs** | Authentic local recs, anti-hype balance | Reddit API — mine r/FoodNYC, r/njfood, etc. |

## In-App Place Card Spec — What Each Card Shows

| Card Element | Source |
|---|---|
| **Photo carousel** | Google Places photos + top Instagram posts for that location |
| **Vibe tags** | LLM-generated from review mining ("intimate," "trendy," "loud & fun") |
| **"Why we picked this"** | AI blurb: "Trending on TikTok this month, known for their pasta tasting menu" |
| **Menu highlights** | Scraped menu + LLM picks "best for date night" dishes |
| **Quick stats** | Price level, walk time from previous stop, dress code |
| **Swap button** | One tap → shows 2–3 alternatives with same vibe/budget, same card format |

The swap UX is key — user should never feel like they're "starting over," just sliding to the next option in the same slot of the itinerary.

---

## Data Architecture — How We Make Recommendations Good

This is the moat. Layered data strategy:

### Layer 1: Structured APIs (backbone)
- **Google Places API** — ratings, hours, price level, photos, reviews, location data
- **Eventbrite / SeatGeek APIs** — local events, shows, experiences for the "activity" slot
- **Resy / OpenTable** — reservation availability + "hard to book" = trending signal

### Layer 2: AI-Enriched Intelligence (the edge)
- **Review mining pipeline:** Pull Google Places reviews → Claude extracts vibe tags, best dishes, date-night suitability score, dress code signals, noise level, ambiance descriptors
- **Buzz scoring:** Track Instagram + TikTok post volume and engagement on location tags to identify trending spots
- **Seasonal/temporal awareness:** Rooftop bar = summer. Outdoor market = fall. Cozy wine bar = winter. Integrate weather API to adjust in real-time.
- **Pairing logic:** AI learns which activity → restaurant → dessert/drinks combos work based on proximity, vibe continuity, and timing

### Layer 3: Community Data (long-term moat)
- **Post-date ratings** from users — builds dating-specific review data
- **"Worked for couples like you"** — collaborative filtering once volume exists
- **Local tipster program** — recruit food bloggers / local creators to seed "insider picks" per city

### Layer 4: Content Scraping (supplemental)
- **The Infatuation / Eater** — editorial credibility; LLM summarizes their take on a place
- **Reddit city subs** (r/FoodNYC, r/njfood, etc.) — authentic local recs
- **Menu scraping** — pull menus from restaurant websites for the in-app menu display

---

## Database Schema (Supabase)

Core tables to start:

- `users` — auth, profile, preferences, location
- `couples` — linked user pairs, shared preference overlap
- `places` — cached place data (Google Places ID as key), enriched with AI tags
- `place_reviews_raw` — cached Google reviews for AI processing
- `place_enrichments` — AI-generated vibe tags, best dishes, date suitability score, buzz score
- `itineraries` — generated plans with ordered stops
- `itinerary_stops` — individual stops within a plan (FK to places + itineraries)
- `post_date_reviews` — user ratings per stop after the date
- `swap_history` — tracks what users swapped away from (negative signal for recs)

---

## MVP Scope (Phase 1)

Build this first. No more, no less:

1. ✅ Auth + user onboarding (preferences)
2. ✅ Plan generation: input preferences → Claude generates itinerary using Google Places API data
3. ✅ Rich place cards: photos, AI vibe tags, review summary, price, hours
4. ✅ Swap functionality: swap any stop for alternatives
5. ✅ Post-date review (simple 3-question form)
6. ✅ Mobile-first responsive design

### NOT in MVP:
- ❌ Couples pairing / shared profiles (phase 2)
- ❌ Booking/reservation integration (phase 2)
- ❌ Instagram/TikTok buzz scoring (phase 2)
- ❌ Menu scraping (phase 2 — use Google Places menu links for now)
- ❌ Local tipster content (phase 3)
- ❌ Collaborative filtering (phase 3 — need volume first)

---

## Design Direction

- Dark mode default, warm accent colors (think: evening/nightlife energy)
- Card-based UI — each place is a swipeable/tappable card
- Map view toggle for the full itinerary
- Minimal text, heavy on photos and quick-scan tags
- The feel should be: premium, curated, not "another restaurant list app"

---

## Let's Start

Begin by scaffolding the Next.js project with:
- Supabase auth + database setup (create the core tables above)
- Google Places API integration (search, details, photos)
- The plan generation flow: user inputs preferences → Claude API call → returns structured itinerary
- Basic place card component with photo carousel, vibe tags, and stats

Build iteratively — get the core loop working (input → generate → browse → swap) before polishing.
