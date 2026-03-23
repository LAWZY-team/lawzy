"use client"

import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Check, ChevronsUpDown } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { toast } from "sonner"
import { DatePicker } from "@/components/date-picker"
import { useAuthStore } from "@/stores/auth-store"
import { api } from "@/lib/api/client"
import { useT } from "@/components/i18n-provider"

const languages = [
  { label: "Tiếng Việt", value: "vi" },
  { label: "English", value: "en" },
  { label: "French", value: "fr" },
  { label: "German", value: "de" },
  { label: "Spanish", value: "es" },
  { label: "Portuguese", value: "pt" },
  { label: "Russian", value: "ru" },
  { label: "Japanese", value: "ja" },
  { label: "Korean", value: "ko" },
  { label: "Chinese", value: "zh" },
] as const

const accountFormSchema = z.object({
  name: z
    .string()
    .min(2, {
      message: "Tên phải có ít nhất 2 ký tự.",
    })
    .max(100, {
      message: "Tên không được quá 100 ký tự.",
    }),
  position: z.string().max(100).optional(),
  dob: z.date().optional().nullable(),
  language: z.string().optional(),
})

type AccountFormValues = z.infer<typeof accountFormSchema>

export function AccountForm() {
  const { t } = useT()
  const user = useAuthStore((s) => s.user)
  const fetchUser = useAuthStore((s) => s.fetchUser)

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: user?.name ?? "",
      position: user?.position ?? "",
      dob: undefined,
      language: "vi",
    },
  })

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name ?? "",
        position: user.position ?? "",
        dob: undefined,
        language: "vi",
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.name, user?.position])

  async function onSubmit(data: AccountFormValues) {
    try {
      await api.patch("/users/profile", {
        name: data.name?.trim() || user?.name,
        position: data.position?.trim() || undefined,
      })
      await fetchUser?.()
      toast.success(t("common_save") + "!")
    } catch {
      toast.error("Cập nhật tài khoản thất bại")
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("auth_name")}</FormLabel>
              <FormControl>
                <Input placeholder={t("auth_name_placeholder")} {...field} />
              </FormControl>
              <FormDescription>
                Tên này sẽ được hiển thị trên hồ sơ của bạn và trong email.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="space-y-2">
          <FormLabel>{t("auth_email")}</FormLabel>
          <Input
            value={user?.email ?? ""}
            disabled
            className="bg-muted"
            placeholder={t("auth_email_placeholder")}
          />
          <FormDescription>
            Email đăng nhập. Liên hệ hỗ trợ nếu cần đổi email.
          </FormDescription>
        </div>
        <FormField
          control={form.control}
          name="position"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("auth_register_position")}</FormLabel>
              <FormControl>
                <Input placeholder={t("auth_register_position_custom_placeholder")} {...field} />
              </FormControl>
              <FormDescription>
                Chức vụ của bạn trong công ty hoặc tổ chức.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="dob"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Ngày sinh</FormLabel>
              <DatePicker
                selected={field.value ?? undefined}
                onSelect={field.onChange}
                placeholder="Chọn ngày sinh (tùy chọn)"
              />
              <FormDescription>
                Ngày sinh của bạn được sử dụng để tính tuổi. Có thể để trống.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="language"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Ngôn ngữ</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-[200px] justify-between",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value
                        ? languages.find(
                            (language) => language.value === field.value
                          )?.label
                        : "Chọn ngôn ngữ"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput placeholder="Tìm kiếm ngôn ngữ..." />
                    <CommandEmpty>Không tìm thấy ngôn ngữ.</CommandEmpty>
                    <CommandList>
                        <CommandGroup>
                        {languages.map((language) => (
                            <CommandItem
                            value={language.label}
                            key={language.value}
                            onSelect={() => {
                                form.setValue("language", language.value)
                            }}
                            >
                            <Check
                                className={cn(
                                "mr-2 h-4 w-4",
                                language.value === field.value
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                            />
                            {language.label}
                            </CommandItem>
                        ))}
                        </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormDescription>
                Đây là ngôn ngữ sẽ được sử dụng trong bảng điều khiển.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">{t("common_save")}</Button>
      </form>
    </Form>
  )
}
