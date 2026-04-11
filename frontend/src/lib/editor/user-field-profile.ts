/**
 * Groups user custom-field keys for profile UI (wizard modal + /fields page).
 * API remains a flat list; grouping is frontend-only.
 */
export type UserFieldGroupId = 'basic' | 'representative' | 'contract_profile'

export const USER_FIELD_GROUP_LABELS: Record<UserFieldGroupId, string> = {
  basic: 'Thông tin cơ bản',
  representative: 'Thông tin người đại diện',
  contract_profile: 'Thông tin theo loại hợp đồng',
}

/** Canonical keys per group (for ordering and empty-state hints). */
export const CANONICAL_KEYS_BY_GROUP: Record<UserFieldGroupId, readonly string[]> = {
  basic: ['company_name', 'address', 'tax_id'],
  representative: ['representative', 'representative_cccd', 'representative_phone', 'position'],
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
}

const GROUP_BY_KEY: Record<string, UserFieldGroupId> = (() => {
  const m: Record<string, UserFieldGroupId> = {}
  for (const k of CANONICAL_KEYS_BY_GROUP.basic) m[k] = 'basic'
  for (const k of CANONICAL_KEYS_BY_GROUP.representative) m[k] = 'representative'
  for (const k of CANONICAL_KEYS_BY_GROUP.contract_profile) m[k] = 'contract_profile'
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
  address: 'Địa chỉ',
  tax_id: 'Mã số thuế',
  representative: 'Người đại diện',
  representative_cccd: 'CCCD người đại diện',
  representative_phone: 'SĐT người đại diện',
  position: 'Chức vụ',
  phone: 'Điện thoại',
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
}
