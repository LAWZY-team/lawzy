export const LAWFIRM_MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export const LAWFIRM_DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const LAWFIRM_PDF_MIME = 'application/pdf';

export const LAWFIRM_IDENTITY_MIMES = [
  LAWFIRM_PDF_MIME,
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const LAWFIRM_TEMPLATE_MIMES = [LAWFIRM_DOCX_MIME, LAWFIRM_PDF_MIME] as const;
