import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, AlertTriangle, BarChart3, Clock, TrendingUp, TrendingDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function OverviewSection() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["/api/stats"],
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <header className="bg-dark-secondary border-b border-slate-700 px-6 py-4 -mx-6 -mt-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Security Overview</h2>
              <p className="text-slate-400 mt-1">Monitor and analyze log anomalies in real-time</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-slate-300">System healthy</p>
                <p className="text-xs text-accent-green">All systems operational</p>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-dark-secondary border-slate-700">
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const totalLogs = stats?.totalLogs || 0;
  const anomaliesDetected = stats?.anomaliesDetected || 0;
  const averageRiskScore = stats?.averageRiskScore || 0;
  const recentAnomalies = stats?.recentAnomalies || [];
  const highRiskAnomalies = stats?.highRiskAnomalies || [];

  return (
    <div className="p-6">
      {/* Header */}
      <header className="bg-dark-secondary border-b border-slate-700 px-6 py-4 -mx-6 -mt-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Security Overview</h2>
            <p className="text-slate-400 mt-1">Monitor and analyze log anomalies in real-time</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-slate-300">Last scan: 2 minutes ago</p>
              <p className="text-xs text-accent-green">System healthy</p>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-dark-secondary border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium">Total Logs Processed</p>
                <p className="text-3xl font-bold text-white mt-2">{totalLogs.toLocaleString()}</p>
                <p className="text-accent-green text-sm mt-1">
                  <TrendingUp className="inline w-4 h-4 mr-1" />
                  Active monitoring
                </p>
              </div>
              <div className="w-12 h-12 bg-accent-blue/10 rounded-lg flex items-center justify-center">
                <FileText className="text-accent-blue text-xl" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-dark-secondary border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium">Anomalies Detected</p>
                <p className="text-3xl font-bold text-white mt-2">{anomaliesDetected}</p>
                <p className="text-accent-amber text-sm mt-1">
                  <AlertTriangle className="inline w-4 h-4 mr-1" />
                  {Array.isArray(highRiskAnomalies) ? highRiskAnomalies.length : 0} high priority
                </p>
              </div>
              <div className="w-12 h-12 bg-accent-red/10 rounded-lg flex items-center justify-center">
                <AlertTriangle className="text-accent-red text-xl" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-dark-secondary border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium">Average Risk Score</p>
                <p className="text-3xl font-bold text-white mt-2">{averageRiskScore}</p>
                <p className="text-accent-green text-sm mt-1">
                  <TrendingDown className="inline w-4 h-4 mr-1" />
                  Within normal range
                </p>
              </div>
              <div className="w-12 h-12 bg-accent-amber/10 rounded-lg flex items-center justify-center">
                <BarChart3 className="text-accent-amber text-xl" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-dark-secondary border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm font-medium">Processing Time</p>
                <p className="text-3xl font-bold text-white mt-2">1.2s</p>
                <p className="text-accent-green text-sm mt-1">
                  <Clock className="inline w-4 h-4 mr-1" />
                  Avg per log
                </p>
              </div>
              <div className="w-12 h-12 bg-accent-green/10 rounded-lg flex items-center justify-center">
                <Clock className="text-accent-green text-xl" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent High-Risk Anomalies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-dark-secondary border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-white">Recent Anomalies</CardTitle>
              <span className="text-accent-blue hover:text-blue-400 text-sm font-medium cursor-pointer">View All</span>
            </div>
          </CardHeader>
          <CardContent>
            {!Array.isArray(recentAnomalies) || recentAnomalies.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                <p className="text-slate-400">No recent anomalies detected</p>
                <p className="text-xs text-slate-500 mt-2">Your system appears to be secure</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Array.isArray(recentAnomalies) && recentAnomalies.slice(0, 5).map((anomaly: any) => (
                  <div key={anomaly.id} className="flex items-center justify-between p-4 bg-dark-tertiary/50 rounded-lg border border-slate-600">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        parseFloat(anomaly.riskScore) >= 8 ? "bg-accent-red" : 
                        parseFloat(anomaly.riskScore) >= 6 ? "bg-accent-amber" : "bg-accent-green"
                      }`}></div>
                      <div>
                        <p className="text-white font-medium">{anomaly.description}</p>
                        <p className="text-slate-400 text-sm">
                          {new Date(anomaly.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        className={`${
                          parseFloat(anomaly.riskScore) >= 8 ? "bg-accent-red/20 text-accent-red" : 
                          parseFloat(anomaly.riskScore) >= 6 ? "bg-accent-amber/20 text-accent-amber" : "bg-accent-green/20 text-accent-green"
                        }`}
                      >
                        {parseFloat(anomaly.riskScore).toFixed(1)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chart Placeholder */}
        <Card className="bg-dark-secondary border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold text-white">Anomaly Trends</CardTitle>
              <select className="bg-dark-tertiary border border-slate-600 rounded-lg px-3 py-1 text-sm text-white">
                <option>Last 7 days</option>
                <option>Last 30 days</option>
                <option>Last 90 days</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-dark-tertiary/50 rounded-lg flex items-center justify-center border border-slate-600">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 text-slate-500 mx-auto mb-4" />
                <p className="text-slate-400">Anomaly trend chart</p>
                <p className="text-xs text-slate-500 mt-2">Chart visualization will be displayed here</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
