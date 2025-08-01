import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Filter, Download, Search, MoreHorizontal, Brain, BarChart3, Database } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { FullCycleTest } from "./full-cycle-test";

export function AnalysisSection() {
  const [riskFilter, setRiskFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("24h");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: anomalies, isLoading } = useQuery({
    queryKey: ["/api/anomalies"],
  });

  const handleExport = () => {
    if (!anomalies || anomalies.length === 0) {
      return;
    }

    // Prepare data for export
    const exportData = anomalies.map((anomaly: any) => ({
      timestamp: new Date(anomaly.timestamp).toISOString(),
      anomalyType: anomaly.anomalyType,
      description: anomaly.description,
      riskScore: anomaly.riskScore,
      detectionMethod: anomaly.detectionMethod,
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
          const value = (row as any)[header];
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

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "reviewed":
        return "bg-accent-green/20 text-accent-green";
      case "false_positive":
        return "bg-slate-600/20 text-slate-400";
      default:
        return "bg-accent-amber/20 text-accent-amber";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getDetectionMethodBadge = (method: string) => {
    switch (method) {
      case 'traditional':
        return (
          <Badge className="bg-green-100 text-green-800">
            <Database className="w-3 h-3 mr-1" />
            Traditional ML
          </Badge>
        );
      case 'advanced':
        return (
          <Badge className="bg-purple-100 text-purple-800">
            <BarChart3 className="w-3 h-3 mr-1" />
            Advanced ML
          </Badge>
        );
      case 'ai':
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <Brain className="w-3 h-3 mr-1" />
            AI-Powered
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
          <div className="flex space-x-3">
            <Button variant="outline" className="border-slate-600 text-slate-300">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
            <Button 
              onClick={handleExport}
              disabled={!anomalies || anomalies.length === 0}
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
                <option value="pending">Pending</option>
                <option value="reviewed">Reviewed</option>
                <option value="false_positive">False Positive</option>
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
                      <input type="checkbox" className="accent-accent-blue" />
                    </TableHead>
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
                      <TableCell colSpan={8} className="text-center py-12">
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
                          <input type="checkbox" className="accent-accent-blue" />
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
                            {anomaly.status === "pending" ? "Pending Review" :
                             anomaly.status === "reviewed" ? "Reviewed" : "False Positive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button variant="ghost" size="sm" className="text-accent-blue hover:text-blue-400">
                              View Details
                            </Button>
                            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                              <MoreHorizontal className="h-4 w-4" />
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
    </div>
  );
}
