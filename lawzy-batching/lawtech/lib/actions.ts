"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import type { GeneralInfo } from "@/lib/schemas";

export async function saveCase(caseId: string, generalInfo: GeneralInfo) {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error("Unauthorized: Bạn cần đăng nhập để lưu hồ sơ");
  }

  // If it's a new case, we insert into cases first
  if (caseId === "new") {
    const { data: newCase, error: caseError } = await supabase
      .from("cases")
      .insert({
        name: generalInfo.companyNameVi || "Hồ sơ mới",
        status: "draft",
        created_by: user.id,
      })
      .select("id")
      .single();

    if (caseError) {
      console.error("Failed to create case:", caseError);
      throw new Error("Không thể tạo hồ sơ mới");
    }

    const newCaseId = newCase.id;

    const { error: infoError } = await supabase
      .from("general_info")
      .insert({
        case_id: newCaseId,
        data: generalInfo as Record<string, any>,
      });

    if (infoError) {
      console.error("Failed to save general info:", infoError);
      throw new Error("Không thể lưu thông tin hồ sơ");
    }

    // Trả về newCaseId để Client tự redirect, tránh lỗi NEXT_REDIRECT bị catch
    return { success: true, newCaseId };
  } else {
    // Update existing case
    const { error: infoError } = await supabase
      .from("general_info")
      .update({
        data: generalInfo as Record<string, any>,
        updated_at: new Date().toISOString(),
      })
      .eq("case_id", caseId);

    if (infoError) {
      console.error("Failed to update general info:", infoError);
      throw new Error("Không thể cập nhật thông tin hồ sơ");
    }

    // Optionally update the case name if it changed
    await supabase
      .from("cases")
      .update({
        name: generalInfo.companyNameVi || "Hồ sơ không tên",
        updated_at: new Date().toISOString(),
      })
      .eq("id", caseId);

    revalidatePath(`/cases/${caseId}`);
    revalidatePath("/dashboard");
    return { success: true };
  }
}
