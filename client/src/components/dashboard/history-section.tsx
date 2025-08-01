import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, AlertTriangle, Download, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { RetryUploadButton } from "./retry-upload-button";

export function HistorySection() {
  const { data: logFiles, isLoading } = useQuery({
    queryKey: ["/api/log-files"],
  });

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return "< 1h ago";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <Check className="h-6 w-6 text-accent-green" />;
      case "processing":
        return <Loader2 className="h-6 w-6 text-accent-amber animate-spin" />;
      case "failed":
        return <AlertTriangle className="h-6 w-6 text-accent-red" />;
      default:
        return <Loader2 className="h-6 w-6 text-slate-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-accent-green/10";
      case "processing":
        return "bg-accent-amber/10";
      case "failed":
        return "bg-accent-red/10";
      default:
        return "bg-slate-600/10";
    }
  };

  const getStatusText = (status: string, errorMessage?: string) => {
    switch (status) {
      case "completed":
        return "Completed successfully";
      case "processing":
        return "Processing...";
      case "failed":
        if (errorMessage?.includes('timeout') || errorMessage?.includes('Processing timed out')) {
          return "Processing timed out - retry recommended";
        }
        return "Failed - see details";
      case "pending":
        return "Queued for processing";
      default:
        return "Unknown status";
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <header className="bg-dark-secondary border-b border-slate-700 px-6 py-4 -mx-6 -mt-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Processing History</h2>
            <p className="text-slate-400 mt-1">Track all your log analysis sessions</p>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto">
        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="bg-dark-secondary border-slate-700">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <Skeleton className="w-12 h-12 rounded-lg mr-4" />
                      <div>
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-12" />
                  </div>
                  <div className="space-y-3 mb-4">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-9 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !Array.isArray(logFiles) || logFiles.length === 0 ? (
          <Card className="bg-dark-secondary border-slate-700">
            <CardContent className="p-12 text-center">
              <Info className="h-16 w-16 text-slate-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Processing History</h3>
              <p className="text-slate-400 mb-6">
                Upload your first log file to start tracking analysis sessions
              </p>
              <Button className="bg-accent-blue hover:bg-blue-600">
                Upload Log Files
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {logFiles.map((logFile: any) => (
              <Card key={logFile.id} className="bg-dark-secondary border-slate-700">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className={`w-12 h-12 ${getStatusColor(logFile.status)} rounded-lg flex items-center justify-center mr-4`}>
                        {getStatusIcon(logFile.status)}
                      </div>
                      <div>
                        <h4 className="text-white font-semibold truncate max-w-32" title={logFile.originalName}>
                          {logFile.originalName}
                        </h4>
                        <p className="text-slate-400 text-sm">{getStatusText(logFile.status, logFile.errorMessage)}</p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500">
                      {formatTimeAgo(logFile.uploadedAt)}
                    </span>
                  </div>
                  
                  <div className="space-y-3 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">File size:</span>
                      <span className="text-white">{formatFileSize(logFile.fileSize)}</span>
                    </div>
                    {logFile.totalLogs && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Total logs:</span>
                        <span className="text-white">{logFile.totalLogs.toLocaleString()}</span>
                      </div>
                    )}
                    {logFile.status === "processing" && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Progress:</span>
                        <span className="text-white">Processing...</span>
                      </div>
                    )}
                    {logFile.status === "completed" && logFile.processedAt && (
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Completed:</span>
                        <span className="text-white">{formatTimeAgo(logFile.processedAt)}</span>
                      </div>
                    )}
                    {logFile.status === "failed" && logFile.errorMessage && (
                      <div className="text-xs text-accent-red bg-red-950/30 border border-red-800/30 rounded p-2">
                        <div className="font-medium mb-1">
                          {logFile.errorMessage.includes('timeout') ? 'Processing Timeout' : 'Processing Error'}
                        </div>
                        <div className="text-red-300">
                          {logFile.errorMessage.includes('timeout') 
                            ? 'File processing exceeded time limit. Use the retry button below.'
                            : logFile.errorMessage
                          }
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-2">
                    {logFile.status === "completed" ? (
                      <>
                        <Button 
                          size="sm" 
                          className="flex-1 bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20"
                        >
                          View Results
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-slate-600 text-slate-400 hover:text-white hover:bg-slate-600"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </>
                    ) : logFile.status === "failed" ? (
                      <>
                        <RetryUploadButton
                          logFileId={logFile.id}
                          filename={logFile.originalName}
                          errorMessage={logFile.errorMessage}
                          onRetryComplete={() => {
                            // Optional: Add any specific retry completion logic
                          }}
                        />
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-slate-600 text-slate-400 hover:text-white hover:bg-slate-600"
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                      </>
                    ) : logFile.status === "processing" ? (
                      <Button 
                        size="sm" 
                        className="w-full bg-accent-red/10 text-accent-red hover:bg-accent-red/20"
                      >
                        Cancel Processing
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        className="w-full bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20"
                        disabled
                      >
                        Queued
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
