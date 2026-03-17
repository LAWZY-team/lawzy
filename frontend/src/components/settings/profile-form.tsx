"use client"

import { useState } from "react"

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
import { Textarea } from "@/components/ui/textarea"
import { useAuthStore } from "@/stores/auth-store"
import { api } from "@/lib/api/client"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { Modal } from "@/components/ui/modal"
import { Label } from "@/components/ui/label"
import { PasswordRequirements } from "@/components/password-requirements"
import { validatePassword } from "@/lib/utils/password-validator"

const profileFormSchema = z.object({
  username: z
    .string({ error: "Vui lòng nhập tên người dùng." })
    .min(2, { message: "Tên người dùng phải có ít nhất 2 ký tự." })
    .max(50, { message: "Tên người dùng không được quá 50 ký tự." }),
  email: z.string({ error: "Vui lòng chọn email." }).email(),
  bio: z.string().max(250, { message: "Tiểu sử không được quá 250 ký tự." }).optional(),
  urls: z
    .array(z.object({ value: z.string().url({ message: "Vui lòng nhập URL hợp lệ." }) }))
    .optional(),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

export function ProfileForm() {
  const { user, fetchUser } = useAuthStore()

  const defaultValues: Partial<ProfileFormValues> = {
    username: user?.name ?? "",
    email: user?.email ?? "",
    bio: "",
    urls: [],
  }

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues,
    mode: "onChange",
  })

  const { fields, append, remove } = useFieldArray({
    name: "urls",
    control: form.control,
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

  async function onSubmit(data: ProfileFormValues) {
    try {
      await api.patch("/users/profile", { name: data.username })
      await fetchUser()
      toast.success("Đã cập nhật hồ sơ thành công!")
    } catch {
      toast.error("Cập nhật thất bại")
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
              <FormLabel>Họ và tên</FormLabel>
              <FormControl>
                <Input placeholder="Nguyễn Văn A" {...field} />
              </FormControl>
              <FormDescription>
                Tên hiển thị công khai của bạn trong hệ thống Lawzy.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
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
          <Button type="submit">Cập nhật hồ sơ</Button>
          <Button type="button" variant="outline" onClick={() => setShowPasswordModal(true)}>
            Đổi mật khẩu
          </Button>
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
                {showCurrentPassword ? (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                )}
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
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
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
