import { CaseWorkspace } from "@/components/cases/CaseWorkspace";
import { createClient } from "@/utils/supabase/server";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CasePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: templates } = await supabase.from("templates").select("*").order("code");

  const mappedTemplates = (templates || []).map((t) => ({
    id: t.id,
    code: t.code,
    name: t.name,
    isRequired: t.is_required,
    language: t.language,
    status: "pending",
    placeholders: Object.values(t.field_mappings || {}),
  }));

  let generalInfo = undefined;

  if (id !== "new") {
    const { data: infoData } = await supabase
      .from("general_info")
      .select("data")
      .eq("case_id", id)
      .single();

    if (infoData?.data) {
      generalInfo = infoData.data;
    }
  }

  return (
    <CaseWorkspace 
      caseId={id} 
      templates={mappedTemplates} 
      initialGeneralInfo={generalInfo} 
    />
  );
}
