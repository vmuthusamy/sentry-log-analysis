import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { RefreshCw, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface RetryUploadButtonProps {
  logFileId: string;
  filename: string;
  errorMessage?: string;
  onRetryComplete?: () => void;
}

export function RetryUploadButton({ 
  logFileId, 
  filename, 
  errorMessage,
  onRetryComplete 
}: RetryUploadButtonProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const retryMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/process-logs/${logFileId}`, {
        retry: true,
        aiConfig: { provider: 'openai', model: 'gpt-4o' } // Default retry with standard config
      });
      return await res.json();
    },
    onSuccess: (data) => {
      const isTimeout = errorMessage?.includes('timeout') || errorMessage?.includes('Processing timed out');
      toast({
        title: "File reprocessing started",
        description: isTimeout 
          ? `${filename} is being retried after timeout. Processing will be monitored for timeouts.`
          : `${filename} is being reprocessed. Please wait for completion.`,
      });
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/log-files"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/anomalies"] });
      
      onRetryComplete?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Retry failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const isTimeoutError = errorMessage?.includes('timeout') || errorMessage?.includes('Processing timed out');

  return (
    <Button
      size="sm"
      onClick={() => retryMutation.mutate()}
      disabled={retryMutation.isPending}
      className={`flex-1 ${isTimeoutError 
        ? 'bg-yellow-600/20 text-yellow-300 hover:bg-yellow-600/30 border border-yellow-600/50' 
        : 'bg-red-600/20 text-red-300 hover:bg-red-600/30 border border-red-600/50'
      }`}
    >
      {retryMutation.isPending ? (
        <>
          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
          Retrying...
        </>
      ) : (
        <>
          <Upload className="h-3 w-3 mr-1" />
          {isTimeoutError ? 'Retry Upload' : 'Retry Processing'}
        </>
      )}
    </Button>
  );
}