import { z } from "zod";

const optionalPositiveNumber = z.preprocess(
  (value) => (value === "" || value === undefined || value === null ? undefined : Number(value)),
  z.number().positive().optional()
);

const memberSchema = z.object({
  name: z.string().min(1, "Bắt buộc"),
  nationality: z.string().min(1, "Bắt buộc"),
  documentNumber: z.string().min(1, "Bắt buộc"),
  sharePercent: z.number().min(0).max(100),
});

const industrySchema = z.object({
  code: z.string().min(1, "Bắt buộc"),
  nameVi: z.string().min(1, "Bắt buộc"),
  nameEn: z.string().optional(),
  isPrimary: z.boolean().default(false),
});

export const generalInfoSchema = z
  .object({
    companyNameVi: z.string().min(1, "Tên tiếng Việt là bắt buộc"),
    companyNameEn: z.string().min(1, "Tên tiếng Anh là bắt buộc"),
    companyNameAbbr: z.string().optional(),
    address: z.string().min(1, "Địa chỉ là bắt buộc"),
    phone: z.string().optional(),
    email: z.string().email("Email không hợp lệ").optional().or(z.literal("")),

    capitalAmount: z.number().positive("Vốn phải là số dương"),
    capitalCurrency: z.enum(["VND", "USD"]),
    legalCapitalAmount: optionalPositiveNumber,

    members: z.array(memberSchema).min(1, "Cần ít nhất một thành viên"),

    legalRepName: z.string().min(1, "Bắt buộc"),
    legalRepNationality: z.string().min(1, "Bắt buộc"),
    legalRepDocNumber: z.string().min(1, "Bắt buộc"),
    legalRepAddress: z.string().optional(),
    legalRepTitle: z.string().min(1, "Bắt buộc"),

    industries: z.array(industrySchema).min(1, "Cần ít nhất một ngành nghề"),

    registrationDate: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, "Định dạng dd/mm/yyyy"),
    operationDuration: optionalPositiveNumber,
    registrationAuthority: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    const total = data.members.reduce((sum, m) => sum + m.sharePercent, 0);
    if (Math.abs(total - 100) > 0.001) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Tổng tỷ lệ vốn góp phải bằng 100%. Hiện tại: ${total.toFixed(2)}%`,
        path: ["members"],
      });
    }
  });

export type GeneralInfo = z.infer<typeof generalInfoSchema>;
