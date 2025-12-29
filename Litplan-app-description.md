Lit Plan AI should keep the same free vs paid logic and backend approach, but the UX is organized around three bottom tabs (Explore, Search, Viewed Cities) plus top tabs for Individual vs Group plans, all in a black/grey/red theme.

Plan offerings (refined)
Free tier
* Access to one city per week, with up to top 10 plans in that city, split into Individual and Group sections once a city is selected.
* Weekday‑only access, no weekend spots, and no persistent “saved” cities in the Viewed Cities tab.
Pro / subscription tier
* Unlimited city search across the top 100 cities and up to top 50 plans per city, including weekday and weekend plans.
* Full Individual and Group plan options, plus the Viewed Cities tab with history and saved cities; this tier unlocks saving cities and richer group flows.

Authentication
Login is not amust but use a way that we can identify the user through maybe iCloud account that will download the app and log in them in in that capacity already before they open the app and this will identify if they have paid for subscription or not

Navigation and UI structure
Bottom tabs
* Home tab:
    * Has an explore section which Shows a spread‑out card deck UI, where each deck represents a city and the cards in the deck are different locations/plans in that city.
    * Decks can be presented in a horizontal slider or bundled clusters, giving a quick visual overview of available cities and their vibes.
    * A search bar at the top lets users type and jump directly to a preferred city, mirroring the dedicated Search tab’s behavior.
* Search tab (middle icon):
    * Dedicated city search with the same functionality as the Explore search bar: type a city name, see matching cities from the top‑100 list, and select one. 
    * After choosing a city, the screen shows two top tabs: Individual and Group plans. 
* Viewed Cities tab:
    * For Pro users, shows a list/grid of recently viewed cities ordered by recency, plus a “saved” section where they can pin favorite cities for quick access.
    * Free users see only a basic recent list (for their single weekly city) and no saved section, reinforcing the upgrade value of persistent personalization.
* Profile tab
    * For the user to see their profile, name, email, subscription. Billing. Settings to change authentication.
Top tabs after city selection
* Individual plans:
    * Shows single spots someone can go to (restaurants, bars, events), ranked (1–10 free, up to 50 for Pro) with AI tags like genre, vibe, and event type.
* Group plans:
    * Shows AI‑generated combinations of 2–3 plans (e.g. pre‑sport bar → game → after‑spot) for a night or day, with each combination represented as a “flow” card that groups the steps in one place.

Screenshots
Use the screenshots attached as inspiration for the ui of the app
- For the explore section of the as described above in the home tab I want you to take inspiration from screenshot-1 where there is the card ui components but you execute them as explained above then you can use screenshot-4 in the section for people as an example of how you will arrange the different ui card bundles for each city. Let the ui card decks appear as one over each other for the individual cities in a unique pattern that is not uniform and can be unique for each other stack. Use actual examples showcasing 10 great night out plans that people can go to in at least 10 cities to demonstrate in this section. The plans should have the following
    - A good hd photo that represents the location or event
    - A great title 
    - Date 
    - Entry if applicable
    - Venue, linked to Google maps
    - Any other necessary things
- when someone opens a ui card stack of a city you make the cards to be enlarged to cover atleast 80% of the screen but centered and let the
sides of the card be slight transparent, atleast 50% opacity, then let one scroll through the cards one by one horizontally. Let
the next card that will be on the right be visible by 10% of its frame reduced to 80% of the current card and when a user swipes
to the next card it glides and snaps when it reaches its placement. And the previous card will have the same appearance on the left side of the screen like 
the next card on the right side. Let the top part of this interface have a title of the city in bold visible font
- Use screenshot-4 also as an inspiration for the explore page in terms of arrangement with the different sections.
- Also the tabs at the bottom of the screen for screenshot-4 would be ideal for the app
- Use screenshot-2 as an inspiration to put together the city screen. Let plans be scrolled vertically. dont include description of the city and include the tabs for group and single plans.

Database and data model updates
The existing city/plan schema can support these UX features with a few additions.
* Cities: unchanged core fields (city_id, name, country, rank), plus fields for display assets (card image, color accent) to power the Explore card decks.
* Plans: continue to store per‑city, per‑week plans with flags for is_individual, is_group, and is_weekend, plus AI tags for genre and type.
* Group flows: store 2–3 linked plan_ids per flow so the Group tab can render bundled experiences as a single object for a night or day.
* User metadata:
    * Recent cities list keyed by user_id with timestamps so the Viewed Cities tab can order by recency.
    * Saved cities collection available only when subscription_status is active, aligning with the Pro entitlement.y 
Weekly AI jobs still refresh the city_week and plan data, so the UI always rides on up‑to‑date pre‑computed recommendations rather than per‑user AI calls.


Backend and paywall considerations
The previous recommendation of a managed backend (such as Firestore with serverless functions) plus native StoreKit 2 remains suitable, because the new features primarily add read‑heavy UX and simple user‑specific collections (recent and saved cities), which are cheap to store and query at small scale.supertokens
* Entitlements still control:
    * Number of cities available (one vs unlimited).
    * Number of plans per city (10 vs 50).
    * Access to weekend plans and group flows.
    * Access to the “saved cities” section in Viewed Cities.
* Paywalls can be triggered when:
    * A free user tries to open an 11th plan.
    * A free user taps a weekend plan or tries to access a second city in the same week.
    * A free user taps “save city” in Viewed Cities.


Visual theme
The overall visual identity should reflect a black primary background, grey surfaces, and red accent color.y
* Black or very dark grey backgrounds emphasize card decks and city imagery, enhancing the “nightlife” or “plans” vibe.
* Grey is ideal for secondary text, card borders, and separators, ensuring readability while maintaining a sleek look.
* Red works as the accent color for active tabs, CTA buttons (Subscribe, Save City, Upgrade to Pro), selection highlights, and key tags, drawing attention to important actions and status.

But look at it and inform me from the perspective of an expert ui designer what color scheme would be the best from the examples of other expert apps that have been created, what would be the best color scheme for this app.

Recommended setup for the app
* Starting simple and low‑overhead: use StoreKit 2 only, with Apple as the sole payment handler for Pro access inside the app. 

