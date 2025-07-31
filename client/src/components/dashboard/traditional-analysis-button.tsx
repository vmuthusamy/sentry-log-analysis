import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Brain, CheckCircle, AlertTriangle, Shield, Zap } from "lucide-react";

interface TraditionalAnalysisButtonProps {
  logFileId: string;
  filename: string;
  onAnalysisComplete?: () => void;
}

export function TraditionalAnalysisButton({ 
  logFileId, 
  filename, 
  onAnalysisComplete 
}: TraditionalAnalysisButtonProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const { toast } = useToast();

  const handleTraditionalAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const response = await apiRequest("POST", `/api/analyze-traditional/${logFileId}`);
      const results = await response.json();
      
      setAnalysisResults(results);
      
      // Invalidate cache to refresh anomalies
      queryClient.invalidateQueries({ queryKey: ["/api/anomalies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/log-files"] });
      
      toast({
        title: "Traditional Analysis Complete",
        description: `Found ${results.anomaliesFound} anomalies using rule-based detection`,
      });
      
      onAnalysisComplete?.();
      
    } catch (error) {
      console.error("Traditional analysis failed:", error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Traditional analysis failed",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-dark-secondary border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Brain className="h-5 w-5" />
            Traditional ML Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-white">No LLM Required</h4>
              <p className="text-sm text-slate-400">
                Uses rule-based detection, pattern matching, and statistical analysis
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span className="text-slate-300">Cryptocurrency Mining</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span className="text-slate-300">Tor/Dark Web Access</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span className="text-slate-300">Blocked Traffic Analysis</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <span className="text-slate-300">Statistical Anomalies</span>
            </div>
          </div>

          <Button 
            onClick={handleTraditionalAnalysis}
            disabled={isAnalyzing}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isAnalyzing ? (
              <>
                <Zap className="mr-2 h-4 w-4 animate-spin" />
                Analyzing with Traditional ML...
              </>
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" />
                Run Traditional Analysis
              </>
            )}
          </Button>

          {analysisResults && (
            <div className="mt-4 p-4 bg-dark-tertiary rounded-lg border border-slate-600">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-white">Analysis Results</h4>
                <Badge variant="outline" className="text-blue-400 border-blue-400">
                  {analysisResults.method}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Anomalies Found:</span>
                  <div className="font-medium text-white">{analysisResults.anomaliesFound}</div>
                </div>
                <div>
                  <span className="text-slate-400">Log Entries:</span>
                  <div className="font-medium text-white">{analysisResults.logEntriesAnalyzed}</div>
                </div>
              </div>
              
              {analysisResults.anomalies && analysisResults.anomalies.length > 0 && (
                <div className="mt-3">
                  <h5 className="text-sm font-medium text-slate-300 mb-2">Top Anomalies:</h5>
                  <div className="space-y-2">
                    {analysisResults.anomalies.slice(0, 3).map((anomaly: any, index: number) => (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">{anomaly.anomalyType.replace(/_/g, ' ')}</span>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={
                              anomaly.riskScore >= 9 ? "text-red-400 border-red-400" :
                              anomaly.riskScore >= 7 ? "text-amber-400 border-amber-400" :
                              "text-blue-400 border-blue-400"
                            }
                          >
                            {anomaly.riskScore}/10
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}