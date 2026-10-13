# Cut Log

Personal fitness tracker for the cut from 224.9 lb to ~195 lb (12% body fat): meals with barcode scanning and a food database, workouts, Fitbit steps, weigh-ins, and a progress dashboard. Works on desktop and installs to a phone's home screen; both read the same data.

- **Food:** scan a barcode (Open Food Facts, then USDA branded foods) or search USDA FoodData Central. Pick servings or grams; macros are computed from the database values. Recent foods re-log in one tap.
- **Steps:** Fitbit Web API (the same account Google Health shows). Syncs when the app opens and daily via Vercel Cron. Steps typed by hand override Fitbit for that day.
- **Sync:** data lives in Upstash Redis, so every device sees the same log.
- **Sign-in:** a single password (`APP_PASSWORD`); each device stays signed in for 6 months.

## Setup on Vercel

1. vercel.com → **Add New → Project** → import this repo. Under Environment Variables add `APP_PASSWORD` and `AUTH_SECRET`. Deploy.
2. Project → **Storage** → **Create Database → Upstash for Redis** (free) → connect it to this project. Redeploy.
3. Get a free USDA key at https://api.data.gov/signup and add it as `USDA_API_KEY`.
4. https://dev.fitbit.com/apps/new → OAuth 2.0 Application Type **Personal**, Redirect URL `https://<your-app>.vercel.app/api/fitbit/callback`, Default Access Type **Read Only**. Add the Client ID and Client Secret as `FITBIT_CLIENT_ID` / `FITBIT_CLIENT_SECRET`, plus any random `CRON_SECRET`. Redeploy, then open **Plan → Connect Fitbit**.
5. On your phone, open the site and choose **Add to Home Screen** (Safari share menu, or Chrome's menu → Install app).

## Local development

```
npm install
APP_PASSWORD=dev npm run dev
```
Without Redis env vars, data is kept in `.data/dev.json`.
