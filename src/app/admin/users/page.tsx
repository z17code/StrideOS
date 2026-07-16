"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ADMIN_DELETE_USER_CONFIRMATION } from "@/lib/auth/delete-account-constants";
import { ClipboardCopy, Check } from "lucide-react";

type AdminUser = {
  id: string;
  username: string;
  email: string | null;
  adminNote: string | null;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

type UserDetail = {
  user: AdminUser;
  summary: {
    hasProfile: boolean;
    onboardingCompleted: boolean;
    onboardingSkipped: boolean;
    activeGoal: {
      distanceType: string;
      raceDate: string;
      targetTime: number | null;
    } | null;
    activePlan: {
      id: string;
      label: string | null;
      versionNumber: number;
      startsOn: string;
      endsOn: string;
      totalWeeks: number;
    } | null;
    lastCheckinDate: string | null;
    checkinsLast7Days: number;
    activityCount: number;
    sessionCount: number;
    pendingResetTokens: number;
  };
};

type StatusFilter = "all" | "active" | "disabled" | "admin";

async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fallthrough
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function fmtTime(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("zh-CN", { hour12: false });
  } catch {
    return iso;
  }
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [resetInfo, setResetInfo] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editNote, setEditNote] = useState("");
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (status !== "all") params.set("status", status);
    const res = await fetch(`/api/v1/admin/users?${params.toString()}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error?.message ?? "加载失败");
      return;
    }
    setUsers(data.users);
  }, [q, status]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!detailId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/v1/admin/users/${detailId}`);
        const data = await res.json();
        if (!res.ok) {
          if (!cancelled) setError(data?.error?.message ?? "加载详情失败");
          return;
        }
        if (!cancelled) setDetail(data as UserDetail);
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detailId]);

  function startEdit(user: AdminUser) {
    setEditingId(user.id);
    setEditUsername(user.username);
    setEditNote(user.adminNote ?? "");
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditUsername("");
    setEditNote("");
  }

  function openDelete(user: AdminUser) {
    setDeletingUser(user);
    setDeleteConfirmation("");
    setError(null);
  }

  function closeDelete() {
    setDeletingUser(null);
    setDeleteConfirmation("");
  }

  async function saveEdit(user: AdminUser) {
    setBusyId(user.id);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        adminNote: editNote.trim() ? editNote.trim() : null,
      };
      if (editUsername.trim() && editUsername.trim() !== user.username) {
        body.username = editUsername.trim();
      }
      const res = await fetch(`/api/v1/admin/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "保存失败");
        return;
      }
      cancelEdit();
      await load();
      if (detailId === user.id) setDetailId(user.id);
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(user: AdminUser) {
    setBusyId(user.id);
    setError(null);
    try {
      const res = await fetch(`/api/v1/admin/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "操作失败");
        return;
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function createResetToken(user: AdminUser) {
    setBusyId(user.id);
    setError(null);
    setResetInfo(null);
    setCopied(false);
    try {
      const res = await fetch("/api/v1/admin/reset-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, expiresInHours: 24 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "生成失败");
        return;
      }
      const link = data.resetUrl ?? data.resetPath ?? "";
      setResetInfo(
        [
          `用户 ${data.username} · 24h 有效`,
          `链接：${link}`,
          `令牌：${data.token}`,
          "此前未使用的令牌已自动作废",
        ].join("\n"),
      );
    } finally {
      setBusyId(null);
    }
  }

  async function copyResetLink() {
    if (!resetInfo) return;
    const line = resetInfo
      .split("\n")
      .find((l) => l.startsWith("链接："));
    const text = line ? line.replace(/^链接：/, "") : resetInfo;
    const ok = await copyText(text);
    if (ok) setCopied(true);
    else setError("复制失败，请手动选择");
  }

  async function invalidateResetTokens(user: AdminUser) {
    setBusyId(user.id);
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/reset-token", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "作废失败");
        return;
      }
      setResetInfo(`已作废 ${data.username} 的未用令牌 ${data.invalidated} 个`);
      if (detailId === user.id) setDetailId(user.id);
    } finally {
      setBusyId(null);
    }
  }

  async function kickSessions(user: AdminUser) {
    if (!window.confirm(`确定踢下线「${user.username}」的全部会话？`)) return;
    setBusyId(user.id);
    setError(null);
    try {
      const res = await fetch(`/api/v1/admin/users/${user.id}/sessions`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "操作失败");
        return;
      }
      setResetInfo(`已踢下线 ${data.username}（${data.destroyed} 个会话）`);
      if (detailId === user.id) setDetailId(user.id);
    } finally {
      setBusyId(null);
    }
  }

  async function unlockLogin(user: AdminUser) {
    setBusyId(user.id);
    setError(null);
    try {
      const res = await fetch("/api/v1/admin/rate-limits", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: user.username }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "解锁失败");
        return;
      }
      setResetInfo(
        data.deleted
          ? `已解除 ${user.username} 的登录锁定`
          : `${user.username} 当前无登录锁定记录`,
      );
    } finally {
      setBusyId(null);
    }
  }

  async function confirmDelete() {
    if (!deletingUser) return;
    if (deleteConfirmation !== ADMIN_DELETE_USER_CONFIRMATION) {
      setError("确认文案不一致，请完整输入后再试");
      return;
    }
    setBusyId(deletingUser.id);
    setError(null);
    try {
      const res = await fetch(`/api/v1/admin/users/${deletingUser.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: deleteConfirmation }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "注销失败");
        return;
      }
      closeDelete();
      if (detailId === deletingUser.id) setDetailId(null);
      await load();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">用户管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          搜索筛选、只读摘要；停用仅禁用登录；注销永久删除数据
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="user-q">搜索用户名</Label>
          <Input
            id="user-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="输入用户名"
            className="h-9 w-48"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="user-status">状态</Label>
          <select
            id="user-status"
            className="flex h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
          >
            <option value="all">全部</option>
            <option value="active">正常</option>
            <option value="disabled">已停用</option>
            <option value="admin">管理员</option>
          </select>
        </div>
        <Button size="sm" variant="outline" onClick={() => void load()}>
          刷新
        </Button>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {resetInfo && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle className="text-base">操作结果</CardTitle>
              <CardDescription>重置链接仅显示一次，请安全转发</CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="touch-manipulation"
              onClick={() => void copyResetLink()}
            >
              {copied ? (
                <>
                  <Check className="mr-1 h-4 w-4" /> 已复制
                </>
              ) : (
                <>
                  <ClipboardCopy className="mr-1 h-4 w-4" /> 复制链接
                </>
              )}
            </Button>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap break-all rounded-md bg-muted p-3 text-xs">
              {resetInfo}
            </pre>
          </CardContent>
        </Card>
      )}

      {deletingUser && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base text-destructive">
              注销用户「{deletingUser.username}」
            </CardTitle>
            <CardDescription>
              将永久删除该用户的计划、打卡、训练记录、跑鞋、力量课、比赛策略与会话，不可恢复。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="admin-delete-confirm">请完整输入确认文案</Label>
              <p className="break-all font-mono text-xs text-muted-foreground select-all">
                {ADMIN_DELETE_USER_CONFIRMATION}
              </p>
              <Input
                id="admin-delete-confirm"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder={ADMIN_DELETE_USER_CONFIRMATION}
                autoComplete="off"
                spellCheck={false}
                disabled={busyId === deletingUser.id}
                className="font-mono text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="destructive"
                disabled={
                  busyId === deletingUser.id ||
                  deleteConfirmation !== ADMIN_DELETE_USER_CONFIRMATION
                }
                onClick={() => void confirmDelete()}
              >
                {busyId === deletingUser.id ? "正在注销…" : "确认永久注销"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busyId === deletingUser.id}
                onClick={closeDelete}
              >
                取消
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {detailId && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle className="text-base">
                用户摘要
                {detail ? ` · ${detail.user.username}` : ""}
              </CardTitle>
              <CardDescription>只读支持信息，不含训练明细全文</CardDescription>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setDetailId(null)}>
              关闭
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {detailLoading && (
              <p className="text-muted-foreground">加载中…</p>
            )}
            {detail && (
              <dl className="grid gap-2 sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">状态</dt>
                  <dd>
                    {detail.user.isActive ? "正常" : "已停用"} · {detail.user.role}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">注册 / 最近登录</dt>
                  <dd>
                    {fmtTime(detail.user.createdAt)} / {fmtTime(detail.user.lastLoginAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Onboarding</dt>
                  <dd>
                    {detail.summary.onboardingCompleted
                      ? "已完成"
                      : detail.summary.onboardingSkipped
                        ? "已跳过"
                        : detail.summary.hasProfile
                          ? "进行中"
                          : "无档案"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">活跃目标</dt>
                  <dd>
                    {detail.summary.activeGoal
                      ? `${detail.summary.activeGoal.distanceType} · ${detail.summary.activeGoal.raceDate}`
                      : "无"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">活跃计划</dt>
                  <dd>
                    {detail.summary.activePlan
                      ? `v${detail.summary.activePlan.versionNumber} · ${detail.summary.activePlan.startsOn}→${detail.summary.activePlan.endsOn}（${detail.summary.activePlan.totalWeeks}周）`
                      : "无"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">打卡 / 活动 / 会话</dt>
                  <dd>
                    最近打卡 {detail.summary.lastCheckinDate ?? "—"} · 近7日{" "}
                    {detail.summary.checkinsLast7Days} 次 · 活动{" "}
                    {detail.summary.activityCount} · 会话{" "}
                    {detail.summary.sessionCount} · 未用重置令牌{" "}
                    {detail.summary.pendingResetTokens}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">备注</dt>
                  <dd>{detail.user.adminNote?.trim() || "—"}</dd>
                </div>
              </dl>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">用户名</th>
                  <th className="px-4 py-3 font-medium">备注</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">最近登录</th>
                  <th className="px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isEditing = editingId === u.id;
                  return (
                    <tr
                      key={u.id}
                      className="border-b border-border align-top last:border-0"
                    >
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <Input
                            value={editUsername}
                            onChange={(e) => setEditUsername(e.target.value)}
                            className="h-9 min-w-28"
                            aria-label="用户名"
                          />
                        ) : (
                          <button
                            type="button"
                            className="font-medium text-left hover:underline"
                            onClick={() => setDetailId(u.id)}
                          >
                            {u.username}
                          </button>
                        )}
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {u.role}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <Input
                            value={editNote}
                            onChange={(e) => setEditNote(e.target.value)}
                            placeholder="例如：张三 / 同事"
                            className="h-9 min-w-36"
                            maxLength={200}
                            aria-label="用户备注"
                          />
                        ) : (
                          <span className="text-muted-foreground">
                            {u.adminNote?.trim() ? u.adminNote : "—"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            u.isActive ? "text-success" : "text-destructive"
                          }
                        >
                          {u.isActive ? "正常" : "已停用"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {fmtTime(u.lastLoginAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {isEditing ? (
                            <>
                              <Button
                                size="sm"
                                disabled={busyId === u.id}
                                onClick={() => void saveEdit(u)}
                              >
                                保存
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={busyId === u.id}
                                onClick={cancelEdit}
                              >
                                取消
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busyId === u.id}
                                onClick={() => setDetailId(u.id)}
                              >
                                摘要
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={busyId === u.id}
                                onClick={() => startEdit(u)}
                              >
                                编辑
                              </Button>
                            </>
                          )}
                          {u.role !== "admin" && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyId === u.id || isEditing}
                              onClick={() => void toggleActive(u)}
                            >
                              {u.isActive ? "停用" : "启用"}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={busyId === u.id || isEditing}
                            onClick={() => void createResetToken(u)}
                          >
                            重置令牌
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === u.id || isEditing}
                            onClick={() => void kickSessions(u)}
                          >
                            踢下线
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={busyId === u.id || isEditing}
                            onClick={() => void unlockLogin(u)}
                          >
                            解锁登录
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busyId === u.id || isEditing}
                            onClick={() => void invalidateResetTokens(u)}
                          >
                            作废令牌
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={busyId === u.id || isEditing}
                            onClick={() => openDelete(u)}
                          >
                            注销
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      暂无用户
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
