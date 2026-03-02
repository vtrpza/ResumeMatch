"use client";

import { useEffect, useRef } from "react";
import { getOrCreateSessionId } from "@/lib/cookies";
import { capture } from "@/lib/analytics";

export function LandingTracker() {
  const sampleReportSent = useRef(false);

  useEffect(() => {
    getOrCreateSessionId();
    capture("landing_viewed");
  }, []);

  useEffect(() => {
    if (sampleReportSent.current) return;
    const el = document.getElementById("preview");
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          sampleReportSent.current = true;
          capture("sample_report_viewed");
        }
      },
      { threshold: 0.2 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return null;
}
