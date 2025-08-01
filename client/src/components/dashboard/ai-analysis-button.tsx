import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Brain, Zap, AlertTriangle } from "lucide-react";
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
  const { toast } = useToast();

  const { data: apiKeyStatus } = useQuery({
    queryKey: ["/api/user-api-keys/status"],
  });

  const handleAIAnalysis = async () => {
    // Auto-select provider: prefer OpenAI, fallback to Gemini
    const openaiWorking = (apiKeyStatus as any)?.openai?.configured && (apiKeyStatus as any)?.openai?.working;
    const geminiWorking = (apiKeyStatus as any)?.gemini?.configured && (apiKeyStatus as any)?.gemini?.working;
    
    if (!openaiWorking && !geminiWorking) {
      toast({
        title: "API Key Required",
        description: "Please configure your OpenAI or Gemini API key in Settings first.",
        variant: "destructive",
      });
      return;
    }

    const selectedProvider = openaiWorking ? "openai" : "gemini";
    
    setIsAnalyzing(true);
    try {
      const aiConfig = {
        provider: selectedProvider,
        tier: "standard",
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
        description: `Log file is being analyzed with ${selectedProvider === "openai" ? "OpenAI GPT-4o" : "Google Gemini"}. This may take a few minutes.`,
      });
      
      onAnalysisComplete?.();
      
    } catch (error) {
      console.error("AI analysis failed:", error);
      
      // Parse error message to determine if it's a provider issue
      const errorMessage = error instanceof Error ? error.message : "AI analysis failed";
      let title = "Analysis Failed";
      let description = errorMessage;
      
      // Check for processing limit error first
      if (errorMessage.includes("Processing limit reached")) {
        title = "Processing Limit Reached";
        description = "You can only process 3 files at the same time. Please wait for current analyses to complete before starting new ones.";
      }
      // Check for common AI provider throttling/quota issues
      else if (errorMessage.includes("429") || errorMessage.includes("quota") || errorMessage.includes("rate limit")) {
        title = "AI Provider Rate Limited";
        description = `${selectedProvider === "openai" ? "OpenAI" : "Google"} is currently rate limiting requests. This is not an issue with our platform. Please wait a few minutes and try again, or try switching to the other AI provider.`;
      } else if (errorMessage.includes("401") || errorMessage.includes("unauthorized") || errorMessage.includes("invalid api key")) {
        title = "API Key Issue";
        description = `Your ${selectedProvider === "openai" ? "OpenAI" : "Google"} API key appears to be invalid or expired. Please check your API key in Settings.`;
      } else if (errorMessage.includes("403") || errorMessage.includes("billing") || errorMessage.includes("payment")) {
        title = "AI Provider Billing Issue";
        description = `${selectedProvider === "openai" ? "OpenAI" : "Google"} reports a billing or payment issue with your account. Please check your billing status with the provider.`;
      } else if (errorMessage.includes("timeout") || errorMessage.includes("network")) {
        title = "Connection Issue";
        description = `Unable to connect to ${selectedProvider === "openai" ? "OpenAI" : "Google"}. This may be a temporary network issue. Please try again in a few minutes.`;
      }
      
      toast({
        title,
        description,
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const hasWorkingKeys = ((apiKeyStatus as any)?.openai?.configured && (apiKeyStatus as any)?.openai?.working) || 
                        ((apiKeyStatus as any)?.gemini?.configured && (apiKeyStatus as any)?.gemini?.working);
  
  const getProviderDisplay = () => {
    const openaiWorking = (apiKeyStatus as any)?.openai?.configured && (apiKeyStatus as any)?.openai?.working;
    const geminiWorking = (apiKeyStatus as any)?.gemini?.configured && (apiKeyStatus as any)?.gemini?.working;
    
    if (openaiWorking) return "OPENAI";
    if (geminiWorking) return "GEMINI";
    return "SETUP REQUIRED";
  };

  return (
    <div className="space-y-2">
      <Button 
        onClick={handleAIAnalysis}
        disabled={isAnalyzing || !hasWorkingKeys}
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
              <div className="text-xs opacity-90">Smart provider selection</div>
            </div>
          </div>
          <Badge className={hasWorkingKeys ? "bg-blue-100 text-blue-800 text-xs" : "bg-amber-100 text-amber-800 text-xs"}>
            {getProviderDisplay()}
          </Badge>
        </div>
      </Button>

      {!hasWorkingKeys && (
        <div className="bg-amber-950/50 border border-amber-800 rounded-lg p-3 text-sm">
          <div className="flex items-center gap-2 text-amber-200 mb-2">
            <AlertTriangle className="h-4 w-4" />
            <span className="font-medium">API Key Required</span>
          </div>
          <p className="text-amber-300 text-xs">
            Configure your OpenAI or Gemini API key in Settings to enable AI analysis.
          </p>
        </div>
      )}
    </div>
  );
}