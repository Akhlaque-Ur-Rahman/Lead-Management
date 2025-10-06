import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
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
  Line
} from 'recharts';
import { Download, TrendingUp, Users, Calendar, Target } from 'lucide-react';

export function Reports() {
  // Mock data for charts
  const monthlyLeadData = [
    { month: 'Jan', leads: 95, converted: 18 },
    { month: 'Feb', leads: 112, converted: 21 },
    { month: 'Mar', leads: 89, converted: 16 },
    { month: 'Apr', leads: 134, converted: 25 },
    { month: 'May', leads: 156, converted: 29 },
    { month: 'Jun', leads: 142, converted: 28 },
    { month: 'Jul', leads: 168, converted: 32 },
    { month: 'Aug', leads: 189, converted: 37 },
    { month: 'Sep', leads: 201, converted: 41 }
  ];

  const statusDistribution = [
    { name: 'Hot', value: 156, color: '#ef4444' },
    { name: 'Warm', value: 423, color: '#3b82f6' },
    { name: 'Cold', value: 313, color: '#6b7280' },
    { name: 'Converted', value: 231, color: '#10b981' },
    { name: 'Lost', value: 124, color: '#f59e0b' }
  ];

  const sourcePerformance = [
    { source: 'Direct Contact', leads: 345, conversion: 22 },
    { source: 'Referral', leads: 298, conversion: 28 },
    { source: 'Website', leads: 267, conversion: 15 },
    { source: 'LinkedIn', leads: 189, conversion: 18 },
    { source: 'Cold Calling', leads: 148, conversion: 12 }
  ];

  const followUpMetrics = [
    { week: 'Week 1', scheduled: 45, completed: 38, missed: 7 },
    { week: 'Week 2', scheduled: 52, completed: 41, missed: 11 },
    { week: 'Week 3', scheduled: 48, completed: 44, missed: 4 },
    { week: 'Week 4', scheduled: 56, completed: 49, missed: 7 }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1>Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive insights into your lead management performance
          </p>
        </div>
        <div className="flex gap-2">
          <Select defaultValue="month">
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,247</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+12.5%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18.5%</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+2.3%</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.4h</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">-0.5h</span> from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue Generated</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹12.4L</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+18.7%</span> from last month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Lead Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Lead Trends</CardTitle>
            <CardDescription>Lead acquisition and conversion over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyLeadData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="leads" fill="#3b82f6" name="Total Leads" />
                <Bar dataKey="converted" fill="#10b981" name="Converted" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Lead Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Status Distribution</CardTitle>
            <CardDescription>Current pipeline breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Source Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Source Performance</CardTitle>
            <CardDescription>Leads and conversion rates by source</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sourcePerformance} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="source" type="category" width={80} />
                <Tooltip />
                <Bar dataKey="leads" fill="#3b82f6" name="Total Leads" />
                <Bar dataKey="conversion" fill="#10b981" name="Conversion %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Follow-up Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Follow-up Performance</CardTitle>
            <CardDescription>Weekly follow-up completion rates</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={followUpMetrics}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="scheduled" 
                  stroke="#3b82f6" 
                  name="Scheduled"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="completed" 
                  stroke="#10b981" 
                  name="Completed"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="missed" 
                  stroke="#ef4444" 
                  name="Missed"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Performance Summary Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Performance Summary</CardTitle>
          <CardDescription>Individual performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Team Member</th>
                  <th className="text-right p-2">Leads Assigned</th>
                  <th className="text-right p-2">Follow-ups</th>
                  <th className="text-right p-2">Conversions</th>
                  <th className="text-right p-2">Conversion Rate</th>
                  <th className="text-right p-2">Revenue</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-2 font-medium">Rajesh Kumar</td>
                  <td className="text-right p-2">142</td>
                  <td className="text-right p-2">89</td>
                  <td className="text-right p-2">28</td>
                  <td className="text-right p-2">19.7%</td>
                  <td className="text-right p-2">₹3.2L</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium">Priya Sharma</td>
                  <td className="text-right p-2">156</td>
                  <td className="text-right p-2">98</td>
                  <td className="text-right p-2">31</td>
                  <td className="text-right p-2">19.9%</td>
                  <td className="text-right p-2">₹3.8L</td>
                </tr>
                <tr className="border-b">
                  <td className="p-2 font-medium">Amit Patel</td>
                  <td className="text-right p-2">134</td>
                  <td className="text-right p-2">76</td>
                  <td className="text-right p-2">23</td>
                  <td className="text-right p-2">17.2%</td>
                  <td className="text-right p-2">₹2.7L</td>
                </tr>
                <tr>
                  <td className="p-2 font-medium">Sunita Singh</td>
                  <td className="text-right p-2">125</td>
                  <td className="text-right p-2">67</td>
                  <td className="text-right p-2">21</td>
                  <td className="text-right p-2">16.8%</td>
                  <td className="text-right p-2">₹2.5L</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}