import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function RefreshCacheButton() {
  const { toast } = useToast();

  const handleRefresh = () => {
    // Clear all cached data to fix caching issues
    queryClient.clear();
    
    // Refetch current data
    queryClient.invalidateQueries({ queryKey: ["/api/log-files"] });
    queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    queryClient.invalidateQueries({ queryKey: ["/api/anomalies"] });
    
    toast({
      title: "Cache cleared",
      description: "Data refreshed successfully",
    });
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      onClick={handleRefresh}
      className="text-slate-300 border-slate-600 hover:bg-slate-700"
    >
      <RefreshCw className="w-4 h-4 mr-2" />
      Refresh Data
    </Button>
  );
}