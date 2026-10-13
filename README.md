# Cut Log

Personal fitness tracker for the cut from 224.9 lb to ~195 lb (12% body fat): meals with barcode scanning and a food database, workouts, Fitbit steps, weigh-ins, and a progress dashboard. Works on desktop and installs to a phone's home screen; both read the same data.

- **Food:** scan a barcode (Open Food Facts, then USDA branded foods) or search USDA FoodData Central. Pick servings or grams; macros are computed from the database values. Recent foods re-log in one tap.
- **Steps:** Google Health API (which replaced the Fitbit Web API in 2026), daily step totals via `dataPoints:dailyRollUp`. Syncs when the app opens and daily via Vercel Cron. Steps typed by hand override it for that day.
- **Sync:** data lives in Upstash Redis, so every device sees the same log.
- **Sign-in:** a single password (`APP_PASSWORD`); each device stays signed in for 6 months.

## Setup on Vercel

1. vercel.com → **Add New → Project** → import this repo. Under Environment Variables add `APP_PASSWORD` and `AUTH_SECRET`. Deploy.
2. Project → **Storage** → **Create Database → Upstash for Redis** (free) → connect it to this project. Redeploy.
3. Get a free USDA key at https://api.data.gov/signup and add it as `USDA_API_KEY`.
4. Google Cloud console (console.cloud.google.com), in one project:
   - **APIs & Services → Library**: enable **Google Health API**.
   - **OAuth consent screen**: External; add your own Google account under **Test users**; add the scope `.../auth/googlehealth.activity_and_fitness.readonly`.
   - **Credentials → Create credentials → OAuth client ID → Web application**. Authorized JavaScript origin `https://<your-app>.vercel.app`; Authorized redirect URI `https://<your-app>.vercel.app/api/fitbit/callback`.
   - Add the client ID and secret to Vercel as `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, plus any random `CRON_SECRET`. Redeploy, then open **Plan → Connect Google Health**.
   - While the consent screen is in Testing, Google expires the sign-in after 7 days; reconnect from Plan, or publish the consent screen to keep it.
5. On your phone, open the site and choose **Add to Home Screen** (Safari share menu, or Chrome's menu → Install app).

## Local development

```
npm install
APP_PASSWORD=dev npm run dev
```
Without Redis env vars, data is kept in `.data/dev.json`.
