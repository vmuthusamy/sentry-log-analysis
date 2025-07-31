import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, CheckCircle, Clock, AlertTriangle, Brain, BarChart3, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface TestResult {
  method: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  anomaliesFound: number;
  averageRisk: number;
  executionTime: number;
  error?: string;
}

interface LogFile {
  id: string;
  originalName: string;
  status: string;
}

export function FullCycleTest() {
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<string>("");
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<number>(0);

  const detectionMethods = [
    { 
      id: 'traditional', 
      name: 'Traditional ML', 
      description: 'Rule-based detection with pattern matching',
      icon: Database,
      color: 'bg-green-500',
      endpoint: '/api/analyze-traditional'
    },
    { 
      id: 'advanced', 
      name: 'Advanced ML', 
      description: 'Multi-model ensemble with statistical analysis',
      icon: BarChart3,
      color: 'bg-purple-500',
      endpoint: '/api/analyze-advanced-ml'
    },
    { 
      id: 'ai', 
      name: 'AI-Powered', 
      description: 'GPT-4o & Gemini analysis',
      icon: Brain,
      color: 'bg-blue-500',
      endpoint: '/api/process-logs'
    }
  ];

  const { data: logFiles } = useQuery<LogFile[]>({
    queryKey: ["/api/log-files"],
  });

  // Run full cycle test mutation
  const runTestMutation = useMutation({
    mutationFn: async ({ fileId, method }: { fileId: string; method: any }) => {
      const startTime = performance.now();
      const res = await apiRequest("POST", `${method.endpoint}/${fileId}`, {
        config: { provider: method.id === 'ai' ? 'openai' : undefined }
      });
      const endTime = performance.now();
      const data = await res.json();
      return { ...data, executionTime: endTime - startTime };
    },
    onSuccess: (data, variables) => {
      const endTime = performance.now();
      setTestResults(prev => prev.map(result => 
        result.method === variables.method.id 
          ? {
              ...result,
              status: 'completed' as const,
              anomaliesFound: data.anomaliesProcessed || 0,
              averageRisk: data.averageRiskScore || 0,
              executionTime: data.executionTime || 0
            }
          : result
      ));
      
      // Move to next test
      setCurrentTest(prev => prev + 1);
    },
    onError: (error: Error, variables) => {
      setTestResults(prev => prev.map(result => 
        result.method === variables.method.id 
          ? {
              ...result,
              status: 'failed' as const,
              error: error.message
            }
          : result
      ));
      
      // Move to next test even on failure
      setCurrentTest(prev => prev + 1);
    },
  });

  const startFullCycleTest = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a log file to test",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    setCurrentTest(0);
    
    // Initialize test results
    const initialResults: TestResult[] = detectionMethods.map(method => ({
      method: method.id,
      status: 'pending',
      anomaliesFound: 0,
      averageRisk: 0,
      executionTime: 0
    }));
    setTestResults(initialResults);

    // Run tests sequentially
    for (let i = 0; i < detectionMethods.length; i++) {
      const method = detectionMethods[i];
      
      // Update status to running
      setTestResults(prev => prev.map(result => 
        result.method === method.id 
          ? { ...result, status: 'running' as const }
          : result
      ));

      try {
        await runTestMutation.mutateAsync({ fileId: selectedFile, method });
      } catch (error) {
        console.error(`Test failed for ${method.name}:`, error);
      }

      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setIsRunning(false);
    setCurrentTest(0);
    
    // Refresh anomalies data
    queryClient.invalidateQueries({ queryKey: ["/api/anomalies"] });
    queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    
    toast({
      title: "Full cycle test completed",
      description: "All detection methods have been tested",
    });
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'running':
        return <Clock className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  const completedTests = testResults.filter(r => r.status === 'completed').length;
  const totalTests = detectionMethods.length;
  const progressPercentage = totalTests > 0 ? (completedTests / totalTests) * 100 : 0;

  return (
    <div className="space-y-6">
      <Card className="bg-dark-secondary border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Play className="h-5 w-5" />
            Full Cycle Detection Testing
          </CardTitle>
          <p className="text-sm text-slate-400">
            Test a single log file through all 3 detection methods for comprehensive comparison
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Select Log File</label>
            <Select value={selectedFile} onValueChange={setSelectedFile}>
              <SelectTrigger className="bg-dark-tertiary border-slate-600 text-white">
                <SelectValue placeholder="Choose a completed log file..." />
              </SelectTrigger>
              <SelectContent className="bg-dark-tertiary border-slate-600">
                {logFiles?.filter(file => file.status === 'completed').map((file) => (
                  <SelectItem key={file.id} value={file.id} className="text-white">
                    {file.originalName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={startFullCycleTest}
            disabled={!selectedFile || isRunning}
            className="w-full bg-accent-blue hover:bg-blue-600"
          >
            <Play className="w-4 h-4 mr-2" />
            {isRunning ? "Running Tests..." : "Start Full Cycle Test"}
          </Button>

          {isRunning && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-300">Progress</span>
                <span className="text-slate-400">{completedTests} / {totalTests}</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {testResults.length > 0 && (
        <Card className="bg-dark-secondary border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Test Results Comparison</CardTitle>
            <p className="text-sm text-slate-400">
              Compare performance across all detection methods
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {detectionMethods.map((method, index) => {
                const result = testResults.find(r => r.method === method.id);
                const Icon = method.icon;
                
                return (
                  <div 
                    key={method.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      result?.status === 'running' 
                        ? 'border-blue-500 bg-blue-500/5'
                        : 'border-slate-600 bg-dark-tertiary/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${method.color}`}></div>
                        <Icon className="w-5 h-5 text-slate-300" />
                        <div>
                          <div className="font-medium text-white">{method.name}</div>
                          <div className="text-sm text-slate-400">{method.description}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        {result && (
                          <>
                            {result.status === 'completed' && (
                              <div className="text-right">
                                <div className="text-sm font-medium text-white">
                                  {result.anomaliesFound} anomalies
                                </div>
                                <div className="text-xs text-slate-400">
                                  Risk: {result.averageRisk.toFixed(1)} | {(result.executionTime / 1000).toFixed(1)}s
                                </div>
                              </div>
                            )}
                            
                            {result.status === 'failed' && result.error && (
                              <div className="text-right">
                                <div className="text-sm text-red-400">Failed</div>
                                <div className="text-xs text-slate-400">{result.error}</div>
                              </div>
                            )}
                          </>
                        )}
                        
                        {getStatusIcon(result?.status || 'pending')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}