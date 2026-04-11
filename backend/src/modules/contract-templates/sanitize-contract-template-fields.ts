import type {
  MergeFieldDataType,
  MergeFieldDefinition,
} from './contract-templates.types';
import { AiSanitizerService } from './ai-sanitizer.service';

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
  value?: string;
  dataType?: MergeFieldDataType;
  existingKeys: Set<string>;
  valueToFieldMap?: Map<string, MergeFieldDefinition>;
}): SanitizedFieldMatch {
  // If we have a value and it was already sanitized, reuse the field
  if (params.value && params.valueToFieldMap && params.valueToFieldMap.has(params.value)) {
    const existingField = params.valueToFieldMap.get(params.value)!;
    return {
      field: existingField,
      placeholder: `{{${existingField.fieldKey}}}`,
    };
  }

  const cleanedLabel = cleanLabel(params.label);
  const fieldKey = ensureUniqueFieldKey(
    buildBaseFieldKey(cleanedLabel),
    params.existingKeys,
  );
  
  const field: MergeFieldDefinition = {
    fieldKey,
    label: cleanedLabel || 'Nhập giá trị',
    dataType: params.dataType || inferDataType(cleanedLabel),
    required: false,
  };

  // Track the new field for deduplication if value is provided
  if (params.value && params.valueToFieldMap) {
    params.valueToFieldMap.set(params.value, field);
  }

  return {
    field,
    placeholder: `{{${fieldKey}}}`,
  };
}

function sanitizeSegments(params: {
  line: string;
  existingKeys: Set<string>;
  mergeFields: MergeFieldDefinition[];
  valueToFieldMap: Map<string, MergeFieldDefinition>;
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
    
    // Check if the value itself contains more sensitive info (recursive-like check)
    const { sanitizedLine: deepSanitizedValue } = sanitizeInlineValues({
      line: value,
      existingKeys: params.existingKeys,
      mergeFields: params.mergeFields,
      valueToFieldMap: params.valueToFieldMap,
    });

    const fieldMatch = createFieldMatch({
      label,
      value: deepSanitizedValue === value ? value : undefined, // If sanitized deep, don't use as cache key for raw value
      existingKeys: params.existingKeys,
      valueToFieldMap: params.valueToFieldMap,
    });
    
    // Only add to mergeFields if it's a new field (deduplication)
    if (!params.mergeFields.find(f => f.fieldKey === fieldMatch.field.fieldKey)) {
      params.mergeFields.push(fieldMatch.field);
    }
    
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
  valueToFieldMap: Map<string, MergeFieldDefinition>;
}): { sanitizedLine: string; sanitizedCount: number } {
  let { line, existingKeys, mergeFields, valueToFieldMap } = params;
  let sanitizedCount = 0;

  // 1. Currency parsing (e.g. 34.000.000 VNĐ (Ba mươi bốn triệu đồng))
  const moneyRegex = /(?:\b\d{1,3}(?:[.,]\d{3})+(?:[.,]\d+)?\s*(?:VNĐ|VND|đồng|dong|đ|USD|EUR|[\$€£]))(?![a-zA-ZÀ-ỹ])(?:\s*\([\s\S]+?\))?/gi;
  line = line.replace(moneyRegex, (match) => {
    const value = normalizeWhitespace(match);
    const fieldMatch = createFieldMatch({ 
      label: 'Số tiền', 
      value, 
      dataType: 'currency', 
      existingKeys,
      valueToFieldMap,
    });
    if (!mergeFields.find(f => f.fieldKey === fieldMatch.field.fieldKey)) {
      mergeFields.push(fieldMatch.field);
    }
    sanitizedCount++;
    return fieldMatch.placeholder;
  });

  // 2. Date parsing (e.g. ngày 01 tháng 03 năm 2025, or 01/03/2025)
  const dateRegex = /(?:(?:ng[aà]y\s+)?(?:0?[1-9]|[12][0-9]|3[01])\s*[-/.]\s*(?:0?[1-9]|1[012])\s*[-/.]\s*(?:19|20)\d\d|(?:ng[aà]y)\s+(?:0?[1-9]|[12][0-9]|3[01])\s+(?:th[aá]ng)\s+(?:0?[1-9]|1[012])\s+(?:n[aă]m)\s+(?:19|20)\d\d)/gi;
  line = line.replace(dateRegex, (match) => {
    const value = normalizeWhitespace(match);
    const fieldMatch = createFieldMatch({ 
      label: 'Ngày tháng năm', 
      value, 
      dataType: 'date', 
      existingKeys,
      valueToFieldMap,
    });
    if (!mergeFields.find(f => f.fieldKey === fieldMatch.field.fieldKey)) {
      mergeFields.push(fieldMatch.field);
    }
    sanitizedCount++;
    return fieldMatch.placeholder;
  });

  // 3. Email parsing
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  line = line.replace(emailRegex, (match) => {
    const value = normalizeWhitespace(match);
    const fieldMatch = createFieldMatch({ 
      label: 'Email', 
      value, 
      dataType: 'string', 
      existingKeys,
      valueToFieldMap,
    });
    if (!mergeFields.find(f => f.fieldKey === fieldMatch.field.fieldKey)) {
      mergeFields.push(fieldMatch.field);
    }
    sanitizedCount++;
    return fieldMatch.placeholder;
  });

  // 4. Phone number parsing
  const phoneRegex = /(?:\+84|0)(?:\s*\d){9,10}\b/g;
  line = line.replace(phoneRegex, (match) => {
    const value = normalizeWhitespace(match);
    const fieldMatch = createFieldMatch({ 
      label: 'Số điện thoại', 
      value, 
      dataType: 'string', 
      existingKeys,
      valueToFieldMap,
    });
    if (!mergeFields.find(f => f.fieldKey === fieldMatch.field.fieldKey)) {
      mergeFields.push(fieldMatch.field);
    }
    sanitizedCount++;
    return fieldMatch.placeholder;
  });

  // 5. Tax ID / MST / ID numbers
  const idRegex = /(?<!\d)(?:\d{10}|\d{12})(?!\d)/g;
  line = line.replace(idRegex, (match) => {
    const value = normalizeWhitespace(match);
    const fieldMatch = createFieldMatch({ 
      label: 'Mã số / Định danh', 
      value, 
      dataType: 'string', 
      existingKeys,
      valueToFieldMap,
    });
    if (!mergeFields.find(f => f.fieldKey === fieldMatch.field.fieldKey)) {
      mergeFields.push(fieldMatch.field);
    }
    sanitizedCount++;
    return fieldMatch.placeholder;
  });

  return { sanitizedLine: line, sanitizedCount };
}

/**
 * Escapes a string for use in a regular expression.
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Maps AI categories to MergeFieldDataTypes.
 */
function mapAiCategoryToDataType(category: string): MergeFieldDataType {
  const cat = category.toUpperCase();
  if (cat === 'DATE') return 'date';
  if (cat === 'BANK') return 'number'; // account numbers
  if (cat === 'CONTACT') return 'string';
  if (cat === 'CURRENCY') return 'currency';
  return 'string';
}

/**
 * Maps AI categories to human-friendly labels.
 */
function mapAiCategoryToLabel(category: string): string {
  const labels: Record<string, string> = {
    COMPANY: 'Tên công ty',
    PERSON: 'Họ và tên',
    DATE: 'Ngày tháng',
    ADDRESS: 'Địa chỉ',
    ID: 'Mã số định danh',
    CONTACT: 'Thông tin liên hệ',
    BANK: 'Tài khoản ngân hàng',
    REPRESENTATIVE: 'Người đại diện',
    PARTY_ALIAS: 'Tên gọi tắt',
    CURRENCY: 'Số tiền',
  };
  return labels[category.toUpperCase()] || 'Nhập giá trị';
}

export const sanitizeContractTemplateFields = async ({
  text,
  aiSanitizer,
}: {
  text: string;
  aiSanitizer?: AiSanitizerService;
}): Promise<SanitizedContractTemplateText> => {
  const mergeFields: MergeFieldDefinition[] = [];
  const existingKeys = new Set<string>();
  const valueToFieldMap = new Map<string, MergeFieldDefinition>();
  let sanitizedFieldCount = 0;

  // 1. PHASE 1: Structural Label Sanitization (Regex based)
  const lines = text.split(/\r?\n/);
  const regexSanitizedLines = lines.map((line) => {
    const { sanitizedLine: postSegmentLine, sanitizedCount: count1 } = sanitizeSegments({
      line,
      existingKeys,
      mergeFields,
      valueToFieldMap,
    });
    const { sanitizedLine: postInlineLine, sanitizedCount: count2 } = sanitizeInlineValues({
      line: postSegmentLine,
      existingKeys,
      mergeFields,
      valueToFieldMap,
    });
    sanitizedFieldCount += (count1 + count2);
    return postInlineLine;
  });
  let sanitizedText = regexSanitizedLines.join('\n');

  // 2. PHASE 2: AI-Powered Entity Sanitization
  if (aiSanitizer) {
    try {
      // Use original text for identification to avoid confusion with already replaced placeholders
      const entities = await aiSanitizer.identifySensitiveEntities(text);
      
      // Sort keys by length descending to replace longest matches first (prevents partial replacement)
      const sortedKeys = Object.keys(entities).sort((a, b) => b.length - a.length);

      for (const entityText of sortedKeys) {
        if (!entityText || entityText.length < 2) continue;
        
        // Skip if this entity looks like it could be a placeholder prefix or was already replaced
        if (entityText.includes('{{') || entityText.includes('}}')) continue;

        const category = entities[entityText];
        const label = mapAiCategoryToLabel(category);
        const dataType = mapAiCategoryToDataType(category);

        // Before global replacement, check if it's already in the text
        const escapedEntity = escapeRegExp(entityText);
        const entityRegex = new RegExp(`(?<!\\{\\{)${escapedEntity}(?!\\}\\})`, 'g');

        if (entityRegex.test(sanitizedText)) {
          const fieldMatch = createFieldMatch({ 
            label, 
            value: entityText, 
            dataType, 
            existingKeys,
            valueToFieldMap,
          });
          
          if (!mergeFields.find(f => f.fieldKey === fieldMatch.field.fieldKey)) {
            mergeFields.push(fieldMatch.field);
          }
          
          sanitizedText = sanitizedText.replace(entityRegex, fieldMatch.placeholder);
          sanitizedFieldCount += 1;
        }
      }
    } catch (error) {
      console.error('AI Sanitization Phase failed:', error);
    }
  }

  // 3. PHASE 3: Greedy Explanation Cleanup
  // Specifically looks for placeholders followed by parenthetical explanations (common in currency)
  // that might have been missed due to line breaks or regex limitations.
  // Example: {{SO_TIEN}} (Ba mươi bốn triệu đồng) -> {{SO_TIEN}}
  const explanationRegex = /({{[A-Z0-9_]+}})\s*(\([\s\S]+?\))/g;
  sanitizedText = sanitizedText.replace(explanationRegex, (match, placeholder, explanation) => {
    // Only collapse if the explanation contains "triệu", "tỷ", "ngàn", "đồng" or looks like a numeric expansion
    const foldedExp = foldVi(explanation);
    const isFinancialExp = /(trieu|ty|ngan|dong|tram|vnd|usd|ba muoi|bon muoi|nam muoi|linh|le)/i.test(foldedExp);
    if (isFinancialExp || explanation.length < 100) {
      return placeholder;
    }
    return match;
  });

  // 4. FINAL CLEANUP
  const finalSanitizedText = sanitizedText
    .replace(/^\s*--\s*\d+\s+of\s+\d+\s*--\s*$/gmi, '')
    .replace(/^\s*-\s*\d+\s+-\s*$/gm, '')
    .replace(/^\s*Page\s+\d+\s+of\s+\d+\s*$/gmi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
    
  return {
    sanitizedText: finalSanitizedText,
    mergeFields,
    sanitizedFieldCount,
  };
};
