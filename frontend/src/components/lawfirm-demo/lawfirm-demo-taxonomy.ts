import type {
  ClientProfile,
  FieldGroup,
  InvestorType,
  Locale,
  ProfileField,
} from "./lawfirm-demo-types";

type TaxonomyEntry = {
  id: string;
  group: Exclude<FieldGroup, "other">;
  vi: string;
  en: string;
  aliases: string[];
};

export const taxonomy: TaxonomyEntry[] = [
  { id: "f_cn_hoten", group: "individual", vi: "Họ và tên", en: "Full name", aliases: ["[HỌ TÊN NHÀ ĐẦU TƯ]", "{{ho_ten_nha_dau_tu}}"] },
  { id: "f_cn_gioitinh", group: "individual", vi: "Giới tính", en: "Gender", aliases: ["[GIỚI TÍNH]", "{{gioi_tinh}}"] },
  { id: "f_cn_ngaysinh", group: "individual", vi: "Ngày sinh", en: "Date of birth", aliases: ["[NGÀY SINH]", "{{ngay_sinh}}"] },
  { id: "f_cn_quoctich", group: "individual", vi: "Quốc tịch", en: "Nationality", aliases: ["[QUỐC TỊCH]", "{{quoc_tich}}"] },
  { id: "f_cn_cccd", group: "individual", vi: "CCCD / Hộ chiếu", en: "ID / Passport number", aliases: ["[SỐ CCCD]", "[SỐ HỘ CHIẾU]", "{{cccd}}"] },
  { id: "f_cn_diachi", group: "individual", vi: "Địa chỉ liên hệ", en: "Contact address", aliases: ["[ĐỊA CHỈ LIÊN HỆ]", "{{dia_chi_lien_he}}"] },
  { id: "f_cn_dienthoai", group: "individual", vi: "Điện thoại", en: "Phone", aliases: ["[ĐIỆN THOẠI]", "{{dien_thoai}}"] },
  { id: "f_cn_email", group: "individual", vi: "Email", en: "Email", aliases: ["[EMAIL]", "{{email}}"] },
  { id: "f_to_ten", group: "organization", vi: "Tên doanh nghiệp / tổ chức", en: "Company / organization name", aliases: ["[TÊN DOANH NGHIỆP]", "{{ten_doanh_nghiep}}", "[Tên công ty]", "[TÊN TỔ CHỨC]"] },
  { id: "f_to_loaihinh", group: "organization", vi: "Loại hình tổ chức", en: "Legal entity type", aliases: ["[LOẠI HÌNH TỔ CHỨC]", "{{loai_hinh}}"] },
  { id: "f_to_mst", group: "organization", vi: "Mã số thuế", en: "Tax code", aliases: ["[MÃ SỐ THUẾ]", "{{mst}}", "[MST]", "[MÃ SỐ DOANH NGHIỆP]"] },
  { id: "f_to_ngaycap", group: "organization", vi: "Ngày cấp", en: "Issue date", aliases: ["[NGÀY CẤP]", "{{ngay_cap}}"] },
  { id: "f_to_noicap", group: "organization", vi: "Nơi cấp", en: "Issuing authority", aliases: ["[NƠI CẤP]", "[CƠ QUAN CẤP]", "{{noi_cap}}"] },
  { id: "f_to_diachi", group: "organization", vi: "Địa chỉ trụ sở", en: "Registered address", aliases: ["[ĐỊA CHỈ TRỤ SỞ]", "{{dia_chi}}", "[Địa chỉ]"] },
  { id: "f_to_dienthoai", group: "organization", vi: "Điện thoại", en: "Phone", aliases: ["[ĐIỆN THOẠI]", "{{dien_thoai}}"] },
  { id: "f_to_email", group: "organization", vi: "Email", en: "Email", aliases: ["[EMAIL]", "{{email}}"] },
  { id: "f_to_website", group: "organization", vi: "Website", en: "Website", aliases: ["[WEBSITE]", "{{website}}"] },
  { id: "f_to_vondl", group: "organization", vi: "Vốn điều lệ", en: "Charter capital", aliases: ["[VỐN ĐIỀU LỆ]", "{{von_dieu_le}}"] },
  { id: "f_dd_hoten", group: "representative", vi: "Họ tên người đại diện", en: "Representative name", aliases: ["[NGƯỜI ĐẠI DIỆN]", "{{nguoi_dai_dien}}", "[HỌ TÊN NGƯỜI ĐẠI DIỆN]"] },
  { id: "f_dd_gioitinh", group: "representative", vi: "Giới tính", en: "Gender", aliases: ["[GIỚI TÍNH ĐẠI DIỆN]"] },
  { id: "f_dd_ngaysinh", group: "representative", vi: "Ngày sinh", en: "Date of birth", aliases: ["[NGÀY SINH ĐẠI DIỆN]"] },
  { id: "f_dd_quoctich", group: "representative", vi: "Quốc tịch", en: "Nationality", aliases: ["[QUỐC TỊCH ĐẠI DIỆN]"] },
  { id: "f_dd_chucdanh", group: "representative", vi: "Chức danh", en: "Title", aliases: ["[CHỨC VỤ]", "{{chuc_vu}}", "[CHỨC DANH]"] },
  { id: "f_dd_madinhdanh", group: "representative", vi: "Mã định danh cá nhân", en: "Personal ID number", aliases: ["[MÃ ĐỊNH DANH]", "[SỐ CCCD]", "{{cccd}}"] },
  { id: "f_dd_diachi", group: "representative", vi: "Địa chỉ liên hệ", en: "Contact address", aliases: ["[ĐỊA CHỈ ĐẠI DIỆN]"] },
  { id: "f_dd_dienthoai", group: "representative", vi: "Điện thoại", en: "Phone", aliases: ["[ĐIỆN THOẠI ĐẠI DIỆN]"] },
  { id: "f_dd_email", group: "representative", vi: "Email", en: "Email", aliases: ["[EMAIL ĐẠI DIỆN]"] },
];

export function createDefaultFields(locale: Locale): ProfileField[] {
  return taxonomy.map((field) => ({
    id: field.id,
    group: field.group,
    label: locale === "vi" ? field.vi : field.en,
    value: "",
    aliases: field.aliases.join(", "),
  }));
}

export function createProfile(locale: Locale, name = ""): ClientProfile {
  return {
    id: `profile-${crypto.randomUUID()}`,
    name,
    investorType: "individual",
    fields: createDefaultFields(locale),
  };
}

export function fieldGroupFor(id: string): FieldGroup {
  return taxonomy.find((item) => item.id === id)?.group ?? "other";
}

export function guessMapping(placeholder: string): string {
  return taxonomy.find((item) => item.aliases.includes(placeholder))?.id ?? "";
}

export function visibleGroups(investorType: InvestorType): FieldGroup[] {
  return [
    investorType === "individual" ? "individual" : "organization",
    "representative",
    "other",
  ];
}

