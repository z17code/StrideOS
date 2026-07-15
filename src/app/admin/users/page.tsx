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

type AdminUser = {
  id: string;
  username: string;
  email: string | null;
  adminNote: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editNote, setEditNote] = useState("");
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");

  const load = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/v1/admin/users");
    const data = await res.json();
    if (!res.ok) {
      setError(data?.error?.message ?? "加载失败");
      return;
    }
    setUsers(data.users);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
    setResetToken(null);
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
      setResetToken(
        `用户 ${data.username} 的重置令牌（24h）：\n${data.token}`,
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
          可备注识别用户、修改用户名；停用仅禁用登录；注销将永久删除该用户全部数据
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {resetToken && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">重置令牌（仅显示一次）</CardTitle>
            <CardDescription>请通过安全渠道交给用户</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap break-all rounded-md bg-muted p-3 text-xs">
              {resetToken}
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
              停用账号不会删数据；若只需禁止登录请用「停用」。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="admin-delete-confirm">
                请完整输入确认文案
              </Label>
              <p className="text-xs text-muted-foreground font-mono break-all select-all">
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

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">用户名</th>
                  <th className="px-4 py-3 font-medium">备注</th>
                  <th className="px-4 py-3 font-medium">角色</th>
                  <th className="px-4 py-3 font-medium">状态</th>
                  <th className="px-4 py-3 font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isEditing = editingId === u.id;
                  return (
                    <tr
                      key={u.id}
                      className="border-b border-border last:border-0 align-top"
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
                          <span className="font-medium">{u.username}</span>
                        )}
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
                      <td className="px-4 py-3 text-muted-foreground">{u.role}</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            u.isActive ? "text-success" : "text-destructive"
                          }
                        >
                          {u.isActive ? "正常" : "已停用"}
                        </span>
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
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={busyId === u.id}
                              onClick={() => startEdit(u)}
                            >
                              编辑
                            </Button>
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

