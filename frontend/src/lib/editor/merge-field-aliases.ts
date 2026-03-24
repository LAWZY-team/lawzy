const TERM_TO_CONCEPT: Record<string, string> = {
  ten: 'name',
  ho_ten: 'name',
  cong_ty: 'company',
  doanh_nghiep: 'company',
  dia_chi: 'address',
  ma_so_thue: 'tax',
  mst: 'tax',
  dien_thoai: 'phone',
  sdt: 'phone',
  so_dien_thoai: 'phone',
  dai_dien: 'representative',
  nguoi_dai_dien: 'representative',
  chuc_vu: 'position',
  so_hop_dong: 'contract',
  so_hd: 'contract',
  ngay_ky: 'date',
  ngay_ky_ket: 'date',
  ngay_ky_hop_dong: 'date',
  dia_diem: 'location',
  dia_diem_ky: 'location',
  dia_diem_ky_ket: 'location',
  ben_a: 'party_a',
  ben_b: 'party_b',
  nguoi_lao_dong: 'employee',
  nld: 'employee',
  gia_tri: 'value',
  muc_luong: 'salary',
  luong: 'salary',
  ngay_bat_dau: 'start',
  ngay_ket_thuc: 'end',
  noi_cap: 'place',
  so_cccd: 'id',
  so_cmnd: 'id',
  cccd: 'id',
  cmnd: 'id',

  don_gia: 'price',
  don_vi_gia: 'price_unit',
  dien_tich: 'area',
  tien_coc: 'deposit',
  chu_nha: 'landlord',
  chu_nha_tro: 'landlord',
  nguoi_thue: 'tenant',
  ben_cho_thue: 'lessor',
  ben_thue: 'lessee',
  thoi_han_thue: 'lease_term',
  ngay_bat_dau_thue: 'lease_start',
  ngay_ket_thuc_thue: 'lease_end',
  tien_thue_nha: 'rent',
  gia_thue: 'rent',
  so_tien_thue: 'rent_amount',

  ma_so_hd: 'invoice_number',
  ma_hoa_don: 'invoice_number',
  so_hoa_don: 'invoice_number',
  thue_suat: 'tax_rate',
  tong_tien: 'total',
  tong_cong: 'total',
  tien_thue: 'tax_amount',
  tien_chua_thue: 'subtotal',
  tien_sau_thue: 'amount_after_tax',
  nguoi_mua: 'buyer',
  nguoi_ban: 'seller',
  ten_hang: 'item_name',
  don_vi_tinh: 'unit',
  so_luong: 'quantity',
  thanh_tien: 'amount',
  ngay_lap_hd: 'invoice_date',
  han_thanh_toan: 'due_date',

  nguoi_uy_quyen: 'principal',
  nguoi_duoc_uy_quyen: 'attorney',
  pham_vi_uy_quyen: 'scope',
  noi_dung_uy_quyen: 'scope',
  thoi_han_uy_quyen: 'validity_period',
  ngay_uy_quyen: 'effective_date',
  hieu_luc: 'effective',

  ngay_lap: 'record_date',
  ngay_ghi: 'record_date',
  nguoi_lap: 'recorder',
  noi_dung: 'content',
  noi_dung_bb: 'content',
  dia_diem_hop: 'venue',
  ngay_hop: 'meeting_date',
  gio_hop: 'meeting_time',
  nguoi_tham_du: 'attendee',
  thanh_phan: 'attendee',
  ket_luan: 'conclusion',
  quyet_dinh: 'decision',

  ly_do: 'reason',
  yeu_cau: 'request',
  ngay_nop: 'submit_date',
  noi_nop: 'submit_place',
  muc_dich: 'purpose',
}

function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .replace(/[^a-z0-9\u00C0-\u024F]/gu, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

/** Remove Vietnamese diacritics for matching */
function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/** Extract canonical "concept tokens" from a key for comparison */
function keyToConcepts(key: string): string[] {
  const raw = normalizeKey(removeAccents(key))
  const parts = raw.split('_').filter((p) => p.length > 1)
  const concepts = parts.map((p) => TERM_TO_CONCEPT[p] || p)
  return [...new Set(concepts)].sort()
}

/** Canonical form: sorted concepts joined. Enables TEN_CONG_TY ↔ company_name match. */
function toCanonicalForm(key: string): string {
  return keyToConcepts(key).join('_')
}

/**
 * Find the best matching key from mergeFieldValues for a contract key.
 * Returns user key if semantic match found, else empty string.
 */
function findBestMatchingKey(
  contractKey: string,
  userKeys: string[]
): string {
  const canonicalContract = toCanonicalForm(contractKey)
  if (!canonicalContract) return ''

  let bestMatch = ''
  let bestScore = 0

  for (const userKey of userKeys) {
    const canonicalUser = toCanonicalForm(userKey)
    if (!canonicalUser) continue

    if (canonicalContract === canonicalUser) return userKey

    const contractConcepts = new Set(keyToConcepts(contractKey))
    const userConcepts = new Set(keyToConcepts(userKey))
    const intersection = [...contractConcepts].filter((c) => userConcepts.has(c))
    const unionSize = new Set([...contractConcepts, ...userConcepts]).size
    const score = unionSize > 0 ? intersection.length / unionSize : 0

    if (score > bestScore && score >= 0.5) {
      bestScore = score
      bestMatch = userKey
    }
  }

  return bestMatch
}

/**
 * Resolve merge field value: exact key first, then smart semantic match.
 */
export function resolveMergeFieldValue(
  key: string,
  mergeFieldValues: Record<string, string>
): string {
  const exact = mergeFieldValues[key]
  if (exact !== undefined && exact !== '') return exact

  const userKeys = Object.keys(mergeFieldValues)
  const matched = findBestMatchingKey(key, userKeys)
  if (matched) return mergeFieldValues[matched] ?? ''

  return ''
}
