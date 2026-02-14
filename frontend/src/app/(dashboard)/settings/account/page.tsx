import { Separator } from "@/components/ui/separator"
import { AccountForm } from "@/components/settings/account-form"

export default function AccountPage() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Tài khoản</h3>
        <p className="text-sm text-muted-foreground">
          Cập nhật cài đặt tài khoản của bạn. Đặt ngôn ngữ và ngày sinh.
        </p>
      </div>
      <Separator />
      <AccountForm />
    </div>
  )
}
