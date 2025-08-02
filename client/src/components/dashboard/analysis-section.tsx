import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, Download, Search, MoreHorizontal, Brain, BarChart3, Database, Eye, CheckSquare, X, Clock, Copy, ChevronDown, ChevronRight, Code } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { FullCycleTest } from "./full-cycle-test";
import { AnomalyDetailsModal } from "./anomaly-details-modal";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

export function AnalysisSection() {
  const [riskFilter, setRiskFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("24h");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const { data: anomalies, isLoading } = useQuery({
    queryKey: ["/api/anomalies"],
  });

  // Bulk update mutation for selected anomalies
  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ anomalyIds, updates }: { anomalyIds: string[]; updates: any }) => {
      const response = await fetch("/api/anomalies/bulk-update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anomalyIds, updates }),
      });
      if (!response.ok) throw new Error("Failed to update anomalies");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/anomalies"] });
      setSelectedRows(new Set());
      toast({ title: "Anomalies updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update anomalies", variant: "destructive" });
    }
  });

  const handleExport = () => {
    if (!anomalies || !Array.isArray(anomalies) || anomalies.length === 0) {
      return;
    }

    // Prepare data for export
    const exportData = anomalies.map((anomaly: any) => ({
      timestamp: new Date(anomaly.timestamp).toISOString(),
      anomalyType: anomaly.anomalyType,
      description: anomaly.description,
      riskScore: anomaly.riskScore,
      detectionMethod: anomaly.detectionMethod,
      detectionCategory: getDetectionMethodCategory(anomaly.detectionMethod || 'traditional'),
      status: anomaly.status,
      sourceIP: anomaly.sourceData?.sourceIP || 'N/A',
      destinationIP: anomaly.sourceData?.destinationIP || 'N/A',
      user: anomaly.sourceData?.user || 'N/A',
      action: anomaly.sourceData?.action || 'N/A',
      url: anomaly.sourceData?.url || 'N/A',
      category: anomaly.sourceData?.category || 'N/A'
    }));

    // Convert to CSV
    const headers = Object.keys(exportData[0]);
    const csvContent = [
      headers.join(','),
      ...exportData.map(row => 
        headers.map(header => {
          const value = (row as Record<string, any>)[header];
          // Escape commas and quotes in CSV
          return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
            ? `"${value.replace(/"/g, '""')}"` 
            : value;
        }).join(',')
      )
    ].join('\n');

    // Download CSV file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `anomalies-export-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getRiskBadgeColor = (riskScore: number) => {
    if (riskScore >= 9) return "bg-accent-red/20 text-accent-red";
    if (riskScore >= 7) return "bg-accent-amber/20 text-accent-amber";
    if (riskScore >= 4) return "bg-blue-500/20 text-blue-400";
    return "bg-accent-green/20 text-accent-green";
  };

  const getDetectionMethodCategory = (method: string) => {
    if (method === 'traditional_ml' || method === 'traditional') return 'Traditional';
    if (method === 'advanced_ml') return 'Advanced';
    if (method === 'openai' || method === 'gemini' || method === 'ai') return 'GenAI';
    return 'Unknown';
  };

  const getDetectionMethodBadgeColor = (category: string) => {
    switch (category) {
      case 'Traditional': return "bg-blue-500/20 text-blue-400";
      case 'Advanced': return "bg-purple-500/20 text-purple-400";
      case 'GenAI': return "bg-accent-green/20 text-accent-green";
      default: return "bg-gray-500/20 text-gray-400";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-accent-red/20 text-accent-red";
      case "under_review":
        return "bg-accent-blue/20 text-accent-blue";
      case "false_positive":
        return "bg-slate-600/20 text-slate-400";
      case "dismissed":
        return "bg-slate-500/20 text-slate-500";
      default:
        return "bg-accent-amber/20 text-accent-amber";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending": return "Pending Review";
      case "under_review": return "Under Review";
      case "confirmed": return "Confirmed";
      case "false_positive": return "False Positive";
      case "dismissed": return "Dismissed";
      default: return status;
    }
  };

  const handleRowSelection = (anomalyId: string, checked: boolean) => {
    const newSelection = new Set(selectedRows);
    if (checked) {
      newSelection.add(anomalyId);
    } else {
      newSelection.delete(anomalyId);
    }
    setSelectedRows(newSelection);
  };

  const handleBulkStatusUpdate = (newStatus: string) => {
    if (selectedRows.size === 0) return;
    
    bulkUpdateMutation.mutate({
      anomalyIds: Array.from(selectedRows),
      updates: { 
        status: newStatus,
        reviewedAt: new Date().toISOString()
      }
    });
  };

  const handleRowExpansion = (anomalyId: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(anomalyId)) {
      newExpandedRows.delete(anomalyId);
    } else {
      newExpandedRows.add(anomalyId);
    }
    setExpandedRows(newExpandedRows);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copied to clipboard" });
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast({ title: "Copied to clipboard" });
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getDetectionMethodBadge = (method: string) => {
    const category = getDetectionMethodCategory(method);
    const colorClass = getDetectionMethodBadgeColor(category);
    
    switch (category) {
      case 'Traditional':
        return (
          <Badge className={`${colorClass} border-0`}>
            <Database className="w-3 h-3 mr-1" />
            Traditional
          </Badge>
        );
      case 'Advanced':
        return (
          <Badge className={`${colorClass} border-0`}>
            <BarChart3 className="w-3 h-3 mr-1" />
            Advanced
          </Badge>
        );
      case 'GenAI':
        return (
          <Badge className={`${colorClass} border-0`}>
            <Brain className="w-3 h-3 mr-1" />
            GenAI
          </Badge>
        );
      default:
        return <Badge variant="secondary">{method}</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <header className="bg-dark-secondary border-b border-slate-700 px-6 py-4 -mx-6 -mt-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Analysis Results</h2>
            <p className="text-slate-400 mt-1">Review detected anomalies and risk assessments</p>
          </div>
          <div className="flex space-x-3 items-center">
            {/* Bulk Actions */}
            {selectedRows.size > 0 && (
              <div className="flex items-center space-x-2 mr-4">
                <span className="text-slate-400 text-sm">
                  {selectedRows.size} selected
                </span>
                <Select onValueChange={handleBulkStatusUpdate}>
                  <SelectTrigger className="w-48 bg-dark-primary border-slate-600 text-white">
                    <SelectValue placeholder="Bulk update status" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600 text-white">
                    <SelectItem value="under_review" className="text-white hover:bg-slate-700 focus:bg-slate-700">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Mark as Under Review
                      </div>
                    </SelectItem>
                    <SelectItem value="confirmed" className="text-white hover:bg-slate-700 focus:bg-slate-700">
                      <div className="flex items-center gap-2">
                        <CheckSquare className="h-4 w-4" />
                        Mark as Confirmed
                      </div>
                    </SelectItem>
                    <SelectItem value="false_positive" className="text-white hover:bg-slate-700 focus:bg-slate-700">
                      <div className="flex items-center gap-2">
                        <X className="h-4 w-4" />
                        Mark as False Positive
                      </div>
                    </SelectItem>
                    <SelectItem value="dismissed" className="text-white hover:bg-slate-700 focus:bg-slate-700">
                      <div className="flex items-center gap-2">
                        <X className="h-4 w-4" />
                        Dismiss
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <Button variant="outline" className="border-slate-600 text-slate-300">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
            <Button 
              onClick={handleExport}
              disabled={!anomalies || !Array.isArray(anomalies) || anomalies.length === 0}
              className="bg-accent-blue hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </header>

      {/* Full Cycle Test Section */}
      <FullCycleTest />

      {/* Filter Bar */}
      <Card className="bg-dark-secondary border-slate-700 mb-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Risk Level</label>
              <select 
                className="w-full bg-dark-tertiary border border-slate-600 rounded-lg px-3 py-2 text-white"
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
              >
                <option value="all">All Levels</option>
                <option value="critical">Critical (9-10)</option>
                <option value="high">High (7-8)</option>
                <option value="medium">Medium (4-6)</option>
                <option value="low">Low (1-3)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Time Range</label>
              <select 
                className="w-full bg-dark-tertiary border border-slate-600 rounded-lg px-3 py-2 text-white"
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
              >
                <option value="24h">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="custom">Custom range</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Source</label>
              <select className="w-full bg-dark-tertiary border border-slate-600 rounded-lg px-3 py-2 text-white">
                <option value="all">All Sources</option>
                <option value="zscaler">Zscaler Logs</option>
                <option value="custom">Custom Logs</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
              <select 
                className="w-full bg-dark-tertiary border border-slate-600 rounded-lg px-3 py-2 text-white"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All</option>
                <option value="pending">Pending Review</option>
                <option value="under_review">Under Review</option>
                <option value="confirmed">Confirmed</option>
                <option value="false_positive">False Positive</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card className="bg-dark-secondary border-slate-700">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-dark-tertiary/50">
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-300">
                      <input 
                        type="checkbox" 
                        className="accent-accent-blue"
                        checked={Array.isArray(anomalies) && selectedRows.size === anomalies.length && anomalies.length > 0}
                        onChange={(e) => {
                          if (Array.isArray(anomalies)) {
                            if (e.target.checked) {
                              setSelectedRows(new Set(anomalies.map((a: any) => a.id)));
                            } else {
                              setSelectedRows(new Set());
                            }
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead className="text-slate-300">Raw Log</TableHead>
                    <TableHead className="text-slate-300">Timestamp</TableHead>
                    <TableHead className="text-slate-300">Anomaly Type</TableHead>
                    <TableHead className="text-slate-300">Risk Score</TableHead>
                    <TableHead className="text-slate-300">Detection Method</TableHead>
                    <TableHead className="text-slate-300">Source</TableHead>
                    <TableHead className="text-slate-300">Status</TableHead>
                    <TableHead className="text-slate-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!anomalies || (Array.isArray(anomalies) && anomalies.length === 0) ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12">
                        <Search className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                        <p className="text-slate-400">No anomalies found</p>
                        <p className="text-xs text-slate-500 mt-2">
                          Try adjusting your filters or upload log files for analysis
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    Array.isArray(anomalies) && anomalies.map((anomaly: any) => (
                      <TableRow key={anomaly.id} className="border-slate-700 hover:bg-dark-tertiary/30">
                        <TableCell>
                          <input 
                            type="checkbox" 
                            className="accent-accent-blue"
                            checked={selectedRows.has(anomaly.id)}
                            onChange={(e) => handleRowSelection(anomaly.id, e.target.checked)}
                          />
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRowExpansion(anomaly.id)}
                              className="text-slate-400 hover:text-white p-1"
                            >
                              {expandedRows.has(anomaly.id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                            <div className="flex-1 min-w-0">
                              {expandedRows.has(anomaly.id) ? (
                                <div className="bg-dark-primary p-3 rounded-lg border border-slate-600">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-slate-400 flex items-center">
                                      <Code className="h-3 w-3 mr-1" />
                                      Raw Log Entry
                                      {anomaly.logLineNumber && (
                                        <span className="ml-2 bg-slate-700 px-2 py-1 rounded text-xs">
                                          Line {anomaly.logLineNumber}
                                        </span>
                                      )}
                                    </span>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => copyToClipboard(anomaly.rawLogEntry || JSON.stringify(anomaly.sourceData))}
                                      className="text-slate-400 hover:text-white p-1"
                                    >
                                      <Copy className="h-3 w-3" />
                                    </Button>
                                  </div>
                                  <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap break-all bg-slate-900/50 p-2 rounded border max-h-32 overflow-y-auto">
                                    {anomaly.rawLogEntry || JSON.stringify(anomaly.sourceData, null, 2)}
                                  </pre>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400 text-xs truncate">
                                    {anomaly.rawLogEntry ? 
                                      anomaly.rawLogEntry.substring(0, 50) + "..." : 
                                      "Click to view raw log"
                                    }
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(anomaly.rawLogEntry || JSON.stringify(anomaly.sourceData))}
                                    className="text-slate-400 hover:text-white p-1 ml-2"
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-white">
                          {formatTimestamp(anomaly.timestamp)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="text-white font-medium">
                              {anomaly.anomalyType.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                            </div>
                            <div className="text-slate-400 text-sm">{anomaly.description}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getRiskBadgeColor(parseFloat(anomaly.riskScore))}>
                            {parseFloat(anomaly.riskScore).toFixed(1)} {
                              parseFloat(anomaly.riskScore) >= 9 ? "Critical" :
                              parseFloat(anomaly.riskScore) >= 7 ? "High" :
                              parseFloat(anomaly.riskScore) >= 4 ? "Medium" : "Low"
                            }
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {getDetectionMethodBadge(anomaly.detectionMethod || 'traditional')}
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {anomaly.sourceData?.sourceIP || "Unknown"}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeColor(anomaly.status)}>
                            {getStatusLabel(anomaly.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-accent-blue hover:text-blue-400"
                              onClick={() => setSelectedAnomalyId(anomaly.id)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Details
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Pagination */}
          {Array.isArray(anomalies) && anomalies.length > 0 && (
            <div className="bg-dark-tertiary/30 px-6 py-3 border-t border-slate-700">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-400">
                  Showing <span className="font-medium text-white">1</span> to{" "}
                  <span className="font-medium text-white">{Math.min(20, anomalies.length)}</span> of{" "}
                  <span className="font-medium text-white">{anomalies.length}</span> results
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" className="border-slate-600 text-slate-400">
                    Previous
                  </Button>
                  <Button size="sm" className="bg-accent-blue">1</Button>
                  <Button variant="outline" size="sm" className="border-slate-600 text-slate-400">2</Button>
                  <Button variant="outline" size="sm" className="border-slate-600 text-slate-400">
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Anomaly Details Modal */}
      <AnomalyDetailsModal
        anomalyId={selectedAnomalyId}
        open={!!selectedAnomalyId}
        onClose={() => setSelectedAnomalyId(null)}
      />
    </div>
  );
}
