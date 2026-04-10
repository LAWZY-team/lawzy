import type {
  MergeFieldDataType,
  MergeFieldDefinition,
} from './contract-templates.types';

interface SanitizedFieldMatch {
  field: MergeFieldDefinition;
  placeholder: string;
}

export interface SanitizedContractTemplateText {
  sanitizedText: string;
  mergeFields: MergeFieldDefinition[];
  sanitizedFieldCount: number;
}

const LABEL_HINTS = [
  'ten', 'ho ten', 'full name', 'legal name', 'company name', 'party name', 'name',
  'cong ty', 'doanh nghiep', 'company', 'enterprise', 'organization',
  'dia chi', 'address', 'registered address', 'business address',
  'email', 'dien thoai', 'so dien thoai', 'phone', 'telephone', 'mobile',
  'contact number', 'mst', 'ma so thue', 'ma so doanh nghiep', 'tax',
  'tax code', 'tax id', 'tax identification number', 'business registration number',
  'registration number', 'fax', 'website', 'ngay sinh', 'date of birth',
  'birthday', 'cccd', 'cmnd', 'ho chieu', 'passport', 'passport number',
  'id number', 'identity card', 'quoc tich', 'nationality', 'chuc vu',
  'dai dien', 'nguoi dai dien', 'title', 'position', 'job title',
  'representative', 'legal representative', 'authorized representative',
  'tai khoan', 'ngan hang', 'chi nhanh', 'account', 'account number', 'bank',
  'bank account', 'bank name', 'branch', 'noi cap', 'ngay cap', 'issued by',
  'issue date', 'issued date', 'ben a', 'ben b', 'nguoi lao dong',
  'nguoi su dung lao dong', 'seller', 'buyer', 'provider', 'customer',
  'employee', 'employer', 'contractor', 'client', 'service provider',
  'signing', 'ngay ky', 'dia diem ky', 'signing date', 'signing place',
  'signing location', 'effective date', 'commencement date',
  'gia thue', 'tien thue', 'gia tri', 'thanh toan', 'dat coc', 'tien coc',
  'so tien', 'tien nha', 'chu tai khoan', 'so tai khoan', 'ngay thanh toan',
  'thoi han', 'ngay het han', 'ngay bat dau', 'ngay ket thuc', 'phi', 'stk'
];

const FIELD_TYPE_RULES: Array<{
  pattern: RegExp;
  dataType: MergeFieldDataType;
}> = [
  {
    pattern: /(ngay|date|sinh|ky|cap|birthday|effective date|commencement date|issue date|issued date|thoi han)/i,
    dataType: 'date',
  },
  {
    pattern: /(gia|tong|phi|tien|amount|price|salary|luong|fee|payment|compensation|remuneration|deposit|dat coc)/i,
    dataType: 'currency',
  },
  {
    pattern: /(so luong|quantity|number|serial number|registration number|passport number|id number|tax id|phone number|account number|so|stk)/i,
    dataType: 'number',
  },
  {
    pattern: /(noi dung|mo ta|description|pham vi|address|scope|details|content|service description|goods description|dia chi)/i,
    dataType: 'text',
  },
];

function foldVi(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd');
}

function normalizeWhitespace(text: string): string {
  return text.replace(/[ \t]+/g, ' ').trim();
}

function cleanLabel(label: string): string {
  return normalizeWhitespace(
    label.replace(/^[-*]\s*/, '').replace(/\s+/g, ' '),
  );
}

function isLikelyFieldLabel(label: string, value: string): boolean {
  const foldedLabel = foldVi(label);
  if (
    foldedLabel.startsWith('dieu ') ||
    foldedLabel.startsWith('article ') ||
    foldedLabel.startsWith('clause ')
  ) {
    return false;
  }
  if (label.length < 2 || label.length > 120) return false;
  if (!value.trim()) return false;
  
  if (LABEL_HINTS.some((hint) => foldedLabel.includes(hint))) return true;
  
  const labelWordCount = foldedLabel.split(/\s+/).filter(Boolean).length;
  if (labelWordCount > 15) return false;
  
  // Reject common sentence endings or paragraph lead-in
  if (/(\bnhư sau\b|\bgồm\b|\bcác bước\b|\bquy định\b|\bsau đây\b)$/i.test(label.trim())) {
    return false;
  }
  
  if (value.length <= 100 && labelWordCount <= 15) {
    if (labelWordCount <= 6) return true;
    if (value.length <= 60) return true;
  }

  return /^(?:[A-ZÀ-Ỹ][\wÀ-ỹ]*\s*){1,10}$/u.test(label.trim());
}

function inferDataType(label: string): MergeFieldDataType {
  const foldedLabel = foldVi(label);
  return (
    FIELD_TYPE_RULES.find((rule) => rule.pattern.test(foldedLabel))?.dataType ??
    'string'
  );
}

function buildBaseFieldKey(label: string): string {
  const normalized = foldVi(label)
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .toUpperCase();
  return normalized || 'FIELD';
}

function ensureUniqueFieldKey(
  baseKey: string,
  existingKeys: Set<string>,
): string {
  if (!existingKeys.has(baseKey)) {
    existingKeys.add(baseKey);
    return baseKey;
  }
  for (let index = 2; index < 1000; index += 1) {
    const candidate = `${baseKey}_${index}`;
    if (!existingKeys.has(candidate)) {
      existingKeys.add(candidate);
      return candidate;
    }
  }
  const fallback = `${baseKey}_${Date.now()}`;
  existingKeys.add(fallback);
  return fallback;
}

function createFieldMatch(params: {
  label: string;
  existingKeys: Set<string>;
}): SanitizedFieldMatch {
  const cleanedLabel = cleanLabel(params.label);
  const fieldKey = ensureUniqueFieldKey(
    buildBaseFieldKey(cleanedLabel),
    params.existingKeys,
  );
  return {
    field: {
      fieldKey,
      label: cleanedLabel || 'Nhập giá trị',
      dataType: inferDataType(cleanedLabel),
      required: false,
    },
    placeholder: `{{${fieldKey}}}`,
  };
}

function sanitizeSegments(params: {
  line: string;
  existingKeys: Set<string>;
  mergeFields: MergeFieldDefinition[];
}): { sanitizedLine: string; sanitizedCount: number } {
  const segments = params.line.split(/(?<=;)/);
  let sanitizedCount = 0;
  const sanitizedSegments = segments.map((segment) => {
    // Allows matching up to 120 chars for labels
    const match = segment.match(
      /^(\s*[-*]?\s*)([^:;\n]{2,120}?)(\s*:\s*)([^;\n]+?)(\s*;?\s*)$/
    );
    if (!match) return segment;
    const [, prefix, rawLabel, separator, rawValue, suffix] = match;
    const label = cleanLabel(rawLabel);
    const value = normalizeWhitespace(rawValue);
    if (!isLikelyFieldLabel(label, value)) return segment;
    const fieldMatch = createFieldMatch({
      label,
      existingKeys: params.existingKeys,
    });
    params.mergeFields.push(fieldMatch.field);
    sanitizedCount += 1;
    return `${prefix}${label}${separator}${fieldMatch.placeholder}${suffix}`;
  });
  return {
    sanitizedLine: sanitizedSegments.join(''),
    sanitizedCount,
  };
}

function sanitizeInlineValues(params: {
  line: string;
  existingKeys: Set<string>;
  mergeFields: MergeFieldDefinition[];
}): { sanitizedLine: string; sanitizedCount: number } {
  let { line, existingKeys, mergeFields } = params;
  let sanitizedCount = 0;

  // 1. Currency parsing (e.g. 34.000.000 VNĐ (Ba mươi bốn triệu đồng))
  const moneyRegex = /(?:\b\d{1,3}(?:[.,]\d{3})+(?:[.,]\d+)?\s*(?:VNĐ|VND|đồng|dong|đ|USD|EUR))(?![a-zA-ZÀ-ỹ])(?:\s*\([^)]+\))?/gi;
  line = line.replace(moneyRegex, (match) => {
    const fieldMatch = createFieldMatch({ label: 'Số tiền', existingKeys });
    fieldMatch.field.dataType = 'currency';
    mergeFields.push(fieldMatch.field);
    sanitizedCount++;
    return fieldMatch.placeholder;
  });

  // 2. Date parsing (e.g. ngày 01 tháng 03 năm 2025, or 01/03/2025)
  const dateRegex = /(?:(?:ng[aà]y\s+)?(?:0?[1-9]|[12][0-9]|3[01])\s*[-/.]\s*(?:0?[1-9]|1[012])\s*[-/.]\s*(?:19|20)\d\d|(?:ng[aà]y)\s+(?:0?[1-9]|[12][0-9]|3[01])\s+(?:th[aá]ng)\s+(?:0?[1-9]|1[012])\s+(?:n[aă]m)\s+(?:19|20)\d\d)/gi;
  line = line.replace(dateRegex, (match) => {
    const fieldMatch = createFieldMatch({ label: 'Ngày tháng năm', existingKeys });
    fieldMatch.field.dataType = 'date';
    mergeFields.push(fieldMatch.field);
    sanitizedCount++;
    return fieldMatch.placeholder;
  });

  return { sanitizedLine: line, sanitizedCount };
}

export const sanitizeContractTemplateFields = ({
  text,
}: {
  text: string;
}): SanitizedContractTemplateText => {
  const mergeFields: MergeFieldDefinition[] = [];
  const existingKeys = new Set<string>();
  const lines = text.split(/\r?\n/);
  let sanitizedFieldCount = 0;
  
  const sanitizedLines = lines.map((line) => {
    // 1. Process inline structural label segments (Label: Value)
    const { sanitizedLine: postSegmentLine, sanitizedCount: count1 } = sanitizeSegments({
      line,
      existingKeys,
      mergeFields,
    });
    
    // 2. Fallback to process free-floating currency / date patterns
    const { sanitizedLine: postInlineLine, sanitizedCount: count2 } = sanitizeInlineValues({
      line: postSegmentLine,
      existingKeys,
      mergeFields,
    });
    
    sanitizedFieldCount += (count1 + count2);
    return postInlineLine;
  });
  
  const sanitizedText = sanitizedLines
    .join('\n')
    .replace(/^\s*--\s*\d+\s+of\s+\d+\s*--\s*$/gmi, '')
    .replace(/^\s*-\s*\d+\s+-\s*$/gm, '')
    .replace(/^\s*Page\s+\d+\s+of\s+\d+\s*$/gmi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
    
  return {
    sanitizedText,
    mergeFields,
    sanitizedFieldCount,
  };
};
