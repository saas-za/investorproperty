"use client";

import { useEffect } from "react";
import { PORTAL } from "@/lib/site/vacancies";

/** Tells the portal that this page was opened, from the visitor's own browser, so each visit is its own entry in the activity log. Shows nothing. */
export default function ViewBeacon({ spaceId }: { spaceId: string }) {
  useEffect(() => {
    fetch(`${PORTAL}/api/public/vacancies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "view", spaceId }),
      keepalive: true,
    }).catch(() => {});
  }, [spaceId]);
  return null;
}
