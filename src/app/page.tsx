import { LandingTracker } from "@/components/LandingTracker";
import { CtaLink } from "@/components/CtaLink";

export default function HomePage() {
  return (
    <>
      <LandingTracker />
      <main className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-24">
        {/* Hero Section */}
        <section className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium text-zinc-500 sm:text-base">
            Resume Match
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl sm:leading-tight">
            Match your resume to the job—before you apply
          </h1>
          <p className="mt-5 text-lg text-zinc-400 sm:mt-6 sm:text-xl">
            Upload your PDF, paste the job description. Get a match score,
            missing keywords, ATS risks, and stronger bullets in seconds. No
            fluff, no fabrication. Your data stays private.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:mt-12 sm:flex-row sm:justify-center">
            <CtaLink
              href="/scan"
              cta="hero_scan"
              className="focus-ring active:opacity-90 rounded-lg bg-white px-6 py-3.5 text-center text-sm font-medium text-zinc-900 transition hover:bg-zinc-200 sm:text-base"
            >
              Scan your resume
            </CtaLink>
            <CtaLink
              href="#preview"
              cta="hero_sample_report"
              alsoCapture="sample_report_viewed"
              className="focus-ring active:opacity-90 rounded-lg border border-zinc-700 bg-zinc-900 px-6 py-3.5 text-center text-sm font-medium text-white transition hover:bg-zinc-800 sm:text-base"
            >
              See sample report
            </CtaLink>
          </div>
        </section>

        {/* How It Works */}
        <section className="mx-auto mt-24 max-w-4xl sm:mt-32">
          <h2 className="text-center text-2xl font-semibold text-white sm:text-3xl">
            How it works
          </h2>
          <p className="mt-2 text-center text-zinc-500">Three steps, one report.</p>
          <div className="mt-12 grid gap-8 sm:grid-cols-3 sm:gap-6">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 text-xl font-semibold text-white">
                1
              </div>
              <h3 className="mt-4 text-lg font-medium text-white">
                Upload your resume
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                Upload your resume PDF. We analyze content, structure, and
                formatting.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 text-xl font-semibold text-white">
                2
              </div>
              <h3 className="mt-4 text-lg font-medium text-white">
                Paste the job description
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                Paste the full job description. We compare it against your
                resume.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 text-xl font-semibold text-white">
                3
              </div>
              <h3 className="mt-4 text-lg font-medium text-white">
                Get your report
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                Get a report in seconds—match score, gaps, risks, and stronger
                bullets.
              </p>
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="mx-auto mt-24 max-w-3xl sm:mt-32">
          <h2 className="text-center text-2xl font-semibold text-white sm:text-3xl">
            Why scan before you apply
          </h2>
          <div className="mt-12 space-y-8">
            <div>
              <h3 className="text-lg font-medium text-white">
                Focus on roles where you&apos;re a strong fit
              </h3>
              <p className="mt-2 text-zinc-400">
                See where you stand before you spend time applying. Put energy
                into roles where your resume actually matches.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">
                Add the right keywords so your resume gets past filters
              </h3>
              <p className="mt-2 text-zinc-400">
                We show exactly which keywords and skills are in the job but
                missing from your resume. Add them where they fit.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">
                Fix formatting and structure so ATS systems read your resume
              </h3>
              <p className="mt-2 text-zinc-400">
                Get flagged for layout issues, missing sections, or other
                problems that can get you filtered out. Fix them before you
                apply.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">
                Turn vague bullets into clear, quantifiable impact
              </h3>
              <p className="mt-2 text-zinc-400">
                We only improve what&apos;s already on your resume—no invented
                achievements. Get rewritten bullets that are stronger and
                specific.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">
                Highlight the experience that matters for this job
              </h3>
              <p className="mt-2 text-zinc-400">
                Get a job-specific summary that surfaces your most relevant
                experience for this role.
              </p>
            </div>
          </div>
        </section>

        {/* Report Preview */}
        <section
          id="preview"
          className="mx-auto mt-24 max-w-4xl sm:mt-32"
        >
          <h2 className="text-center text-2xl font-semibold text-white sm:text-3xl">
            What you&apos;ll get
          </h2>
          <p className="mt-2 text-center text-zinc-500">
            Here&apos;s what one scan returns.
          </p>
          <div className="mt-12 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 sm:p-8">
            <p className="mb-6 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Sample report
            </p>
            <div className="space-y-8">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Match score</h3>
                <p className="mt-2 text-3xl font-semibold text-white">72%</p>
                <p className="mt-1 text-sm text-zinc-400">
                  Overall alignment with job requirements
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  Good match. Adding missing keywords could improve your score.
                </p>
              </div>
              <div className="border-t border-zinc-800 pt-8">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Gaps to close</p>
                <h3 className="mt-3 text-sm font-medium text-zinc-400">Missing keywords</h3>
                <p className="mt-1 text-xs text-zinc-500">
                  Terms in the job description not found in your resume
                </p>
                <ul className="mt-3 space-y-1.5 text-sm text-zinc-300">
                  <li>• CI/CD</li>
                  <li>• Kubernetes</li>
                  <li>• GraphQL</li>
                </ul>
                <h3 className="mt-5 text-sm font-medium text-zinc-400">Missing skills</h3>
                <p className="mt-1 text-xs text-zinc-500">
                  Skills mentioned in the job that aren&apos;t clearly present
                </p>
                <ul className="mt-3 space-y-1.5 text-sm text-zinc-300">
                  <li>• Cloud architecture</li>
                  <li>• Performance optimization</li>
                </ul>
              </div>
              <div className="border-t border-zinc-800 pt-8">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Risks to fix</p>
                <h3 className="mt-3 text-sm font-medium text-zinc-400">ATS risk flags</h3>
                <p className="mt-1 text-xs text-zinc-500">
                  Formatting or content issues that could affect ATS compatibility
                </p>
                <ul className="mt-3 space-y-1.5 text-sm text-zinc-300">
                  <li>• Resume uses two-column layout which may confuse ATS parsers</li>
                  <li>• No quantified achievements in first 3 bullets</li>
                </ul>
              </div>
              <div className="border-t border-zinc-800 pt-8">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Improvements</p>
                <h3 className="mt-3 text-sm font-medium text-zinc-400">Weak bullets → Rewritten</h3>
                <p className="mt-1 text-xs text-zinc-500">
                  Stronger, more impactful versions based on your actual experience
                </p>
                <div className="mt-4 space-y-3 text-sm">
                  <div>
                    <p className="text-xs font-medium text-zinc-500">Original</p>
                    <p className="mt-1 text-zinc-400 line-through">
                      Responsible for managing team projects
                    </p>
                    <p className="mt-3 text-xs font-medium text-zinc-500">Suggested</p>
                    <p className="mt-1 text-zinc-300">
                      Led cross-functional team of 8 to deliver 3 major product
                      launches on schedule, reducing time-to-market by 20%
                    </p>
                  </div>
                </div>
              </div>
              <div className="border-t border-zinc-800 pt-8">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Summary</p>
                <div className="mt-3 flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-sm font-medium text-zinc-400">
                    Tailored summary
                  </h3>
                  <span className="text-xs text-zinc-500 border border-zinc-700 rounded-md px-2.5 py-1.5">Copy</span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">
                  Job-specific summary highlighting your most relevant experience
                </p>
                <p className="mt-3 text-sm text-zinc-300 leading-relaxed">
                  Full-stack engineer with 5+ years building scalable web
                  applications. Proven track record in React, Node.js, and
                  cloud-native architectures with a focus on performance and
                  developer experience.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Trust / Credibility */}
        <section className="mx-auto mt-24 max-w-3xl sm:mt-32">
          <h2 className="text-center text-2xl font-semibold text-white sm:text-3xl">
            Honest analysis, no fabrication
          </h2>
          <div className="mt-12 space-y-6 text-center">
            <p className="text-zinc-400">
              We only use what&apos;s in your resume—no invented achievements or
              skills. Every suggestion is grounded in your real background and
              how it maps to the job.
            </p>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 text-left">
              <p className="text-sm font-medium text-white mb-2">Your privacy matters</p>
              <p className="text-sm text-zinc-400">
                Your resume and job description are processed securely and deleted immediately after analysis. 
                We don&apos;t store your documents, share your data with third parties, or use it to train AI models. 
                Your information stays private.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="mx-auto mt-24 max-w-3xl sm:mt-32">
          <h2 className="text-center text-2xl font-semibold text-white sm:text-3xl">
            Pricing
          </h2>
          <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center sm:mt-12">
            <p className="text-2xl font-semibold text-white sm:text-3xl">
              $2 per scan
            </p>
            <p className="mt-2 text-zinc-400">
              One free scan, then $2 for each report. One-time payment, no subscription.
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto mt-24 max-w-3xl sm:mt-32">
          <h2 className="text-center text-2xl font-semibold text-white sm:text-3xl">
            Frequently asked questions
          </h2>
          <div className="mt-12 space-y-8">
            <div>
              <h3 className="text-lg font-medium text-white">
                How does the scan work?
              </h3>
              <p className="mt-2 text-zinc-400">
                Upload your resume PDF and paste the job description. We
                analyze both, extract keywords and requirements, and return a
                structured report: match score, gaps, ATS risk flags, and
                bullet rewrites. We flag formatting issues that can hurt ATS
                parsing—we don&apos;t guarantee any system will pass, but we
                help you fix obvious risks.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">
                Is my data private?
              </h3>
              <p className="mt-2 text-zinc-400">
                Yes. We process your documents securely and don&apos;t store
                them after analysis. We don&apos;t share your data with third
                parties or use it for training.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">
                Do you rewrite or fabricate experience?
              </h3>
              <p className="mt-2 text-zinc-400">
                No. We only improve bullets that are already in your resume. We
                never invent achievements, add skills you don&apos;t have, or
                fabricate experience.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">
                Who is this for?
              </h3>
              <p className="mt-2 text-zinc-400">
                U.S. job seekers in software engineering, product,
                data/analytics, and design. Works best when you have a specific
                job description to match against.
              </p>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto mt-24 max-w-2xl text-center sm:mt-32">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">
            Ready to see your match?
          </h2>
          <p className="mt-4 text-lg text-zinc-400">
            One free scan, then $2 per report. No subscription.
          </p>
          <CtaLink
            href="/scan"
            cta="final_scan"
            className="focus-ring active:opacity-90 mt-8 inline-block rounded-lg bg-white px-8 py-3.5 text-base font-medium text-zinc-900 transition hover:bg-zinc-200"
          >
            Start your free scan
          </CtaLink>
        </section>
      </main>
    </>
  );
}
