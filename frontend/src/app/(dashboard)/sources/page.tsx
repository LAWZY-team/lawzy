"use client"

import { FolderInput, Rocket } from "lucide-react"
import { useT } from "@/components/i18n-provider"
import { Card, CardContent } from "@/components/ui/card"

export default function SourcesPage() {
  const { t } = useT()

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 bg-gray-50/50 dark:bg-transparent min-h-[calc(100vh-8rem)]">
      <Card className="w-full max-w-2xl border-none shadow-none bg-transparent">
        <CardContent className="flex flex-col items-center text-center space-y-6 pt-6">
          <div className="relative">


          </div>
          
          <div className="space-y-4">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              {t("sources_coming_soon_title")}
            </h2>
            <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
              {t("sources_coming_soon_description")}
            </p>
          </div>


        </CardContent>
      </Card>
    </div>
  )
}
