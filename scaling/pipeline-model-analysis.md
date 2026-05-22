# Bolt Pipeline — Full Agent Analysis & Model Recommendations

---

## The Full Pipeline (5 GPT calls per run)

Most people count 4 agents but there are actually **5 GPT calls** per pipeline:

```
Agent 1   → Venue Discovery
Agent 2   → Relevance Validator
cityName  → Local language lookup (hidden GPT call inside Agent 3)
Agent 3.5 → Timing Adjuster
Agent 4   → Narrative Creator
```

Agent 3 itself is not a GPT call — it's Google Places API. But it triggers a hidden
`getCityLocalName()` GPT call to get the local language name of the city for address matching.

---

## Agent-by-Agent Breakdown

### Agent 1 — Venue Discovery
**What it does:** Generates a list of 3-7 real venues for the chosen theme and city.
Includes venue name, address, coordinates, opening hours, why recommended, popularity signals.

**Prompt size:** ~1,400 input tokens (large system prompt with city rules, proximity requirements, theme definitions)
**Output size:** ~2,500–4,000 output tokens (full JSON for 5-7 venues with all fields)
**Temperature:** 0.7 (needs some creativity to find the best venues)
**Quality bar:** CRITICAL — this is the foundation of the entire plan. Hallucinated or wrong venues fail Google Places and tank the pipeline.
**Key requirement:** Deep world knowledge of real venues in global cities.

---

### Agent 2 — Relevance Validator
**What it does:** Reviews the discovered venues and approves/rejects each one.
Checks: Is it a real entertainment venue? Does it match the theme? Is it a duplicate? Is it named after the city itself?

**Prompt size:** ~1,000 input tokens
**Output size:** ~300–500 output tokens (approve/reject JSON decisions)
**Temperature:** 0.3 (deterministic — yes/no decisions)
**Quality bar:** MEDIUM — the rules are explicit and well-defined. A smaller model can follow a clear checklist. Google Places is the real safety net anyway.
**Key requirement:** Rule-following, classification.

---

### getCityLocalName — Local City Name Lookup
**What it does:** Given "Moscow" returns `{ english: "Moscow", local: "Москва" }`.
Used by Agent 3 to match city names in Google Places addresses.

**Prompt size:** ~200 input tokens
**Output size:** ~80 output tokens
**Temperature:** 0.1 (pure factual)
**Quality bar:** LOW — this is a geography/language lookup. Any model handles this.
**Key requirement:** Basic geography and language knowledge.

---

### Agent 3.5 — Timing Adjuster
**What it does:** Takes Google Places opening hours and adjusts each venue's start time
to fit when it's actually open. Reorders venues chronologically.

**Prompt size:** ~900–1,200 input tokens (includes full opening hours text per venue)
**Output size:** ~500–800 output tokens (adjusted times + reasons)
**Temperature:** 0.3 (deterministic — time math)
**Quality bar:** MEDIUM — it's schedule arithmetic. It needs to parse "Monday: 9:00 AM – 11:00 PM"
and place a venue within those hours. No creativity needed.
**Key requirement:** Temporal reasoning, schedule logic.

---

### Agent 4 — Narrative Creator
**What it does:** Writes the final user-facing copy. Creates the plan title, 2-3 sentence overview,
and one captivating sentence per venue. This is exactly what the user reads in the app.

**Prompt size:** ~500 input tokens
**Output size:** ~600–900 output tokens
**Temperature:** 0.8 (high creativity)
**Quality bar:** HIGH — this is the product. Poor writing here = bad user experience.
A weak model produces generic, flat copy ("Great rooftop with views"). A strong model
produces vivid, exciting copy that makes users want to go.
**Key requirement:** Creative writing, travel voice, second-person narrative style.

---

## Cost Per Pipeline Run (Current vs Recommended)

### Current: All GPT-4o

| Agent | Input tokens | Output tokens | Cost |
|---|---|---|---|
| Agent 1 | 1,400 | 3,000 | $0.0335 |
| Agent 2 | 1,000 | 400 | $0.0065 |
| getCityLocalName | 200 | 80 | $0.0013 |
| Agent 3.5 | 1,000 | 650 | $0.0090 |
| Agent 4 | 500 | 700 | $0.0083 |
| **Total** | | | **~$0.059/run** |

GPT-4o pricing: $2.50/1M input · $10.00/1M output · 450K TPM

---

### Recommended: Optimised Split

| Agent | Model | Reasoning |
|---|---|---|
| Agent 1 | `gpt-5.1` | Best venue knowledge, better output quality, cheapest input ($1.25 vs $2.50) |
| Agent 2 | `gpt-4.1-mini` | Rule-following classification — mini handles this perfectly |
| getCityLocalName | `gpt-4.1-mini` | Pure geography lookup — cheapest option |
| Agent 3.5 | `gpt-4.1-mini` | Schedule arithmetic — no creativity, mini is sufficient |
| Agent 4 | `gpt-5.1` | User-facing copy — quality matters most here |

| Agent | Model | Input cost | Output cost | Total |
|---|---|---|---|---|
| Agent 1 | gpt-5.1 | 1,400 × $1.25/1M = $0.00175 | 3,000 × $10/1M = $0.0300 | $0.0318 |
| Agent 2 | gpt-4.1-mini | 1,000 × $0.40/1M = $0.0004 | 400 × $1.60/1M = $0.00064 | $0.0010 |
| getCityLocalName | gpt-4.1-mini | 200 × $0.40/1M = $0.00008 | 80 × $1.60/1M = $0.000128 | $0.0002 |
| Agent 3.5 | gpt-4.1-mini | 1,000 × $0.40/1M = $0.0004 | 650 × $1.60/1M = $0.00104 | $0.0014 |
| Agent 4 | gpt-5.1 | 500 × $1.25/1M = $0.000625 | 700 × $10/1M = $0.007 | $0.0076 |
| **Total** | | | | **~$0.042/run** |

**Saving: ~$0.017 per run (~29% cheaper)**

At 1,000 runs/month: saves ~$17
At 10,000 runs/month: saves ~$170
At 100,000 runs/month: saves ~$1,700

---

## Throughput Impact

| Model | TPM limit | Max pipelines/min |
|---|---|---|
| gpt-4o (current, all agents) | 450,000 | ~18 |
| gpt-5.1 (Agents 1 + 4) | 1,000,000 | ~33 |
| gpt-4.1-mini (Agents 2, cityName, 3.5) | 2,000,000 | unlimited for these |

**Effective throughput improves from ~18 to ~33 pipelines/minute (+83%)**
Bottleneck shifts from gpt-4o's 450K TPM to gpt-5.1's 1M TPM.

---

## Why NOT gpt-4.1 for Anything

GPT-4.1 pricing: $2.00 input / $8.00 output — more expensive on input than gpt-5.1 ($1.25)
and less capable. There is no use case where gpt-4.1 beats gpt-5.1 on cost or quality.
It should not be used in this pipeline.

---

## Why NOT gpt-4.1-mini for Agent 1

Agent 1 is the only place where model quality directly affects the number of venues
that survive Google Places validation. A weaker model:
- Suggests venues it "knows" but that don't exist or have closed
- Fabricates addresses for real venue names
- Recommends venues in the wrong city (suburb, nearby town)

Since each rejected venue reduces the pool Agent 4 works with, a weaker Agent 1
increases the chance of the pipeline returning fewer than 3 venues or failing entirely.
The cost difference between gpt-4.1-mini and gpt-5.1 on Agent 1 is minimal in absolute
terms (~$0.001) — not worth the quality risk.

---

## Implementation

In `gpt-client.ts`, the `DEFAULT_MODEL` is used by all agents.
To implement the split, pass `model` explicitly per agent call:

```typescript
// Agent 1 — needs best world knowledge
const response = await gptRequest([{ role: 'user', content: userPrompt }], {
  systemPrompt,
  model: 'gpt-5.1',
  temperature: 0.7,
  maxTokens: 4096,
  jsonMode: true,
});

// Agent 2 — classification only
const response = await gptRequest([{ role: 'user', content: userPrompt }], {
  systemPrompt,
  model: 'gpt-4.1-mini',
  temperature: 0.3,
  maxTokens: 2048,
  jsonMode: true,
});

// getCityLocalName — factual lookup
const response = await gptRequest([{ role: 'user', content: ... }], {
  systemPrompt: 'You are a geography expert. Return only valid JSON.',
  model: 'gpt-4.1-mini',
  temperature: 0.1,
  maxTokens: 200,
  jsonMode: true,
});

// Agent 3.5 — schedule math
const response = await gptRequest([{ role: 'user', content: userPrompt }], {
  systemPrompt,
  model: 'gpt-4.1-mini',
  temperature: 0.3,
  maxTokens: 2048,
  jsonMode: true,
});

// Agent 4 — user-facing narrative
const response = await gptRequest([{ role: 'user', content: userPrompt }], {
  systemPrompt,
  model: 'gpt-5.1',
  temperature: 0.8,
  maxTokens: 2048,
  jsonMode: true,
});
```

No changes needed to `gpt-client.ts` — the `model` field is already supported as an option.
Just pass it at each call site.

---

## Summary

| | Current | Recommended |
|---|---|---|
| Models used | gpt-4o everywhere | gpt-5.1 (Agents 1+4), gpt-4.1-mini (Agents 2, cityName, 3.5) |
| Cost per run | ~$0.059 | ~$0.042 |
| Saving | — | ~29% |
| TPM ceiling | 450K | 1M (gpt-5.1 bound) |
| Pipelines/min | ~18 | ~33 |
| Quality change | Baseline | Agent 1 better (gpt-5.1 > gpt-4o on venue knowledge), Agent 4 better (gpt-5.1 > gpt-4o on creative writing) |
