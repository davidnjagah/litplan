# AI Integration Guide - Litplan Backend

**Sprint 4, Day 16 - Weekly Plan Refresh with Claude AI**

This document explains how Litplan uses AI (Claude by Anthropic) to automatically generate fresh nightlife plans and group flows every week.

---

## Overview

The `weeklyPlanRefresh` scheduled Cloud Function runs every **Monday at 00:00 UTC** to generate AI-powered nightlife content for all active cities in the Litplan app.

### What Gets Generated

For each active city:
- **50 individual nightlife plans** - Bars, clubs, lounges, rooftop venues, live music spots, etc.
- **10 group flows** - Multi-venue experiences connecting 2-3 activities into cohesive night-out journeys

---

## How It Works

### 1. Scheduled Execution

```typescript
// Runs every Monday at midnight UTC
schedule('0 0 * * 1')
  .timeZone('UTC')
  .onRun(async (context) => { ... })
```

### 2. City Processing

The function:
1. Queries all cities where `metadata.isActive == true`
2. Processes each city sequentially
3. Generates plans and flows using Claude AI
4. Saves to Firestore (archives old content, adds new)
5. Updates city metadata

### 3. AI Generation Flow

```
Query Active Cities
       ↓
For Each City:
   → Generate 50 Individual Plans (Claude API call)
   → Generate 10 Group Flows (Claude API call)
   → Archive old plans
   → Save new plans to Firestore
   → Update city metadata
       ↓
Log Summary & Metrics
```

---

## AI Model & Prompting

### Model
**Claude 3.5 Sonnet** (`claude-3-5-sonnet-20241022`)
- **Max Tokens**: 4000 per request
- **Temperature**: Default (balanced creativity/consistency)
- **Provider**: Anthropic

### Prompt Engineering

#### Individual Plans Prompt
The prompt instructs Claude to generate nightlife plans with:
- Title (creative, catchy)
- Venue name (realistic for the city)
- Description (2-3 sentences)
- Start time & duration
- Price range ($, $$, $$$, Free)
- Vibe (energetic, chill, upscale, etc.)
- Tags (live-music, rooftop, cocktails, etc.)
- Category (Rooftop Bar, Nightclub, etc.)

**Key Instructions**:
- Focus on **variety** (different venue types, vibes, price points)
- Make ~33% weekend-appropriate
- Use realistic venue names authentic to the city
- Return ONLY valid JSON (no markdown formatting)

#### Group Flows Prompt
The prompt instructs Claude to generate multi-venue experiences with:
- Title & description
- 2-3 activities in sequential order
- Each activity has venue, description, timing, duration
- Total duration & estimated cost
- Difficulty level (easy/moderate/intense)
- Best for (friends, date night, birthday, etc.)

**Key Instructions**:
- Create **logical progressions** (dinner → bar → club)
- ~50% weekend-appropriate
- Vary difficulty and price points
- Include diverse themes (foodie, music-focused, party-heavy, etc.)

### Response Parsing

Claude returns JSON arrays wrapped in text. We extract using regex:

```typescript
const jsonMatch = content.text.match(/\[[\s\S]*\]/);
const plans = JSON.parse(jsonMatch[0]);
```

---

## Cost Estimation

### Anthropic Pricing (as of 2025)
- **Input**: $3.00 per 1M tokens
- **Output**: $15.00 per 1M tokens

### Per-City Cost Estimate

For each city (2 API calls: plans + flows):

**Individual Plans (50 plans)**:
- Input: ~1,000 tokens (prompt)
- Output: ~3,000 tokens (JSON response)
- Cost: $0.003 (input) + $0.045 (output) = **~$0.048**

**Group Flows (10 flows)**:
- Input: ~1,200 tokens (prompt)
- Output: ~2,500 tokens (JSON response)
- Cost: $0.0036 (input) + $0.0375 (output) = **~$0.041**

**Total per city**: ~**$0.09**

### Monthly Cost (100 cities)

If you have 100 active cities:
- **Per run**: 100 cities × $0.09 = **$9.00**
- **Per month**: 4 runs (4 Mondays) × $9.00 = **$36.00/month**

**Note**: These are estimates. Actual costs may vary based on response length and token usage.

---

## Environment Configuration

### Local Development

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Add your Anthropic API key:
   ```bash
   ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

3. Run with emulator:
   ```bash
   npm run serve
   ```

### Production Deployment

Set the API key in Firebase Functions config:

```bash
firebase functions:config:set anthropic.api_key="sk-ant-your-actual-key"
```

The function accesses it via:
```typescript
const apiKey = functions.config().anthropic?.api_key;
```

### Verify Configuration

```bash
# View current config
firebase functions:config:get

# Output should include:
# {
#   "anthropic": {
#     "api_key": "sk-ant-..."
#   }
# }
```

---

## Testing Locally

### 1. Manual Test (Emulator)

Start the emulator:
```bash
npm run serve
```

Trigger the function manually via Firebase Console or:
```bash
# Using Firebase CLI
firebase functions:shell

# In the shell:
weeklyPlanRefresh({})
```

### 2. Test with Specific City

You can export testing functions and call them directly:

```typescript
import { generateIndividualPlansForTesting } from './scheduled/weeklyPlanRefresh';

const testCity = {
  name: 'New York',
  country: 'United States',
  coordinates: { latitude: 40.7128, longitude: -74.0060 }
};

const plans = await generateIndividualPlansForTesting('nyc-001', testCity, 5);
console.log(plans);
```

### 3. Dry Run (No Firestore Writes)

Comment out the `saveIndividualPlans` and `saveGroupFlows` calls to test AI generation without affecting the database.

---

## Monitoring AI Job Runs

### Cloud Functions Logs

View logs in Firebase Console:
1. Go to **Functions** → **Logs**
2. Filter by function: `weeklyPlanRefresh`
3. Look for execution summaries:

```
========================================
Weekly plan refresh job completed
Cities processed: 100/100
Total plans generated: 5000
Total group flows generated: 1000
Errors: 0
Execution time: 180.42s
Timestamp: 2025-12-29T00:03:00.123Z
========================================
```

### Key Metrics to Monitor

- **Success Rate**: `citiesProcessed / totalCities`
- **Errors**: Number of cities that failed to refresh
- **Execution Time**: Should complete within Cloud Functions timeout (9 min for scheduled functions)
- **Plans Generated**: Should be ~50 per city
- **Group Flows Generated**: Should be ~10 per city

### Alerts to Set Up

1. **Function Failures**: Alert if job fails 2+ times in a row
2. **Low Output**: Alert if `totalPlansGenerated < expectedCount * 0.8`
3. **High Execution Time**: Alert if duration > 8 minutes (approaching timeout)
4. **API Errors**: Alert on Anthropic API rate limits or errors

---

## Fallback Strategy

### If AI Generation Fails

The function includes error handling at multiple levels:

1. **Per-City Errors**:
   - If one city fails, the job continues with others
   - Error is logged, counter incremented
   - City's old plans remain until next successful run

2. **API Key Missing**:
   - Function returns empty array
   - Logs error: "Anthropic API key not configured"
   - No writes to Firestore

3. **JSON Parsing Errors**:
   - If Claude returns malformed JSON, function catches error
   - Returns empty array for that city
   - Logs error for investigation

4. **Rate Limiting**:
   - Anthropic SDK handles retries automatically
   - If persistent, job will fail for affected cities
   - Manual retry: Re-deploy or trigger function manually

### Manual Fallback

If the AI job is down, you can:

1. **Use pre-seeded plans**: Keep a backup collection of manually curated plans
2. **Skip a week**: Old plans remain active until next successful run
3. **Manual generation**: Run seed scripts (`npm run seed:plans`)

---

## Performance Optimization

### Current Approach
- **Sequential processing**: Cities processed one at a time
- **Batch writes**: Firestore writes use batching (500 ops/batch)
- **Single region**: Function runs in default Cloud Functions region

### Potential Improvements

1. **Parallel City Processing**:
   ```typescript
   await Promise.all(cities.map(city => processCity(city)));
   ```
   - Risk: May hit Anthropic rate limits
   - Benefit: Faster execution

2. **Caching**:
   - Cache city metadata to reduce Firestore reads
   - Cache AI responses for similar cities

3. **Incremental Refresh**:
   - Only refresh top 50 cities weekly
   - Refresh lower-ranked cities monthly

4. **Dedicated Queue**:
   - Use Cloud Tasks for better retry logic and visibility

---

## Troubleshooting

### Problem: Function Times Out

**Symptoms**: Execution stops before completing all cities

**Solutions**:
1. Reduce `count` (generate 30 plans instead of 50)
2. Process cities in smaller batches
3. Increase function timeout (max 9 min for scheduled functions)

### Problem: Low-Quality Plans

**Symptoms**: Plans are repetitive, unrealistic, or poorly formatted

**Solutions**:
1. Refine prompt (add more specific instructions)
2. Increase `max_tokens` for longer responses
3. Add examples in prompt (few-shot learning)
4. Switch to Claude Opus for higher quality (higher cost)

### Problem: High Costs

**Symptoms**: Monthly AI costs exceed budget

**Solutions**:
1. Reduce refresh frequency (every 2 weeks instead of weekly)
2. Reduce plans per city (30 instead of 50)
3. Use cheaper model (Claude Haiku for some cities)
4. Implement tiered refresh (top cities get more plans)

### Problem: Duplicate Plans

**Symptoms**: Same venues/ideas appear repeatedly

**Solutions**:
1. Add "no duplicates" instruction to prompt
2. Track previously generated plans and pass to AI as context
3. Implement deduplication logic post-generation

---

## Best Practices

### 1. Prompt Versioning
- Track prompt changes in version control
- A/B test new prompts before deploying
- Document why prompts were changed

### 2. Response Validation
- Always validate AI-generated content before saving
- Check for required fields
- Sanitize user-facing text

### 3. Graceful Degradation
- Never let AI failures break the app
- Fall back to existing plans if generation fails
- Log all errors for later analysis

### 4. Cost Management
- Monitor API usage weekly
- Set budget alerts in Anthropic Console
- Review and optimize prompts regularly

### 5. Quality Assurance
- Manually review sample plans after each run
- Collect user feedback on plan quality
- Iterate on prompts based on data

---

## Future Enhancements

### Planned Improvements

1. **Personalization**:
   - Use user preference data to tailor plans
   - Generate plans based on trending vibes

2. **Multi-Language Support**:
   - Generate plans in local languages for international cities
   - Claude supports 100+ languages

3. **Image Generation**:
   - Integrate DALL-E or Stable Diffusion for venue images
   - Generate custom hero images per plan

4. **Real-Time Updates**:
   - Allow on-demand plan generation for specific cities
   - Generate plans based on real-time events (concerts, sports, etc.)

5. **Hybrid Approach**:
   - Mix AI-generated plans with manually curated "premium" plans
   - Use AI to enhance/expand manually created plans

---

## References

- [Anthropic API Documentation](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
- [Claude Prompt Engineering Guide](https://docs.anthropic.com/claude/docs/prompt-engineering)
- [Firebase Scheduled Functions](https://firebase.google.com/docs/functions/schedule-functions)
- [Litplan Data Models](/src/models/README.md)

---

## Support

For issues with AI integration:
1. Check Firebase Functions logs
2. Review Anthropic API status page
3. Verify API key configuration
4. Consult this documentation

**Last Updated**: Sprint 4, Day 16 (December 2025)
