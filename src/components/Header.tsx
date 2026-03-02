import Link from "next/link";

export function Header() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="min-h-[44px] flex items-center py-2 text-base font-medium text-white transition hover:text-zinc-200"
        >
          Resume Gap Scanner
        </Link>
        <span className="hidden text-sm text-zinc-500 sm:inline">
          Match your resume to the job
        </span>
      </div>
    </header>
  );
}
