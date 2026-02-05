# LitPlanz App Store Submission Guide

## App Information

**App Name:** LitPlanz
**Subtitle:** Discover your perfect night out
**Bundle ID:** com.litplanz.app
**Primary Category:** Lifestyle
**Secondary Category:** Travel

---

## Pre-Submission Checklist

### ✅ Code & Configuration (Completed)
- [x] Apple Sign In implemented and working
- [x] Google Sign In working
- [x] Onboarding flow implemented
- [x] App icon configured
- [x] Privacy Policy & Terms of Service (litplanz.com)
- [x] Entitlements configured (Sign in with Apple)
- [x] Info.plist configured with privacy descriptions
- [x] `Config.environment` set to `.production`
- [x] `Config.enableStoreKitTesting` set to `false`

### 🔲 App Store Connect (Manual)
- [ ] Create app record in App Store Connect
- [ ] Create subscription products:
  - `com.litplan.pro.monthly` - $4.99/month
  - `com.litplan.pro.yearly` - $39.99/year (3-day trial)
- [ ] Upload screenshots (6.7", 6.5", 5.5" displays)
- [ ] Fill in app metadata (description, keywords, etc.)
- [ ] Set age rating (12+ for alcohol references)
- [ ] Add Privacy Policy URL: `https://litplanz.com/privacy`
- [ ] Add Support URL: `https://litplanz.com`

### 🔲 Final Testing
- [ ] Test on real device (not simulator)
- [ ] Test Apple Sign In on real device
- [ ] Test Google Sign In on real device
- [ ] Test subscription purchase flow (sandbox)
- [ ] Test offline mode
- [ ] Verify all API endpoints work

### 🔲 Archive & Submit
- [ ] Select "Any iOS Device (arm64)" in Xcode
- [ ] Product → Archive
- [ ] Organizer → Validate App (fix any issues)
- [ ] Organizer → Distribute App → App Store Connect → Upload
- [ ] Submit for Review in App Store Connect

---

## Production Configuration Tables

### Table 1: App Configuration

| Item | Current Value | Production Value | Status |
|------|---------------|------------------|--------|
| Environment | `.development` | `.production` | ✅ Changed |
| StoreKit Testing | `true` | `false` | ✅ Changed |
| Debug Logging | `true` (DEBUG) | `false` (RELEASE) | ✅ Auto |
| Bundle ID | `com.litplanz.app` | `com.litplanz.app` | ✅ Ready |
| App Version | `1.0` | `1.0` | ✅ Ready |

### Table 2: Infrastructure

| Task | Status | Notes |
|------|--------|-------|
| Supabase Production Plan | 🔲 Check | Ensure adequate limits |
| Custom Domain SSL | ✅ Done | auth.litplanz.com |
| Database Backups | 🔲 Check | Enable in Supabase |
| **Rate Limiting** | 🔲 Check | Configure in Supabase |
| Monitoring/Alerts | ⚪ Optional | |

### Table 3: App Store Connect

| Task | Status | Notes |
|------|--------|-------|
| Create App Record | 🔲 Needed | |
| Bundle ID | 🔲 Select | com.litplanz.app |
| SKU | 🔲 Create | litplanz-ios-001 |
| Subscription Products | 🔲 Create | Monthly $4.99, Yearly $39.99 |
| Privacy Policy URL | 🔲 Add | https://litplanz.com/privacy |
| Support URL | 🔲 Add | https://litplanz.com |
| Screenshots | 🔲 Upload | 6.7", 6.5", 5.5" |

---

## App Store Connect Setup

### Step 1: Create App Store Connect Record

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click "My Apps" → "+" → "New App"
3. Fill in:
   - **Platforms:** iOS
   - **Name:** LitPlanz
   - **Primary Language:** English (U.S.)
   - **Bundle ID:** com.litplanz.app
   - **SKU:** litplanz-ios-001
   - **User Access:** Full Access

### Step 2: Configure Apple Sign In (Already Done)

**Apple Developer Portal:**
- App ID `com.litplanz.app` has Sign in with Apple enabled

**Supabase Dashboard → Authentication → Providers → Apple:**
- **Client IDs:** `com.litplanz.app`
- **Secret Key:** Leave empty (not needed for native iOS)

---

## App Store Metadata

### Description (4000 characters max)

```
Discover your perfect night out with LitPlanz — the AI-powered nightlife discovery app that curates personalized venues, plans, and experiences just for you.

EXPLORE 100+ CITIES WORLDWIDE
From New York to Tokyo, Miami to Berlin — find the hottest bars, clubs, restaurants, and entertainment venues in cities across the globe. Our curated database features handpicked venues with detailed information, photos, and real-time availability.

MATCH YOUR MOOD WITH VIBEZ
Whether you're in the mood for chill rooftop drinks, high-energy dancing, a romantic dinner, or a wild night out — just select your vibe and get instant, personalized recommendations. Our AI understands exactly what you're looking for.

PLAN THE PERFECT NIGHT WITH GROUP FLOWS
Multi-stop itineraries designed for groups. See time estimates, walking routes, and costs for the entire night — from dinner to drinks to dancing. No more endless group chats trying to figure out where to go next.

BOLT: INSTANT CUSTOM PLANS
Need a plan right now? Bolt generates personalized itineraries in seconds based on your location, group size, and vibe preferences. From a casual Tuesday happy hour to an epic Saturday night out.

KEY FEATURES:
• AI-powered venue recommendations
• 100+ cities worldwide
• Custom group itineraries
• Real-time walking routes
• Cost estimates per person
• Multiple "vibes" to match your mood
• Save and share your favorite plans
• Works offline with cached data

LITPLANZ PRO:
Upgrade to Pro for unlimited access to all 100+ cities, unlimited plan generation, all vibes, priority support, and early access to new features.

Whether you're a local looking for something new or traveling to an unfamiliar city, LitPlanz is your ultimate guide to nightlife discovery. Download now and discover your perfect night out.
```

### Keywords (100 characters max)

```
nightlife,bars,clubs,restaurants,going out,party,drinks,nightclub,date night,group plans,travel
```

### Promotional Text (170 characters max)

```
Plan your perfect night out with AI-powered recommendations. Discover bars, clubs, and restaurants in 100+ cities. Group plans, vibes, and instant itineraries.
```

### What's New (Version 1.0.0)

```
Welcome to LitPlanz! Your AI-powered guide to discovering the perfect night out.

• Explore 100+ cities worldwide
• Match your mood with Vibez
• Create group itineraries with Group Flows
• Instant custom plans with Bolt
• Sign in with Apple or Google
• Save your favorite plans
```

---

## Screenshots Required

### iPhone 6.7" Display (1290 x 2796 px)
Required for iPhone 15 Pro Max, iPhone 16 Pro Max

1. **Explore Screen** - City cards with search
2. **Vibez Screen** - Mood/vibe selection
3. **Group Flow Detail** - Itinerary with venues
4. **Bolt Screen** - Instant plan generation
5. **Home Screen** - Recent plans and quick actions

### iPhone 6.5" Display (1284 x 2778 px)
Required for iPhone 14 Plus, iPhone 15 Plus

Same screenshots, resized

### iPhone 5.5" Display (1242 x 2208 px)
Required for older iPhones (iPhone 8 Plus)

Same screenshots, resized

### Existing Screenshots
Screenshots have been captured and are available at:
- `/screenshots/Screenshot-1.png`
- `/screenshots/Screenshot-2.png`
- `/screenshots/Screenshot-3.png`
- `/screenshots/Screenshot-4.png`

---

## App Privacy

### Data Collection

**Data Linked to You:**
- Email Address (for account creation)
- Name (optional, from Apple/Google Sign In)
- User ID (for authentication)
- Usage Data (analytics)

**Data Not Linked to You:**
- Crash Data
- Performance Data

### Privacy Policy URL
`https://litplanz.com/privacy`

### Terms of Service URL
`https://litplanz.com/terms`

---

## In-App Purchases

### Subscription Group
- **Name:** LitPlanz Pro
- **Group ID:** litplan_pro_group

### Product 1: Monthly Subscription
| Field | Value |
|-------|-------|
| **Product ID** | `com.litplan.pro.monthly` |
| **Reference Name** | Litplan Pro Monthly |
| **Type** | Auto-Renewable Subscription |
| **Duration** | 1 Month |
| **Price** | $4.99/month |
| **Description** | Unlimited access to all cities, vibes, and features |

### Product 2: Yearly Subscription
| Field | Value |
|-------|-------|
| **Product ID** | `com.litplan.pro.yearly` |
| **Reference Name** | Litplan Pro Yearly |
| **Type** | Auto-Renewable Subscription |
| **Duration** | 1 Year |
| **Price** | $39.99/year |
| **Free Trial** | 3 days |
| **Description** | Unlimited access to all cities and plans - Best Value! |

---

## App Review Information

### Contact Information
- **First Name:** [Your First Name]
- **Last Name:** [Your Last Name]
- **Phone Number:** [Your Phone]
- **Email:** [Your Email]

### Demo Account (if needed)
- **Email:** demo@litplanz.com
- **Password:** [Set up a demo account password]

### Notes for Reviewer
```
LitPlanz is a nightlife discovery app that uses AI to generate personalized venue recommendations and group itineraries.

To test the app:
1. Sign in with Apple or Google, or continue as Guest
2. Explore cities using the search feature
3. Select a city to see Group Flows (multi-stop itineraries)
4. Try the "Bolt" feature to generate instant plans
5. Switch between "Vibes" to see different mood-based recommendations

Pro features can be tested using the demo account provided.

The app requires network connectivity for full functionality but includes offline caching for previously viewed content.
```

---

## Age Rating

**Age Rating:** 12+
- Infrequent/Mild Alcohol, Tobacco, or Drug Use or References (venues may serve alcohol)
- No Cartoon or Fantasy Violence
- No Realistic Violence
- No Sexual Content or Nudity
- No Profanity or Crude Humor
- No Gambling

---

## Export Compliance

**Uses Encryption:** Yes (HTTPS/TLS for network requests)
**Exempt:** Yes (standard HTTPS encryption is exempt from export compliance documentation)

---

## Xcode Archive & Upload

### Steps to Archive:

1. In Xcode, select **"Any iOS Device (arm64)"** as destination
2. Go to **Product → Archive**
3. Wait for archive to complete
4. In Organizer, click **"Distribute App"**
5. Select **"App Store Connect"** → **"Upload"**
6. Follow prompts to upload

### Before Archiving, Verify:
- [x] `Config.environment = .production`
- [x] `Config.enableStoreKitTesting = false`
- [ ] App icon included (1024x1024 for App Store)
- [ ] Test on physical device first

---

## Contact URLs

| Type | URL |
|------|-----|
| **Support URL** | https://litplanz.com |
| **Marketing URL** | https://litplanz.com |
| **Privacy Policy URL** | https://litplanz.com/privacy |
| **Terms of Service URL** | https://litplanz.com/terms |
