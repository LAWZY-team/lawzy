"use client"

import { useEffect, useMemo } from "react"
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

const LANGUAGES = [
  { labelKey: "lang_vi", value: "vi" as const },
  { labelKey: "lang_en", value: "en" as const },
] as const

function makeAccountFormSchema(t: (k: string) => string) {
  return z.object({
    name: z
      .string()
      .min(2, { message: t("account_schema_name_min") })
      .max(100, { message: t("account_schema_name_max") }),
    position: z.string().max(100).optional(),
    dob: z.date().optional().nullable(),
    language: z.string().optional(),
  })
}

type AccountFormValues = z.infer<ReturnType<typeof makeAccountFormSchema>>

export function AccountForm() {
  const { t, locale, setLocale } = useT()
  const user = useAuthStore((s) => s.user)
  const fetchUser = useAuthStore((s) => s.fetchUser)
  const accountFormSchema = useMemo(() => makeAccountFormSchema(t), [t])

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: user?.name ?? "",
      position: user?.position ?? "",
      dob: undefined,
      language: locale,
    },
  })

  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name ?? "",
        position: user.position ?? "",
        dob: undefined,
        language: locale,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.name, user?.position, locale])

  async function onSubmit(data: AccountFormValues) {
    try {
      await api.patch("/users/profile", {
        name: data.name?.trim() || user?.name,
        position: data.position?.trim() || undefined,
      })
      await fetchUser?.()
      toast.success(t("common_save") + "!")
    } catch {
      toast.error(t("settings_account_update_failed"))
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
                {t("settings_account_name_desc")}
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
            {t("settings_account_email_desc")}
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
                {t("settings_account_position_desc")}
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
              <FormLabel>{t("settings_dob_label")}</FormLabel>
              <DatePicker
                selected={field.value ?? undefined}
                onSelect={field.onChange}
                placeholder={t("settings_dob_placeholder")}
              />
              <FormDescription>
                {t("settings_dob_desc")}
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
              <FormLabel>{t("settings_language_label")}</FormLabel>
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
                        ? t(LANGUAGES.find((l) => l.value === field.value)?.labelKey ?? "lang_vi")
                        : t("settings_language_select")}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput placeholder={t("settings_language_search")} />
                    <CommandEmpty>{t("settings_language_empty")}</CommandEmpty>
                    <CommandList>
                      <CommandGroup>
                        {LANGUAGES.map((lang) => (
                          <CommandItem
                            value={t(lang.labelKey)}
                            key={lang.value}
                            onSelect={() => {
                              form.setValue("language", lang.value)
                              setLocale(lang.value)
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                lang.value === field.value ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {t(lang.labelKey)}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormDescription>
                {t("settings_language_desc")}
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
