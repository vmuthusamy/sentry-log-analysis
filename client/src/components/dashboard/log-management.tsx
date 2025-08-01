import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
// import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, RefreshCw, Settings, Calendar, AlertTriangle, CheckCircle, Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { TraditionalAnalysisButton } from "./traditional-analysis-button";
import { AdvancedMLButton } from "./advanced-ml-button";
import { AIAnalysisButton } from "./ai-analysis-button";
import { RefreshCacheButton } from "../refresh-cache-button";

interface LogFile {
  id: string;
  filename: string;
  originalName: string;
  fileSize: number;
  status: string;
  uploadedAt: string;
  processedAt?: string;
  totalEntries?: number;
  errorMessage?: string;
}

export default function LogManagement() {
  const { toast } = useToast();
  const [selectedConfig, setSelectedConfig] = useState(null);

  const { data: logFiles, isLoading, refetch } = useQuery<LogFile[]>({
    queryKey: ["/api/log-files"],
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });

  const reprocessMutation = useMutation({
    mutationFn: async ({ logFileId, aiConfig }: { logFileId: string; aiConfig?: any }) => {
      const res = await apiRequest("POST", `/api/process-logs/${logFileId}`, {
        aiConfig,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Reprocessing started",
        description: `Log file is being reanalyzed with ${data.aiConfig?.provider || 'default'} AI configuration.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/log-files"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Reprocessing failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string, errorMessage?: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case "processing":
        return <Badge className="bg-blue-100 text-blue-800"><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Processing</Badge>;
      case "failed":
        if (errorMessage?.includes('timeout') || errorMessage?.includes('Processing timed out')) {
          return <Badge className="bg-yellow-100 text-yellow-800"><AlertTriangle className="w-3 h-3 mr-1" />Timed Out</Badge>;
        }
        return <Badge className="bg-red-100 text-red-800"><AlertTriangle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <header className="bg-dark-secondary border-b border-slate-700 px-6 py-4 -mx-6 -mt-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Log File Management</h2>
            <p className="text-slate-400 mt-1">Manage uploaded files and AI analysis configurations</p>
          </div>
        </div>
      </header>

      <div className="space-y-6">
        {/* Log Files Table */}
        <div>
          <Card className="bg-dark-secondary border-slate-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <FileText className="h-5 w-5" />
                    Uploaded Log Files
                  </CardTitle>
                  <p className="text-sm text-slate-400">
                    Reprocess files with different AI configurations for comparison
                  </p>
                </div>
                <RefreshCacheButton />
              </div>
            </CardHeader>
            <CardContent>
              {!logFiles || logFiles.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-400">No log files uploaded yet</p>
                  <p className="text-sm text-slate-500">Upload files to see them here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {logFiles.map((file) => (
                    <Card key={file.id} className="bg-dark-tertiary/30 border-slate-600">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-slate-400" />
                            <div>
                              <div className="font-medium text-white">{file.originalName}</div>
                              <div className="text-xs text-slate-400">
                                {formatFileSize(file.fileSize)} • Uploaded {formatDate(file.uploadedAt)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {getStatusBadge(file.status, file.errorMessage)}
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-slate-600 text-slate-300 hover:bg-slate-700"
                              onClick={() => reprocessMutation.mutate({ 
                                logFileId: file.id, 
                                aiConfig: selectedConfig 
                              })}
                              disabled={reprocessMutation.isPending || file.status === "processing"}
                            >
                              {reprocessMutation.isPending ? (
                                <RefreshCw className="h-3 w-3 animate-spin mr-1" />
                              ) : (
                                <Settings className="h-3 w-3 mr-1" />
                              )}
                              Reprocess
                            </Button>
                          </div>
                        </div>
                        {file.totalEntries && (
                          <div className="mt-2 text-sm text-slate-400">
                            {file.totalEntries.toLocaleString()} log entries
                          </div>
                        )}
                        
                        {/* Error Message Display */}
                        {file.status === 'failed' && file.errorMessage && (
                          <div className="mt-2 p-2 bg-red-950/50 border border-red-800/50 rounded text-xs">
                            <div className="text-red-300 font-medium mb-1">
                              {file.errorMessage.includes('timeout') ? 'Processing Timeout' : 'Processing Error'}
                            </div>
                            <div className="text-red-400">
                              {file.errorMessage.includes('timeout') 
                                ? 'File processing exceeded time limit. Click "Reprocess" to try again.'
                                : file.errorMessage
                              }
                            </div>
                          </div>
                        )}
                        
                        {/* Simple 3-Option Analysis */}
                        <div className="mt-3 pt-3 border-t border-slate-600">
                          <h4 className="text-sm font-medium text-slate-300 mb-3">Choose Analysis Method</h4>
                          <div className="grid grid-cols-1 gap-3">
                            {/* Traditional ML - Option 1 */}
                            <TraditionalAnalysisButton 
                              logFileId={file.id}
                              filename={file.originalName}
                              onAnalysisComplete={() => {
                                queryClient.invalidateQueries({ queryKey: ["/api/anomalies"] });
                                queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
                              }}
                            />

                            {/* Advanced ML - Option 2 */}
                            <AdvancedMLButton 
                              logFileId={file.id}
                              filename={file.originalName}
                              onAnalysisComplete={() => {
                                queryClient.invalidateQueries({ queryKey: ["/api/anomalies"] });
                                queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
                              }}
                            />

                            {/* AI-Powered - Option 3 */}
                            <AIAnalysisButton 
                              logFileId={file.id}
                              filename={file.originalName}
                              onAnalysisComplete={() => {
                                queryClient.invalidateQueries({ queryKey: ["/api/anomalies"] });
                                queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
                              }}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}