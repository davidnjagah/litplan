# AI Agents - DEPRECATED

## Pipeline Moved to Railway

All AI pipeline orchestration has been **moved to Railway** to prevent request timeouts.

### Why the Migration?

Supabase Edge Functions have a **60-second timeout limit**, which is insufficient for AI pipeline operations that can take several minutes to complete.

### New Location

**Railway Service:** `backend/railway/src/index.ts`

**Railway URL:** See `RAILWAY_URL` in `backend/supabase/.env`

Current Production URL: `https://litplan-production.up.railway.app`

### Railway Endpoints

| Endpoint | Description |
|----------|-------------|
| `POST /api/pipeline/individual` | Generate individual plans (uses Claude via search-agent) |
| `POST /api/pipeline/group` | Generate group plans (uses GPT 7-agent pipeline) |
| `POST /api/pipeline/full` | Run complete pipeline (individual + group) |
| `POST /api/pipeline/batch` | Batch processing for multiple cities |
| `GET /health` | Health check |

### How to Run the Pipeline

```bash
# Check Railway service health
curl https://litplan-production.up.railway.app/health

# Generate individual plans for a city
curl -X POST https://litplan-production.up.railway.app/api/pipeline/individual \
  -H "Content-Type: application/json" \
  -d '{
    "cityId": "city-id",
    "cityName": "Dar es Salaam",
    "country": "Tanzania"
  }'

# Generate group plans for a city
curl -X POST https://litplan-production.up.railway.app/api/pipeline/group \
  -H "Content-Type: application/json" \
  -d '{
    "cityName": "Dar es Salaam",
    "country": "Tanzania"
  }'

# Run full pipeline (individual + group)
curl -X POST https://litplan-production.up.railway.app/api/pipeline/full \
  -H "Content-Type: application/json" \
  -d '{
    "cityId": "city-id",
    "cityName": "Dar es Salaam",
    "country": "Tanzania"
  }'
```

### What About These Files?

The files in this folder are kept for **reference only**. They contain:

- **Prompt templates** - Used by the Railway service
- **Agent logic** - Historical reference for how each agent works
- **Quality criteria** - Standards for plan validation

### Agent Overview (Reference)

| Agent | Purpose |
|-------|---------|
| `group-plan-generator` | Creates initial group plans with 9 default types |
| `details-validator` | Validates venue details and coordinates |
| `address-validator` | Triple-checks and corrects addresses |
| `description-editor` | Polishes descriptions for quality |
| `quality-gate` | Ensures city-unique titles and scores |
| `comms-specialist` | Crafts captivating descriptions |
| `tag-generator` | Generates bestFor audience tags |
| `search-agent` | Claude-powered venue/event search |

### Default Plan Types (9 Types)

1. **couples** - Romantic experiences for two
2. **friend_groups** - Social adventures for groups
3. **girls_trips** - Glamorous getaways
4. **girls_night_out** - Ladies night celebrations
5. **boys_night_out** - High-energy VIP experiences
6. **luxury** - Premium five-star experiences
7. **family** - Kid-friendly excursions
8. **free_experiences** - No-cost activities
9. **romantic** - Candlelit dinners and sunset spots

### Day Distribution Rules

- Nightclubs/Clubs: Friday & Saturday ONLY
- Family activities: Saturday & Sunday
- Restaurants: Spread across weekdays (Mon-Thu)
- Rooftop/Cocktail bars: Thursday-Saturday
- Luxury experiences: Thursday-Saturday
- Free experiences: Any day, prefer weekends

---

**Migration Date:** January 2026

**DO NOT** deploy these functions directly. Use the Railway service instead.
