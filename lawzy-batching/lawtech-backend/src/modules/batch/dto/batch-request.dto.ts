export type BatchLanguage = "vi" | "en" | "both";
export type BatchFormat = "docx" | "pdf" | "both";

export interface BatchRequestDto {
  caseId: string;
  generalInfo: Record<string, unknown>;
  templateIds: string[];
  language: BatchLanguage;
  format: BatchFormat;
}

export interface BatchFileResult {
  templateCode: string;
  status: "ok" | "error";
  error?: string;
}

export interface BatchResponseDto {
  signedUrl: string;
  files: BatchFileResult[];
}
