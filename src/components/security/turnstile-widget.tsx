"use client";

import { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact" | "flexible";
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

const SCRIPT_ID = "cf-turnstile-script";
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type Props = {
  onToken: (token: string | null) => void;
  className?: string;
  theme?: "light" | "dark" | "auto";
};

/**
 * Cloudflare Turnstile managed widget.
 * Renders nothing when NEXT_PUBLIC_TURNSTILE_SITE_KEY is unset.
 */
export function TurnstileWidget({ onToken, className, theme = "auto" }: Props) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || "";
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  onTokenRef.current = onToken;
  const [ready, setReady] = useState(false);

  const renderWidget = useCallback(() => {
    if (!siteKey || !containerRef.current || !window.turnstile) return;
    if (widgetIdRef.current != null) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {
        // ignore
      }
      widgetIdRef.current = null;
    }
    containerRef.current.innerHTML = "";
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme,
      size: "flexible",
      callback: (token) => onTokenRef.current(token),
      "expired-callback": () => onTokenRef.current(null),
      "error-callback": () => onTokenRef.current(null),
    });
    setReady(true);
  }, [siteKey, theme]);

  useEffect(() => {
    if (!siteKey) {
      onTokenRef.current(null);
      return;
    }

    function ensureScript() {
      const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
      if (existing) {
        if (window.turnstile) renderWidget();
        else existing.addEventListener("load", renderWidget, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.async = true;
      script.onload = () => renderWidget();
      document.head.appendChild(script);
    }

    ensureScript();

    return () => {
      if (widgetIdRef.current != null && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, renderWidget]);

  if (!siteKey) return null;

  return (
    <div className={className}>
      <div ref={containerRef} className="min-h-[65px]" />
      {!ready && (
        <p className="text-xs text-muted-foreground">人机验证加载中…</p>
      )}
    </div>
  );
}

export function resetTurnstile() {
  try {
    window.turnstile?.reset();
  } catch {
    // ignore
  }
}
