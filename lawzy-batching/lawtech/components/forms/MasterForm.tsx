"use client";

import { useEffect, useMemo } from "react";
import { useFieldArray, useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { generalInfoSchema, type GeneralInfo } from "@/lib/schemas";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  defaultValues?: Partial<GeneralInfo>;
  onSubmit: (data: GeneralInfo) => void;
  isSaving?: boolean;
}

const AUTO_SAVE_INTERVAL_MS = 30_000;

export function MasterForm({ defaultValues, onSubmit, isSaving }: Props) {
  const initialValues = useMemo<Partial<GeneralInfo>>(() => {
    // Lọc bỏ các giá trị null/undefined từ Supabase để không ghi đè chuỗi rỗng ("") của base defaults.
    const safeDefaults: Record<string, any> = {};
    if (defaultValues) {
      for (const [key, val] of Object.entries(defaultValues)) {
        if (val !== null && val !== undefined) {
          safeDefaults[key] = val;
        }
      }
    }

    return {
      companyNameVi: "",
      companyNameEn: "",
      companyNameAbbr: "",
      address: "",
      phone: "",
      email: "",
      capitalAmount: 0,
      capitalCurrency: "VND",
      legalRepName: "",
      legalRepNationality: "",
      legalRepDocNumber: "",
      legalRepAddress: "",
      legalRepTitle: "",
      members: [{ name: "", nationality: "", documentNumber: "", sharePercent: 100 }],
      industries: [{ code: "", nameVi: "", nameEn: "", isPrimary: true }],
      registrationDate: "",
      registrationAuthority: "",
      ...safeDefaults,
    };
  }, [defaultValues]);

  const form = useForm<GeneralInfo>({
    resolver: zodResolver(generalInfoSchema) as Resolver<GeneralInfo>,
    defaultValues: initialValues as GeneralInfo,
  });

  const members = useFieldArray({ control: form.control, name: "members" });
  const industries = useFieldArray({ control: form.control, name: "industries" });
  const values = useWatch({ control: form.control });

  const completionPct = useMemo(() => {
    const flatten = (value: unknown): unknown[] => {
      if (Array.isArray(value)) return value.flatMap(flatten);
      if (value && typeof value === "object") return Object.values(value).flatMap(flatten);
      return [value];
    };
    const leafValues = flatten(values);
    const filled = leafValues.filter((v) => v !== "" && v !== undefined && v !== null).length;
    const total = Math.max(leafValues.length, 1);
    return Math.round((filled / total) * 100);
  }, [values]);

  useEffect(() => {
    const id = setInterval(() => {
      if (form.formState.isDirty) {
        form.handleSubmit(onSubmit)();
      }
    }, AUTO_SAVE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [form, onSubmit]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center gap-3">
          <Progress value={completionPct} className="flex-1 h-2" />
          <span className="text-sm text-muted-foreground w-10">{completionPct}%</span>
          {isSaving && <span className="text-xs text-muted-foreground">Đang lưu…</span>}
        </div>

        <Tabs defaultValue="company">
          <TabsList className="mb-4 flex-wrap">
            <TabsTrigger value="company">Thông tin công ty</TabsTrigger>
            <TabsTrigger value="capital">Vốn điều lệ</TabsTrigger>
            <TabsTrigger value="representative">Người đại diện</TabsTrigger>
            <TabsTrigger value="members">Thành viên</TabsTrigger>
            <TabsTrigger value="industries">Ngành nghề</TabsTrigger>
          </TabsList>

          <TabsContent value="company" className="space-y-4">
            <FormField
              control={form.control}
              name="companyNameVi"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên công ty (tiếng Việt)</FormLabel>
                  <FormControl>
                    <Input placeholder="Công ty TNHH ABC" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="companyNameEn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên công ty (tiếng Anh)</FormLabel>
                  <FormControl>
                    <Input placeholder="ABC Co., Ltd." {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="companyNameAbbr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tên viết tắt</FormLabel>
                  <FormControl>
                    <Input placeholder="ABC" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Địa chỉ trụ sở</FormLabel>
                  <FormControl>
                    <Input placeholder="Số 1, Đường ABC, Quận 1, TP.HCM" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số điện thoại</FormLabel>
                    <FormControl>
                      <Input placeholder="028 1234 5678" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="contact@abc.com" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="registrationDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ngày thành lập (dd/mm/yyyy)</FormLabel>
                  <FormControl>
                    <Input placeholder="01/01/2025" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="registrationAuthority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cơ quan đăng ký</FormLabel>
                  <FormControl>
                    <Input placeholder="Sở Tài chính TP.HCM" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>

          <TabsContent value="capital" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="capitalAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vốn điều lệ</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="10000000000"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="capitalCurrency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Đơn vị tiền tệ</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="VND">VND</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="legalCapitalAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vốn pháp định (nếu có)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="0"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value === "" ? undefined : Number(e.target.value))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="operationDuration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Thời hạn hoạt động (năm)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="50"
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value === "" ? undefined : Number(e.target.value))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>

          <TabsContent value="representative" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="legalRepName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Họ tên</FormLabel>
                    <FormControl>
                      <Input placeholder="Nguyễn Văn A" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="legalRepTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Chức danh</FormLabel>
                    <FormControl>
                      <Input placeholder="Giám đốc" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="legalRepNationality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quốc tịch</FormLabel>
                    <FormControl>
                      <Input placeholder="Việt Nam" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="legalRepDocNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Số hộ chiếu/CCCD</FormLabel>
                    <FormControl>
                      <Input placeholder="0123456789" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="legalRepAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Địa chỉ liên hệ</FormLabel>
                  <FormControl>
                    <Input placeholder="Địa chỉ thường trú hoặc liên hệ" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            {form.formState.errors.members?.message && (
              <p className="text-sm text-destructive">
                {form.formState.errors.members.message}
              </p>
            )}
            {members.fields.map((member, index) => (
              <div key={member.id} className="rounded-lg border p-4">
                <div className="mb-4 flex items-center justify-between">
                  <p className="font-medium">Thành viên {index + 1}</p>
                  {members.fields.length > 1 && (
                    <Button type="button" variant="outline" onClick={() => members.remove(index)}>
                      Xóa
                    </Button>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name={`members.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tên thành viên/cổ đông</FormLabel>
                        <FormControl>
                          <Input placeholder="Nhà đầu tư ABC" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`members.${index}.nationality`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quốc tịch</FormLabel>
                        <FormControl>
                          <Input placeholder="Singapore" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`members.${index}.documentNumber`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Số giấy tờ</FormLabel>
                        <FormControl>
                          <Input placeholder="P1234567" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`members.${index}.sharePercent`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tỷ lệ góp vốn (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="100"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                members.append({
                  name: "",
                  nationality: "",
                  documentNumber: "",
                  sharePercent: 0,
                })
              }
            >
              Thêm thành viên
            </Button>
          </TabsContent>

          <TabsContent value="industries" className="space-y-4">
            {industries.fields.map((industry, index) => (
              <div key={industry.id} className="rounded-lg border p-4">
                <div className="mb-4 flex items-center justify-between">
                  <p className="font-medium">Ngành nghề {index + 1}</p>
                  {industries.fields.length > 1 && (
                    <Button type="button" variant="outline" onClick={() => industries.remove(index)}>
                      Xóa
                    </Button>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name={`industries.${index}.code`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mã ngành</FormLabel>
                        <FormControl>
                          <Input placeholder="6201" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`industries.${index}.nameVi`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tên ngành tiếng Việt</FormLabel>
                        <FormControl>
                          <Input placeholder="Lập trình máy vi tính" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`industries.${index}.nameEn`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tên ngành tiếng Anh</FormLabel>
                        <FormControl>
                          <Input placeholder="Computer programming" {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`industries.${index}.isPrimary`}
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center gap-3 pt-6">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                          />
                        </FormControl>
                        <FormLabel>Ngành chính</FormLabel>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                industries.append({ code: "", nameVi: "", nameEn: "", isPrimary: false })
              }
            >
              Thêm ngành nghề
            </Button>
          </TabsContent>
        </Tabs>

        <Button type="submit" className="w-full">
          Batch Fill
        </Button>
      </form>
    </Form>
  );
}
