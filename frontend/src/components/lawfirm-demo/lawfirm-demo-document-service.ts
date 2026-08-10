import JSZip from "jszip";
import { guessMapping } from "./lawfirm-demo-taxonomy";
import type { TemplateDocument, TemplateField } from "./lawfirm-demo-types";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const WORD_XML = /^word\/(document|header[0-9]*|footer[0-9]*|footnotes|endnotes)\.xml$/;

function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function decodeXml(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function encodeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function extractPlaceholders(text: string): string[] {
  if (!text) return [];
  const patterns = [
    /\[[^[\]\r\n]{1,80}\]/g,
    /\{\{[^{}\r\n]{1,80}\}\}/g,
    /<<[^<>\r\n]{1,80}>>/g,
    /\$\{[^{}\r\n]{1,80}\}/g,
    /\$\([^()\r\n]{1,80}\)/g,
    /\{[^{}\r\n]{2,80}\}/g,
    /<(?!\/?(p|div|span|h[1-6]|b|i|u|strong|table|tr|td|th|br|w:|xml|html|body|head|style|script)\b)[^<>\r\n]{2,80}>/gi,
  ];
  const matches = patterns.flatMap((pattern) => text.match(pattern) ?? []);
  return [...new Set(matches.map((m) => m.trim()).filter((m) => m.length >= 3))].sort();
}

export function cleanPlaceholderLabel(value: string): string {
  return value
    .replace(/^(\$\{|\$\(|\{\{|<<|\[|\{|\<)/, "")
    .replace(/(\}\}|\}\)|\}\||>>|\]|\}|\>)$/, "")
    .trim();
}

export function countOccurrences(text: string, value: string): number {
  return text.match(new RegExp(escapeRegExp(value), "g"))?.length ?? 0;
}

export function extractDocBinaryText(bytes: ArrayBuffer): string {
  const uint8 = new Uint8Array(bytes);
  const textPieces: string[] = [];

  // 1. Scan UTF-16LE character sequences (Word 97-2003 OLE2 binary format)
  let utf16Str = "";
  for (let i = 0; i < uint8.length - 1; i += 2) {
    const charCode = uint8[i] | (uint8[i + 1] << 8);
    if (
      (charCode >= 0x0020 && charCode <= 0x1ef9 && charCode !== 0xfeff && charCode !== 0xffff) ||
      charCode === 10 ||
      charCode === 13 ||
      charCode === 9
    ) {
      utf16Str += String.fromCharCode(charCode);
    } else {
      if (utf16Str.trim().length >= 3) {
        textPieces.push(utf16Str);
      }
      utf16Str = "";
    }
  }
  if (utf16Str.trim().length >= 3) {
    textPieces.push(utf16Str);
  }

  // 2. Scan UTF-8 / ASCII / Windows-1258 text sequences
  const decoder = new TextDecoder("utf-8", { fatal: false });
  const rawUtf8 = decoder.decode(bytes);
  const utf8Matches = rawUtf8.match(/[\w\s\u00C0-\u1EF9\[\]\{\}<>\:\-\_\,\.\?\!\%\$\@\#\&\*\(\)]{3,}/g) ?? [];

  const combined = [...textPieces, ...utf8Matches].join("\n");
  const cleanLines = combined
    .split(/[\r\n]+/)
    .map((line) => line.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, " ").trim())
    .filter((line) => line.length > 2 && /[\w\u00C0-\u1EF9\[\]\{\}<>]/.test(line));

  return [...new Set(cleanLines)].join("\n\n");
}

async function extractDocxText(bytes: ArrayBuffer): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(bytes);
    let text = "";
    for (const name of Object.keys(zip.files)) {
      if (!WORD_XML.test(name)) continue;
      const xml = await zip.file(name)?.async("string");
      if (!xml) continue;
      const runs = xml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) ?? [];
      text += `${runs.map((run) => decodeXml(run.replace(/<[^>]+>/g, ""))).join(" ")}\n`;
    }
    return text;
  } catch {
    return extractDocBinaryText(bytes);
  }
}

export async function buildDocxPreview(bytes: ArrayBuffer): Promise<string | undefined> {
  try {
    const mammoth = await import("mammoth");
    const result = await mammoth.convertToHtml({ arrayBuffer: bytes.slice(0) });
    return result.value || undefined;
  } catch {
    const text = extractDocBinaryText(bytes);
    if (!text) return undefined;
    return `<div class="p-4 space-y-3 font-sans text-xs leading-relaxed text-zinc-900 bg-white border border-zinc-200 rounded-md shadow-2xs">${text
      .split("\n\n")
      .map((p) => `<p>${encodeXml(p)}</p>`)
      .join("")}</div>`;
  }
}

async function extractPdf(bytes: ArrayBuffer): Promise<{ text: string; image?: string }> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  const pdf = await pdfjs.getDocument({ data: bytes.slice(0) }).promise;
  let text = "";
  for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, 20); pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    text += `${content.items.map((item) => ("str" in item ? item.str : "")).join(" ")}\n`;
  }

  const firstPage = await pdf.getPage(1);
  const viewport = firstPage.getViewport({ scale: 1.1 });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const context = canvas.getContext("2d");
  if (!context) return { text };
  await firstPage.render({ canvas, canvasContext: context, viewport }).promise;
  return { text, image: canvas.toDataURL("image/png") };
}

export async function buildDocumentPreviewFromBytes(
  fileName: string,
  bytes: ArrayBuffer,
): Promise<Pick<TemplateDocument, "fileType" | "previewHtml" | "previewImage" | "plainText" | "fields">> {
  const ext = fileName.toLowerCase();
  const fileType: DocumentKind = ext.endsWith(".pdf") ? "pdf" : ext.endsWith(".doc") ? "doc" : "docx";
  let plainText = "";
  let previewHtml: string | undefined;
  let previewImage: string | undefined;

  if (fileType === "pdf") {
    const result = await extractPdf(bytes);
    plainText = result.text;
    previewImage = result.image;
  } else if (fileType === "doc") {
    plainText = extractDocBinaryText(bytes.slice(0));
    if (plainText) {
      previewHtml = `<div class="p-4 space-y-3 font-sans text-xs leading-relaxed text-zinc-900 bg-white border border-zinc-200 rounded-md shadow-2xs">${plainText
        .split("\n\n")
        .map((p) => `<p>${encodeXml(p)}</p>`)
        .join("")}</div>`;
    }
  } else {
    plainText = await extractDocxText(bytes.slice(0));
    previewHtml = await buildDocxPreview(bytes.slice(0));
  }

  const fields: TemplateField[] = extractPlaceholders(plainText).map((placeholder) => ({
    id: uid("field"),
    label: cleanPlaceholderLabel(placeholder) || "Trường thông tin",
    placeholder,
    mappedKey: guessMapping(placeholder),
    source: "auto",
    count: countOccurrences(plainText, placeholder),
  }));

  return {
    fileType,
    previewHtml,
    previewImage,
    plainText,
    fields,
  };
}

export async function buildDocumentPreviewFromFileId(
  fileId: string,
  fileName: string,
): Promise<Pick<TemplateDocument, "fileType" | "previewHtml" | "previewImage" | "plainText" | "fields">> {
  const response = await fetch(`/api/proxy/files/${fileId}/download`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw new Error(`Could not load document bytes (${response.status})`);
  }
  return buildDocumentPreviewFromBytes(fileName, await response.arrayBuffer());
}

export async function analyzeDocument(
  file: File,
): Promise<{ document: TemplateDocument; bytes: ArrayBuffer }> {
  const bytes = await file.arrayBuffer();
  const preview = await buildDocumentPreviewFromBytes(file.name, bytes);

  const id = uid("document");
  return {
    bytes,
    document: {
      id,
      fileName: file.name,
      fileType: preview.fileType,
      status: "draft",
      fields: preview.fields,
      previewMode: "highlight",
      previewHtml: preview.previewHtml,
      previewImage: preview.previewImage,
      plainText: preview.plainText,
      storageKey: `lawfirm-document:${id}`,
    },
  };
}

export async function fillDocx(
  bytes: ArrayBuffer,
  replacements: Array<{ aliases: string[]; value: string }>,
): Promise<{ blob: Blob; count: number }> {
  const zip = await JSZip.loadAsync(bytes);
  let count = 0;
  for (const name of Object.keys(zip.files)) {
    if (!WORD_XML.test(name)) continue;
    const entry = zip.file(name);
    if (!entry) continue;
    let xml = await entry.async("string");
    for (const replacement of replacements) {
      for (const alias of replacement.aliases) {
        if (!alias) continue;
        const pattern = new RegExp(escapeRegExp(alias), "g");
        const matches = xml.match(pattern);
        if (matches) {
          count += matches.length;
          xml = xml.replace(pattern, encodeXml(replacement.value));
        }
      }
    }
    zip.file(name, xml);
  }
  const blob = await zip.generateAsync({ type: "blob", mimeType: DOCX_MIME });
  return { blob, count };
}

export async function createResultsZip(results: Array<{ name: string; blob?: Blob }>): Promise<Blob> {
  const zip = new JSZip();
  results.forEach((result) => {
    if (result.blob) zip.file(`DA_DIEN_${result.name}`, result.blob);
  });
  return zip.generateAsync({ type: "blob" });
}

export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
