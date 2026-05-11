"use client";

import { useEffect, useRef } from "react";
import { renderAsync } from "docx-preview";

interface Props {
  docxBuffer: ArrayBuffer | null;
}

export function DocPreview({ docxBuffer }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !docxBuffer) return;

    renderAsync(docxBuffer, containerRef.current, undefined, {
      className: "docx-preview",
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      ignoreFonts: false,
      breakPages: true,
      useBase64URL: false,
    });
  }, [docxBuffer]);

  if (!docxBuffer) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
        Chọn một tài liệu để xem trước
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="docx-preview-container overflow-auto rounded-lg border bg-white p-4"
      style={{ minHeight: "600px" }}
    />
  );
}
