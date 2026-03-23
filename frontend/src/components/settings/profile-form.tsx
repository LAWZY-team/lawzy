"use client"

import { useMemo } from "react"
import { z } from "zod"
import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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
import { useAuthStore } from "@/stores/auth-store"
import { api } from "@/lib/api/client"
import { useT } from "@/components/i18n-provider"

function makeProfileFormSchema(t: (k: string) => string) {
  return z.object({
    username: z
      .string({ error: t("profile_schema_username_required") })
      .min(2, { message: t("profile_schema_username_min") })
      .max(50, { message: t("profile_schema_username_max") }),
    position: z.string({ error: t("profile_schema_position_required") }),
    email: z.string({ error: t("profile_schema_email_required") }).email(),
    bio: z.string().max(250, { message: t("profile_schema_bio_max") }).optional(),
    urls: z
      .array(z.object({ value: z.string().url({ message: t("profile_schema_url_invalid") }) }))
      .optional(),
  })
}

type ProfileFormValues = z.infer<ReturnType<typeof makeProfileFormSchema>>

export function ProfileForm() {
  const { t } = useT()
  const { user, fetchUser } = useAuthStore()
  const profileFormSchema = useMemo(() => makeProfileFormSchema(t), [t])

  const defaultValues: Partial<ProfileFormValues> = {
    username: user?.name ?? "",
    position: user?.position ?? "",
    email: user?.email ?? "",
    bio: "",
    urls: [],
  }

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues,
    mode: "onChange",
  })

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { fields, append, remove } = useFieldArray({
    name: "urls",
    control: form.control,
  })

  async function onSubmit(data: ProfileFormValues) {
    try {
      await api.patch("/users/profile", { 
        name: data.username,
        position: data.position 
      })
      await fetchUser()
      toast.success(t("settings_profile_updated"))
    } catch {
      toast.error(t("settings_profile_update_failed"))
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("settings_profile_name_label")}</FormLabel>
              <FormControl>
                <Input placeholder={t("auth_name_placeholder")} {...field} />
              </FormControl>
              <FormDescription>
                {t("settings_profile_desc")}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="position"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("auth_register_position")}</FormLabel>
              <FormControl>
                <Input placeholder={t("settings_profile_position_placeholder")} {...field} />
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
              <FormLabel>{t("auth_email")}</FormLabel>
              <FormControl>
                <Input {...field} disabled />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tiểu sử</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Giới thiệu một chút về bản thân bạn"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Mô tả ngắn gọn về chuyên môn và kinh nghiệm của bạn.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        /> */}
        <div>
          {/* <div className="mb-4">
            <FormLabel className="text-base">Liên kết</FormLabel>
            <FormDescription>
              Thêm liên kết đến trang web, blog hoặc hồ sơ mạng xã hội của bạn.
            </FormDescription>
          </div> */}
          {/* {fields.map((field, index) => (
            <FormField
              control={form.control}
              key={field.id}
              name={`urls.${index}.value`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={cn(index !== 0 && "sr-only")}>URLs</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                       <Input {...field} />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <span className="sr-only">Xóa</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                          <path d="M3 6h18" />
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                        </svg>
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))} */}
          {/* <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => append({ value: "" })}
          >
            Thêm URL
          </Button> */}
        </div>
        <div className="flex justify-start gap-2">
          <Button type="submit">{t("settings_profile_btn_save")}</Button>
        </div>
      </form>
    </Form>
  )
}
