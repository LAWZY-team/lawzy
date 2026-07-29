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
  const patterns = [/\[[^[\]\r\n]{1,80}\]/g, /\{\{[^{}\r\n]{1,80}\}\}/g, /<<[^<>\r\n]{1,80}>>/g];
  return [...new Set(patterns.flatMap((pattern) => text.match(pattern) ?? []))];
}

export function cleanPlaceholderLabel(value: string): string {
  return value
    .replace(/^\[|\]$/g, "")
    .replace(/^\{\{|\}\}$/g, "")
    .replace(/^<<|>>$/g, "")
    .trim();
}

export function countOccurrences(text: string, value: string): number {
  return text.match(new RegExp(escapeRegExp(value), "g"))?.length ?? 0;
}

async function extractDocxText(bytes: ArrayBuffer): Promise<string> {
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
}

async function buildDocxPreview(bytes: ArrayBuffer): Promise<string | undefined> {
  const mammoth = await import("mammoth");
  const result = await mammoth.convertToHtml({ arrayBuffer: bytes.slice(0) });
  return result.value || undefined;
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

export async function analyzeDocument(
  file: File,
): Promise<{ document: TemplateDocument; bytes: ArrayBuffer }> {
  const bytes = await file.arrayBuffer();
  const fileType = file.name.toLowerCase().endsWith(".pdf") ? "pdf" : "docx";
  let plainText = "";
  let previewHtml: string | undefined;
  let previewImage: string | undefined;

  if (fileType === "pdf") {
    const result = await extractPdf(bytes);
    plainText = result.text;
    previewImage = result.image;
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

  const id = uid("document");
  return {
    bytes,
    document: {
      id,
      fileName: file.name,
      fileType,
      status: "draft",
      fields,
      previewMode: "highlight",
      previewHtml,
      previewImage,
      plainText,
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
