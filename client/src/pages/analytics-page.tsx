import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SystemAccessGuard } from "@/components/system-access-guard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, TrendingUp, Clock, Activity, AlertTriangle, UserCheck } from "lucide-react";

export default function AnalyticsPage() {
  const [selectedDays, setSelectedDays] = useState("30");

  const { data: systemOverview, isLoading: overviewLoading } = useQuery({
    queryKey: ["/api/system/analytics/overview", selectedDays],
    queryFn: () => fetch(`/api/system/analytics/overview?days=${selectedDays}`).then(res => res.json())
  });

  const { data: userMetrics, isLoading: userLoading } = useQuery({
    queryKey: ["/api/system/analytics/users", selectedDays],
    queryFn: () => fetch(`/api/system/analytics/users?days=${selectedDays}`).then(res => res.json())
  });

  const { data: securityAnalytics, isLoading: securityLoading } = useQuery({
    queryKey: ["/api/system/analytics/security", selectedDays],
    queryFn: () => fetch(`/api/system/analytics/security?days=${selectedDays}`).then(res => res.json())
  });

  const { data: activityTimeline, isLoading: timelineLoading } = useQuery({
    queryKey: ["/api/system/analytics/activity-timeline"],
    queryFn: () => fetch(`/api/system/analytics/activity-timeline?limit=50`).then(res => res.json())
  });

  const { data: systemHealth, isLoading: healthLoading } = useQuery({
    queryKey: ["/api/system/health"],
    queryFn: () => fetch(`/api/system/health`).then(res => res.json()),
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const getActivityLevelColor = (level: string) => {
    switch (level) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'light': return 'bg-gray-100 text-gray-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'heavy': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRetentionColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'at_risk': return 'bg-yellow-100 text-yellow-800';
      case 'churned': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isLoading = overviewLoading || userLoading || securityLoading || timelineLoading || healthLoading;

  if (isLoading) {
    return (
      <SystemAccessGuard requiredRole="system">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Loading system analytics...</p>
            </div>
          </div>
        </div>
      </SystemAccessGuard>
    );
  }

  return (
    <SystemAccessGuard requiredRole="system">
      <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">System Analytics</h1>
          <p className="text-muted-foreground">Complete visibility into user activity, security, and platform performance</p>
        </div>
        <Select value={selectedDays} onValueChange={setSelectedDays}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* System Health & Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userMetrics?.summary?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              {userMetrics?.summary?.newUsers || 0} new users
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemHealth?.activeUsers?.last24Hours || 0}</div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Data</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userMetrics?.summary?.totalFilesSizeMB?.toFixed(1) || 0} MB</div>
            <p className="text-xs text-muted-foreground">
              Files processed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemHealth?.errorStats?.errorRate ? (100 - systemHealth.errorStats.errorRate).toFixed(1) : 100}%</div>
            <p className="text-xs text-muted-foreground">
              Processing success
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Heavy Users</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userMetrics?.summary?.heavyUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              5+ uploads
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="uploads">File Uploads</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="timeline">Activity Timeline</TabsTrigger>
          <TabsTrigger value="health">System Health</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All User Activity</CardTitle>
              <CardDescription>
                Complete visibility into user behavior and platform usage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userMetrics?.users?.map((user: any) => (
                  <div key={user.userId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium">{user.email}</p>
                      <div className="flex gap-2">
                        <Badge variant="outline">
                          {user.role || 'user'}
                        </Badge>
                        <Badge className={user.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Registered {user.daysSinceRegistration} days ago
                      </p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>{user.totalUploads || 0} uploads</p>
                      <p>{user.totalAnomalies || 0} anomalies</p>
                      <p>{user.totalFileSizeMB || 0} MB processed</p>
                      <p>Risk: {user.avgRiskScore || 0}/10</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="uploads" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>File Upload Analytics</CardTitle>
              <CardDescription>
                Detailed analysis of all file uploads and processing
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{systemOverview?.fileAnalytics?.summary?.totalFiles || 0}</div>
                    <div className="text-sm text-muted-foreground">Total Files</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{systemOverview?.fileAnalytics?.summary?.totalSizeMB || 0} MB</div>
                    <div className="text-sm text-muted-foreground">Total Size</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{systemOverview?.fileAnalytics?.summary?.successRate || 0}%</div>
                    <div className="text-sm text-muted-foreground">Success Rate</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{systemOverview?.fileAnalytics?.summary?.avgProcessingTimeSeconds || 0}s</div>
                    <div className="text-sm text-muted-foreground">Avg Processing</div>
                  </div>
                </div>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {systemOverview?.fileAnalytics?.uploads?.slice(0, 20).map((upload: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-medium">{upload.fileName}</div>
                        <div className="text-sm text-muted-foreground">{upload.userEmail}</div>
                      </div>
                      <div className="text-right text-sm">
                        <div>📁 {upload.fileSizeMB} MB</div>
                        <div>⚠️ {upload.anomaliesFound} anomalies</div>
                        <Badge className={upload.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {upload.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="retention" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Retention Cohorts</CardTitle>
              <CardDescription>
                Weekly retention rates by user registration cohort
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {cohortData?.cohorts?.map((cohort: any) => (
                  <div key={cohort.cohort_week} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">
                        Week of {new Date(cohort.cohort_week).toLocaleDateString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {cohort.cohort_size} users registered
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline">Week 1: {cohort.week_1_retention}%</Badge>
                      <Badge variant="outline">Week 2: {cohort.week_2_retention}%</Badge>
                      <Badge variant="outline">Week 3: {cohort.week_3_retention}%</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Access Logs</CardTitle>
              <CardDescription>
                Real-time user activity and system events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {accessLogs?.logs?.map((log: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{log.eventType}</Badge>
                      <span className="text-muted-foreground">{log.userId.slice(0, 8)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>
    </SystemAccessGuard>
  );
}