import { Separator } from "@/components/ui/separator"
import { DisplayForm } from "@/components/settings/display-form"

export default function DisplayPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Hiển thị</h3>
        <p className="text-sm text-muted-foreground">
          Bật hoặc tắt các mục hiển thị trong ứng dụng.
        </p>
      </div>
      <Separator />
      <DisplayForm />
    </div>
  )
}
