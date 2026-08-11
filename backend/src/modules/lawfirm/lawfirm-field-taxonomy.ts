export type LawfirmFieldGroup =
  | 'individual'
  | 'organization'
  | 'representative'
  | 'other';

export interface LawfirmFieldDefinition {
  canonicalKey: string;
  currentProfileKey: string;
  group: LawfirmFieldGroup;
  labelVi: string;
  labelEn: string;
  aliases: readonly string[];
  legacyKeys?: readonly string[];
}

/**
 * Canonical backend taxonomy for the lawfirm profile/template pipeline.
 *
 * `canonicalKey` is the target semantic identity used by V2.
 * `currentProfileKey` keeps Phase 0 compatible with persisted `f_*` profile
 * fields until the ProfileEntity/ProfileValue migration is introduced.
 */
export const LAWFIRM_FIELD_DEFINITIONS: readonly LawfirmFieldDefinition[] = [
  {
    canonicalKey: 'person.full_name',
    currentProfileKey: 'f_cn_hoten',
    group: 'individual',
    labelVi: 'Họ và tên',
    labelEn: 'Full name',
    aliases: ['[HỌ TÊN NHÀ ĐẦU TƯ]', '{{ho_ten_nha_dau_tu}}'],
  },
  {
    canonicalKey: 'person.gender',
    currentProfileKey: 'f_cn_gioitinh',
    group: 'individual',
    labelVi: 'Giới tính',
    labelEn: 'Gender',
    aliases: ['[GIỚI TÍNH]', '{{gioi_tinh}}'],
  },
  {
    canonicalKey: 'person.date_of_birth',
    currentProfileKey: 'f_cn_ngaysinh',
    group: 'individual',
    labelVi: 'Ngày sinh',
    labelEn: 'Date of birth',
    aliases: ['[NGÀY SINH]', '{{ngay_sinh}}'],
  },
  {
    canonicalKey: 'person.nationality',
    currentProfileKey: 'f_cn_quoctich',
    group: 'individual',
    labelVi: 'Quốc tịch',
    labelEn: 'Nationality',
    aliases: ['[QUỐC TỊCH]', '{{quoc_tich}}'],
  },
  {
    canonicalKey: 'person.personal_id',
    currentProfileKey: 'f_cn_cccd',
    group: 'individual',
    labelVi: 'CCCD / Hộ chiếu',
    labelEn: 'ID / Passport number',
    aliases: ['[SỐ CCCD]', '[SỐ HỘ CHIẾU]', '{{cccd}}'],
  },
  {
    canonicalKey: 'person.contact_address',
    currentProfileKey: 'f_cn_diachi',
    group: 'individual',
    labelVi: 'Địa chỉ liên hệ',
    labelEn: 'Contact address',
    aliases: [
      '[ĐỊA CHỈ LIÊN HỆ]',
      '[ĐỊA CHỈ LIÊN LẠC THƯỜNG TRÚ]',
      '{{dia_chi_lien_he}}',
    ],
  },
  {
    canonicalKey: 'person.phone',
    currentProfileKey: 'f_cn_dienthoai',
    group: 'individual',
    labelVi: 'Điện thoại',
    labelEn: 'Phone',
    aliases: ['[ĐIỆN THOẠI]', '{{dien_thoai}}'],
  },
  {
    canonicalKey: 'person.email',
    currentProfileKey: 'f_cn_email',
    group: 'individual',
    labelVi: 'Email',
    labelEn: 'Email',
    aliases: ['[EMAIL]', '{{email}}'],
  },
  {
    canonicalKey: 'organization.legal_name',
    currentProfileKey: 'f_to_ten',
    group: 'organization',
    labelVi: 'Tên doanh nghiệp / tổ chức',
    labelEn: 'Company / organization name',
    aliases: [
      '[TÊN DOANH NGHIỆP]',
      '{{ten_doanh_nghiep}}',
      '[TÊN CÔNG TY]',
      '[TÊN TỔ CHỨC]',
      '[TÊN ĐƠN VỊ]',
      '<<TÊN DOANH NGHIỆP>>',
      '[CÔNG TY]',
    ],
    legacyKeys: ['company_name'],
  },
  {
    canonicalKey: 'organization.legal_entity_type',
    currentProfileKey: 'f_to_loaihinh',
    group: 'organization',
    labelVi: 'Loại hình tổ chức',
    labelEn: 'Legal entity type',
    aliases: ['[LOẠI HÌNH TỔ CHỨC]', '{{loai_hinh}}'],
  },
  {
    canonicalKey: 'organization.tax_id',
    currentProfileKey: 'f_to_mst',
    group: 'organization',
    labelVi: 'Mã số thuế',
    labelEn: 'Tax code',
    aliases: [
      '[MÃ SỐ THUẾ]',
      '{{mst}}',
      '[MST]',
      '[MÃ SỐ DOANH NGHIỆP]',
      '<<MÃ SỐ THUẾ>>',
    ],
    legacyKeys: ['tax_id'],
  },
  {
    canonicalKey: 'organization.registration_issue_date',
    currentProfileKey: 'f_to_ngaycap',
    group: 'organization',
    labelVi: 'Ngày cấp',
    labelEn: 'Issue date',
    aliases: ['[NGÀY CẤP]', '{{ngay_cap}}'],
  },
  {
    canonicalKey: 'organization.registration_authority',
    currentProfileKey: 'f_to_noicap',
    group: 'organization',
    labelVi: 'Nơi cấp',
    labelEn: 'Issuing authority',
    aliases: ['[NƠI CẤP]', '[CƠ QUAN CẤP]', '{{noi_cap}}'],
  },
  {
    canonicalKey: 'organization.registered_address',
    currentProfileKey: 'f_to_diachi',
    group: 'organization',
    labelVi: 'Địa chỉ trụ sở',
    labelEn: 'Registered address',
    aliases: [
      '[ĐỊA CHỈ TRỤ SỞ]',
      '[ĐỊA CHỈ TRỤ SỞ CHÍNH]',
      '[ĐỊA CHỈ TRỤ SỞ CHÍNH CỦA CÔNG TY]',
      '[ĐỊA CHỈ CÔNG TY]',
      '{{dia_chi}}',
      '[ĐỊA CHỈ]',
      '<<ĐỊA CHỈ>>',
    ],
    legacyKeys: ['address'],
  },
  {
    canonicalKey: 'organization.phone',
    currentProfileKey: 'f_to_dienthoai',
    group: 'organization',
    labelVi: 'Điện thoại',
    labelEn: 'Phone',
    aliases: ['[ĐIỆN THOẠI]', '{{dien_thoai}}'],
  },
  {
    canonicalKey: 'organization.email',
    currentProfileKey: 'f_to_email',
    group: 'organization',
    labelVi: 'Email',
    labelEn: 'Email',
    aliases: ['[EMAIL]', '{{email}}'],
  },
  {
    canonicalKey: 'organization.website',
    currentProfileKey: 'f_to_website',
    group: 'organization',
    labelVi: 'Website',
    labelEn: 'Website',
    aliases: ['[WEBSITE]', '{{website}}'],
  },
  {
    canonicalKey: 'organization.charter_capital',
    currentProfileKey: 'f_to_vondl',
    group: 'organization',
    labelVi: 'Vốn điều lệ',
    labelEn: 'Charter capital',
    aliases: ['[VỐN ĐIỀU LỆ]', '{{von_dieu_le}}'],
  },
  {
    canonicalKey: 'representative.full_name',
    currentProfileKey: 'f_dd_hoten',
    group: 'representative',
    labelVi: 'Họ tên người đại diện',
    labelEn: 'Representative name',
    aliases: [
      '[NGƯỜI ĐẠI DIỆN]',
      '{{nguoi_dai_dien}}',
      '[HỌ TÊN NGƯỜI ĐẠI DIỆN]',
      '[ĐẠI DIỆN PHÁP LUẬT]',
      '<<NGƯỜI ĐẠI DIỆN>>',
    ],
    legacyKeys: ['representative'],
  },
  {
    canonicalKey: 'representative.gender',
    currentProfileKey: 'f_dd_gioitinh',
    group: 'representative',
    labelVi: 'Giới tính',
    labelEn: 'Gender',
    aliases: ['[GIỚI TÍNH ĐẠI DIỆN]'],
  },
  {
    canonicalKey: 'representative.date_of_birth',
    currentProfileKey: 'f_dd_ngaysinh',
    group: 'representative',
    labelVi: 'Ngày sinh',
    labelEn: 'Date of birth',
    aliases: ['[NGÀY SINH ĐẠI DIỆN]'],
  },
  {
    canonicalKey: 'representative.nationality',
    currentProfileKey: 'f_dd_quoctich',
    group: 'representative',
    labelVi: 'Quốc tịch',
    labelEn: 'Nationality',
    aliases: ['[QUỐC TỊCH ĐẠI DIỆN]'],
  },
  {
    canonicalKey: 'representative.title',
    currentProfileKey: 'f_dd_chucdanh',
    group: 'representative',
    labelVi: 'Chức danh',
    labelEn: 'Title',
    aliases: [
      '[CHỨC VỤ]',
      '{{chuc_vu}}',
      '[CHỨC DANH]',
      '[CHỨC VỤ ĐẠI DIỆN]',
      '<<CHỨC VỤ>>',
    ],
    legacyKeys: ['position'],
  },
  {
    canonicalKey: 'representative.personal_id',
    currentProfileKey: 'f_dd_madinhdanh',
    group: 'representative',
    labelVi: 'Mã định danh cá nhân',
    labelEn: 'Personal ID number',
    aliases: ['[MÃ ĐỊNH DANH]', '[SỐ CCCD]', '{{cccd}}'],
  },
  {
    canonicalKey: 'representative.contact_address',
    currentProfileKey: 'f_dd_diachi',
    group: 'representative',
    labelVi: 'Địa chỉ liên hệ',
    labelEn: 'Contact address',
    aliases: ['[ĐỊA CHỈ ĐẠI DIỆN]'],
  },
  {
    canonicalKey: 'representative.phone',
    currentProfileKey: 'f_dd_dienthoai',
    group: 'representative',
    labelVi: 'Điện thoại',
    labelEn: 'Phone',
    aliases: ['[ĐIỆN THOẠI ĐẠI DIỆN]'],
  },
  {
    canonicalKey: 'representative.email',
    currentProfileKey: 'f_dd_email',
    group: 'representative',
    labelVi: 'Email',
    labelEn: 'Email',
    aliases: ['[EMAIL ĐẠI DIỆN]'],
  },
];

const removeKnownWrapper = (value: string): string => {
  const wrappers: ReadonlyArray<readonly [string, string]> = [
    ['{{', '}}'],
    ['<<', '>>'],
    ['[', ']'],
    ['${', '}'],
    ['$(', ')'],
    ['{', '}'],
    ['<', '>'],
  ];
  for (const [opening, closing] of wrappers) {
    if (value.startsWith(opening) && value.endsWith(closing)) {
      return value.slice(opening.length, -closing.length);
    }
  }
  return value;
};

export const normalizeLawfirmFieldAlias = (value: string): string =>
  removeKnownWrapper(value.normalize('NFKC').trim())
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleUpperCase('vi-VN');

const aliasIndex = new Map<string, LawfirmFieldDefinition[]>();
const keyIndex = new Map<string, LawfirmFieldDefinition>();

for (const definition of LAWFIRM_FIELD_DEFINITIONS) {
  const keys = [
    definition.canonicalKey,
    definition.currentProfileKey,
    ...(definition.legacyKeys ?? []),
  ];
  for (const key of keys) {
    keyIndex.set(key.trim().toLocaleLowerCase('en-US'), definition);
  }
  for (const alias of definition.aliases) {
    const normalized = normalizeLawfirmFieldAlias(alias);
    const definitions = aliasIndex.get(normalized) ?? [];
    if (!definitions.includes(definition)) definitions.push(definition);
    aliasIndex.set(normalized, definitions);
  }
}

export const findLawfirmFieldDefinitionByKey = (
  key: string,
): LawfirmFieldDefinition | undefined =>
  keyIndex.get(key.trim().toLocaleLowerCase('en-US'));

export const findLawfirmFieldCandidatesByAlias = (
  alias: string,
): readonly LawfirmFieldDefinition[] =>
  aliasIndex.get(normalizeLawfirmFieldAlias(alias)) ?? [];

export const resolveCurrentProfileFieldKey = (alias: string): string => {
  const candidates = findLawfirmFieldCandidatesByAlias(alias);
  return candidates.length === 1 ? candidates[0].currentProfileKey : '';
};

export const toCanonicalLawfirmFieldKey = (key: string): string | undefined =>
  findLawfirmFieldDefinitionByKey(key)?.canonicalKey;

export const toCurrentLawfirmProfileFieldKey = (
  key: string,
): string | undefined =>
  findLawfirmFieldDefinitionByKey(key)?.currentProfileKey;

export const normalizePersistedLawfirmFieldKey = (key: string): string =>
  toCurrentLawfirmProfileFieldKey(key) ?? key.trim();

const CUSTOM_PROFILE_FIELD_KEY = /^custom-[a-z0-9][a-z0-9_-]{0,78}$/i;

/**
 * Normalizes a template mapping before persistence.
 *
 * Known semantic, legacy and current keys are collapsed to the current
 * profile key. User-created profile fields keep their durable `custom-*`
 * identity. Every other key is rejected instead of silently becoming an
 * automatic mapping that can fill the wrong profile value.
 */
export const normalizeTemplateMappedKey = (
  key: string | null | undefined,
): string | undefined => {
  const trimmed = key?.trim() ?? '';
  if (!trimmed) return '';
  const knownKey = toCurrentLawfirmProfileFieldKey(trimmed);
  if (knownKey) return knownKey;
  return CUSTOM_PROFILE_FIELD_KEY.test(trimmed) ? trimmed : undefined;
};
