# Resume Match

**Match your resume to the job—before you apply.**

Resume Match is a U.S.-focused SaaS that helps job seekers understand how well their resume aligns with specific job descriptions. Upload your resume PDF, paste a job description, and get an instant analysis: match score, missing keywords, ATS risk flags, stronger bullet rewrites, and a tailored summary.

## What It Does

Resume Match analyzes your resume against a job description and returns:

- **Match Score**: Overall alignment percentage with job requirements
- **Missing Keywords**: Specific terms from the job description not found in your resume
- **Missing Skills**: Required skills that aren't present in your resume
- **ATS Risk Flags**: Formatting and structure issues that could cause parsing problems
- **Weak Bullets → Rewritten**: Improved versions of existing resume bullets (no fabrication)
- **Tailored Summary**: Job-specific summary highlighting your most relevant experience

## Who It's For

U.S. job seekers in:
- Software engineering
- Product management
- Data & analytics
- Design

Works best when you have a specific job description to match against.

## How It Works

1. **Upload your resume** (PDF format)
2. **Paste the job description**
3. **Get your report** in seconds with actionable insights

The analysis uses structured AI to extract requirements, compare against your resume, and provide specific, actionable feedback. We never invent achievements or add skills you don't have—everything is grounded in your actual resume content.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: Neon Postgres
- **Storage**: Vercel Blob
- **Payments**: Stripe Checkout
- **Analytics**: PostHog (optional)
- **Monitoring**: Sentry, OpenTelemetry
- **AI**: OpenAI GPT-5-mini (default), GPT-5 (premium/fallback)

## Local Development

### Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenAI API key (required)
- Neon Postgres database (optional, for full functionality)
- Stripe account (optional, for payment testing)

### Setup

1. **Clone the repository**

```bash
git clone <repository-url>
cd resume-match
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

```bash
cp .env.example .env.local
```

Edit `.env.local` and set at least:

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

For full MVP functionality, also configure:

```bash
# Stripe (for payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_SCAN=price_xxx   # one-time $2 per scan
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database (Neon Postgres)
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require

# Analytics (optional)
NEXT_PUBLIC_POSTHOG_KEY=ph_xxx
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

4. **Set up the database** (if using Neon)

- Create a Neon project at [neon.tech](https://neon.tech)
- Run `schema.sql` in the Neon SQL editor
- Copy the connection string to `DATABASE_URL` in `.env.local`

5. **Run the development server**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the repository in Vercel
3. Configure environment variables in Vercel dashboard:
   - `OPENAI_API_KEY`
   - `DATABASE_URL` (if using Neon)
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_SCAN`
   - `NEXT_PUBLIC_APP_URL` (your Vercel deployment URL)
   - `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` (if using PostHog)
4. Configure Stripe webhook:
   - Point webhook URL to `https://your-app.vercel.app/api/webhooks/stripe`
   - Use the webhook secret in `STRIPE_WEBHOOK_SECRET`

## Current Status

**MVP Status**: Core functionality implemented

- ✅ Resume PDF upload and extraction
- ✅ Job description input
- ✅ AI-powered analysis (match score, keywords, skills, ATS risks)
- ✅ Bullet rewriting (no fabrication)
- ✅ Tailored summary generation
- ✅ Paywall and Stripe integration
- ✅ Analytics tracking
- ✅ Result page with full report

**Roadmap**:
- Enhanced ATS parsing accuracy
- Additional vertical support
- Export functionality
- Cover letter generation (premium)

## Pricing

$2 per scan. One free scan, then $2 per report. One-time payment, no subscription.

## Privacy & Trust

- Your documents are processed securely
- We don't store resumes after analysis
- We don't share your data with third parties
- We don't use your data for training
- All analysis is grounded in your actual resume—no fabrication

## Contributing

This repository is publicly visible for transparency, feedback, and credibility. 

**This is not an open-source project.** The source code is provided for viewing and evaluation purposes only. See [LICENSE](LICENSE) for full terms.

If you have feedback, suggestions, or find bugs, please open an issue. However, please understand that this is a commercial product, and contributions may not be accepted.

## License

Copyright (c) 2025 Resume Match. All rights reserved.

This software is proprietary and confidential. Public visibility does not constitute a grant of rights to use, modify, or distribute the software. See [LICENSE](LICENSE) for full terms.

**Important**: This repository is made publicly visible for transparency and feedback purposes. It is NOT licensed under MIT, Apache, or any other permissive open-source license. Unauthorized commercial reuse is prohibited.

## Disclaimer

Resume Match provides analysis and suggestions to help improve your resume. We do not guarantee job interviews, offers, or ATS system compatibility. Results depend on many factors beyond resume quality.
