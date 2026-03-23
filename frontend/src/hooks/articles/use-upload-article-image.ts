import { useMutation } from "@tanstack/react-query"
import { api } from "@/lib/api/client"

interface UploadResult {
  key: string
  url: string
}

export function useUploadArticleImage() {
  return useMutation({
    mutationFn: async (file: File): Promise<UploadResult> => {
      const formData = new FormData()
      formData.append("file", file)
      return api.upload<UploadResult>("/articles/upload-image", formData)
    },
  })
}
