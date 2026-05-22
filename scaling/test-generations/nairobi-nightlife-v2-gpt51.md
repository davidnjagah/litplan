# Test Generation — Nairobi · Nightlife
**Pipeline:** bolt-pipeline-v2 (gpt-5.1 / gpt-4.1-mini split, midnight sort fix)
**Date:** 2026-05-21

---

## Run 1 — ⚠️ Timing bug (pre-fix)
**Status:** 3 venues verified but stop order garbled (00:20 → 15:00 → 22:00)

| Stop | Time | Venue |
|---|---|---|
| 1 | 00:20 | Havana Bar & Restaurant |
| 2 | 15:00 | Blacky'z Lounge ← wrong (3 PM for nightlife) |
| 3 | 22:00 | The Alchemist |

Cost: KES 5,000 – 11,000  
Root cause: `enforceChronologicalSpacing` sorted 00:20 (= 20 min) before 22:00 (= 1320 min), treating post-midnight times as early morning.

---

## Run 2 — ✅ Timing fixed, 1 venue (thin Agent 1 draw)
**Status:** Sort fix confirmed working. Only 1 venue survived quality filter this run — Agent 1 suggested venues with insufficient reviews.

### Neon Nights at The Alchemist: Nairobi's Creative Party Playground

## Stop 1 — 10:00 PM · 120 min

### The Alchemist
📍 Parklands Rd, Nairobi, Kenya
🗺️ [Open in Maps](https://www.google.com/maps/search/?api=1&query=The%20Alchemist&query_place_id=ChIJr9P-KRUXLxgR4Wn6jx1lv9A)

---

## Plan Details
| | |
|---|---|
| Estimated cost | KES 2,000 – 4,500 |
| Venues verified | 1 / 7 this run |
| Rejected | B-CLUB Nairobi · KIZA Restaurant & Lounge · The Mirage Lounge · Mercury Lounge ABC Place |
| Fix applied | midnight sort: times < 06:00 unwrapped to +1440 when themeStart ≥ 12:00 |
