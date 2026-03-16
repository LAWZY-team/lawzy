"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Check, ChevronsUpDown } from "lucide-react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useState } from "react"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { Modal } from "@/components/ui/modal"
import { Label } from "@/components/ui/label"
import { PasswordRequirements } from "@/components/password-requirements"
import { validatePassword } from "@/lib/utils/password-validator"

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
    .max(30, {
      message: "Tên không được quá 30 ký tự.",
    }),
  dob: z.date({
    error: "Vui lòng chọn ngày sinh.",
  }),
  language: z.string({
    error: "Vui lòng chọn ngôn ngữ.",
  }),
})

type AccountFormValues = z.infer<typeof accountFormSchema>

// This can come from your database or API.
const defaultValues: Partial<AccountFormValues> = {
  name: "Nguyễn Văn A",
  dob: new Date("1990-01-01"),
  language: "vi",
}

export function AccountForm() {
  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues,
  })

  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false)
  const [passwordError, setPasswordError] = useState("")

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError("")

    if (newPassword !== confirmPassword) {
      setPasswordError("Mật khẩu xác nhận không khớp")
      return
    }

    if (currentPassword === newPassword) {
      setPasswordError("Mật khẩu mới không được trùng với mật khẩu hiện tại")
      return
    }

    const validation = validatePassword(newPassword)
    if (!validation.valid) {
      setPasswordError(validation.message || "Mật khẩu không hợp lệ")
      return
    }

    setIsChangingPassword(true)
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      const data = await res.json()

      if (!res.ok) {
        setPasswordError(data.message || "Đổi mật khẩu thất bại")
        return
      }

      toast.success("Đổi mật khẩu thành công!")
      setShowPasswordModal(false)
      // Reset fields
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (err) {
      setPasswordError("Không thể kết nối đến máy chủ")
    } finally {
      setIsChangingPassword(false)
    }
  }

  function onSubmit(data: AccountFormValues) {
    toast.success("Đã cập nhật tài khoản thành công!")
    console.log(JSON.stringify(data, null, 2))
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Họ tên</FormLabel>
              <FormControl>
                <Input placeholder="Tên của bạn" {...field} />
              </FormControl>
              <FormDescription>
                Tên này sẽ được hiển thị trên hồ sơ của bạn và trong email.
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
                selected={field.value}
                onSelect={field.onChange}
                placeholder="Chọn ngày sinh"
              />
              <FormDescription>
                Ngày sinh của bạn được sử dụng để tính tuổi.
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
        {/* a button "Change password left si" */}
        <div className="flex justify-start gap-2">
        <Button type="submit">Cập nhật tài khoản</Button>
        <Button type="button" variant="outline" onClick={() => setShowPasswordModal(true)}>Đổi mật khẩu</Button>
        </div>

      </form>

      <Modal
        open={showPasswordModal}
        onOpenChange={setShowPasswordModal}
        title="Đổi mật khẩu"
        size="md"
      >
        <form onSubmit={handlePasswordChange} className="space-y-4 pt-4">
          {passwordError && (
            <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {passwordError}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="currentPassword">Mật khẩu hiện tại</Label>
            <div className="relative">
              <Input
                id="currentPassword"
                type={showCurrentPassword ? "text" : "password"}
                placeholder="Nhập mật khẩu hiện tại"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                disabled={isChangingPassword}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                tabIndex={-1}
              >
                {showCurrentPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">Mật khẩu mới</Label>
            <PasswordRequirements
              password={newPassword}
              open={showPasswordRequirements}
              onOpenChange={setShowPasswordRequirements}
            >
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  placeholder="Nhập mật khẩu mới"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value)
                    if (e.target.value.length > 0) {
                      setShowPasswordRequirements(true)
                    }
                  }}
                  onFocus={() => setShowPasswordRequirements(true)}
                  onBlur={() => {
                    setTimeout(() => setShowPasswordRequirements(false), 200)
                  }}
                  required
                  disabled={isChangingPassword}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  tabIndex={-1}
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </div>
            </PasswordRequirements>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Nhập lại mật khẩu mới"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isChangingPassword}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowPasswordModal(false)}
              disabled={isChangingPassword}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isChangingPassword}>
              {isChangingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                "Đổi mật khẩu"
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </Form>
  )
}
