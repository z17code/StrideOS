"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  RECOVERY_ROUTINES,
  type RecoveryKind,
} from "@/lib/tools/recovery";
import { cn } from "@/lib/utils";

export default function RecoveryPage() {
  const [kind, setKind] = useState<RecoveryKind>("warmup");
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const routine = useMemo(
    () => RECOVERY_ROUTINES.find((r) => r.kind === kind)!,
    [kind],
  );

  function toggle(id: string) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function reset() {
    setChecked({});
  }

  const done = routine.items.filter((i) => checked[i.id]).length;

  return (
    <div className="page-shell max-w-lg">
      <div>
        <Link href="/tools" className="text-xs text-muted-foreground hover:text-foreground">
          ← 工具
        </Link>
        <h1 className="page-title mt-1">热身 / 放松 / 拉伸</h1>
        <p className="page-subtitle">课前课后可勾选完成</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {RECOVERY_ROUTINES.map((r) => (
          <Button
            key={r.kind}
            type="button"
            size="sm"
            variant={kind === r.kind ? "default" : "outline"}
            className="touch-manipulation"
            onClick={() => {
              setKind(r.kind);
              setChecked({});
            }}
          >
            {r.title}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">{routine.title}</CardTitle>
              <CardDescription>{routine.subtitle}</CardDescription>
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={reset}>
              重置
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            已完成 {done}/{routine.items.length}
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {routine.items.map((item) => {
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
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-sm font-medium", on && "line-through opacity-70")}>
                    {item.title}
                    {item.durationSec != null && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {item.durationSec >= 60
                          ? `${Math.round(item.durationSec / 60)} 分钟`
                          : `${item.durationSec} 秒`}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{item.detail}</span>
                </span>
              </button>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
