import { useState } from 'react';
import { usePageMeta } from './layout/PageMetaContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { Download, TrendingUp, Users, Target, BarChart3 } from 'lucide-react';
import { useLeads } from './LeadsContext';
import CompanyFilter from './CompanyFilter';
import { useAuth } from './AuthContext';
import { BentoStatCard } from './dashboard/BentoStatCard';
import { cn } from './ui/utils';
import { toast } from 'sonner';

export function Reports() {
  const { leads, lostLeads, getLeadsByCompany, getGlobalAggregates } = useLeads();
  const { user, users } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [selectedCompany, setSelectedCompany] = useState('all');

  // Prepare report data based on selected company and user role
  let reportLeads = selectedCompany === 'all' ? leads : getLeadsByCompany(selectedCompany);
  let reportLostLeads = selectedCompany === 'all' ? lostLeads : lostLeads.filter(ll => ll.lead.companyId === selectedCompany);

  // If sales users, restrict data to their assigned leads only
  if (user?.role === 'sales_user') {
    reportLeads = reportLeads.filter(l => l.assignedTo === user.id);
    reportLostLeads = reportLostLeads.filter(ll => ll.lostBy === user.id);
  }

  // Calculate real statistics
  const totalLeads = reportLeads.length;
  const convertedCount = reportLeads.filter(l => l.status === 'Converted').length;
  const lostCount = reportLostLeads.length;
  const totalProcessed = convertedCount + lostCount;
  const conversionRate = totalProcessed > 0 ? ((convertedCount / totalProcessed) * 100).toFixed(1) : '0';

  // Status distribution with real data
  const statusChartColors: Record<string, string> = {
    Hot: 'var(--status-hot-bg)',
    Warm: 'var(--status-warm-bg)',
    Cold: 'var(--status-cold-bg)',
    Converted: 'var(--status-converted-bg)',
    Lost: 'var(--status-lost-bg)',
  };

  const statusDistribution = [
    { name: 'Hot', value: reportLeads.filter(l => l.status === 'Hot').length, color: statusChartColors.Hot },
    { name: 'Warm', value: reportLeads.filter(l => l.status === 'Warm').length, color: statusChartColors.Warm },
    { name: 'Cold', value: reportLeads.filter(l => l.status === 'Cold').length, color: statusChartColors.Cold },
    { name: 'Converted', value: convertedCount, color: statusChartColors.Converted },
    { name: 'Lost', value: lostCount, color: statusChartColors.Lost }
  ].filter(item => item.value > 0); // Only show non-zero values

  // User performance - leads assigned to each user
  const userPerformance = users.map(u => {
    const userLeads = reportLeads.filter(l => l.assignedTo === u.id);
    const userConverted = userLeads.filter(l => l.status === 'Converted').length;
    const userLost = reportLostLeads.filter(l => l.lostBy === u.id).length;

    return {
      name: u.name.split(' ')[0], // First name only for chart
      leads: userLeads.length,
      converted: userConverted,
      lost: userLost,
      conversionRate: userLeads.length > 0 ? ((userConverted / (userConverted + userLost)) * 100).toFixed(0) : '0'
    };
  }).filter(item => item.leads > 0); // Only show users with leads

  // Monthly trend (last 6 months simulation - in real app this would be from actual data)
  const getMonthlyData = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    const data = [];
    
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      // Simulate data - in real app, filter leads by created month
      const monthLeads = Math.floor(totalLeads / 6 + Math.random() * 20);
      const monthConverted = Math.floor(monthLeads * 0.2 + Math.random() * 5);
      
      data.push({
        month: months[monthIndex],
        leads: monthLeads,
        converted: monthConverted
      });
    }
    
    return data;
  };

  const monthlyData = getMonthlyData();

  // Lead status by stage
  const stageData = [
    { stage: 'New', count: reportLeads.filter(l => l.status === 'Cold').length },
    { stage: 'Contacted', count: reportLeads.filter(l => l.status === 'Warm').length },
    { stage: 'Qualified', count: reportLeads.filter(l => l.status === 'Hot').length },
    { stage: 'Converted', count: convertedCount },
  ];

  const handleExportReport = () => {
    toast.success('Report exported successfully!');
    // In real implementation, this would generate and download a PDF/Excel report
  };

  const COLORS = [
    'var(--status-hot-bg)',
    'var(--status-warm-bg)',
    'var(--status-cold-bg)',
    'var(--status-converted-bg)',
    'var(--status-lost-bg)',
  ];

  usePageMeta({
    title: 'Reports & Analytics',
    description: 'Comprehensive insights into your lead management performance',
    actions: (
      <>
        <CompanyFilter value={selectedCompany} onChange={setSelectedCompany} hideIfCompanyAdmin={true} />
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Time period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Time</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="quarter">This Quarter</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleExportReport} className="gap-2">
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Export</span>
        </Button>
      </>
    ),
  });

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="dashboard-bento">
        <BentoStatCard
          label="Total Leads"
          value={totalLeads}
          subtitle="Active in system"
          icon={<Users className="h-4 w-4" />}
          variant="primary"
        />
        <BentoStatCard
          label="Conversion Rate"
          value={`${conversionRate}%`}
          subtitle={`${convertedCount} of ${totalProcessed} closed`}
          icon={<Target className="h-4 w-4" />}
          variant="warm"
        />
        <BentoStatCard
          label="Converted Leads"
          value={convertedCount}
          subtitle="Successfully closed"
          icon={<TrendingUp className="h-4 w-4" />}
          variant="rose"
        />
        <BentoStatCard
          label="Active Users"
          value={getGlobalAggregates(selectedCompany === 'all' ? undefined : selectedCompany).activeUsers}
          subtitle="Users active in selected scope"
          icon={<Users className="h-4 w-4" />}
          variant="teal"
        />

        <Card className={cn('card-bento gap-0 border-0')}>
          <CardHeader className="px-5 pt-5">
            <CardTitle>Monthly Lead Trend</CardTitle>
            <CardDescription>Lead acquisition and conversion over time</CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="month" 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="leads" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Total Leads"
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="converted" 
                  stroke="var(--status-converted-bg)" 
                  strokeWidth={2}
                  name="Converted"
                  dot={{ fill: 'var(--status-converted-bg)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card className={cn('card-bento gap-0 border-0')}>
          <CardHeader className="px-5 pt-5">
            <CardTitle>Lead Status Distribution</CardTitle>
            <CardDescription>Breakdown by current status</CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {statusDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="var(--chart-2)"
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <p>No data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Performance */}
        <Card className={cn('card-bento gap-0 border-0')}>
          <CardHeader className="px-5 pt-5">
            <CardTitle>Team Performance</CardTitle>
            <CardDescription>Leads assigned to each team member</CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {userPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={userPerformance}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="name" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="leads" fill="hsl(var(--primary))" name="Total Leads" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="converted" fill="var(--status-converted-bg)" name="Converted" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="lost" fill="var(--status-lost-bg)" name="Lost" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <p>No user data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pipeline Funnel */}
        <Card className={cn('card-bento gap-0 border-0')}>
          <CardHeader className="px-5 pt-5">
            <CardTitle>Lead Pipeline</CardTitle>
            <CardDescription>Funnel progression through stages</CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stageData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  type="number"
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  dataKey="stage" 
                  type="category"
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  width={100}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px'
                  }}
                />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
                  {stageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className={cn('card-bento gap-0 border-0 bento-span-full')}>
          <CardHeader className="px-5 pt-5">
            <CardTitle>Performance Summary</CardTitle>
            <CardDescription>Detailed breakdown by team members</CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5">
          <div className="space-y-4">
            {userPerformance.length > 0 ? (
              userPerformance.map((user, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="space-y-1">
                    <p className="font-medium">{user.name}</p>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>{user.leads} leads</span>
                      <span className="text-icon-success">{user.converted} converted</span>
                      <span className="text-muted-foreground">{user.lost} lost</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Conversion Rate</div>
                      <div className="text-lg font-medium">{user.conversionRate}%</div>
                    </div>
                    <Badge 
                      variant={parseInt(user.conversionRate) > 50 ? "default" : "secondary"}
                    >
                      {parseInt(user.conversionRate) > 50 ? "Excellent" : "Good"}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p>No performance data available</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
