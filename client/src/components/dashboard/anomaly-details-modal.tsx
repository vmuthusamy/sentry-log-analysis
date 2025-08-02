import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Brain, BarChart3, Database, User, Clock, AlertTriangle, FileText, MessageSquare } from "lucide-react";
import { QuickWebhookSetup } from "@/components/webhooks/quick-webhook-setup";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

interface AnomalyDetailsModalProps {
  anomalyId: string | null;
  open: boolean;
  onClose: () => void;
}

export function AnomalyDetailsModal({ anomalyId, open, onClose }: AnomalyDetailsModalProps) {
  const [status, setStatus] = useState("");
  const [analystNotes, setAnalystNotes] = useState("");
  const [priority, setPriority] = useState("");

  const { data: anomaly, isLoading, error } = useQuery({
    queryKey: ["/api/anomalies", anomalyId],
    enabled: !!anomalyId && open,
    retry: false,
  });

  const updateAnomalyMutation = useMutation({
    mutationFn: async (updates: any) => {
      return await apiRequest(`/api/anomalies/${anomalyId}`, "PATCH", updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/anomalies"] });
      toast({ title: "Anomaly updated successfully" });
      onClose();
    },
    onError: (error) => {
      console.error("Anomaly update error:", error);
      toast({ 
        title: "Failed to update anomaly", 
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive" 
      });
    }
  });

  const handleStatusChange = () => {
    if (!status) return;
    
    updateAnomalyMutation.mutate({
      status,
      analystNotes: analystNotes || undefined,
      priority: priority || undefined,
      reviewedAt: new Date().toISOString(),
    });
  };

  const getRiskBadgeColor = (riskScore: number) => {
    if (riskScore >= 9) return "bg-accent-red/20 text-accent-red";
    if (riskScore >= 7) return "bg-accent-amber/20 text-accent-amber";
    if (riskScore >= 4) return "bg-blue-500/20 text-blue-400";
    return "bg-accent-green/20 text-accent-green";
  };

  const getDetectionMethodBadge = (method: string) => {
    if (method === 'traditional_ml' || method === 'traditional') {
      return (
        <Badge className="bg-blue-500/20 text-blue-400 border-0">
          <Database className="w-3 h-3 mr-1" />
          Traditional
        </Badge>
      );
    }
    if (method === 'advanced_ml') {
      return (
        <Badge className="bg-purple-500/20 text-purple-400 border-0">
          <BarChart3 className="w-3 h-3 mr-1" />
          Advanced
        </Badge>
      );
    }
    if (method === 'openai' || method === 'gemini' || method === 'ai') {
      return (
        <Badge className="bg-accent-green/20 text-accent-green border-0">
          <Brain className="w-3 h-3 mr-1" />
          GenAI
        </Badge>
      );
    }
    return <Badge variant="secondary">{method}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-dark-secondary border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-accent-amber" />
            Anomaly Details
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <div className="animate-pulse bg-dark-tertiary h-4 rounded w-3/4"></div>
            <div className="animate-pulse bg-dark-tertiary h-4 rounded w-1/2"></div>
            <div className="animate-pulse bg-dark-tertiary h-20 rounded"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-accent-red mx-auto mb-4" />
            <h3 className="text-white text-lg font-semibold mb-2">Failed to Load Anomaly Details</h3>
            <p className="text-slate-400 mb-4">
              {error instanceof Error ? error.message : 'Unable to fetch anomaly information'}
            </p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Retry
            </Button>
          </div>
        ) : anomaly ? (
          <div className="space-y-6">
            {/* Header Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-dark-tertiary border-slate-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Risk Score</span>
                    <Badge className={getRiskBadgeColor(parseFloat((anomaly as any).riskScore))}>
                      {parseFloat((anomaly as any).riskScore).toFixed(1)}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-dark-tertiary border-slate-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Detection Method</span>
                    {getDetectionMethodBadge((anomaly as any).detectionMethod)}
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-dark-tertiary border-slate-600">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Timestamp</span>
                    <span className="text-white text-sm">
                      {new Date((anomaly as any).timestamp).toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Anomaly Information */}
            <Card className="bg-dark-tertiary border-slate-600">
              <CardHeader>
                <CardTitle className="text-white text-lg">Anomaly Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-slate-300 font-medium mb-2">Type</h4>
                  <p className="text-white">
                    {(anomaly as any).anomalyType.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </p>
                </div>
                <div>
                  <h4 className="text-slate-300 font-medium mb-2">Description</h4>
                  <p className="text-slate-200">{(anomaly as any).description}</p>
                </div>
              </CardContent>
            </Card>

            {/* Raw Log Entry */}
            {(anomaly as any).rawLogEntry && (
              <Card className="bg-dark-tertiary border-slate-600">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Raw Log Entry
                    {(anomaly as any).logLineNumber && (
                      <Badge variant="outline" className="text-xs">
                        Line {(anomaly as any).logLineNumber}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="bg-dark-primary p-4 rounded-lg text-sm text-slate-300 overflow-x-auto font-mono">
                    {(anomaly as any).rawLogEntry}
                  </pre>
                </CardContent>
              </Card>
            )}

            {/* Source Data */}
            <Card className="bg-dark-tertiary border-slate-600">
              <CardHeader>
                <CardTitle className="text-white text-lg">Source Data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries((anomaly as any).sourceData || {}).map(([key, value]) => (
                    <div key={key}>
                      <span className="text-slate-400 text-sm block">
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </span>
                      <span className="text-white">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* AI Analysis */}
            {(anomaly as any).aiAnalysis && (
              <Card className="bg-dark-tertiary border-slate-600">
                <CardHeader>
                  <CardTitle className="text-white text-lg flex items-center gap-2">
                    <Brain className="h-5 w-5 text-accent-green" />
                    AI Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries((anomaly as any).aiAnalysis || {}).map(([key, value]) => (
                      <div key={key}>
                        <span className="text-slate-400 text-sm block font-medium">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </span>
                        <p className="text-slate-200 mt-1">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <Separator className="bg-slate-600" />

            {/* SOC Analyst Actions */}
            <Card className="bg-dark-tertiary border-slate-600">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-accent-blue" />
                  SOC Analyst Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Update Status
                    </label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger className="bg-dark-primary border-slate-600 text-white">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600 text-white">
                        <SelectItem value="under_review" className="text-white hover:bg-slate-700 focus:bg-slate-700">Under Review</SelectItem>
                        <SelectItem value="confirmed" className="text-white hover:bg-slate-700 focus:bg-slate-700">Confirmed Threat</SelectItem>
                        <SelectItem value="false_positive" className="text-white hover:bg-slate-700 focus:bg-slate-700">False Positive</SelectItem>
                        <SelectItem value="dismissed" className="text-white hover:bg-slate-700 focus:bg-slate-700">Dismissed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Priority
                    </label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger className="bg-dark-primary border-slate-600 text-white">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600 text-white">
                        <SelectItem value="low" className="text-white hover:bg-slate-700 focus:bg-slate-700">Low</SelectItem>
                        <SelectItem value="medium" className="text-white hover:bg-slate-700 focus:bg-slate-700">Medium</SelectItem>
                        <SelectItem value="high" className="text-white hover:bg-slate-700 focus:bg-slate-700">High</SelectItem>
                        <SelectItem value="critical" className="text-white hover:bg-slate-700 focus:bg-slate-700">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Analyst Notes
                  </label>
                  <Textarea
                    value={analystNotes}
                    onChange={(e) => setAnalystNotes(e.target.value)}
                    placeholder="Add your analysis notes, investigation findings, or action taken..."
                    className="bg-dark-primary border-slate-600 text-white placeholder-slate-500"
                    rows={4}
                  />
                </div>

                <div className="flex gap-3">
                  <Button 
                    onClick={handleStatusChange}
                    disabled={!status || updateAnomalyMutation.isPending}
                    className="bg-accent-blue hover:bg-blue-600"
                  >
                    {updateAnomalyMutation.isPending ? "Updating..." : "Update Anomaly"}
                  </Button>
                  <QuickWebhookSetup 
                    anomalyType={(anomaly as any)?.anomalyType}
                    riskScore={parseFloat((anomaly as any)?.riskScore || '0')}
                  />
                  <Button variant="outline" onClick={onClose} className="border-slate-600 text-slate-300">
                    Close
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}