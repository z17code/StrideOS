"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type AuthStageProps = {
  brandTitle?: string;
  brandSubtitle?: string;
  children: ReactNode;
  className?: string;
};

const highlights = [
  { label: "确定性计划", detail: "按目标自动排周" },
  { label: "训练驾驶舱", detail: "今日课表一屏看清" },
  { label: "智能调课", detail: "状态变化即时适配" },
];

export function AuthStage({
  brandTitle = "StrideOS",
  brandSubtitle = "长跑智能教练",
  children,
  className,
}: AuthStageProps) {
  return (
    <div
      className={cn(
        "auth-stage relative flex min-h-dvh overflow-hidden bg-zinc-950 text-zinc-50 safe-pt safe-pb safe-px",
        className,
      )}
    >
      <div className="auth-stage-bg" aria-hidden />
      <div className="auth-stage-grid" aria-hidden />
      <div className="auth-stage-lanes" aria-hidden />
      <div className="auth-stage-sweep" aria-hidden />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-10 px-4 py-10 lg:flex-row lg:items-center lg:gap-16 lg:px-8">
        <section className="mx-auto w-full max-w-md space-y-8 text-center lg:mx-0 lg:max-w-lg lg:flex-1 lg:text-left">
          <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium tracking-wide text-zinc-300 backdrop-blur-sm">
            <span className="auth-stage-pulse h-1.5 w-1.5 rounded-full bg-emerald-400" />
            邀请制训练系统
          </div>

          <div className="space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br from-zinc-100 to-zinc-400 text-xl font-bold tracking-tight text-zinc-950 shadow-[0_0_40px_-8px_rgba(255,255,255,0.45)] lg:mx-0">
              S
            </div>
            <div>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                {brandTitle}
              </h1>
              <p className="mt-3 text-base text-zinc-400 sm:text-lg">
                {brandSubtitle}
              </p>
            </div>
            <p className="mx-auto max-w-md text-sm leading-relaxed text-zinc-500 lg:mx-0">
              面向进阶跑者的训练驾驶舱：生成计划、记录执行、洞察恢复，把每一公里都算进目标。
            </p>
          </div>

          <ul className="hidden gap-3 sm:grid sm:grid-cols-3 lg:grid-cols-1 lg:gap-3">
            {highlights.map((item) => (
              <li
                key={item.label}
                className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left backdrop-blur-sm"
              >
                <div className="text-sm font-medium text-zinc-100">{item.label}</div>
                <div className="mt-0.5 text-xs text-zinc-500">{item.detail}</div>
              </li>
            ))}
          </ul>

          <div className="hidden font-mono text-[11px] uppercase tracking-[0.28em] text-zinc-600 lg:block">
            pace · load · recovery · race
          </div>
        </section>

        <section className="mx-auto w-full max-w-md lg:mx-0 lg:max-w-[420px]">
          {children}
        </section>
      </div>
    </div>
  );
}
