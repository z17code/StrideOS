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

type Stats = {
  users: {
    total: number;
    active: number;
    disabled: number;
    admins: number;
    registeredLast7Days: number;
  };
  invites: {
    total: number;
    available: number;
    used: number;
    expired: number;
  };
  engagement: {
    checkinUsersToday: number;
    activePlans: number;
    activitiesTotal: number;
    asOfDate: string;
  };
};

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export default function AdminHomePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/v1/admin/stats");
        const data = await res.json();
        if (!res.ok) {
          if (!cancelled) setError(data?.error?.message ?? "加载失败");
          return;
        }
        if (!cancelled) setStats(data.stats);
      } catch {
        if (!cancelled) setError("网络错误");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">管理后台</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          邀请制运维：用户、邀请码、限流与审计
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">概览指标</h2>
        {stats ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="用户"
              value={stats.users.total}
              hint={`正常 ${stats.users.active} · 停用 ${stats.users.disabled} · 管理 ${stats.users.admins}`}
            />
            <Stat
              label="近 7 日注册"
              value={stats.users.registeredLast7Days}
            />
            <Stat
              label="可用邀请码"
              value={stats.invites.available}
              hint={`已用 ${stats.invites.used} · 过期 ${stats.invites.expired}`}
            />
            <Stat
              label="今日打卡人数"
              value={stats.engagement.checkinUsersToday}
              hint={`${stats.engagement.asOfDate} · 活跃计划 ${stats.engagement.activePlans}`}
            />
          </div>
        ) : !error ? (
          <p className="text-sm text-muted-foreground">加载中…</p>
        ) : null}
      </section>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/admin/users">
          <Card className="transition-colors hover:bg-muted/40">
            <CardHeader>
              <CardTitle>用户管理</CardTitle>
              <CardDescription>
                搜索筛选、摘要、启停、重置令牌、踢下线、注销
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">进入 →</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/invites">
          <Card className="transition-colors hover:bg-muted/40">
            <CardHeader>
              <CardTitle>邀请码</CardTitle>
              <CardDescription>创建、筛选、复制与清空</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">进入 →</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/security">
          <Card className="transition-colors hover:bg-muted/40">
            <CardHeader>
              <CardTitle>安全 / 限流</CardTitle>
              <CardDescription>查看并解除登录锁定</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">进入 →</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/audit">
          <Card className="transition-colors hover:bg-muted/40">
            <CardHeader>
              <CardTitle>操作审计</CardTitle>
              <CardDescription>管理员操作只读记录</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">进入 →</p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
