# API Routes

This directory contains all API route handlers for the Litplan backend.

## Structure

```
api/
├── cities.ts         # City-related endpoints
├── plans.ts          # Plan-related endpoints
├── user.ts           # User profile and activity endpoints
├── subscription.ts   # Subscription and payment endpoints
└── config.ts         # App configuration endpoints
```

## Implementation Status

- [ ] cities.ts - To be implemented in Day 3
- [ ] plans.ts - To be implemented in Day 4
- [ ] user.ts - To be implemented in Day 3
- [ ] subscription.ts - To be implemented in Sprint 2
- [ ] config.ts - To be implemented in Day 5

## Usage

Each route file exports handlers that will be imported in `src/index.ts`:

```typescript
import citiesRoutes from './api/cities';
import userRoutes from './api/user';

app.use('/cities', citiesRoutes);
app.use('/user', userRoutes);
```

## API Specification

See `../../.ai-team/backend-specs.md` for complete API documentation.
