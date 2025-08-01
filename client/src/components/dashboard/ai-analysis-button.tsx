import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, Zap, Bot, Settings, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface AIAnalysisButtonProps {
  logFileId: string;
  filename: string;
  onAnalysisComplete?: () => void;
}

export function AIAnalysisButton({ 
  logFileId, 
  filename, 
  onAnalysisComplete 
}: AIAnalysisButtonProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("openai");
  const [selectedTier, setSelectedTier] = useState("standard");
  const { toast } = useToast();

  const { data: apiKeyStatus } = useQuery({
    queryKey: ["/api/user-api-keys/status"],
  });

  const handleAIAnalysis = async () => {
    // Check if API keys are configured
    if (!(apiKeyStatus as any)?.openai?.configured && !(apiKeyStatus as any)?.gemini?.configured) {
      toast({
        title: "API Keys Required",
        description: "Please configure your OpenAI or Gemini API keys in Settings first.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      const aiConfig = {
        provider: selectedProvider,
        tier: selectedTier,
        temperature: 0.1,
      };

      const response = await apiRequest("POST", `/api/process-logs/${logFileId}`, {
        aiConfig,
      });
      const results = await response.json();
      
      // Invalidate cache to refresh anomalies
      queryClient.invalidateQueries({ queryKey: ["/api/anomalies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/log-files"] });
      
      toast({
        title: "AI Analysis Started",
        description: `Log file is being analyzed with ${selectedProvider} AI. This may take a few minutes.`,
      });
      
      onAnalysisComplete?.();
      
    } catch (error) {
      console.error("AI analysis failed:", error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "AI analysis failed",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const isProviderAvailable = (provider: string) => {
    if (provider === "openai") {
      return (apiKeyStatus as any)?.openai?.configured;
    } else if (provider === "gemini") {
      return (apiKeyStatus as any)?.gemini?.configured;
    }
    return false;
  };

  const hasConfiguredKeys = (apiKeyStatus as any)?.openai?.configured || (apiKeyStatus as any)?.gemini?.configured;

  return (
    <div className="space-y-2">
      <Button 
        onClick={() => hasConfiguredKeys ? handleAIAnalysis() : setShowConfig(true)}
        disabled={isAnalyzing}
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 h-auto py-3"
      >
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            {isAnalyzing ? (
              <Zap className="h-4 w-4 animate-spin" />
            ) : (
              <Brain className="h-4 w-4" />
            )}
            <div className="text-left">
              <div className="font-medium">AI-Powered Analysis</div>
              <div className="text-xs opacity-90">GPT-4o or Gemini deep insights</div>
            </div>
          </div>
          {hasConfiguredKeys && (
            <Badge className="bg-blue-100 text-blue-800 text-xs">
              {selectedProvider.toUpperCase()}
            </Badge>
          )}
          {!hasConfiguredKeys && (
            <Badge className="bg-amber-100 text-amber-800 text-xs">
              Setup Required
            </Badge>
          )}
        </div>
      </Button>

      {showConfig && !hasConfiguredKeys && (
        <div className="bg-amber-950/50 border border-amber-800 rounded-lg p-3 text-sm">
          <div className="flex items-center gap-2 text-amber-200 mb-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">API Keys Required</span>
          </div>
          <p className="text-amber-300 text-xs mb-2">
            Configure your OpenAI or Gemini API keys in Settings first.
          </p>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setShowConfig(false)}
            className="text-amber-300 border-amber-600"
          >
            Close
          </Button>
        </div>
      )}

      {showConfig && hasConfiguredKeys && (
        <div className="bg-blue-950/30 border border-blue-800 rounded-lg p-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-300">Provider</label>
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger className="bg-dark-tertiary border-slate-600 text-white h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai" disabled={!isProviderAvailable("openai")}>
                    OpenAI {isProviderAvailable("openai") ? "✓" : "✗"}
                  </SelectItem>
                  <SelectItem value="gemini" disabled={!isProviderAvailable("gemini")}>
                    Gemini {isProviderAvailable("gemini") ? "✓" : "✗"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-300">Tier</label>
              <Select value={selectedTier} onValueChange={setSelectedTier}>
                <SelectTrigger className="bg-dark-tertiary border-slate-600 text-white h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setShowConfig(false)}
            className="w-full"
          >
            Done
          </Button>
        </div>
      )}
    </div>
  );
}