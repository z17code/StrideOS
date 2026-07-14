"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV === "development") return;
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      // ignore registration failures in unsupported environments
    });
  }, []);
  return null;
}
