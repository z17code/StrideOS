"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function parseHmsToSec(h: string, m: string, s: string): number | null {
  const hh = h === "" ? 0 : Number(h);
  const mm = m === "" ? 0 : Number(m);
  const ss = s === "" ? 0 : Number(s);
  if (![hh, mm, ss].every((n) => Number.isFinite(n) && n >= 0 && Number.isInteger(n))) {
    return null;
  }
  if (mm >= 60 || ss >= 60) return null;
  const total = hh * 3600 + mm * 60 + ss;
  return total > 0 ? total : null;
}

export function splitSecToHms(totalSec: number | null | undefined): {
  h: string;
  m: string;
  s: string;
} {
  if (totalSec == null || !Number.isFinite(totalSec) || totalSec <= 0) {
    return { h: "", m: "", s: "" };
  }
  const sec = Math.max(0, Math.round(totalSec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return {
    h: h > 0 ? String(h) : "",
    m: String(m),
    s: String(s),
  };
}

type Props = {
  hours: string;
  minutes: string;
  seconds: string;
  onHoursChange: (v: string) => void;
  onMinutesChange: (v: string) => void;
  onSecondsChange: (v: string) => void;
  className?: string;
  idPrefix?: string;
};

export function DurationFields({
  hours,
  minutes,
  seconds,
  onHoursChange,
  onMinutesChange,
  onSecondsChange,
  className,
  idPrefix = "dur",
}: Props) {
  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      <div>
        <Input
          id={`${idPrefix}-h`}
          type="number"
          inputMode="numeric"
          min={0}
          max={99}
          value={hours}
          onChange={(e) => onHoursChange(e.target.value)}
          placeholder="0"
          aria-label="小时"
        />
        <span className="mt-0.5 block text-center text-[10px] text-muted-foreground">
          时
        </span>
      </div>
      <div>
        <Input
          id={`${idPrefix}-m`}
          type="number"
          inputMode="numeric"
          min={0}
          max={59}
          value={minutes}
          onChange={(e) => onMinutesChange(e.target.value)}
          placeholder="0"
          aria-label="分钟"
        />
        <span className="mt-0.5 block text-center text-[10px] text-muted-foreground">
          分
        </span>
      </div>
      <div>
        <Input
          id={`${idPrefix}-s`}
          type="number"
          inputMode="numeric"
          min={0}
          max={59}
          value={seconds}
          onChange={(e) => onSecondsChange(e.target.value)}
          placeholder="0"
          aria-label="秒"
        />
        <span className="mt-0.5 block text-center text-[10px] text-muted-foreground">
          秒
        </span>
      </div>
    </div>
  );
}
