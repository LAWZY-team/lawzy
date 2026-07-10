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
    'contract_number',
    'signing_date',
    'signing_location',
  ],
  investor_organization: [],
  investor_individual: [],
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
}

