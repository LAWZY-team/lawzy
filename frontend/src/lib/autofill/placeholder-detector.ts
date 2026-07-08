import JSZip from 'jszip'
import { DEFAULT_LABEL_BY_KEY, CANONICAL_KEYS_BY_GROUP } from '@/lib/editor/user-field-profile'

/**
 * Extracts raw plain text from all XML components of a .docx file (document, headers, footers).
 */
export async function extractDocxPlainText(buffer: ArrayBuffer): Promise<string> {
  try {
    const zip = await JSZip.loadAsync(buffer)
    const xmlFileNames = Object.keys(zip.files).filter(
      (name) =>
        name === 'word/document.xml' ||
        name.startsWith('word/header') ||
        name.startsWith('word/footer')
    )

    let totalText = ''
    for (const name of xmlFileNames) {
      const file = zip.file(name)
      if (!file) continue
      const xmlString = await file.async('text')
      // Extract text inside <w:t ...>text</w:t> tags
      const textMatches = xmlString.match(/<w:t[^>]*>([^<]*)<\/w:t>/g)
      if (textMatches) {
        const cleaned = textMatches
          .map((tag) => tag.replace(/<[^>]+>/g, ''))
          .join(' ')
        totalText += ' ' + cleaned
      }
    }
    return totalText.trim()
  } catch (err) {
    console.error('Error extracting text from docx:', err)
    return ''
  }
}

/**
 * Detects all placeholders matching [...] or {{...}} or <<...>> in plain text.
 */
export function extractPlaceholders(text: string): string[] {
  if (!text) return []
  const matches: string[] = []

  // Match square brackets: e.g., [TÊN DOANH NGHIỆP], [MÃ SỐ THUẾ]
  const bracketMatches = text.match(/\[[^\]]{2,80}\]/g)
  if (bracketMatches) matches.push(...bracketMatches)

  // Match double curly braces: e.g., {{ten_doanh_nghiep}}, {{mst}}
  const curlyMatches = text.match(/\{\{[^}]{2,80}\}\}/g)
  if (curlyMatches) matches.push(...curlyMatches)

  // Match double angle brackets: e.g., <<Tên công ty>>
  const angleMatches = text.match(/<<[^>]{2,80}>>/g)
  if (angleMatches) matches.push(...angleMatches)

  // Clean, trim and unique
  const unique = Array.from(new Set(matches.map((m) => m.trim()).filter((m) => m.length > 2)))
  return unique.sort()
}

/** Known common alias mappings to canonical keys */
const COMMON_ALIASES: Record<string, string[]> = {
  // Doanh nghiệp / Tổ chức
  company_name: ['[TÊN DOANH NGHIỆP]', '{{ten_doanh_nghiep}}', '[Tên công ty]', '[TÊN TỔ CHỨC]', '<<Tên doanh nghiệp>>', '[CÔNG TY]'],
  f_to_ten: ['[TÊN DOANH NGHIỆP]', '{{ten_doanh_nghiep}}', '[Tên công ty]', '[TÊN TỔ CHỨC]', '[TÊN ĐƠN VỊ]'],
  tax_id: ['[MÃ SỐ THUẾ]', '{{mst}}', '[MST]', '[MÃ SỐ DOANH NGHIỆP]', '<<Mã số thuế>>'],
  f_to_mst: ['[MÃ SỐ THUẾ]', '{{mst}}', '[MST]', '[MÃ SỐ DOANH NGHIỆP]'],
  address: ['[ĐỊA CHỈ TRỤ SỞ]', '{{dia_chi}}', '[Địa chỉ]', '[ĐỊA CHỈ]', '<<Địa chỉ>>'],
  f_to_diachi: ['[ĐỊA CHỈ TRỤ SỞ]', '{{dia_chi}}', '[Địa chỉ]', '[ĐỊA CHỈ CÔNG TY]'],
  f_to_loaihinh: ['[LOẠI HÌNH TỔ CHỨC]', '{{loai_hinh}}', '[LOẠI HÌNH DOANH NGHIỆP]'],
  f_to_ngaycap: ['[NGÀY CẤP]', '{{ngay_cap}}', '[NGÀY CẤP ĐKKD]'],
  f_to_noicap: ['[NƠI CẤP]', '[CƠ QUAN CẤP]', '{{noi_cap}}', '[SỞ KẾ HOẠCH VÀ ĐẦU TƯ]'],
  f_to_vondl: ['[VỐN ĐIỀU LỆ]', '{{von_dieu_le}}', '[Vốn điều lệ]'],
  website: ['[WEBSITE]', '{{website}}'],
  phone: ['[ĐIỆN THOẠI CÔNG TY]', '[SĐT CÔNG TY]', '{{dien_thoai_cong_ty}}'],
  
  // Người đại diện
  representative: ['[NGƯỜI ĐẠI DIỆN]', '{{nguoi_dai_dien}}', '[HỌ TÊN NGƯỜI ĐẠI DIỆN]', '<<Người đại diện>>', '[ĐẠI DIỆN PHÁP LUẬT]'],
  representative_cccd: ['[CCCD NGƯỜI ĐẠI DIỆN]', '[SỐ CCCD ĐẠI DIỆN]', '{{cccd_nguoi_dai_dien}}', '[MÃ ĐỊNH DANH ĐẠI DIỆN]'],
  representative_phone: ['[SĐT NGƯỜI ĐẠI DIỆN]', '[ĐIỆN THOẠI ĐẠI DIỆN]', '{{sdt_nguoi_dai_dien}}'],
  position: ['[CHỨC VỤ]', '{{chuc_vu}}', '[CHỨC DANH]', '[CHỨC VỤ ĐẠI DIỆN]', '<<Chức vụ>>'],

  // Cá nhân
  f_cn_hoten: ['[HỌ TÊN NHÀ ĐẦU TƯ]', '{{ho_ten_nha_dau_tu}}', '[HỌ VÀ TÊN]', '[TÊN CÁ NHÂN]'],
  f_cn_gioitinh: ['[GIỚI TÍNH]', '{{gioi_tinh}}'],
  f_cn_ngaysinh: ['[NGÀY SINH]', '{{ngay_sinh}}', '[NGÀY THÁNG NĂM SINH]'],
  f_cn_quoctich: ['[QUỐC TỊCH]', '{{quoc_tich}}'],
  f_cn_cccd: ['[SỐ CCCD]', '[SỐ HỘ CHIẾU]', '{{cccd}}', '[MÃ ĐỊNH DANH CÁ NHÂN]', '[CCCD/CMND]'],
  f_cn_diachi: ['[ĐỊA CHỈ LIÊN HỆ]', '{{dia_chi_lien_he}}', '[ĐỊA CHỈ THƯỜNG TRÚ]'],
  f_cn_dienthoai: ['[ĐIỆN THOẠI]', '{{dien_thoai}}', '[SỐ ĐIỆN THOẠI]'],
  f_cn_email: ['[EMAIL]', '{{email}}', '[ĐỊA CHỈ EMAIL]'],

  // Hợp đồng / Lao động
  contract_number: ['[SỐ HỢP ĐỒNG]', '{{so_hop_dong}}'],
  signing_date: ['[NGÀY KÝ]', '{{ngay_ky}}', '[NGÀY KÝ HỢP ĐỒNG]'],
  signing_location: ['[ĐỊA ĐIỂM KÝ]', '{{dia_diem_ky}}'],
  employee_name: ['[TÊN NGƯỜI LAO ĐỘNG]', '{{ten_nld}}', '[HỌ TÊN NLĐ]'],
  employee_cccd: ['[CCCD NLĐ]', '{{cccd_nld}}'],
  work_location: ['[ĐỊA ĐIỂM LÀM VIỆC]', '{{dia_diem_lam_viec}}'],
  job_description: ['[MÔ TẢ CÔNG VIỆC]', '{{mo_ta_cong_viec}}'],
  department: ['[PHÒNG BAN]', '{{phong_ban}}'],
}

/**
 * Guesses the canonical key (e.g. 'company_name' or 'tax_id') given a discovered placeholder string.
 */
export function guessCanonicalMapping(placeholder: string): string {
  const norm = placeholder.trim().toUpperCase()

  // 1. Exact match in COMMON_ALIASES
  for (const [key, aliases] of Object.entries(COMMON_ALIASES)) {
    if (aliases.some((a) => a.toUpperCase() === norm)) {
      return key
    }
  }

  // 2. Fuzzy label matching
  for (const [key, label] of Object.entries(DEFAULT_LABEL_BY_KEY)) {
    const labelNorm = label.toUpperCase()
    // e.g., placeholder [TÊN DOANH NGHIỆP] contains DOANH NGHIỆP
    const innerText = norm.replace(/^[\[\{\<]+|[\]\}\>]+$/g, '').trim()
    if (labelNorm.includes(innerText) || innerText.includes(labelNorm)) {
      return key
    }
  }

  return ''
}
