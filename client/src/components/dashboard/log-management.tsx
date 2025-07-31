import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, RefreshCw, Settings, Calendar, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import AISettings from "./ai-settings";

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

  const { data: logFiles, isLoading } = useQuery<LogFile[]>({
    queryKey: ["/api/log-files"],
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Completed</Badge>;
      case "processing":
        return <Badge className="bg-blue-100 text-blue-800"><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Processing</Badge>;
      case "failed":
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Configuration Panel */}
        <div className="lg:col-span-1">
          <AISettings onConfigChange={setSelectedConfig} />
        </div>

        {/* Log Files Table */}
        <div className="lg:col-span-2">
          <Card className="bg-dark-secondary border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <FileText className="h-5 w-5" />
                Uploaded Log Files
              </CardTitle>
              <p className="text-sm text-slate-400">
                Reprocess files with different AI configurations for comparison
              </p>
            </CardHeader>
            <CardContent>
              {!logFiles || logFiles.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-slate-400">No log files uploaded yet</p>
                  <p className="text-sm text-slate-500">Upload files to see them here</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-600">
                        <TableHead className="text-slate-300">File Name</TableHead>
                        <TableHead className="text-slate-300">Size</TableHead>
                        <TableHead className="text-slate-300">Status</TableHead>
                        <TableHead className="text-slate-300">Uploaded</TableHead>
                        <TableHead className="text-slate-300">Entries</TableHead>
                        <TableHead className="text-slate-300">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logFiles.map((file) => (
                        <TableRow key={file.id} className="border-slate-600">
                          <TableCell className="text-white">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-slate-400" />
                              <div>
                                <div className="font-medium">{file.originalName}</div>
                                <div className="text-xs text-slate-400">{file.filename}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-300">{formatFileSize(file.fileSize)}</TableCell>
                          <TableCell>{getStatusBadge(file.status)}</TableCell>
                          <TableCell className="text-slate-300">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(file.uploadedAt)}
                            </div>
                          </TableCell>
                          <TableCell className="text-slate-300">
                            {file.totalEntries ? file.totalEntries.toLocaleString() : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
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
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {selectedConfig && (
        <Card className="bg-blue-950/50 border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-blue-200">
              <Settings className="h-4 w-4" />
              <span className="font-medium">AI Configuration Selected</span>
            </div>
            <p className="text-sm text-blue-300 mt-1">
              Files will be reprocessed with {selectedConfig.provider} AI using {selectedConfig.tier} tier models.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}