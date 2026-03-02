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

- The `runScan` server action in `src/app/scan/actions.ts` uses real PDF extraction (`src/lib/pdf.ts`), OpenAI analysis (`src/lib/analyze.ts`), and Neon for usage when `DATABASE_URL` is set. No stub or mock data.
- The `/api/usage` and `/api/checkout` routes are real. When Stripe or the database are not configured, they return 503. **Checkout 503/500**: `/api/checkout` returns 503 when `STRIPE_PRICE_SCAN` is not set. For 500: create the price in the **same Stripe account** as `STRIPE_SECRET_KEY` (Dashboard → Products → Add product/price → One time, $2), copy the Price ID (`price_xxx`), set `STRIPE_PRICE_SCAN=price_xxx` in `.env.local`. The price must be **One time** (not recurring). The API error message is shown in the UI. When `RESUME_MATCH_FULL_APP=1`, `/api/usage` returns 503 if the database is unavailable (no 200 with zero counts).
- Client-side cookie/localStorage utilities in `src/lib/cookies.ts` provide a fallback paywall mechanism when the database is unavailable and the feature gate is off. When the gate is on, the scan page does not fall back to localStorage on 503/5xx from `/api/usage`.
- **Feature gate**: set `RESUME_MATCH_FULL_APP=1` for production/ship mode. When set, the app requires `DATABASE_URL` for scans and usage; `runScan` fails with a clear error if the DB is missing, and `/api/usage` returns 503 instead of zero counts. The scan page shows "Usage check unavailable" on 503/5xx and does not use localStorage for the paywall decision. With the gate on and `DATABASE_URL` set, the `sessions` table must exist (run `schema.sql` against Neon) or `/api/usage` will return 503 when the usage query fails.
- The app uses `@/*` path aliases mapped to `./src/*` via `tsconfig.json`.
- Sentry is integrated for error monitoring. Set `NEXT_PUBLIC_SENTRY_DSN` (and optionally `SENTRY_ORG`, `SENTRY_PROJECT` for source maps) for production. Errors are captured with scan-stage and route context; no resume/JD content is sent.
