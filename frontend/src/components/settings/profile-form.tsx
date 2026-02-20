"use client"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useAuthStore } from "@/stores/auth-store"
import { api } from "@/lib/api/client"

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
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn email hiển thị" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={user?.email ?? ""}>{user?.email}</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Email đăng nhập không thể thay đổi tại đây. Vui lòng liên hệ quản trị viên nếu cần thay đổi.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
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
        />
        <div>
          <div className="mb-4">
            <FormLabel className="text-base">Liên kết</FormLabel>
            <FormDescription>
              Thêm liên kết đến trang web, blog hoặc hồ sơ mạng xã hội của bạn.
            </FormDescription>
          </div>
          {fields.map((field, index) => (
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
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => append({ value: "" })}
          >
            Thêm URL
          </Button>
        </div>
        <Button type="submit">Cập nhật hồ sơ</Button>
      </form>
    </Form>
  )
}
