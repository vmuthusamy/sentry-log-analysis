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

  const { data: userMetrics, isLoading: userLoading } = useQuery({
    queryKey: ["/api/analytics/users", selectedDays],
    queryFn: () => fetch(`/api/analytics/users?days=${selectedDays}`).then(res => res.json())
  });

  const { data: dailyMetrics, isLoading: dailyLoading } = useQuery({
    queryKey: ["/api/analytics/daily", selectedDays],
    queryFn: () => fetch(`/api/analytics/daily?days=${selectedDays}`).then(res => res.json())
  });

  const { data: cohortData, isLoading: cohortLoading } = useQuery({
    queryKey: ["/api/analytics/cohorts"],
    queryFn: () => fetch(`/api/analytics/cohorts`).then(res => res.json())
  });

  const { data: accessLogs, isLoading: logsLoading } = useQuery({
    queryKey: ["/api/analytics/access-logs"],
    queryFn: () => fetch(`/api/analytics/access-logs?limit=50`).then(res => res.json())
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

  const isLoading = userLoading || dailyLoading || cohortLoading || logsLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SystemAccessGuard requiredRole="system">
      <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">User Analytics</h1>
          <p className="text-muted-foreground">Monitor user activity, retention, and platform usage</p>
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

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userMetrics?.summary?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              {userMetrics?.summary?.newUsers || 0} new this period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userMetrics?.summary?.activeUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active in last 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Uploads</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dailyMetrics?.summary?.totalUploads || 0}</div>
            <p className="text-xs text-muted-foreground">
              Files uploaded this period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Risk Users</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userMetrics?.summary?.atRiskUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Need engagement
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="activity">Daily Activity</TabsTrigger>
          <TabsTrigger value="retention">Retention</TabsTrigger>
          <TabsTrigger value="logs">Access Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Overview</CardTitle>
              <CardDescription>
                User activity levels and engagement metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {userMetrics?.users?.map((user: any) => (
                  <div key={user.userId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <p className="font-medium">{user.email}</p>
                      <div className="flex gap-2">
                        <Badge className={getActivityLevelColor(user.activityLevel)}>
                          {user.activityLevel}
                        </Badge>
                        <Badge className={getRetentionColor(user.retentionStatus)}>
                          {user.retentionStatus}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      <p>{user.totalUploads} uploads</p>
                      <p>{user.totalAnomaliesFound} anomalies</p>
                      <p>{user.daysSinceRegistration} days ago</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Activity Metrics</CardTitle>
              <CardDescription>
                Track daily user activity and platform usage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dailyMetrics?.metrics?.slice(-14).map((day: any) => (
                  <div key={day.date} className="flex items-center justify-between p-3 border rounded">
                    <div className="font-medium">{new Date(day.date).toLocaleDateString()}</div>
                    <div className="flex gap-4 text-sm">
                      <span>👥 {day.activeUsers} active</span>
                      <span>📁 {day.uploads} uploads</span>
                      <span>⚠️ {day.anomaliesDetected} anomalies</span>
                      <span>👤 {day.newUsers} new</span>
                    </div>
                  </div>
                ))}
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