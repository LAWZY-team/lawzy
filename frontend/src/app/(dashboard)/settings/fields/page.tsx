import { Separator } from "@/components/ui/separator"
import { FieldsForm } from "@/components/settings/fields-form"

export default function SettingsFieldsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Trường dữ liệu</h3>
        <p className="text-sm text-muted-foreground">
          Quản lý các trường riêng của bạn và tùy chọn ẩn/hiện mặc định.
        </p>
      </div>
      <Separator />
      <FieldsForm />
    </div>
  )
}

