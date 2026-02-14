import { Separator } from "@/components/ui/separator"
import { AppearanceForm } from "@/components/settings/appearance-form"

export default function AppearancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Giao diện</h3>
        <p className="text-sm text-muted-foreground">
          Tùy chỉnh giao diện của ứng dụng. Chuyển đổi giữa chế độ sáng và tối.
        </p>
      </div>
      <Separator />
      <AppearanceForm />
    </div>
  )
}
