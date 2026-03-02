import { LandingTracker } from "@/components/LandingTracker";
import { CtaLink } from "@/components/CtaLink";

export default function HomePage() {
  return (
    <>
      <LandingTracker />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
        {/* Hero Section */}
        <section className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium text-zinc-500 sm:text-base">
            Resume Gap Scanner
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight text-white sm:text-5xl sm:leading-tight">
            Match your resume to the job—before you apply
          </h1>
          <p className="mt-4 text-lg text-zinc-400 sm:mt-6 sm:text-xl">
            Upload your PDF, paste the job description. Get a match score,
            missing keywords, ATS risks, and stronger bullets in seconds. No
            fluff, no fabrication.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:justify-center">
            <CtaLink
              href="/scan"
              cta="hero_scan"
              className="rounded-lg bg-white px-6 py-3.5 text-center text-sm font-medium text-zinc-900 transition hover:bg-zinc-200 sm:text-base"
            >
              Scan your resume
            </CtaLink>
            <CtaLink
              href="#preview"
              cta="hero_sample_report"
              alsoCapture="sample_report_viewed"
              className="rounded-lg border border-zinc-700 bg-zinc-900 px-6 py-3.5 text-center text-sm font-medium text-white transition hover:bg-zinc-800 sm:text-base"
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
                Know your match score
              </h3>
              <p className="mt-2 text-zinc-400">
                See how well your resume aligns with the job requirements before
                you spend time on an application. Focus your energy on roles
                where you have a strong match.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">
                Find missing keywords and skills
              </h3>
              <p className="mt-2 text-zinc-400">
                Identify exactly which keywords and skills are in the job
                description but missing from your resume. Add them strategically
                to improve ATS compatibility.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">
                Spot ATS risks
              </h3>
              <p className="mt-2 text-zinc-400">
                Get flagged for formatting issues, missing sections, or other
                problems that could cause your resume to be filtered out by
                applicant tracking systems.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">
                Strengthen weak bullets
              </h3>
              <p className="mt-2 text-zinc-400">
                See which bullets are too vague or weak, and get rewritten
                versions that are more impactful and quantifiable—based only on
                what&apos;s actually in your resume.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">
                Get a tailored summary
              </h3>
              <p className="mt-2 text-zinc-400">
                Receive a job-specific summary that highlights your most relevant
                experience for this particular role.
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
          <div className="mt-12 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 sm:p-8">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-zinc-500">
                  Match score
                </h3>
                <p className="mt-1 text-2xl font-semibold text-white">72%</p>
                <p className="mt-1 text-sm text-zinc-400">
                  Overall alignment with job requirements
                </p>
              </div>
              <div className="border-t border-zinc-800 pt-6">
                <h3 className="text-sm font-medium text-zinc-500">
                  Missing keywords
                </h3>
                <ul className="mt-2 space-y-1 text-sm text-zinc-300">
                  <li>• CI/CD</li>
                  <li>• Kubernetes</li>
                  <li>• GraphQL</li>
                </ul>
              </div>
              <div className="border-t border-zinc-800 pt-6">
                <h3 className="text-sm font-medium text-zinc-500">
                  Missing skills
                </h3>
                <ul className="mt-2 space-y-1 text-sm text-zinc-300">
                  <li>• Cloud architecture</li>
                  <li>• Performance optimization</li>
                </ul>
              </div>
              <div className="border-t border-zinc-800 pt-6">
                <h3 className="text-sm font-medium text-zinc-500">
                  ATS risk flags
                </h3>
                <ul className="mt-2 space-y-1 text-sm text-zinc-300">
                  <li>• Resume uses two-column layout which may confuse ATS parsers</li>
                  <li>• No quantified achievements in first 3 bullets</li>
                </ul>
              </div>
              <div className="border-t border-zinc-800 pt-6">
                <h3 className="text-sm font-medium text-zinc-500">
                  Weak bullets → Rewritten
                </h3>
                <div className="mt-2 space-y-3 text-sm">
                  <div>
                    <p className="text-zinc-400 line-through">
                      Responsible for managing team projects
                    </p>
                    <p className="mt-1 text-zinc-300">
                      Led cross-functional team of 8 to deliver 3 major product
                      launches on schedule, reducing time-to-market by 20%
                    </p>
                  </div>
                </div>
              </div>
              <div className="border-t border-zinc-800 pt-6">
                <h3 className="text-sm font-medium text-zinc-500">
                  Tailored summary
                </h3>
                <p className="mt-2 text-sm text-zinc-300">
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
            Grounded analysis, no fabrication
          </h2>
          <div className="mt-12 space-y-6 text-center">
            <p className="text-zinc-400">
              We analyze what&apos;s actually in your resume. We don&apos;t
              invent achievements, fabricate experience, or add skills you
              don&apos;t have. Every suggestion is based on your real background
              and how it maps to the job description.
            </p>
            <p className="text-zinc-400">
              Your resume and job description are processed securely. We don&apos;t
              store your documents after analysis, and we don&apos;t share your
              data with third parties.
            </p>
          </div>
        </section>

        {/* Pricing Preview */}
        <section className="mx-auto mt-24 max-w-3xl sm:mt-32">
          <h2 className="text-center text-2xl font-semibold text-white sm:text-3xl">
            Pricing
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
              <h3 className="text-lg font-medium text-white">Free</h3>
              <p className="mt-2 text-3xl font-semibold text-white">$0</p>
              <ul className="mt-4 space-y-2 text-sm text-zinc-400">
                <li>• 1 full scan</li>
                <li>• Complete analysis report</li>
                <li>• All features included</li>
              </ul>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
              <h3 className="text-lg font-medium text-white">Sprint</h3>
              <p className="mt-2 text-3xl font-semibold text-white">
                $12<span className="text-base font-normal text-zinc-400">/week</span>
              </p>
              <ul className="mt-4 space-y-2 text-sm text-zinc-400">
                <li>• Unlimited scans</li>
                <li>• Premium features</li>
                <li>• Full rewrite & cover letter</li>
              </ul>
            </div>
          </div>
          <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <h3 className="text-lg font-medium text-white">Pro</h3>
            <p className="mt-2 text-3xl font-semibold text-white">
              $29<span className="text-base font-normal text-zinc-400">/month</span>
            </p>
            <ul className="mt-4 space-y-2 text-sm text-zinc-400">
              <li>• Unlimited scans</li>
              <li>• Premium features</li>
              <li>• Full rewrite & cover letter</li>
              <li>• Best value for regular use</li>
            </ul>
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
                We use AI to analyze your resume PDF and compare it against the
                job description you provide. The system extracts keywords, skills,
                and requirements, then generates a match score and identifies gaps,
                risks, and improvement opportunities.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">
                Is my data private?
              </h3>
              <p className="mt-2 text-zinc-400">
                Yes. We process your resume and job description securely and
                don&apos;t store your documents after analysis. We don&apos;t share
                your data with third parties or use it for training models.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">
                Will this help me pass ATS systems?
              </h3>
              <p className="mt-2 text-zinc-400">
                We identify ATS risk flags in your resume (like problematic
                formatting or missing sections) and suggest improvements. However,
                we don&apos;t guarantee that any resume will pass every ATS system,
                as different systems work differently.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">
                Does the tool rewrite or fabricate experience?
              </h3>
              <p className="mt-2 text-zinc-400">
                No. We only rewrite bullets that are already in your resume to
                make them stronger and more impactful. We never invent achievements,
                add skills you don&apos;t have, or fabricate experience. Every
                suggestion is grounded in what&apos;s actually in your resume.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">
                Who is this for?
              </h3>
              <p className="mt-2 text-zinc-400">
                Resume Gap Scanner is designed for U.S. job seekers in software
                engineering, product, data/analytics, and design roles. The tool
                works best when you have a specific job description to match against.
              </p>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto mt-24 max-w-2xl text-center sm:mt-32">
          <h2 className="text-2xl font-semibold text-white sm:text-3xl">
            Ready to see how your resume matches?
          </h2>
          <p className="mt-4 text-lg text-zinc-400">
            Get your first scan free. No credit card required.
          </p>
          <CtaLink
            href="/scan"
            cta="final_scan"
            className="mt-8 inline-block rounded-lg bg-white px-8 py-3.5 text-base font-medium text-zinc-900 transition hover:bg-zinc-200"
          >
            Start your free scan
          </CtaLink>
        </section>
      </main>
    </>
  );
}
