# AI Affiliate Content Assistant — MVP

## Get a free API key
Go to https://aistudio.google.com/app/apikey → sign in with Google → Create API Key.
No credit card required. Free tier covers plenty of daily testing.

## Run locally
```
npm install
cp .env.example .env.local
# paste your key into .env.local as GEMINI_API_KEY=...
npm run dev
```
Open http://localhost:3000

## Deploy (Vercel — free)
1. Push this folder to a new GitHub repo.
2. Go to vercel.com → New Project → import the repo.
3. In Project Settings → Environment Variables, add:
   `GEMINI_API_KEY = your_key`
4. Deploy. Vercel gives you a live URL in ~1-2 minutes, free Hobby tier.

## Structure
- `app/page.tsx` — landing page
- `app/generate/page.tsx` — generator form + output UI (client-side)
- `app/api/generate/route.ts` — server-side route that calls the Gemini API. The key lives only here, read from `process.env.GEMINI_API_KEY`. It is never sent to the browser.

## Cost
$0. Gemini's free tier (no card needed) covers normal MVP testing volume. If you outgrow it later, Google's paid tier or switching `route.ts` to another provider (OpenAI, Anthropic) is a small, contained change.

## Notes for scaling later
- Add auth (e.g. NextAuth or Clerk) before adding usage limits per user.
- Add a `usage` table (Supabase/Postgres) keyed by user id to track free-tier limits.
- Add Stripe for subscriptions; gate `/api/generate` behind a plan check.
- Add more tools as new routes under `app/api/` and new pages under `app/`.

## If generation fails
Check the Vercel function logs (or terminal in dev) — the API route logs the raw error from Gemini. Common cause: missing/invalid `GEMINI_API_KEY`, or the model name in `route.ts` is outdated (check ai.google.dev/gemini-api/docs/models for the current model name and swap it in).
