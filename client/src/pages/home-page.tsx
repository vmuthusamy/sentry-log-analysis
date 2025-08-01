import { useState } from "react";
import { AuthHeader } from "@/components/auth-header";
import { Sidebar } from "@/components/dashboard/sidebar";
import { OverviewSection } from "@/components/dashboard/overview-section";
import { UploadSection } from "@/components/dashboard/upload-section";
import { AnalysisSection } from "@/components/dashboard/analysis-section";
import { HistorySection } from "@/components/dashboard/history-section";
import { SettingsSection } from "@/components/dashboard/settings-section";
import LogManagement from "@/components/dashboard/log-management";
import { MetricsSection } from "@/components/dashboard/metrics-section";

export default function HomePage() {
  const [activeSection, setActiveSection] = useState<string>("overview");

  const renderSection = () => {
    switch (activeSection) {
      case "overview":
        return <OverviewSection />;
      case "upload":
        return <UploadSection />;
      case "analysis":
        return <AnalysisSection />;
      case "history":
        return <HistorySection />;
      case "management":
        return <LogManagement />;
      case "metrics":
        return <MetricsSection />;
      case "settings":
        return <SettingsSection />;
      default:
        return <OverviewSection />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AuthHeader />
      <div className="flex">
        <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        <div className="flex-1 ml-64 min-h-screen">
          {renderSection()}
        </div>
      </div>
    </div>
  );
}
