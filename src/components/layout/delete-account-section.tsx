"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { DELETE_ACCOUNT_CONFIRMATION } from "@/lib/auth/delete-account-constants";

type Labels = {
  title: string;
  hint: string;
  warning: string;
  confirmLabel: string;
  confirmPlaceholder: string;
  openButton: string;
  cancelButton: string;
  submitButton: string;
  submitting: string;
  mismatch: string;
};

export function DeleteAccountSection({ labels }: { labels: Labels }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canSubmit =
    confirmation === DELETE_ACCOUNT_CONFIRMATION && !busy;

  function close() {
    setOpen(false);
    setConfirmation("");
    setError(null);
  }

  async function handleDelete() {
    if (confirmation !== DELETE_ACCOUNT_CONFIRMATION) {
      setError(labels.mismatch);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/me", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      if (!res.ok) {
        setError(data?.error?.message ?? "注销失败");
        return;
      }
      router.replace("/login");
      router.refresh();
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-destructive">{labels.title}</CardTitle>
        <CardDescription>{labels.hint}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {labels.warning}
        </p>

        {!open ? (
          <Button
            type="button"
            variant="destructive"
            className="w-full touch-manipulation active:opacity-80 sm:w-auto"
            onClick={() => setOpen(true)}
          >
            {labels.openButton}
          </Button>
        ) : (
          <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <div className="space-y-2">
              <Label htmlFor="delete-account-confirm">
                {labels.confirmLabel}
              </Label>
              <p className="text-xs text-muted-foreground font-mono break-all select-all">
                {DELETE_ACCOUNT_CONFIRMATION}
              </p>
              <Input
                id="delete-account-confirm"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder={labels.confirmPlaceholder}
                autoComplete="off"
                spellCheck={false}
                disabled={busy}
                className="font-mono text-sm"
                aria-describedby="delete-account-help"
              />
              <p id="delete-account-help" className="text-xs text-muted-foreground">
                必须与上方文案完全一致（含标点）
              </p>
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                disabled={busy}
                onClick={close}
                className="touch-manipulation"
              >
                {labels.cancelButton}
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={!canSubmit}
                onClick={() => void handleDelete()}
                className="touch-manipulation active:opacity-80"
              >
                {busy ? labels.submitting : labels.submitButton}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

