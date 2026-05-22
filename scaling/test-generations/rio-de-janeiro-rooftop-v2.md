# Test Generation — Rio de Janeiro · Rooftop
**Pipeline:** bolt-pipeline-v2 (gpt-4.1 / gpt-4.1-mini split, pure function scheduling)
**Date:** 2026-05-21
**Status:** ✅ Success

---

## Sky-High Sips: Rooftop Revelry Across Rio

Ascend above Rio's vibrant streets and discover the city's pulse from dazzling new heights, where each rooftop unveils a fresh panorama and an electric atmosphere. From chic sunset cocktails to DJ-fueled nights and jaw-dropping vistas of Sugarloaf and Christ the Redeemer, this trio of rooftops promises you Rio's most unforgettable after-dark adventure. Let the city lights ignite your senses and experience Rio like never before—elevated, exhilarating, and absolutely unmissable.

---

## Stop 1 — 5:30 PM · 90 min

### Bar dos Descasados
📍 R. Felício dos Santos, 15 - Santa Teresa, Rio de Janeiro - RJ, 20241-260, Brazil
🕐 Opens: 17:00 – 00:00
🗺️ [Open in Maps](https://www.google.com/maps/search/?api=1&query=Bar%20dos%20Descasados&query_place_id=ChIJI3HK79F_mQARl_xt93FSWfA)

> Begin your evening among Santa Teresa's artistic rooftops, sipping signature cocktails as golden sunlight melts over Rio's undulating hills and city lights flicker to life in a stylish, laid-back oasis.

---

## Stop 2 — 7:20 PM · 90 min

### Socialtel Lapa
📍 R. Visc. de Maranguape, 9 - Lapa, Rio de Janeiro - RJ, 20021-390, Brazil
🕐 Opens: 17:00 – 01:00
🗺️ [Open in Maps](https://www.google.com/maps/search/?api=1&query=Socialtel%20Lapa&query_place_id=ChIJocs6Cqd_mQARad2LCvclavw)

> Feel the city's rhythm pulse beneath your feet at Terraço Gávea, where live DJs, creative drinks, and panoramic views of downtown and the iconic Carioca Aqueduct set the stage for mingling with Rio's most vibrant crowd.

---

## Stop 3 — 9:10 PM · 90 min

### Yoo2 Rio de Janeiro
📍 Praia de Botafogo, 242 - Botafogo, Rio de Janeiro - RJ, 22250-040, Brazil
🕐 Opens: 16:00 – 23:00
🗺️ [Open in Maps](https://www.google.com/maps/search/?api=1&query=Yoo2%20Rio%20de%20Janeiro&query_place_id=ChIJG76p0Yx_mQARcD9b5__5kWc)

> End your night suspended above Botafogo Bay, savoring gourmet bites and bold cocktails as you drink in legendary views of Sugarloaf Mountain and Christ the Redeemer sparkling against the midnight sky.

---

## Plan Details
| | |
|---|---|
| Total duration | 5 hours |
| Estimated cost | R$80 – R$200 BRL |
| Venues verified | 3 / 3 on Google Places |
| Flow ID | bolt-v2-rio-de-janeiro-rooftop-1779362561076 |

---

## Pipeline Notes
- `gpt-5.1` returned NO_VENUES_DISCOVERED on two attempts — model may not yet be accessible on this account despite appearing on the rate limits dashboard. Agents 1 & 4 running on `gpt-4.1` for this test.
- Timing fix applied: venues with no Google Places close time no longer get forced into an 8-hour window. Times now correctly follow theme start (17:30 for Rooftop) + sequential 20-min travel gaps.
- All 3 stops Google-verified with high/low confidence. Yoo2 returned low confidence but coordinates match Botafogo correctly.
