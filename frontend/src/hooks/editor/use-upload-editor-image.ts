import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api/client";

interface UploadEditorImageInput {
  file: File;
  workspaceId: string;
}

interface UploadEditorImageResult {
  id: string;
}

/**
 * Upload image for contract editor content and return file id.
 * @example
 * const result = await mutateAsync({ file, workspaceId: "ws_123" });
 * const imageSrc = `/api/proxy/files/${result.id}/download`;
 */
export const useUploadEditorImage = () => {
  return useMutation({
    mutationFn: async (
      params: UploadEditorImageInput,
    ): Promise<UploadEditorImageResult> => {
      const formData = new FormData();
      formData.append("file", params.file);
      formData.append("workspaceId", params.workspaceId);
      return api.upload<UploadEditorImageResult>("/files/upload", formData);
    },
  });
};
