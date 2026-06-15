import { TabularReviewsList } from "@/components/lpms/tabular/TabularReviewsList";

export const metadata = {
    title: "Bóc tách hàng loạt - Lawzy LPMS",
};

export default function TabularAnalysisPage() {
    return (
        <div className="flex h-full flex-col bg-slate-50">
            <TabularReviewsList />
        </div>
    );
}
