import { useAuth } from "@/hooks/useAuth";
import { Shield, ChartLine, Upload, Search, History, Settings, LogOut, FolderCog, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const menuItems = [
    { id: "overview", label: "Overview", icon: ChartLine },
    { id: "upload", label: "Upload Logs", icon: Upload },
    { id: "management", label: "AI & Log Management", icon: FolderCog },
    { id: "analysis", label: "Analysis Results", icon: Search },
    { id: "history", label: "History", icon: History },
    { id: "metrics", label: "Success Metrics", icon: BarChart3 },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  return (
    <div className="fixed inset-y-0 left-0 w-64 bg-dark-secondary border-r border-slate-700">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center px-6 py-4 border-b border-slate-700">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-accent-blue/10 rounded-lg flex items-center justify-center mr-3">
              <Shield className="h-6 w-6 text-accent-blue" />
            </div>
            <h1 className="text-xl font-bold text-white">LogGuard</h1>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <Button
                key={item.id}
                variant="ghost"
                onClick={() => {
                  if (item.id === "settings") {
                    setLocation("/settings");
                  } else {
                    onSectionChange(item.id);
                  }
                }}
                className={`w-full justify-start px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-accent-blue/10 text-accent-blue border-l-4 border-accent-blue"
                    : "text-slate-300 hover:bg-slate-700/50"
                }`}
              >
                <Icon className="mr-3 h-5 w-5" />
                <span>{item.label}</span>
              </Button>
            );
          })}
        </nav>
        
        {/* User Profile */}
        <div className="px-4 py-4 border-t border-slate-700">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-accent-green rounded-full flex items-center justify-center mr-3">
              <span className="text-sm font-medium text-white">
                {user?.username?.charAt(0)?.toUpperCase() || "U"}
              </span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white">{user?.username || "User"}</p>
              <p className="text-xs text-slate-400">Security Analyst</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-slate-400 hover:text-white p-2"
              disabled={logoutMutation.isPending}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
