import { WorkflowList } from "@/components/lpms/workflows/WorkflowList";

export const metadata = {
    title: "Quy trình - Lawzy LPMS",
};

export default function WorkflowsPage() {
    return (
        <div className="flex h-full flex-col bg-slate-50">
            <WorkflowList />
        </div>
    );
}
