import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Brain, CheckCircle, AlertTriangle, TrendingUp, Zap, BarChart3, Network, Clock, Target } from "lucide-react";

interface AdvancedMLButtonProps {
  logFileId: string;
  filename: string;
  onAnalysisComplete?: () => void;
}

export function AdvancedMLButton({ 
  logFileId, 
  filename, 
  onAnalysisComplete 
}: AdvancedMLButtonProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const { toast } = useToast();

  const handleAdvancedMLAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const response = await apiRequest("POST", `/api/analyze-advanced-ml/${logFileId}`);
      const results = await response.json();
      
      setAnalysisResults(results);
      
      // Invalidate cache to refresh anomalies
      queryClient.invalidateQueries({ queryKey: ["/api/anomalies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/log-files"] });
      
      toast({
        title: "Advanced ML Analysis Complete",
        description: `Found ${results.anomaliesFound} anomalies using multi-model ensemble`,
      });
      
      onAnalysisComplete?.();
      
    } catch (error) {
      console.error("Advanced ML analysis failed:", error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Advanced ML analysis failed",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-purple-950/50 to-blue-950/50 border-purple-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <TrendingUp className="h-5 w-5" />
            Advanced ML Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <Target className="h-5 w-5 text-purple-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-white">Multi-Model Ensemble</h4>
              <p className="text-sm text-slate-400">
                Advanced machine learning with statistical analysis, behavioral profiling, and time series detection
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-400" />
              <span className="text-slate-300">Statistical Analysis</span>
            </div>
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-green-400" />
              <span className="text-slate-300">Behavioral Profiling</span>
            </div>
            <div className="flex items-center gap-2">
              <Network className="h-4 w-4 text-orange-400" />
              <span className="text-slate-300">Network Analysis</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-cyan-400" />
              <span className="text-slate-300">Time Series Detection</span>
            </div>
          </div>

          <div className="bg-purple-950/30 rounded-lg p-3 border border-purple-800/50">
            <h5 className="text-sm font-medium text-purple-200 mb-2">Advanced Capabilities</h5>
            <div className="grid grid-cols-1 gap-2 text-xs text-slate-300">
              <div>• Z-score anomaly detection with isolation forest</div>
              <div>• User behavior profiling and deviation analysis</div>
              <div>• Network scanning and pattern recognition</div>
              <div>• Time series spike detection and analysis</div>
              <div>• Ensemble learning with weighted consensus</div>
            </div>
          </div>

          <Button 
            onClick={handleAdvancedMLAnalysis}
            disabled={isAnalyzing}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {isAnalyzing ? (
              <>
                <Zap className="mr-2 h-4 w-4 animate-spin" />
                Running Advanced ML Models...
              </>
            ) : (
              <>
                <TrendingUp className="mr-2 h-4 w-4" />
                Run Advanced ML Analysis
              </>
            )}
          </Button>

          {analysisResults && (
            <div className="mt-4 p-4 bg-gradient-to-r from-purple-950/30 to-blue-950/30 rounded-lg border border-purple-600/50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-white">Analysis Results</h4>
                <Badge variant="outline" className="text-purple-400 border-purple-400">
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

              {analysisResults.modelsUsed && (
                <div className="mt-3">
                  <h5 className="text-sm font-medium text-slate-300 mb-2">Models Used:</h5>
                  <div className="flex flex-wrap gap-1">
                    {analysisResults.modelsUsed.map((model: string, index: number) => (
                      <Badge 
                        key={index}
                        variant="outline" 
                        className="text-xs text-purple-300 border-purple-400"
                      >
                        {model}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {analysisResults.anomalies && analysisResults.anomalies.length > 0 && (
                <div className="mt-3">
                  <h5 className="text-sm font-medium text-slate-300 mb-2">Top Anomalies:</h5>
                  <div className="space-y-2">
                    {analysisResults.anomalies.slice(0, 5).map((anomaly: any, index: number) => (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">
                          {anomaly.anomalyType.replace(/_/g, ' ')}
                        </span>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className="text-xs"
                            style={{
                              color: anomaly.riskScore >= 9 ? '#ef4444' :
                                     anomaly.riskScore >= 7 ? '#f59e0b' :
                                     anomaly.riskScore >= 5 ? '#3b82f6' : '#10b981',
                              borderColor: anomaly.riskScore >= 9 ? '#ef4444' :
                                          anomaly.riskScore >= 7 ? '#f59e0b' :
                                          anomaly.riskScore >= 5 ? '#3b82f6' : '#10b981'
                            }}
                          >
                            {anomaly.riskScore}/10
                          </Badge>
                          <span className="text-slate-500">
                            {(anomaly.confidence * 100).toFixed(0)}%
                          </span>
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