import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Users, Calendar, TrendingUp, AlertCircle, BarChart3, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useLeads } from './LeadsContext';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';

// Helper function to get local date string
const getLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function Dashboard() {
  const { user, users } = useAuth();
  const { leads, lostLeads, getDirectorFollowUpsForDate } = useLeads();
  
  // Filter leads based on user role - Sales Users see only their own
  const userLeads = user?.role === 'sales_user' 
    ? leads.filter(l => l.assignedTo === user.id)
    : leads;
    
  const userLostLeads = user?.role === 'sales_user'
    ? lostLeads.filter(ll => ll.lostBy === user.id)
    : lostLeads;
  
  // Calculate real statistics
  const stats = {
    totalLeads: userLeads.length,
    hotLeads: userLeads.filter(l => l.status === 'Hot').length,
    warmLeads: userLeads.filter(l => l.status === 'Warm').length,
    coldLeads: userLeads.filter(l => l.status === 'Cold').length,
    convertedLeads: userLeads.filter(l => l.status === 'Converted').length,
    lostLeadsCount: userLostLeads.length,
    totalDirectors: userLeads.reduce((sum, lead) => sum + (lead.directors?.length || 0), 0),
  };

  // Get today's and upcoming follow-ups
  const today = new Date();
  const todayString = getLocalDateString(today);
  let todayFollowUps = getDirectorFollowUpsForDate(todayString);
  
  // Filter follow-ups for sales users - only their assigned leads
  if (user?.role === 'sales_user') {
    todayFollowUps = todayFollowUps.filter(item => item.lead.assignedTo === user.id);
  }
  
  // Get next 7 days follow-ups
  const upcomingFollowUps: Array<{
    lead: any;
    director: any;
    followUp: any;
    daysAway: number;
  }> = [];
  
  for (let i = 0; i <= 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateString = getLocalDateString(date);
    let dayFollowUps = getDirectorFollowUpsForDate(dateString);
    
    // Filter for sales users
    if (user?.role === 'sales_user') {
      dayFollowUps = dayFollowUps.filter(item => item.lead.assignedTo === user.id);
    }
    
    dayFollowUps.forEach(item => {
      upcomingFollowUps.push({
        ...item,
        daysAway: i
      });
    });
  }

  // Sort by date and time
  upcomingFollowUps.sort((a, b) => {
    const dateCompare = a.followUp.date.localeCompare(b.followUp.date);
    if (dateCompare !== 0) return dateCompare;
    return a.followUp.time.localeCompare(b.followUp.time);
  });

  // Get user's assigned leads
  const myLeads = user?.role === 'sales_user' 
    ? leads.filter(l => l.assignedTo === user.id)
    : leads;

  // Calculate conversion rate
  const totalProcessed = stats.convertedLeads + stats.lostLeadsCount;
  const conversionRate = totalProcessed > 0 
    ? ((stats.convertedLeads / totalProcessed) * 100).toFixed(1)
    : 0;

  // Status distribution percentages
  const totalActive = leads.length;
  const statusPercentages = {
    hot: totalActive > 0 ? Math.round((stats.hotLeads / totalActive) * 100) : 0,
    warm: totalActive > 0 ? Math.round((stats.warmLeads / totalActive) * 100) : 0,
    cold: totalActive > 0 ? Math.round((stats.coldLeads / totalActive) * 100) : 0,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Hot': return 'destructive';
      case 'Warm': return 'default';
      case 'Cold': return 'secondary';
      case 'Converted': return 'default';
      default: return 'secondary';
    }
  };

  const getPriorityBadge = (daysAway: number) => {
    if (daysAway === 0) return <Badge variant="destructive">Today</Badge>;
    if (daysAway === 1) return <Badge variant="default">Tomorrow</Badge>;
    return <Badge variant="secondary">In {daysAway} days</Badge>;
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return 'Unassigned';
    const foundUser = users.find(u => u.id === userId);
    return foundUser ? foundUser.name : 'Unassigned';
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1>Dashboard</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Welcome back, {user?.name}! Here's your LMS overview
        </p>
      </div>

      {/* Stats Cards Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Active Leads</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{stats.totalLeads}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalDirectors} total directors
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Hot Leads</CardTitle>
            <TrendingUp className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{stats.hotLeads}</div>
            <Progress value={statusPercentages.hot} className="mt-2 h-1" />
            <p className="text-xs text-muted-foreground mt-1">
              {statusPercentages.hot}% of active leads
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Today's Follow-ups</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{todayFollowUps.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {todayFollowUps.length > 0 ? 'Requires attention' : 'All clear for today'}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Conversion Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{conversionRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.convertedLeads} converted, {stats.lostLeadsCount} lost
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Warm Leads</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{stats.warmLeads}</div>
            <Progress value={statusPercentages.warm} className="mt-2 h-1" />
            <p className="text-xs text-muted-foreground mt-1">
              {statusPercentages.warm}% of active leads
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Cold Leads</CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{stats.coldLeads}</div>
            <Progress value={statusPercentages.cold} className="mt-2 h-1" />
            <p className="text-xs text-muted-foreground mt-1">
              {statusPercentages.cold}% of active leads
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Converted</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{stats.convertedLeads}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Successfully closed deals
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Lost Leads</CardTitle>
            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{stats.lostLeadsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Marked as lost
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Today's Follow-ups */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Today's Follow-ups</CardTitle>
                <CardDescription>
                  {todayFollowUps.length} scheduled for today
                </CardDescription>
              </div>
              <Badge variant={todayFollowUps.length > 0 ? "destructive" : "secondary"}>
                {todayFollowUps.length}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {todayFollowUps.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No follow-ups scheduled for today</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-3">
                  {todayFollowUps
                    .sort((a, b) => a.followUp.time.localeCompare(b.followUp.time))
                    .map((item, index) => (
                      <div key={index} className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{formatTime(item.followUp.time)}</span>
                          </div>
                          <Badge variant={getStatusColor(item.lead.status)}>
                            {item.lead.status}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <p className="font-medium text-sm">{item.lead.companyName}</p>
                          <p className="text-xs text-muted-foreground">
                            Director: {item.director.firstName} {item.director.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Assigned to: {getUserName(item.lead.assignedTo)}
                          </p>
                          {item.followUp.remark && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-2 p-2 bg-muted rounded">
                              {item.followUp.remark}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Follow-ups (Next 7 days) */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Upcoming Follow-ups</CardTitle>
                <CardDescription>
                  Next 7 days - {upcomingFollowUps.length} scheduled
                </CardDescription>
              </div>
              <Badge variant="secondary">{upcomingFollowUps.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingFollowUps.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No upcoming follow-ups in next 7 days</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-3">
                  {upcomingFollowUps.slice(0, 10).map((item, index) => (
                    <div key={index} className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {new Date(item.followUp.date).toLocaleDateString('en-IN', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatTime(item.followUp.time)}
                            </span>
                          </div>
                        </div>
                        {getPriorityBadge(item.daysAway)}
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium text-sm">{item.lead.companyName}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.director.firstName} {item.director.lastName}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={getStatusColor(item.lead.status)} className="text-xs">
                            {item.lead.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {getUserName(item.lead.assignedTo)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Distribution</CardTitle>
          <CardDescription>Overview of lead status breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-destructive" />
                  <span>Hot Leads</span>
                </div>
                <span className="font-medium">{stats.hotLeads}</span>
              </div>
              <Progress value={statusPercentages.hot} className="h-2" />
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-orange-500" />
                  <span>Warm Leads</span>
                </div>
                <span className="font-medium">{stats.warmLeads}</span>
              </div>
              <Progress value={statusPercentages.warm} className="h-2" />
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <span>Cold Leads</span>
                </div>
                <span className="font-medium">{stats.coldLeads}</span>
              </div>
              <Progress value={statusPercentages.cold} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
