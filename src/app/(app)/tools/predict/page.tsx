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
import { Label } from "@/components/ui/label";
import {
  DurationFields,
  parseHmsToSec,
} from "@/components/ui/duration-fields";
import { formatDurationSec } from "@/lib/datetime";
import {
  assessPerformances,
  PERFORMANCE_LABELS,
  PREDICT_DISTANCES,
  type PerformanceLevel,
  type PredictDistanceKey,
  type PredictResult,
} from "@/lib/tools/predict";

type TimeFields = { h: string; m: string; s: string };

const EMPTY: TimeFields = { h: "", m: "", s: "" };

const LEVEL_CLASS: Record<PerformanceLevel, string> = {
  excellent: "text-amber-500 dark:text-amber-400 font-medium",
  good: "text-emerald-600 dark:text-emerald-400 font-medium",
  average: "text-orange-500 dark:text-orange-400 font-medium",
  poor: "text-red-500 dark:text-red-400 font-medium",
};

const LEVEL_DOT: Record<PerformanceLevel, string> = {
  excellent: "text-amber-400",
  good: "text-emerald-500",
  average: "text-orange-500",
  poor: "text-red-500",
};

function emptyTimes(): Record<PredictDistanceKey, TimeFields> {
  return {
    "3k": { ...EMPTY },
    "5k": { ...EMPTY },
    "10k": { ...EMPTY },
    half: { ...EMPTY },
    full: { ...EMPTY },
  };
}

export default function PredictPage() {
  const [times, setTimes] =
    useState<Record<PredictDistanceKey, TimeFields>>(emptyTimes);
  const [result, setResult] = useState<PredictResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<PredictDistanceKey | null>(null);

  const hasAny = useMemo(
    () =>
      PREDICT_DISTANCES.some((d) => {
        const t = times[d.key];
        return parseHmsToSec(t.h, t.m, t.s) != null;
      }),
    [times],
  );

  function updateField(
    key: PredictDistanceKey,
    field: keyof TimeFields,
    value: string,
  ) {
    setTimes((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));
    setResult(null);
    setError(null);
  }

  function evaluate() {
    setError(null);
    const inputs = PREDICT_DISTANCES.map((d) => {
      const t = times[d.key];
      return {
        key: d.key,
        timeSec: parseHmsToSec(t.h, t.m, t.s),
      };
    });
    if (!inputs.some((i) => i.timeSec != null)) {
      setError("请至少输入一项近三个月内的个人最好成绩");
      setResult(null);
      return;
    }
    const r = assessPerformances(inputs);
    if (!r) {
      setError("无法评估，请检查输入的成绩是否合理");
      setResult(null);
      return;
    }
    setResult(r);
  }

  function clearAll() {
    setTimes(emptyTimes());
    setResult(null);
    setError(null);
    setEditing(null);
  }

  return (
    <div className="page-shell max-w-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link
            href="/tools"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← 工具
          </Link>
          <h1 className="page-title mt-1">成绩预测</h1>
          <p className="page-subtitle">
            输入近三个月内个人最好成绩，评估各距离表现并预测等价成绩
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">输入成绩</CardTitle>
          <CardDescription>
            建议填写真实水平；以 VDOT 最高的一项作为锚定成绩
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {PREDICT_DISTANCES.map((d) => {
            const t = times[d.key];
            const entered = parseHmsToSec(t.h, t.m, t.s);
            const isOpen = editing === d.key;
            const assessment = result?.assessments.find((a) => a.key === d.key);
            const isAnchor = result?.anchorKey === d.key;

            return (
              <div
                key={d.key}
                className="border-b border-border/60 py-3 last:border-0"
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 touch-manipulation text-left active:opacity-80"
                  onClick={() => setEditing(isOpen ? null : d.key)}
                >
                  <span className="text-sm font-medium">{d.label}成绩</span>
                  <span className="flex items-center gap-1.5 text-sm tabular-nums text-muted-foreground">
                    {entered != null ? (
                      <>
                        <span className="text-foreground">
                          {formatDurationSec(entered)}
                        </span>
                        {isAnchor && (
                          <span
                            className="text-amber-400"
                            title="锚定成绩（真实水平）"
                          >
                            ★
                          </span>
                        )}
                        {!isAnchor &&
                          assessment?.level &&
                          assessment.level !== "good" &&
                          assessment.level !== "excellent" && (
                            <span
                              className={LEVEL_DOT[assessment.level]}
                              title={PERFORMANCE_LABELS[assessment.level]}
                            >
                              {assessment.level === "average" ? "▼" : "▼"}
                            </span>
                          )}
                        {assessment && entered == null && (
                          <span className="text-xs text-muted-foreground">
                            ({formatDurationSec(assessment.predictedSec)})
                          </span>
                        )}
                      </>
                    ) : assessment ? (
                      <span className="text-xs">
                        选择用时{" "}
                        <span className="text-muted-foreground">
                          ({formatDurationSec(assessment.predictedSec)})
                        </span>
                      </span>
                    ) : (
                      <span className="text-xs">选择用时 ›</span>
                    )}
                  </span>
                </button>

                {isOpen && (
                  <div className="mt-3 space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      用时（时 / 分 / 秒）
                    </Label>
                    <DurationFields
                      idPrefix={`predict-${d.key}`}
                      hours={t.h}
                      minutes={t.m}
                      seconds={t.s}
                      onHoursChange={(v) => updateField(d.key, "h", v)}
                      onMinutesChange={(v) => updateField(d.key, "m", v)}
                      onSecondsChange={(v) => updateField(d.key, "s", v)}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setTimes((prev) => ({
                            ...prev,
                            [d.key]: { ...EMPTY },
                          }));
                          setResult(null);
                        }}
                      >
                        清除此项
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="flex-1"
                        onClick={() => setEditing(null)}
                      >
                        完成
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {error && (
            <p className="pt-2 text-sm text-destructive">{error}</p>
          )}

          <div className="flex flex-col gap-2 pt-4">
            <Button
              type="button"
              className="w-full touch-manipulation"
              disabled={!hasAny}
              onClick={evaluate}
            >
              开始评估
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full touch-manipulation"
              onClick={clearAll}
            >
              清空
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            锚定成绩：{result.anchorLabel} · VDOT {result.vdot.toFixed(1)}
          </p>
          {result.assessments.map((a) => (
            <Card key={a.key}>
              <CardContent className="space-y-1.5 pt-4">
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold">
                    {a.label}成绩：{" "}
                    {a.actualSec != null
                      ? formatDurationSec(a.actualSec)
                      : "无"}
                  </h3>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {a.actualSec == null ? (
                    <>
                      依据您的{result.anchorLabel}成绩计算，{a.label}
                      成绩应当为{" "}
                      <span className="font-medium text-foreground">
                        {formatDurationSec(a.predictedSec)}
                      </span>
                      ，可进行针对性训练。
                    </>
                  ) : a.key === result.anchorKey ? (
                    <>
                      您当前的{a.label}成绩
                      {a.level && (
                        <>
                          {" "}
                          <span className={LEVEL_CLASS[a.level]}>
                            {PERFORMANCE_LABELS[a.level]}
                          </span>
                        </>
                      )}
                      ，作为真实水平锚定。
                    </>
                  ) : (
                    <>
                      您当前的{a.label}成绩
                      {a.level && (
                        <>
                          {" "}
                          <span className={LEVEL_CLASS[a.level]}>
                            {PERFORMANCE_LABELS[a.level]}
                          </span>
                        </>
                      )}
                      ，依据您的{result.anchorLabel}成绩计算，{a.label}
                      成绩应当为{" "}
                      <span className="font-medium text-foreground">
                        {formatDurationSec(a.predictedSec)}
                      </span>
                      ，您当前是{" "}
                      <span className="font-medium text-foreground">
                        {formatDurationSec(a.actualSec)}
                      </span>
                      {a.level === "excellent" || a.level === "good"
                        ? "。"
                        : "，可进行针对性训练。"}
                    </>
                  )}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
