import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, Activity, BarChart3, FileText, Eye, Brain, Upload } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function MetricsSection() {
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  const { data: metrics, isLoading } = useQuery({
    queryKey: ["/api/metrics", timeRange],
    queryFn: () => fetch(`/api/metrics?timeRange=${timeRange}`).then(res => res.json()),
  });

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return "text-accent-green";
    if (rate >= 80) return "text-accent-amber";
    return "text-accent-red";
  };

  const MetricCard = ({ 
    title, 
    icon: Icon, 
    total, 
    success, 
    failure, 
    successRate,
    additionalInfo 
  }: {
    title: string;
    icon: any;
    total: number;
    success: number;
    failure: number;
    successRate: number;
    additionalInfo?: string;
  }) => (
    <Card className="bg-dark-secondary border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
            <Icon className="h-5 w-5 text-accent-blue" />
            {title}
          </CardTitle>
          <Badge className={`${getSuccessRateColor(successRate)} bg-opacity-20`}>
            {successRate.toFixed(1)}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Total</span>
            <span className="text-white font-mono">{total}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-accent-green">Success</span>
            <span className="text-accent-green font-mono">{success}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-accent-red">Failures</span>
            <span className="text-accent-red font-mono">{failure}</span>
          </div>
          {additionalInfo && (
            <div className="pt-2 border-t border-slate-700">
              <span className="text-slate-400 text-sm">{additionalInfo}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <header className="bg-dark-secondary border-b border-slate-700 px-6 py-4 -mx-6 -mt-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Success & Failure Metrics</h2>
            <p className="text-slate-400 mt-1">Track system performance and reliability</p>
          </div>
          <div className="flex items-center space-x-3">
            <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
              <SelectTrigger className="w-40 bg-dark-tertiary border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-dark-tertiary border-slate-600">
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="border-slate-600 text-slate-300">
              <BarChart3 className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </header>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="File Uploads"
          icon={Upload}
          total={metrics?.fileUploads?.total || 0}
          success={metrics?.fileUploads?.success || 0}
          failure={metrics?.fileUploads?.failure || 0}
          successRate={metrics?.fileUploads?.successRate || 0}
        />
        
        <MetricCard
          title="Analysis Views"
          icon={Eye}
          total={metrics?.analysisViews?.total || 0}
          success={metrics?.analysisViews?.success || 0}
          failure={metrics?.analysisViews?.failure || 0}
          successRate={metrics?.analysisViews?.successRate || 0}
        />
        
        <MetricCard
          title="AI Analysis"
          icon={Brain}
          total={metrics?.aiAnalysis?.total || 0}
          success={metrics?.aiAnalysis?.success || 0}
          failure={metrics?.aiAnalysis?.failure || 0}
          successRate={metrics?.aiAnalysis?.successRate || 0}
        />
        
        <MetricCard
          title="Anomaly Detection"
          icon={Activity}
          total={metrics?.anomalyDetection?.total || 0}
          success={metrics?.anomalyDetection?.success || 0}
          failure={metrics?.anomalyDetection?.failure || 0}
          successRate={metrics?.anomalyDetection?.successRate || 0}
          additionalInfo={`Avg: ${(metrics?.anomalyDetection?.avgAnomalies || 0).toFixed(1)} anomalies`}
        />
      </div>

      {/* Detailed Breakdown */}
      <Tabs defaultValue="ai-providers" className="space-y-6">
        <TabsList className="bg-dark-tertiary">
          <TabsTrigger value="ai-providers" className="data-[state=active]:bg-accent-blue">
            AI Provider Performance
          </TabsTrigger>
          <TabsTrigger value="trends" className="data-[state=active]:bg-accent-blue">
            Success Trends
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai-providers">
          <Card className="bg-dark-secondary border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">AI Provider Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics?.aiAnalysis?.byProvider && Object.entries(metrics.aiAnalysis.byProvider).map(([provider, stats]: [string, any]) => (
                  <div key={provider} className="flex items-center justify-between p-4 bg-dark-tertiary rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-accent-blue"></div>
                      <span className="text-white font-medium capitalize">
                        {provider.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-slate-400 text-sm">Total</div>
                        <div className="text-white font-mono">{stats.total}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-slate-400 text-sm">Success Rate</div>
                        <div className={`font-mono ${getSuccessRateColor(stats.successRate)}`}>
                          {stats.successRate.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {(!metrics?.aiAnalysis?.byProvider || Object.keys(metrics.aiAnalysis.byProvider).length === 0) && (
                  <div className="text-center py-8 text-slate-400">
                    No AI provider data available for the selected time range
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card className="bg-dark-secondary border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Overall System Health</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white">Quick Stats</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Total Operations</span>
                      <span className="text-white font-mono">
                        {(metrics?.fileUploads?.total || 0) + (metrics?.analysisViews?.total || 0) + (metrics?.aiAnalysis?.total || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Overall Success Rate</span>
                      <span className="text-accent-green font-mono">
                        {(
                          ((metrics?.fileUploads?.success || 0) + (metrics?.analysisViews?.success || 0) + (metrics?.aiAnalysis?.success || 0)) /
                          Math.max(1, (metrics?.fileUploads?.total || 0) + (metrics?.analysisViews?.total || 0) + (metrics?.aiAnalysis?.total || 0)) * 100
                        ).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-white">System Status</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-accent-green"></div>
                      <span className="text-slate-300">File Upload System</span>
                      <Badge className="ml-auto bg-accent-green/20 text-accent-green">
                        {metrics?.fileUploads?.successRate >= 90 ? 'Healthy' : 'Degraded'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-accent-blue"></div>
                      <span className="text-slate-300">AI Analysis System</span>
                      <Badge className="ml-auto bg-accent-blue/20 text-accent-blue">
                        {metrics?.aiAnalysis?.successRate >= 85 ? 'Healthy' : 'Degraded'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}