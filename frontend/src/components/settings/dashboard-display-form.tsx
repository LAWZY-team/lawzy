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
  DASHBOARD_CARD_IDS,
  type DashboardCardId,
  useDashboardDisplayStore,
} from "@/stores/dashboard-display-store"
import { useT } from "@/components/i18n-provider"

const CARD_LABELS: Record<DashboardCardId, string> = {
  total_docs: "dash_total_docs",
  completed: "dash_completed",
  drafting: "dash_drafting",
  total_files: "dash_total_files",
  ai_quota: "dash_ai_credit",
  storage: "dash_storage_label",
  referral: "referral_title",
  chart: "dash_chart_title",
  workspace_breakdown: "dash_stats_by_ws",
  recent_docs: "recent_docs_title",
}

function makeDashboardDisplaySchema(t: (k: string) => string) {
  return z.object({
    items: z.array(z.string()).refine((value) => value.some((item) => item), {
      message: t("settings_sidebar_min_one"),
    }),
  })
}

type DisplayFormValues = z.infer<ReturnType<typeof makeDashboardDisplaySchema>>

export function DashboardDisplayForm() {
  const { t } = useT()
  const { enabledCards, setEnabledCards, resetToDefaults } = useDashboardDisplayStore()
  const schema = useMemo(() => makeDashboardDisplaySchema(t), [t])

  const form = useForm<DisplayFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { items: enabledCards },
  })

  useEffect(() => {
    form.reset({ items: enabledCards })
  }, [enabledCards, form])

  const items = DASHBOARD_CARD_IDS.map((id) => ({
    id,
    label: t(CARD_LABELS[id] as keyof typeof CARD_LABELS),
  }))

  function onSubmit(data: DisplayFormValues) {
    setEnabledCards(data.items as DashboardCardId[])
    toast.success(t("settings_dashboard_saved"))
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
                  {t("settings_dashboard_cards_title")}
                </FormLabel>
                <FormDescription>
                  {t("settings_dashboard_cards_desc")}
                </FormDescription>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {items.map((item) => (
                  <FormField
                    key={item.id}
                    control={form.control}
                    name="items"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(item.id)}
                            onCheckedChange={(checked) => {
                              return checked
                                ? field.onChange([...(field.value || []), item.id])
                                : field.onChange(
                                    field.value?.filter((v) => v !== item.id)
                                  )
                            }}
                          />
                        </FormControl>
                        <FormLabel className="font-normal">
                          {item.label}
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
              form.reset({ items: [...DASHBOARD_CARD_IDS] })
              toast.success(t("settings_dashboard_reset"))
            }}
          >
            {t("settings_dashboard_reset_btn")}
          </Button>
        </div>
      </form>
    </Form>
  )
}
