import { TabularReviewView } from "@/components/lpms/tabular/tabular-review-view";

export const metadata = {
  title: "Bóc tách hợp đồng - Lawzy LPMS",
};

export default function TabularAnalysisPage() {
  return (
    <div className="h-full bg-slate-50 flex flex-col">
      <TabularReviewView />
    </div>
  );
}
