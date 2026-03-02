# Resume Gap Scanner

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

- The `runScan` server action in `src/app/scan/actions.ts` currently returns stub/mock data. A real implementation would integrate an LLM API (e.g. OpenAI) for resume analysis.
- The `/api/usage` and `/api/checkout` routes are stubs. Full implementation requires a database and payment provider (Stripe).
- Client-side cookie/localStorage utilities in `src/lib/cookies.ts` provide a fallback paywall mechanism when the database is unavailable.
- The app uses `@/*` path aliases mapped to `./src/*` via `tsconfig.json`.
