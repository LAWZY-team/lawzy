"use client"

import { useEffect, useMemo } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  SIDEBAR_ITEM_HREFS,
  type SidebarItemHref,
  useSidebarDisplayStore,
} from "@/stores/sidebar-display-store"
import { useT } from "@/components/i18n-provider"

const HREF_TO_LABEL: Record<SidebarItemHref, string> = {
  "/clm/dashboard": "sidebar_dashboard",
  "/clm/documents": "sidebar_documents",
  "/clm/projects": "sidebar_projects",
  "/clm/obligations": "sidebar_obligations",
  "/clm/fields": "sidebar_profile",
  "/clm/templates": "sidebar_templates",
  "/clm/sources": "sidebar_sources",
  "/clm/files": "sidebar_storage",
  "/clm/payment": "sidebar_payment_short",
  "/clm/workspace": "sidebar_workspace",
  "/clm/settings": "sidebar_settings",
}

function makeDisplayFormSchema(t: (k: string) => string) {
  return z.object({
    items: z.array(z.string()).refine((value) => value.some((item) => item), {
      message: t("settings_sidebar_min_one"),
    }),
  })
}

type DisplayFormValues = z.infer<ReturnType<typeof makeDisplayFormSchema>>

export function DisplayForm() {
  const { t } = useT()
  const { visibleHrefs, setVisibleHrefs, resetToDefaults } = useSidebarDisplayStore()
  const displayFormSchema = useMemo(() => makeDisplayFormSchema(t), [t])

  const form = useForm<DisplayFormValues>({
    resolver: zodResolver(displayFormSchema),
    defaultValues: { items: visibleHrefs },
  })

  useEffect(() => {
    form.reset({ items: visibleHrefs })
  }, [visibleHrefs, form])

  const items = SIDEBAR_ITEM_HREFS.map((href) => ({
    href,
    labelKey: HREF_TO_LABEL[href],
  }))

  function onSubmit(data: DisplayFormValues) {
    setVisibleHrefs(data.items as SidebarItemHref[])
    toast.success(t("settings_sidebar_saved"))
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="items"
          render={() => (
            <FormItem>
              <div className="mb-4">
                <FormLabel className="text-base">
                  {t("settings_sidebar_title")}
                </FormLabel>
                <FormDescription>
                  {t("settings_sidebar_desc")}
                </FormDescription>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {items.map((item) => (
                  <FormField
                    key={item.href}
                    control={form.control}
                    name="items"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(item.href)}
                            onCheckedChange={(checked) => {
                              return checked
                                ? field.onChange([...(field.value || []), item.href])
                                : field.onChange(
                                    field.value?.filter((v) => v !== item.href)
                                  )
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          {t(item.labelKey)}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex gap-2">
          <Button type="submit">{t("settings_dashboard_update")}</Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetToDefaults()
              form.reset({ items: [...SIDEBAR_ITEM_HREFS] })
              toast.success(t("settings_sidebar_reset"))
            }}
          >
            {t("settings_dashboard_reset_btn")}
          </Button>
        </div>
      </form>
    </Form>
  )
}
