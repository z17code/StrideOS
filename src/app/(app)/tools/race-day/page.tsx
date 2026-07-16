"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RACE_COUNTDOWN } from "@/lib/tools/race-checklist";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "strideos_race_checklist_v1";

function loadChecked(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, boolean>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export default function RaceDayPage() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [phase, setPhase] = useState(RACE_COUNTDOWN[0]!.phase);

  useEffect(() => {
    setChecked(loadChecked());
  }, []);

  const section = RACE_COUNTDOWN.find((s) => s.phase === phase)!;

  function toggle(id: string) {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore quota */
      }
      return next;
    });
  }

  function clearAll() {
    setChecked({});
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  const done = section.items.filter((i) => checked[i.id]).length;

  return (
    <div className="page-shell max-w-lg">
      <div>
        <Link href="/tools" className="text-xs text-muted-foreground hover:text-foreground">
          ← 工具
        </Link>
        <h1 className="page-title mt-1">比赛倒计时清单</h1>
        <p className="page-subtitle">赛前 4 周到比赛当天 · 勾选保存在本机</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {RACE_COUNTDOWN.map((s) => (
          <Button
            key={s.phase}
            type="button"
            size="sm"
            variant={phase === s.phase ? "default" : "outline"}
            className="touch-manipulation"
            onClick={() => setPhase(s.phase)}
          >
            {s.title}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">{section.title}</CardTitle>
              <CardDescription>{section.subtitle}</CardDescription>
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={clearAll}>
              清空全部
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            本节 {done}/{section.items.length}
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {section.items.map((item) => {
            const on = !!checked[item.id];
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => toggle(item.id)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-lg border p-3 text-left touch-manipulation active:scale-[0.99]",
                  on ? "border-foreground/30 bg-muted/40" : "border-border bg-card",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px]",
                    on
                      ? "border-foreground bg-foreground text-background"
                      : "border-muted-foreground/40",
                  )}
                >
                  {on ? "✓" : ""}
                </span>
                <span className={cn("text-sm", on && "line-through opacity-70")}>{item.text}</span>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        分段策略可配合{" "}
        <Link href="/tools/splits" className="underline hover:text-foreground">
          分段配速表
        </Link>
        。清单仅存浏览器，不占用云数据库。
      </p>
    </div>
  );
}
