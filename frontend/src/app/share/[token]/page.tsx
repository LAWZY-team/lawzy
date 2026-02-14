import { getPublicShareSnapshot } from "@/lib/api/public-shares"

export default async function PublicSharePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const snap = await getPublicShareSnapshot(token).catch(() => null)

  if (!snap) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-2">
          <h1 className="text-xl font-semibold">Không tìm thấy link chia sẻ</h1>
          <p className="text-sm text-muted-foreground">
            Link không tồn tại hoặc đã hết hạn.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">{snap.title ?? "Hợp đồng (chỉ xem)"}</h1>
          <p className="text-sm text-muted-foreground">
            Link chia sẻ công khai (read-only). Nội dung là snapshot tại thời điểm tạo link.
          </p>
        </div>
        <div className="border rounded-lg p-4 bg-card">
          <div
            className="prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: snap.html }}
          />
        </div>
      </div>
    </div>
  )
}

