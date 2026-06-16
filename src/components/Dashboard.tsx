import { useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useLeads } from './LeadsContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ClipboardList, UserCheck, CheckCircle, XCircle } from 'lucide-react';
import { hasPermission } from '../types/roles';
import { SuperDashboard } from './SuperDashboard';

export function Dashboard() {
  const { user, isLoading } = useAuth();
  const { leads } = useLeads();

  const stats = useMemo(() => {
    const active = leads.filter((l) => l.status !== 'Converted' && l.status !== 'Lost');
    const pool = active.filter((l) => !l.isAssigned);
    const assigned = active.filter((l) => l.isAssigned);
    const converted = leads.filter((l) => l.status === 'Converted');
    const lost = leads.filter((l) => l.status === 'Lost');
    const today = new Date().toISOString().split('T')[0];
    const followUpsToday = leads.filter((l) => l.nextFollowUpDate === today).length;
    return { pool: pool.length, assigned: assigned.length, converted: converted.length, lost: lost.length, followUpsToday };
  }, [leads]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" role="status" />
          <p className="mt-2 text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (hasPermission(user.role, 'VIEW_SUPER_DASHBOARD')) {
    return <SuperDashboard />;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Hi, Welcome back, {user.name}</h1>
        <p className="text-muted-foreground text-sm mt-1">Here is your lead overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
              Lead Pool
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pool}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-muted-foreground" />
              Assigned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.assigned}</div>
          </CardContent>
        </Card>
        {hasPermission(user.role, 'VIEW_CONVERTED_LEADS') && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                Converted
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.converted}</div>
            </CardContent>
          </Card>
        )}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              Lost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lost}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.followUpsToday} follow-ups due today</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
