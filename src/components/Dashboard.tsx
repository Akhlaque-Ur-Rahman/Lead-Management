import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Users, Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import { useAuth } from './AuthContext';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';

export function Dashboard() {
  const { user } = useAuth();
  
  // Mock data - in real app this would come from your Excel data
  const stats = {
    totalLeads: 1247,
    activeLeads: 892,
    followUpsDue: 23,
    conversionRate: 18.5
  };

  const recentActivity = [
    { id: 1, type: 'New Lead', company: 'ABC Enterprises Pvt Ltd', status: 'Hot', time: '2 hours ago' },
    { id: 2, type: 'Follow-up', company: 'XYZ Corporation', status: 'Warm', time: '4 hours ago' },
    { id: 3, type: 'Converted', company: 'PQR Solutions', status: 'Closed', time: '1 day ago' },
    { id: 4, type: 'Follow-up Due', company: 'LMN Industries', status: 'Cold', time: 'Today' },
  ];

  const upcomingFollowUps = [
    { company: 'Tech Solutions Ltd', date: '2025-09-29', priority: 'High' },
    { company: 'Marketing Corp', date: '2025-09-30', priority: 'Medium' },
    { company: 'Finance Group', date: '2025-10-01', priority: 'High' },
    { company: 'Retail Chain', date: '2025-10-02', priority: 'Low' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1>Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.name}! Overview of your MCA lead management activities
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLeads.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Leads</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeLeads.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +8% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Follow-ups Due</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.followUpsDue}</div>
            <p className="text-xs text-muted-foreground">
              Requires immediate attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversionRate}%</div>
            <p className="text-xs text-muted-foreground">
              +2.5% from last month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates from your lead pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{activity.company}</p>
                    <p className="text-xs text-muted-foreground">{activity.type}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={
                      activity.status === 'Hot' ? 'destructive' :
                      activity.status === 'Warm' ? 'default' :
                      activity.status === 'Cold' ? 'secondary' : 'outline'
                    }>
                      {activity.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Follow-ups */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Follow-ups</CardTitle>
            <CardDescription>Scheduled meetings and calls</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingFollowUps.map((followUp, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{followUp.company}</p>
                    <p className="text-xs text-muted-foreground">{followUp.date}</p>
                  </div>
                  <Badge variant={
                    followUp.priority === 'High' ? 'destructive' :
                    followUp.priority === 'Medium' ? 'default' : 'secondary'
                  }>
                    {followUp.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lead Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Status Distribution</CardTitle>
          <CardDescription>Current pipeline status breakdown</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Hot Leads</span>
              <span>156 (12.5%)</span>
            </div>
            <Progress value={12.5} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Warm Leads</span>
              <span>423 (33.9%)</span>
            </div>
            <Progress value={33.9} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Cold Leads</span>
              <span>313 (25.1%)</span>
            </div>
            <Progress value={25.1} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Converted</span>
              <span>231 (18.5%)</span>
            </div>
            <Progress value={18.5} className="h-2" />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Lost/Closed</span>
              <span>124 (9.9%)</span>
            </div>
            <Progress value={9.9} className="h-2" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}