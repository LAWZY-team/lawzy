"use client";

import { useState } from "react";
import { saveAs } from "file-saver";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { batchFill, type BatchPayload } from "@/lib/api";
import type { GeneralInfo } from "@/lib/schemas";

interface Template {
  id: string;
  code: string;
  name: string;
  isRequired: boolean;
}

interface Props {
  caseId: string;
  generalInfo: GeneralInfo;
  templates: Template[];
}

export function ExportPanel({ caseId, generalInfo, templates }: Props) {
  const [selectedIds, setSelectedIds] = useState<string[]>(
    templates.filter((t) => t.isRequired).map((t) => t.id)
  );
  const [language, setLanguage] = useState<BatchPayload["language"]>("vi");
  const [format, setFormat] = useState<BatchPayload["format"]>("pdf");
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function toggleTemplate(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleExport() {
    setIsExporting(true);
    setProgress(10);
    setError(null);
    try {
      const result = await batchFill({
        caseId,
        generalInfo: generalInfo as Record<string, unknown>,
        templateIds: selectedIds,
        language,
        format,
      });
      setProgress(90);
      const res = await fetch(result.signedUrl);
      const blob = await res.blob();
      const ext = result.signedUrl.startsWith("data:text/plain") ? "txt" : "zip";
      saveAs(blob, `export_${caseId}.${ext}`);
      setProgress(100);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xuất file thất bại");
    } finally {
      setIsExporting(false);
    }
  }

  const required = templates.filter((t) => t.isRequired);
  const optional = templates.filter((t) => !t.isRequired);

  return (
    <div className="space-y-6">
      {/* Template selector */}
      <div className="space-y-3">
        <p className="text-sm font-medium">Chọn tài liệu</p>

        {required.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Bắt buộc</p>
            {required.map((t) => (
              <label key={t.id} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={selectedIds.includes(t.id)}
                  onCheckedChange={() => toggleTemplate(t.id)}
                />
                <span className="text-sm">{t.name}</span>
              </label>
            ))}
          </div>
        )}

        {optional.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Tùy chọn</p>
            {optional.map((t) => (
              <label key={t.id} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={selectedIds.includes(t.id)}
                  onCheckedChange={() => toggleTemplate(t.id)}
                />
                <span className="text-sm">{t.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Format & language */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-sm font-medium">Định dạng</p>
          <Select value={format} onValueChange={(v) => setFormat(v as BatchPayload["format"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="docx">.docx</SelectItem>
              <SelectItem value="pdf">.pdf</SelectItem>
              <SelectItem value="both">Cả hai</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium">Ngôn ngữ</p>
          <Select
            value={language}
            onValueChange={(v) => setLanguage(v as BatchPayload["language"])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vi">Tiếng Việt</SelectItem>
              <SelectItem value="en">Tiếng Anh</SelectItem>
              <SelectItem value="both">Song ngữ</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isExporting && <Progress value={progress} className="h-2" />}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button
          onClick={handleExport}
          disabled={isExporting || selectedIds.length === 0}
          className="flex-1"
        >
          {isExporting ? "Đang xuất…" : `Export ${selectedIds.length} file`}
        </Button>
        <Button
          variant="outline"
          onClick={() => setSelectedIds(templates.map((t) => t.id))}
          disabled={isExporting}
        >
          Chọn tất cả
        </Button>
      </div>
    </div>
  );
}
