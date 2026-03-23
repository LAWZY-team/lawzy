"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { useArticleBySlug } from "@/hooks/articles/use-articles";
import { useT } from "@/components/i18n-provider";

function getContentByLocale(content: unknown, locale: "vi" | "en"): string {
  if (!content || typeof content !== "object") return "";
  const c = content as Record<string, unknown>;
  const val = c[locale === "vi" ? "vi" : "en"];
  return typeof val === "string" ? val : "";
}

interface PolicyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept?: () => void;
  /** Article slug: "term" | "privacy-policy" */
  slug: "term" | "privacy-policy";
  /** Modal title */
  title: string;
  /** When true, user must scroll to bottom before "Đã hiểu" is enabled */
  requireScrollToBottom?: boolean;
}

export function PolicyModal({
  open,
  onOpenChange,
  onAccept,
  slug,
  title,
  requireScrollToBottom = true,
}: PolicyModalProps) {
  const { locale } = useT();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  const { data: article, isLoading, isError } = useArticleBySlug(slug);
  const content =
    article && typeof article.content === "object" && article.content !== null
      ? getContentByLocale(article.content, locale) ||
        getContentByLocale(article.content, locale === "vi" ? "en" : "vi") ||
        article.contentText ||
        ""
      : article?.contentText || "";

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    setHasScrolledToBottom(atBottom);
  }, []);

  useEffect(() => {
    if (!open || !requireScrollToBottom) setHasScrolledToBottom(true);
    else setHasScrolledToBottom(false);
  }, [open, requireScrollToBottom]);

  const canConfirm = !requireScrollToBottom || hasScrolledToBottom;

  const handleConfirm = () => {
    if (!canConfirm) return;
    onAccept?.();
    onOpenChange(false);
  };

  const loadingMsg = slug === "term" ? "Không thể tải nội dung điều khoản." : "Không thể tải nội dung chính sách.";

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={title}
      className="flex flex-col max-h-[90vh]"
    >
      <div className="flex flex-col flex-1 min-h-0 gap-4">
        <h2 className="text-xl font-semibold shrink-0">{title}</h2>
        <div
          ref={scrollRef}
          onScroll={checkScroll}
          className="max-h-[50vh] min-h-[200px] overflow-y-auto pr-2 border rounded-md p-4 bg-muted/30"
        >
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Đang tải nội dung...</p>
          ) : isError || !content ? (
            <p className="text-sm text-muted-foreground">{loadingMsg}</p>
          ) : (
            <div
              className="lawzy-terms prose prose-sm max-w-none text-foreground [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-4 [&_h1]:first:mt-0 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_p]:mb-3 [&_p]:leading-relaxed [&_strong]:font-semibold"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          )}
        </div>
        {requireScrollToBottom && content && (
          <p className="text-xs text-muted-foreground shrink-0">
            Vui lòng kéo xuống đọc toàn bộ nội dung trước khi xác nhận.
          </p>
        )}
        <div className="flex justify-end gap-2 shrink-0 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm}>
            Đã hiểu
          </Button>
        </div>
      </div>
    </Modal>
  );
}
