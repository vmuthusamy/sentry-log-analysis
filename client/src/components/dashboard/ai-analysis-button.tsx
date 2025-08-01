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
  const [selectedProvider, setSelectedProvider] = useState("openai");
  const [selectedTier, setSelectedTier] = useState("standard");
  const { toast } = useToast();

  const { data: apiKeyStatus } = useQuery({
    queryKey: ["/api/user-api-keys/status"],
  });

  const { data: providers } = useQuery({
    queryKey: ["/api/ai-providers"],
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
      return (apiKeyStatus as any)?.openai?.configured && (providers as any)?.availability?.openai;
    } else if (provider === "gemini") {
      return (apiKeyStatus as any)?.gemini?.configured && (providers as any)?.availability?.gcp_gemini;
    }
    return false;
  };

  const hasConfiguredKeys = (apiKeyStatus as any)?.openai?.configured || (apiKeyStatus as any)?.gemini?.configured;

  return (
    <div className="space-y-4">
      <Card className="bg-dark-secondary border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Brain className="h-5 w-5" />
            AI-Powered Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <Bot className="h-5 w-5 text-blue-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-white">Advanced AI Analysis</h4>
              <p className="text-sm text-slate-400">
                Deep behavioral insights using GPT-4o or Gemini
              </p>
            </div>
          </div>

          {!hasConfiguredKeys && (
            <div className="bg-amber-950/50 border border-amber-800 rounded-lg p-3">
              <div className="flex items-center gap-2 text-amber-200">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm font-medium">API Keys Required</span>
              </div>
              <p className="text-xs text-amber-300 mt-1">
                Configure your OpenAI or Gemini API keys in Settings to use AI analysis.
              </p>
            </div>
          )}

          {hasConfiguredKeys && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-300">Provider</label>
                  <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                    <SelectTrigger className="bg-dark-tertiary border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem 
                        value="openai" 
                        disabled={!isProviderAvailable("openai")}
                      >
                        <div className="flex items-center gap-2">
                          <span>OpenAI</span>
                          {isProviderAvailable("openai") ? (
                            <Badge className="bg-green-100 text-green-800 text-xs">Ready</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800 text-xs">Unavailable</Badge>
                          )}
                        </div>
                      </SelectItem>
                      <SelectItem 
                        value="gemini" 
                        disabled={!isProviderAvailable("gemini")}
                      >
                        <div className="flex items-center gap-2">
                          <span>Gemini</span>
                          {isProviderAvailable("gemini") ? (
                            <Badge className="bg-green-100 text-green-800 text-xs">Ready</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800 text-xs">Unavailable</Badge>
                          )}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-300">Model Tier</label>
                  <Select value={selectedTier} onValueChange={setSelectedTier}>
                    <SelectTrigger className="bg-dark-tertiary border-slate-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-blue-950/30 rounded-lg p-3 border border-blue-800/50">
                <h5 className="text-sm font-medium text-blue-200 mb-2">AI Capabilities</h5>
                <div className="grid grid-cols-1 gap-2 text-xs text-slate-300">
                  <div>• Advanced behavioral pattern analysis</div>
                  <div>• Contextual threat assessment</div>
                  <div>• Natural language threat descriptions</div>
                  <div>• AI-powered risk scoring</div>
                  <div>• Deep anomaly insights</div>
                </div>
              </div>
            </>
          )}

          <Button 
            onClick={handleAIAnalysis}
            disabled={isAnalyzing || !hasConfiguredKeys || !isProviderAvailable(selectedProvider)}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {isAnalyzing ? (
              <>
                <Zap className="mr-2 h-4 w-4 animate-spin" />
                Running AI Analysis...
              </>
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" />
                Start AI Analysis
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}