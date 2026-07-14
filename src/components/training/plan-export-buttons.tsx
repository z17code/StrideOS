"use client";

import { Button } from "@/components/ui/button";

export function PlanExportButtons({ versionId }: { versionId: string }) {
  const base = `/api/v1/plans/${versionId}/export`;

  return (
    <div className="flex flex-wrap gap-2">
      <a href={`${base}?format=ics`}>
        <Button type="button" variant="outline" size="sm">
          导出 iCal
        </Button>
      </a>
      <a href={`${base}?format=md`}>
        <Button type="button" variant="outline" size="sm">
          导出 Markdown
        </Button>
      </a>
      <a href={`${base}?format=pdf`} target="_blank" rel="noreferrer">
        <Button type="button" variant="outline" size="sm">
          打印 / PDF
        </Button>
      </a>
    </div>
  );
}
