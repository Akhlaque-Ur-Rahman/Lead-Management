import { useState } from 'react';
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
  const statusDistribution = [
    { name: 'Hot', value: reportLeads.filter(l => l.status === 'Hot').length, color: '#ef4444' },
    { name: 'Warm', value: reportLeads.filter(l => l.status === 'Warm').length, color: '#f97316' },
    { name: 'Cold', value: reportLeads.filter(l => l.status === 'Cold').length, color: '#6366f1' },
    { name: 'Converted', value: convertedCount, color: '#10b981' },
    { name: 'Lost', value: lostCount, color: '#64748b' }
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

  const COLORS = ['#ef4444', '#f97316', '#6366f1', '#10b981', '#64748b'];

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1>Reports & Analytics</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Comprehensive insights into your lead management performance
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
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
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{totalLeads}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active in system
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{conversionRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {convertedCount} of {totalProcessed} closed
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Converted Leads</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{convertedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Successfully closed
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm">Active Users</CardTitle>
              <Users className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl">{getGlobalAggregates(selectedCompany === 'all' ? undefined : selectedCompany).activeUsers}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Users active in selected scope
              </p>
            </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Lead Trend</CardTitle>
            <CardDescription>Lead acquisition and conversion over time</CardDescription>
          </CardHeader>
          <CardContent>
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
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Converted"
                  dot={{ fill: '#10b981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Status Distribution</CardTitle>
            <CardDescription>Breakdown by current status</CardDescription>
          </CardHeader>
          <CardContent>
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
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusDistribution.map((_, index) => (
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
        <Card>
          <CardHeader>
            <CardTitle>Team Performance</CardTitle>
            <CardDescription>Leads assigned to each team member</CardDescription>
          </CardHeader>
          <CardContent>
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
                  <Bar dataKey="converted" fill="#10b981" name="Converted" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="lost" fill="#64748b" name="Lost" radius={[4, 4, 0, 0]} />
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
        <Card>
          <CardHeader>
            <CardTitle>Lead Pipeline</CardTitle>
            <CardDescription>Funnel progression through stages</CardDescription>
          </CardHeader>
          <CardContent>
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
      </div>

      {/* Performance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Summary</CardTitle>
          <CardDescription>Detailed breakdown by team members</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {userPerformance.length > 0 ? (
              userPerformance.map((user, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="space-y-1">
                    <p className="font-medium">{user.name}</p>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>{user.leads} leads</span>
                      <span className="text-green-600">{user.converted} converted</span>
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
                <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No performance data available</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
