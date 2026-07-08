/**
 * Groups user custom-field keys for profile UI (wizard modal + /fields page + /autofill).
 * API remains a flat list; grouping is frontend-only.
 */
export type UserFieldGroupId =
  | 'basic'
  | 'representative'
  | 'contract_profile'
  | 'investor_organization'
  | 'investor_individual'

export const USER_FIELD_GROUP_LABELS: Record<UserFieldGroupId, string> = {
  basic: 'Thông tin cơ bản (Doanh nghiệp/Tổ chức)',
  representative: 'Thông tin người đại diện theo pháp luật',
  contract_profile: 'Thông tin theo hợp đồng / lao động',
  investor_organization: 'Thông tin tổ chức / ĐKKD hành chính',
  investor_individual: 'Thông tin cá nhân / Nhà đầu tư cá nhân',
}

/** Canonical keys per group (for ordering and empty-state hints). */
export const CANONICAL_KEYS_BY_GROUP: Record<UserFieldGroupId, readonly string[]> = {
  basic: ['company_name', 'address', 'tax_id', 'website', 'charter_capital'],
  representative: [
    'representative',
    'representative_cccd',
    'representative_phone',
    'position',
    'representative_gender',
    'representative_dob',
    'representative_nationality',
    'representative_address',
    'representative_email',
  ],
  contract_profile: [
    'phone',
    'employee_name',
    'employee_cccd',
    'employee_address',
    'counterparty_company_name',
    'counterparty_address',
    'counterparty_tax_id',
    'counterparty_representative',
    'work_location',
    'job_description',
    'department',
    'contract_number',
    'signing_date',
    'signing_location',
  ],
  investor_organization: [
    'f_to_ten',
    'f_to_loaihinh',
    'f_to_mst',
    'f_to_ngaycap',
    'f_to_noicap',
    'f_to_diachi',
    'f_to_dienthoai',
    'f_to_email',
    'f_to_website',
    'f_to_vondl',
  ],
  investor_individual: [
    'f_cn_hoten',
    'f_cn_gioitinh',
    'f_cn_ngaysinh',
    'f_cn_quoctich',
    'f_cn_cccd',
    'f_cn_diachi',
    'f_cn_dienthoai',
    'f_cn_email',
  ],
}

const GROUP_BY_KEY: Record<string, UserFieldGroupId> = (() => {
  const m: Record<string, UserFieldGroupId> = {}
  for (const k of CANONICAL_KEYS_BY_GROUP.basic) m[k] = 'basic'
  for (const k of CANONICAL_KEYS_BY_GROUP.representative) m[k] = 'representative'
  for (const k of CANONICAL_KEYS_BY_GROUP.contract_profile) m[k] = 'contract_profile'
  for (const k of CANONICAL_KEYS_BY_GROUP.investor_organization) m[k] = 'investor_organization'
  for (const k of CANONICAL_KEYS_BY_GROUP.investor_individual) m[k] = 'investor_individual'
  return m
})()

export const getGroupForUserFieldKey = (key: string): UserFieldGroupId =>
  GROUP_BY_KEY[key] ?? 'contract_profile'

/** Settings page: unknown custom keys go to "other" instead of lumping into contract_profile. */
export type UserFieldSettingsGroupId = UserFieldGroupId | 'other'

export const USER_FIELD_OTHER_GROUP_LABEL = 'Trường tùy chỉnh khác'

export const getUserFieldGroupForSettings = (key: string): UserFieldSettingsGroupId =>
  (GROUP_BY_KEY[key] as UserFieldSettingsGroupId | undefined) ?? 'other'

export const DEFAULT_LABEL_BY_KEY: Record<string, string> = {
  company_name: 'Tên doanh nghiệp',
  address: 'Địa chỉ trụ sở',
  tax_id: 'Mã số thuế / MSDN',
  website: 'Website doanh nghiệp',
  charter_capital: 'Vốn điều lệ',
  representative: 'Người đại diện theo pháp luật',
  representative_cccd: 'CCCD/Hộ chiếu người đại diện',
  representative_phone: 'SĐT người đại diện',
  position: 'Chức danh / Chức vụ đại diện',
  representative_gender: 'Giới tính người đại diện',
  representative_dob: 'Ngày sinh người đại diện',
  representative_nationality: 'Quốc tịch người đại diện',
  representative_address: 'Địa chỉ thường trú đại diện',
  representative_email: 'Email người đại diện',
  phone: 'Điện thoại cơ quan',
  contract_number: 'Số hợp đồng',
  signing_date: 'Ngày ký',
  signing_location: 'Địa điểm ký',
  employee_name: 'Tên người lao động (cá nhân)',
  employee_cccd: 'CCCD người lao động',
  employee_address: 'Địa chỉ thường trú (NLĐ)',
  counterparty_company_name: 'Tên đối tác / công ty đối tác',
  counterparty_address: 'Địa chỉ đối tác',
  counterparty_tax_id: 'MST đối tác',
  counterparty_representative: 'Người đại diện đối tác',
  work_location: 'Địa điểm làm việc (mặc định)',
  job_description: 'Mô tả công việc (mẫu)',
  department: 'Phòng ban (mặc định)',
  // Taxonomy Hành chính (Tổ chức)
  f_to_ten: 'Tên tổ chức / Doanh nghiệp',
  f_to_loaihinh: 'Loại hình tổ chức (TNHH, CP...)',
  f_to_mst: 'Mã số thuế / MSDN tổ chức',
  f_to_ngaycap: 'Ngày cấp Giấy ĐKKD',
  f_to_noicap: 'Nơi cấp / Cơ quan cấp ĐKKD',
  f_to_diachi: 'Địa chỉ trụ sở tổ chức',
  f_to_dienthoai: 'Điện thoại liên hệ tổ chức',
  f_to_email: 'Email tổ chức',
  f_to_website: 'Website tổ chức',
  f_to_vondl: 'Vốn điều lệ tổ chức',
  // Taxonomy Hành chính (Cá nhân)
  f_cn_hoten: 'Họ và tên cá nhân / Nhà đầu tư',
  f_cn_gioitinh: 'Giới tính cá nhân',
  f_cn_ngaysinh: 'Ngày sinh cá nhân',
  f_cn_quoctich: 'Quốc tịch cá nhân',
  f_cn_cccd: 'Số CCCD / Hộ chiếu cá nhân',
  f_cn_diachi: 'Địa chỉ liên hệ cá nhân',
  f_cn_dienthoai: 'Điện thoại cá nhân',
  f_cn_email: 'Email cá nhân',
}

