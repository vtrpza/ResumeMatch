import Link from "next/link";
import { CtaLink } from "@/components/CtaLink";

export function Header() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="min-h-[44px] flex items-center py-2 text-base font-medium text-white transition hover:text-zinc-200"
        >
          Resume Match
        </Link>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-zinc-500 sm:inline">
            Match your resume to the job
          </span>
          <CtaLink
            href="/scan"
            cta="header_scan"
            className="min-h-[44px] flex items-center rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            Scan resume
          </CtaLink>
        </div>
      </div>
    </header>
  );
}
