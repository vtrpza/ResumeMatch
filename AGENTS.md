# Resume Match

Next.js 15 (App Router) application with TypeScript and Tailwind CSS v4.

## Cursor Cloud specific instructions

### Services

| Service | Command | Port |
|---|---|---|
| Next.js dev server | `npm run dev` | 3000 |

### Key commands

- **Dev server**: `npm run dev`
- **Lint**: `npm run lint` (or `npx next lint`)
- **Build**: `npm run build`
- **Production start**: `npm run start`

### Architecture notes

- **Scan pipeline** (`src/app/scan/actions.ts`): (1) PDF extract (`src/lib/pdf.ts`), (2) analysis with **gpt-4o-mini** (`src/lib/analyze.ts`), (3) premium content with **gpt-4o** (`src/lib/premium-generate.ts`: cover letter + full experience rewrite). Premium step is optional—if it fails, the scan still returns the analysis. Neon is used for usage when `DATABASE_URL` is set. No stub or mock data.
- The `/api/usage` and `/api/checkout` routes are real. When Stripe or the database are not configured, they return 503. **Checkout 503/500**: `/api/checkout` returns 503 when `STRIPE_PRICE_SCAN` is not set. For 500: create the price in the **same Stripe account** as `STRIPE_SECRET_KEY` (Dashboard → Products → Add product/price → One time, $2), copy the Price ID (`price_xxx`), set `STRIPE_PRICE_SCAN=price_xxx` in `.env.local`. The price must be **One time** (not recurring). The API error message is shown in the UI. When `RESUME_MATCH_FULL_APP=1`, `/api/usage` returns 503 if the database is unavailable (no 200 with zero counts).
- Client-side cookie/localStorage utilities in `src/lib/cookies.ts` provide a fallback paywall mechanism when the database is unavailable and the feature gate is off. When the gate is on, the scan page does not fall back to localStorage on 503/5xx from `/api/usage`.
- **Feature gate**: set `RESUME_MATCH_FULL_APP=1` for production/ship mode. When set, the app requires `DATABASE_URL` for scans and usage; `runScan` fails with a clear error if the DB is missing, and `/api/usage` returns 503 instead of zero counts. The scan page shows "Usage check unavailable" on 503/5xx and does not use localStorage for the paywall decision. With the gate on and `DATABASE_URL` set, the `sessions` table must exist (run `schema.sql` against Neon) or `/api/usage` will return 503 when the usage query fails.
- **Identity (one free scan per person)**: When `RESUME_MATCH_FULL_APP=1`, usage is keyed by verified email (identity), not client session ID. Users must verify email via magic link (`POST /api/send-verification`, `GET /api/verify-email?token=...`); the app sets an HttpOnly cookie (`rm_identity`) and uses it for usage and checkout. Set `RESEND_API_KEY` (and optionally `RESEND_FROM`) for verification emails. Schema includes `identities`, `verification_tokens`, and `identity_sessions`; run the full `schema.sql`.
- The app uses `@/*` path aliases mapped to `./src/*` via `tsconfig.json`.
- **Models**: Default analysis is `gpt-4o-mini`; fallback and premium (cover letter + full rewrite) use `gpt-4o`. Set `OPENAI_API_KEY` for scans.
- Sentry is integrated for error monitoring. Set `NEXT_PUBLIC_SENTRY_DSN` (and optionally `SENTRY_ORG`, `SENTRY_PROJECT` for source maps) for production. Errors are captured with scan-stage and route context; no resume/JD content is sent.
