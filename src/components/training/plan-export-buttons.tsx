"use client";

import { Button } from "@/components/ui/button";

export function PlanExportButtons({ versionId }: { versionId: string }) {
  const base = `/api/v1/plans/${versionId}/export`;

  return (
    <>
      <a href={`${base}?format=ics`} className="block min-w-0">
        <Button type="button" variant="outline" size="default" className="w-full sm:w-auto">
          导出 iCal
        </Button>
      </a>
      <a href={`${base}?format=md`} className="block min-w-0">
        <Button type="button" variant="outline" size="default" className="w-full sm:w-auto">
          导出 Markdown
        </Button>
      </a>
      <a
        href={`${base}?format=pdf`}
        target="_blank"
        rel="noreferrer"
        className="block min-w-0 col-span-2 sm:col-span-1"
      >
        <Button type="button" variant="outline" size="default" className="w-full sm:w-auto">
          打印 / PDF
        </Button>
      </a>
    </>
  );
}
