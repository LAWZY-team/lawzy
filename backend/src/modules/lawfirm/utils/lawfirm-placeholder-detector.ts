import JSZip from 'jszip';

const WORD_XML =
  /^word\/(document|header[0-9]*|footer[0-9]*|footnotes|endnotes)\.xml$/;

const COMMON_ALIASES: Record<string, string[]> = {
  company_name: [
    '[TÊN DOANH NGHIỆP]',
    '{{ten_doanh_nghiep}}',
    '[Tên công ty]',
    '[TÊN TỔ CHỨC]',
    '<<Tên doanh nghiệp>>',
    '[CÔNG TY]',
  ],
  f_to_ten: [
    '[TÊN DOANH NGHIỆP]',
    '{{ten_doanh_nghiep}}',
    '[Tên công ty]',
    '[TÊN TỔ CHỨC]',
    '[TÊN ĐƠN VỊ]',
  ],
  tax_id: [
    '[MÃ SỐ THUẾ]',
    '{{mst}}',
    '[MST]',
    '[MÃ SỐ DOANH NGHIỆP]',
    '<<Mã số thuế>>',
  ],
  f_to_mst: ['[MÃ SỐ THUẾ]', '{{mst}}', '[MST]', '[MÃ SỐ DOANH NGHIỆP]'],
  address: ['[ĐỊA CHỈ TRỤ SỞ]', '{{dia_chi}}', '[Địa chỉ]', '[ĐỊA CHỈ]', '<<Địa chỉ>>'],
  f_to_diachi: ['[ĐỊA CHỈ TRỤ SỞ]', '{{dia_chi}}', '[Địa chỉ]', '[ĐỊA CHỈ CÔNG TY]'],
  representative: [
    '[NGƯỜI ĐẠI DIỆN]',
    '{{nguoi_dai_dien}}',
    '[HỌ TÊN NGƯỜI ĐẠI DIỆN]',
    '<<Người đại diện>>',
    '[ĐẠI DIỆN PHÁP LUẬT]',
  ],
  f_dd_hoten: [
    '[NGƯỜI ĐẠI DIỆN]',
    '{{nguoi_dai_dien}}',
    '[HỌ TÊN NGƯỜI ĐẠI DIỆN]',
  ],
  position: ['[CHỨC VỤ]', '{{chuc_vu}}', '[CHỨC DANH]', '[CHỨC VỤ ĐẠI DIỆN]', '<<Chức vụ>>'],
  f_dd_chucdanh: ['[CHỨC VỤ]', '{{chuc_vu}}', '[CHỨC DANH]'],
};

/**
 * Extracts raw plain text from all XML components of a .docx file.
 */
export const extractDocxPlainText = async (
  buffer: Buffer | ArrayBuffer,
): Promise<string> => {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const xmlFileNames = Object.keys(zip.files).filter(
      (name) =>
        name === 'word/document.xml' ||
        name.startsWith('word/header') ||
        name.startsWith('word/footer'),
    );
    let totalText = '';
    for (const name of xmlFileNames) {
      const file = zip.file(name);
      if (!file) continue;
      const xmlString = await file.async('text');
      const textMatches = xmlString.match(/<w:t[^>]*>([^<]*)<\/w:t>/g);
      if (textMatches) {
        const cleaned = textMatches
          .map((tag) => tag.replace(/<[^>]+>/g, ''))
          .join(' ');
        totalText += ` ${cleaned}`;
      }
    }
    return totalText.trim();
  } catch {
    return '';
  }
};

/**
 * Detects all placeholders matching [...], {{...}}, or <<...>> in plain text.
 */
export const extractPlaceholders = (text: string): string[] => {
  if (!text) return [];
  const matches: string[] = [];
  const bracketMatches = text.match(/\[[^\]]{2,80}\]/g);
  if (bracketMatches) matches.push(...bracketMatches);
  const curlyMatches = text.match(/\{\{[^}]{2,80}\}\}/g);
  if (curlyMatches) matches.push(...curlyMatches);
  const angleMatches = text.match(/<<[^>]{2,80}>>/g);
  if (angleMatches) matches.push(...angleMatches);
  return Array.from(
    new Set(matches.map((match) => match.trim()).filter((match) => match.length > 2)),
  ).sort();
};

export const cleanPlaceholderLabel = (value: string): string =>
  value
    .replace(/^\[|\]$/g, '')
    .replace(/^\{\{|\}\}$/g, '')
    .replace(/^<<|>>$/g, '')
    .trim();

export const countOccurrences = (text: string, value: string): number =>
  text.match(new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))?.length ?? 0;

/**
 * Guesses the canonical key given a discovered placeholder string.
 */
export const guessCanonicalMapping = (placeholder: string): string => {
  const norm = placeholder.trim().toUpperCase();
  for (const [key, aliases] of Object.entries(COMMON_ALIASES)) {
    if (aliases.some((alias) => alias.toUpperCase() === norm)) {
      return key;
    }
  }
  const innerText = norm.replace(/^[\[\{\<]+|[\]\}\>]+$/g, '').trim();
  for (const [key, aliases] of Object.entries(COMMON_ALIASES)) {
    if (
      aliases.some((alias) => {
        const aliasInner = alias
          .toUpperCase()
          .replace(/^[\[\{\<]+|[\]\}\>]+$/g, '')
          .trim();
        return aliasInner.includes(innerText) || innerText.includes(aliasInner);
      })
    ) {
      return key;
    }
  }
  return '';
};

export const analyzeDocxPlaceholders = async (
  buffer: Buffer,
): Promise<Array<{ label: string; placeholder: string; mappedKey: string; count: number }>> => {
  const plainText = await extractDocxPlainText(buffer);
  return extractPlaceholders(plainText).map((placeholder) => ({
    label: cleanPlaceholderLabel(placeholder) || 'Trường thông tin',
    placeholder,
    mappedKey: guessCanonicalMapping(placeholder),
    count: countOccurrences(plainText, placeholder),
  }));
};
