"use client";

import { useEffect } from "react";
import { getOrCreateSessionId } from "@/lib/cookies";

export function LandingTracker() {
  useEffect(() => {
    getOrCreateSessionId();
  }, []);

  return null;
}
