import { Wrench } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";

interface ModulePlaceholderPageProps {
  title: string;
  subtitle?: string;
}

export const ModulePlaceholderPage = ({ title, subtitle }: ModulePlaceholderPageProps) => (
  <div className="space-y-4">
    <PageHeader title={title} subtitle={subtitle ?? "Module scaffold created and route is active."} />
    <EmptyState
      icon={Wrench}
      title="Module in progress"
      description="This route is wired and ready for full feature implementation in upcoming steps."
    />
  </div>
);
