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
          appearance?: "always" | "execute" | "interaction-only";
        },
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

const SCRIPT_ID = "cf-turnstile-script";
const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
/** Give up loading so login/register is not blocked in restricted networks. */
const LOAD_TIMEOUT_MS = 8000;

export type TurnstileWidgetStatus =
  | "idle"
  | "loading"
  | "ready"
  | "solved"
  | "expired"
  | "unavailable";

type Props = {
  onToken: (token: string | null) => void;
  /** Fires when load/solve state changes (soft client UX). */
  onStatus?: (status: TurnstileWidgetStatus) => void;
  className?: string;
  theme?: "light" | "dark" | "auto";
};

/**
 * Cloudflare Turnstile managed widget.
 * Renders nothing when NEXT_PUBLIC_TURNSTILE_SITE_KEY is unset.
 * Square container (no rounded clip). Soft-fails to "unavailable" on timeout/error.
 */
export function TurnstileWidget({
  onToken,
  onStatus,
  className,
  theme = "auto",
}: Props) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() || "";
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const onStatusRef = useRef(onStatus);
  onTokenRef.current = onToken;
  onStatusRef.current = onStatus;
  const [status, setStatus] = useState<TurnstileWidgetStatus>("idle");

  const setStatusBoth = useCallback((next: TurnstileWidgetStatus) => {
    setStatus(next);
    onStatusRef.current?.(next);
  }, []);

  const renderWidget = useCallback(() => {
    if (!siteKey || !containerRef.current || !window.turnstile) return false;
    if (widgetIdRef.current != null) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {
        // ignore
      }
      widgetIdRef.current = null;
    }
    containerRef.current.innerHTML = "";
    try {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme,
        // compact is faster on mobile; avoid flexible overflow quirks
        size: "compact",
        callback: (token) => {
          onTokenRef.current(token);
          setStatusBoth("solved");
        },
        "expired-callback": () => {
          onTokenRef.current(null);
          setStatusBoth("expired");
        },
        "error-callback": () => {
          onTokenRef.current(null);
          setStatusBoth("unavailable");
        },
      });
      setStatusBoth("ready");
      return true;
    } catch (err) {
      console.warn("[turnstile] render failed", err);
      onTokenRef.current(null);
      setStatusBoth("unavailable");
      return false;
    }
  }, [siteKey, theme, setStatusBoth]);

  useEffect(() => {
    if (!siteKey) {
      onTokenRef.current(null);
      setStatusBoth("idle");
      return;
    }

    let cancelled = false;
    setStatusBoth("loading");
    onTokenRef.current(null);

    const timeoutId = window.setTimeout(() => {
      if (cancelled) return;
      if (!window.turnstile || widgetIdRef.current == null) {
        onTokenRef.current(null);
        setStatusBoth("unavailable");
      }
    }, LOAD_TIMEOUT_MS);

    function ensureScript() {
      const existing = document.getElementById(
        SCRIPT_ID,
      ) as HTMLScriptElement | null;
      if (existing) {
        if (window.turnstile) {
          if (!cancelled) renderWidget();
        } else {
          existing.addEventListener(
            "load",
            () => {
              if (!cancelled) renderWidget();
            },
            { once: true },
          );
          existing.addEventListener(
            "error",
            () => {
              if (!cancelled) {
                onTokenRef.current(null);
                setStatusBoth("unavailable");
              }
            },
            { once: true },
          );
        }
        return;
      }
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (!cancelled) renderWidget();
      };
      script.onerror = () => {
        if (!cancelled) {
          onTokenRef.current(null);
          setStatusBoth("unavailable");
        }
      };
      document.head.appendChild(script);
    }

    ensureScript();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      if (widgetIdRef.current != null && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // ignore
        }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, renderWidget, setStatusBoth]);

  if (!siteKey) return null;

  const hint =
    status === "loading"
      ? "人机验证加载中…若较慢可直接登录"
      : status === "unavailable"
        ? "人机验证暂不可用，可直接继续"
        : status === "expired"
          ? "人机验证已过期，可刷新或直接继续"
          : null;

  return (
    <div className={className}>
      {/* Square clip — no rounded corners on the widget frame */}
      <div
        ref={containerRef}
        className="min-h-[65px] overflow-hidden rounded-none [&_iframe]:rounded-none"
      />
      {hint && (
        <p className="mt-1 text-xs text-muted-foreground text-zinc-500">
          {hint}
        </p>
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
