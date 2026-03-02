"use client";

import Link from "next/link";
import { capture } from "@/lib/analytics";

type CtaLinkProps = {
  href: string;
  children: React.ReactNode;
  className?: string;
  cta: string;
  alsoCapture?: string;
};

export function CtaLink({
  href,
  children,
  className,
  cta,
  alsoCapture,
}: CtaLinkProps) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        capture("cta_clicked", { cta });
        if (alsoCapture) capture(alsoCapture);
      }}
    >
      {children}
    </Link>
  );
}
