"use client";

/**
 * Canvas editor cho hợp đồng — hiển thị và chỉnh sửa nội dung từ template hoặc AI.
 * Bố cục chuẩn VN (quốc hiệu, tiêu đề căn giữa, căn cứ/lời mở đầu/điều khoản căn trái)
 * được định nghĩa trong src/lib/contract-layout.ts và áp dụng khi render preview (template-preview).
 * Nội dung load từ template đã có align/divider; khi cần căn chỉnh trong editor có thể bổ sung
 * extension text-align cho TipTap.
 */
import { useMemo, useState, useEffect } from "react";
import type { JSONContent } from "@tiptap/core";
import { EditorContent, Editor } from "@tiptap/react";
import { useShallow } from 'zustand/react/shallow';
import { useEditorStore } from "@/stores/editor-store";
import { useUserFieldsStore } from "@/stores/user-fields-store";
import {
  Play,
  MoreHorizontal,
  FileText,
  Code,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Undo,
  Redo,
  ChevronDown,
  Download,
  Printer,
  PanelRightOpen,
  PanelRightClose,
  Save,
  Copy,
  HelpCircle,
  Eye,
  EyeOff,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Share2,
  FileSearch,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createPublicShareSnapshot } from "@/lib/api/public-shares";

const CONTRACT_BODY_CLASSES = [
  "min-h-full p-6 pb-24 text-foreground",
  "[&_.ProseMirror]:min-h-[calc(100%-48px)] [&_.ProseMirror]:outline-none [&_.ProseMirror]:text-foreground",
  "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-6 [&_h1]:mb-2 [&_h1]:first:mt-0",
  "[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-2",
  "[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-1",
  "[&_p]:text-[15px] [&_p]:leading-relaxed [&_p]:mb-3",
  "[&_.merge-field]:inline-flex [&_.merge-field]:align-baseline",
].join(" ");

const getPublicAppBaseUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl && typeof envUrl === "string") {
    return envUrl.replace(/\/$/, "");
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
};

interface CanvasEditorProps {
  editor: Editor | null;
  title?: string;
  // onClose: () => void;
  onRun?: () => void;
  isCode?: boolean;
  /** Panel công cụ (Dữ liệu, Thông tin) đang mở */
  toolsPanelOpen?: boolean;
  /** Bật/tắt panel công cụ */
  onToggleTools?: () => void;
  /** Gọi khi chọn "Lưu bản nháp" trong menu */
  onSave?: () => void;
}

export function CanvasEditor({
  editor,
  title = "Hợp đồng chưa đặt tên",
  // onClose,
  onRun,
  isCode = false,
  toolsPanelOpen = true,
  onToggleTools,
  onSave,
}: CanvasEditorProps) {
  const [docTitle, setDocTitle] = useState(title);
  
  // Track ONLY the keys of merge fields to build the toggle list, preventing re-renders on every keystroke
  // `useShallow` prevents the infinite loop from returning a new Array reference on every check
  const mergeFieldKeys = useEditorStore(useShallow((state: { mergeFieldValues: Record<string, string> }) => Object.keys(state.mergeFieldValues)));
  const templateMergeFields = useEditorStore((state) => state.templateMergeFields);
  const {
    customFields,
    hiddenFieldKeys,
    toggleHiddenFieldKey,
    hideAll,
    showAll,
  } = useUserFieldsStore();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);

  const fieldsForToggles = useMemo(() => {
    // Only re-check lists when the keys change or custom/template fields are added
    const keySet = new Set<string>(mergeFieldKeys);
    for (const f of customFields) keySet.add(f.key);
    for (const f of templateMergeFields ?? []) keySet.add(f.fieldKey);

    const customLabelByKey = new Map(customFields.map((f) => [f.key, f.label]));
    const templateLabelByKey = new Map(
      (templateMergeFields ?? []).map((f) => [f.fieldKey, f.label]),
    );

    return Array.from(keySet)
      .filter((k) => k && k.trim() !== "")
      .sort((a, b) => a.localeCompare(b))
      .map((key) => ({
        key,
        label: customLabelByKey.get(key) ?? templateLabelByKey.get(key) ?? key,
      }));
  }, [mergeFieldKeys, customFields, templateMergeFields]);

  const currentFontFamily = editor?.getAttributes("textStyle")?.fontFamily as
    | string
    | undefined;
  const currentFontSize = editor?.getAttributes("textStyle")?.fontSize as
    | string
    | undefined;

  const fontFamilyLabel =
    (currentFontFamily && currentFontFamily.length > 0
      ? currentFontFamily
      : undefined) ?? "Font";
  const fontSizeLabel =
    (currentFontSize && currentFontSize.length > 0
      ? currentFontSize
      : undefined) ?? "Cỡ chữ";

  useEffect(() => {
    if (!editor || editor.isDestroyed || !editor.view) return;
    const handleEditorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Find the closest ancestor or the target itself that has data-field-key
      const fieldEl = target.closest('[data-field-key]');
      if (fieldEl) {
        const fieldKey = fieldEl.getAttribute('data-field-key');
        if (fieldKey) {
          // Dispatch a custom event to focus the field in the RightPanel
          if (!toolsPanelOpen && onToggleTools) {
            // Defer the state update to avoid interfering with TipTap's native event loop
            setTimeout(() => onToggleTools(), 0);
          }
          window.dispatchEvent(new CustomEvent('lawzy:focus-field', { detail: { fieldKey } }));
        }
      }
    };
    
    const dom = editor.view.dom;
    dom.addEventListener('click', handleEditorClick);
    return () => dom.removeEventListener('click', handleEditorClick);
  }, [editor, toolsPanelOpen, onToggleTools]);

  if (!editor) return null;

  /** Convert editor HTML to final HTML (replace merge fields; apply hide rules; strip merge-field styling) */
  const finalizeContractHtml = (rawHtml: string): string => {
    const currentValues = useEditorStore.getState().mergeFieldValues;
    if (Object.keys(currentValues).length === 0) return rawHtml;
    
    const div = document.createElement("div");
    div.innerHTML = rawHtml;
    div.querySelectorAll("[data-field-key]").forEach((el) => {
      const key = el.getAttribute("data-field-key");
      if (!key) return;

      const isHidden = hiddenFieldKeys.includes(key);
      const value = currentValues[key];

      if (isHidden) {
        // Export behavior: hidden fields should become blank whitespace (not show label/key)
        // Use nbsp to avoid collapsing to nothing in HTML/Word rendering.
        el.textContent = "\u00A0";
      } else if (value !== undefined && value !== "") {
        el.textContent = value;
      } else {
        return;
      }
      el.classList.remove("merge-field");
      (el as HTMLElement).style.fontWeight = "inherit";
      (el as HTMLElement).style.background = "none";
      (el as HTMLElement).style.border = "none";
      (el as HTMLElement).style.padding = "0";
    });
    return div.innerHTML;
  };

  const getFinalHtml = (): string => finalizeContractHtml(editor.getHTML());

  const getFinalExportContent = (): JSONContent => {
    const json = editor.getJSON() as JSONContent;

    const transformNode = (node: JSONContent): JSONContent => {
      if (!node) return node;

      if (node.type === "mergeField") {
        const attrs = (node as { attrs?: { fieldKey?: string } }).attrs;
        const fieldKey = attrs?.fieldKey;
        const isHidden = fieldKey ? hiddenFieldKeys.includes(fieldKey) : false;
        
        // Lookup dynamic value without reactive binding
        const value = fieldKey ? useEditorStore.getState().mergeFieldValues[fieldKey] : undefined;

        if (isHidden) {
          return { type: "text", text: "\u00A0" };
        }

        if (value !== undefined && value !== "") {
          return { type: "text", text: value };
        }

        return { type: "text", text: "" };
      }

      if (node.content && Array.isArray(node.content)) {
        return {
          ...node,
          content: node.content.map((child) =>
            transformNode(child as JSONContent),
          ),
        };
      }

      return node;
    };

    if (!json || !json.content) {
      return { type: "doc", content: [] };
    }

    return {
      ...json,
      content: json.content.map((node) => transformNode(node as JSONContent)),
    };
  };

  const handlePrint = () => {
    const html = getFinalHtml();
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.print();
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html><html><head><meta charset="utf-8"><title>${docTitle || "Hợp đồng"}</title>
      <style>body{font-family:system-ui,serif;max-width:210mm;margin:auto;padding:20px;line-height:1.6}
      h1{font-size:1.5rem;margin:0.5em 0}h2{font-size:1.25rem;margin:0.5em 0}p{margin:0.4em 0}</style></head>
      <body>${html}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handleExportPdf = () => {
    // Browser-native PDF export: Print dialog (user chooses Save as PDF)
    handlePrint();
  };

  const handleExportWord = async () => {
    if (!editor) return;

    try {
      const exportContent = getFinalExportContent();
      const res = await fetch("/api/export/docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: exportContent,
          metadata: { title: docTitle || "Hợp đồng" },
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to export Word");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${docTitle || "Hợp đồng"}.docx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      toast.error("Xuất Word thất bại");
    }
  };


  const handleCopyContent = async () => {
    if (!editor) return;
    const text = editor.getText();
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Đã sao chép nội dung");
    } catch {
      toast.error("Không thể sao chép");
    }
  };

  const handleCreateShareLink = async () => {
    try {
      setShareLoading(true);
      setShareUrl(null);

      const data = await createPublicShareSnapshot({
        title: docTitle || undefined,
        html: getFinalHtml(),
      });
      const baseUrl = getPublicAppBaseUrl();
      const url = `${baseUrl}/share/${data.token}`;
      setShareUrl(url);
      toast.success("Đã tạo link chia sẻ");
    } catch (e) {
      console.error(e);
      toast.error("Không tạo được link chia sẻ");
    } finally {
      setShareLoading(false);
    }
  };

  const handleCopyShareLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Đã sao chép link");
    } catch {
      toast.error("Không thể sao chép link");
    }
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground rounded-3xl overflow-hidden border border-border my-2 mr-2">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-background z-20 sticky top-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <input
            value={docTitle}
            onChange={(e) => setDocTitle(e.target.value)}
            className="bg-transparent border-none outline-none font-medium text-sm text-foreground truncate w-[200px] hover:bg-muted/50 px-2 py-1 rounded transition-colors"
          />
        </div>

        <div className="flex items-center gap-1">
          {isCode && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRun}
              className="text-foreground hover:bg-accent gap-2 h-8 px-3 rounded-full mr-2"
            >
              <Play className="w-4 h-4 fill-current" />
              <span className="text-xs font-medium">Kiểm tra</span>
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground hover:bg-accent h-8 w-8 rounded-full"
                title="Xuất văn bản"
              >
                <Download className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-popover border-border text-popover-foreground"
            >
              {/* <DropdownMenuItem
                onClick={handlePrint}
                className="hover:bg-accent cursor-pointer"
              >
                <Printer className="w-4 h-4 mr-2" /> In / Lưu PDF
              </DropdownMenuItem> */}
              <DropdownMenuItem
                onClick={handleExportPdf}
                className="hover:bg-accent cursor-pointer"
              >
                <Download className="w-4 h-4 mr-2" /> Xuất PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleExportWord}
                className="hover:bg-accent cursor-pointer"
              >
                <FileText className="w-4 h-4 mr-2" /> Xuất Word (.docx)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground hover:bg-accent h-8 w-8 rounded-full"
            title="Xem bản hoàn thiện"
            onClick={() => setPreviewOpen(true)}
          >
            <FileSearch className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground hover:bg-accent h-8 w-8 rounded-full"
            title="Chia sẻ link công khai (chỉ xem)"
            onClick={() => {
              setShareOpen(true);
              setShareUrl(null);
            }}
          >
            <Share2 className="w-4 h-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground hover:bg-accent h-8 w-8 rounded-full"
                title="Ẩn/hiện trường dữ liệu"
              >
                {hiddenFieldKeys.length > 0 ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-popover border-border text-popover-foreground w-[280px]"
            >
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Ẩn/hiện thông tin trường
              </DropdownMenuLabel>
              <DropdownMenuItem
                className="hover:bg-accent cursor-pointer text-sm"
                onClick={() => hideAll(fieldsForToggles.map((f) => f.key))}
              >
                <EyeOff className="w-4 h-4 mr-2" /> Ẩn tất cả
              </DropdownMenuItem>
              <DropdownMenuItem
                className="hover:bg-accent cursor-pointer text-sm"
                onClick={() => showAll()}
              >
                <Eye className="w-4 h-4 mr-2" /> Hiện tất cả
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              {fieldsForToggles.length === 0 ? (
                <DropdownMenuItem className="text-muted-foreground" disabled>
                  Chưa có trường dữ liệu
                </DropdownMenuItem>
              ) : (
                fieldsForToggles.map((f) => (
                  <DropdownMenuCheckboxItem
                    key={f.key}
                    checked={hiddenFieldKeys.includes(f.key)}
                    onCheckedChange={() => toggleHiddenFieldKey(f.key)}
                    className="hover:bg-accent cursor-pointer"
                    title={f.key}
                  >
                    <span className="truncate">{f.label}</span>
                  </DropdownMenuCheckboxItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground hover:bg-accent h-8 w-8 rounded-full"
                title="Thêm"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-popover border-border text-popover-foreground"
            >
              {onSave && (
                <>
                  <DropdownMenuItem
                    onClick={onSave}
                    className="hover:bg-accent cursor-pointer"
                  >
                    <Save className="w-4 h-4 mr-2" /> Lưu bản nháp
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border" />
                </>
              )}
              <DropdownMenuItem
                onClick={handleCopyContent}
                className="hover:bg-accent cursor-pointer"
              >
                <Copy className="w-4 h-4 mr-2" /> Sao chép nội dung
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handlePrint}
                className="hover:bg-accent cursor-pointer"
              >
                <Printer className="w-4 h-4 mr-2" /> Chế độ in
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                className="hover:bg-accent cursor-pointer"
                onClick={() => toast.info("Trợ giúp: Liên hệ support@lawzy.vn")}
              >
                <HelpCircle className="w-4 h-4 mr-2" /> Trợ giúp
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {onToggleTools && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleTools}
              className={cn(
                "h-8 w-8 rounded-full",
                toolsPanelOpen
                  ? "text-foreground bg-accent"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
              title={toolsPanelOpen ? "Đóng công cụ" : "Mở công cụ"}
            >
              {toolsPanelOpen ? (
                <PanelRightClose className="w-4 h-4" />
              ) : (
                <PanelRightOpen className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="px-4 py-2 border-b border-border bg-background flex items-center gap-1 overflow-x-auto no-scrollbar">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              <span className="text-xs">Kiểu văn bản</span>
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-popover border-border text-popover-foreground">
            <DropdownMenuItem
              onClick={() => editor.chain().focus().setParagraph().run()}
              className="hover:bg-accent"
            >
              Văn bản thường
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
              className="hover:bg-accent"
            >
              Tiêu đề 1
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              className="hover:bg-accent"
            >
              Tiêu đề 2
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 3 }).run()
              }
              className="hover:bg-accent"
            >
              Tiêu đề 3
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              <span className="text-xs truncate max-w-[120px]">
                {fontFamilyLabel}
              </span>
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-popover border-border text-popover-foreground">
            <DropdownMenuItem
              onClick={() => editor.chain().focus().unsetFontFamily().run()}
              className="hover:bg-accent"
            >
              Mặc định
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            {["Inter", "Arial", "Times New Roman", "Courier New"].map((ff) => (
              <DropdownMenuItem
                key={ff}
                onClick={() => editor.chain().focus().setFontFamily(ff).run()}
                className="hover:bg-accent"
              >
                {ff}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              <span className="text-xs">{fontSizeLabel}</span>
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-popover border-border text-popover-foreground">
            <DropdownMenuItem
              onClick={() => editor.chain().focus().unsetFontSize().run()}
              className="hover:bg-accent"
            >
              Mặc định
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            {[
              "12px",
              "14px",
              "16px",
              "18px",
              "20px",
              "24px",
              "28px",
              "32px",
            ].map((sz) => (
              <DropdownMenuItem
                key={sz}
                onClick={() => editor.chain().focus().setFontSize(sz).run()}
                className="hover:bg-accent"
              >
                {sz}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-4 w-px bg-border mx-2"></div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          className={cn(
            "h-8 w-8 rounded text-muted-foreground hover:text-foreground hover:bg-accent",
            editor.isActive({ textAlign: "left" }) &&
              "bg-accent text-foreground",
          )}
          title="Căn trái"
        >
          <AlignLeft className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          className={cn(
            "h-8 w-8 rounded text-muted-foreground hover:text-foreground hover:bg-accent",
            editor.isActive({ textAlign: "center" }) &&
              "bg-accent text-foreground",
          )}
          title="Căn giữa"
        >
          <AlignCenter className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          className={cn(
            "h-8 w-8 rounded text-muted-foreground hover:text-foreground hover:bg-accent",
            editor.isActive({ textAlign: "right" }) &&
              "bg-accent text-foreground",
          )}
          title="Căn phải"
        >
          <AlignRight className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().setTextAlign("justify").run()}
          className={cn(
            "h-8 w-8 rounded text-muted-foreground hover:text-foreground hover:bg-accent",
            editor.isActive({ textAlign: "justify" }) &&
              "bg-accent text-foreground",
          )}
          title="Căn đều"
        >
          <AlignJustify className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(
            "h-8 w-8 rounded text-muted-foreground hover:text-foreground hover:bg-accent",
            editor.isActive("bold") && "bg-accent text-foreground",
          )}
          title="In đậm"
        >
          <Bold className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(
            "h-8 w-8 rounded text-muted-foreground hover:text-foreground hover:bg-accent",
            editor.isActive("italic") && "bg-accent text-foreground",
          )}
          title="In nghiêng"
        >
          <Italic className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={cn(
            "h-8 w-8 rounded text-muted-foreground hover:text-foreground hover:bg-accent",
            editor.isActive("underline") && "bg-accent text-foreground",
          )}
          title="Gạch chân"
        >
          <UnderlineIcon className="w-4 h-4" />
        </Button>

        <div className="h-4 w-px bg-border mx-2"></div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn(
            "h-8 w-8 rounded text-muted-foreground hover:text-foreground hover:bg-accent",
            editor.isActive("bulletList") && "bg-accent text-foreground",
          )}
          title="Danh sách"
        >
          <List className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn(
            "h-8 w-8 rounded text-muted-foreground hover:text-foreground hover:bg-accent",
            editor.isActive("orderedList") && "bg-accent text-foreground",
          )}
          title="Danh sách số"
        >
          <ListOrdered className="w-4 h-4" />
        </Button>

        <div className="flex-1"></div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="h-8 w-8 rounded text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30"
          title="Hoàn tác"
        >
          <Undo className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="h-8 w-8 rounded text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30"
          title="Làm lại"
        >
          <Redo className="w-4 h-4" />
        </Button>
      </div>

      {/* Editor Body — cấu trúc văn bản: heading, paragraph, căn giữa/trái */}
      <div className="flex-1 overflow-auto relative bg-background">
        <EditorContent editor={editor} className={cn(CONTRACT_BODY_CLASSES)} />
      </div>

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Xem bản hoàn thiện</DialogTitle>
            <DialogDescription>
              Bản xem trước (read-only) với dữ liệu đã được trộn và áp dụng quy
              tắc ẩn/hiện.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh] pr-4">
            <div
              className={cn(CONTRACT_BODY_CLASSES)}
              dangerouslySetInnerHTML={{ __html: getFinalHtml() }}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Share dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Chia sẻ link công khai</DialogTitle>
            <DialogDescription>
              Tạo link snapshot chỉ đọc. Người nhận không cần đăng nhập và chỉ
              có thể xem.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Button
              type="button"
              onClick={handleCreateShareLink}
              disabled={shareLoading}
            >
              {shareLoading ? "Đang tạo link..." : "Tạo link"}
            </Button>
            {shareUrl && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Link</div>
                <div className="flex items-center gap-2">
                  <input
                    value={shareUrl}
                    readOnly
                    className="flex-1 h-9 rounded-md border border-border bg-background px-3 text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCopyShareLink}
                  >
                    Sao chép
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
