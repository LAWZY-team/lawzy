import { ProjectsOverview } from "@/components/lpms/matters/ProjectsOverview";

export const metadata = {
    title: "Vụ việc - Lawzy LPMS",
};

export default function MattersPage() {
    return (
        <div className="flex h-full flex-col bg-slate-50">
            <ProjectsOverview />
        </div>
    );
}
