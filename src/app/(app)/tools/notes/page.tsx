"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { NOTE_TEMPLATES } from "@/lib/tools/notes";

export default function NotesTemplatesPage() {
  const [activeId, setActiveId] = useState(NOTE_TEMPLATES[0]!.id);
  const [body, setBody] = useState(NOTE_TEMPLATES[0]!.body);
  const [copied, setCopied] = useState(false);

  function select(id: string) {
    const t = NOTE_TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    setActiveId(id);
    setBody(t.body);
    setCopied(false);
  }

  async function copy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(body);
      } else {
        const ta = document.createElement("textarea");
        ta.value = body;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="page-shell max-w-lg">
      <div>
        <Link href="/tools" className="text-xs text-muted-foreground hover:text-foreground">
          ← 工具
        </Link>
        <h1 className="page-title mt-1">训练备注模板</h1>
        <p className="page-subtitle">复制后贴到活动记录备注里</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {NOTE_TEMPLATES.map((t) => (
          <Button
            key={t.id}
            type="button"
            size="sm"
            variant={activeId === t.id ? "default" : "outline"}
            className="touch-manipulation"
            onClick={() => select(t.id)}
          >
            {t.title}
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">模板内容</CardTitle>
          <CardDescription>可在下方直接改字再复制</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            className="font-mono text-sm"
          />
          <Button type="button" className="w-full touch-manipulation" onClick={() => void copy()}>
            {copied ? "已复制" : "复制到剪贴板"}
          </Button>
          <Button type="button" variant="outline" className="w-full touch-manipulation" asChild>
            <Link href="/activity">去活动页粘贴</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
