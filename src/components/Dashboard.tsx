import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useLeads } from './LeadsContext';
import { toLocalDateKey } from '../utils/dates';
import { isLeadInPoolForUser, isLeadInAssignedForUser } from '../utils/role/visibility';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ClipboardList, UserCheck, CheckCircle, XCircle, Calendar, Plus, ArrowRight } from 'lucide-react';
import { hasPermission } from '../types/roles';
import { SuperDashboard } from './SuperDashboard';
import { PageHeader } from './layout/PageHeader';
import { OnboardingChecklist } from './OnboardingChecklist';
import { PipelineTrendChart } from './dashboard/PipelineTrendChart';

export function Dashboard() {
  const { user, isLoading } = useAuth();
  const { leads, loadLeadsForDashboard, refreshFlag, getDirectorFollowUpsForDate } = useLeads();
  const navigate = useNavigate();

  useEffect(() => {
    loadLeadsForDashboard();
  }, [loadLeadsForDashboard, refreshFlag]);

  const { stats, followUpsTodayList } = useMemo(() => {
    if (!user) {
      return {
        stats: { pool: 0, assigned: 0, converted: 0, lost: 0, followUpsToday: 0 },
        followUpsTodayList: [],
      };
    }

    const active = leads.filter((l) => l.status !== 'Converted' && l.status !== 'Lost');
    const pool = active.filter((l) => isLeadInPoolForUser(user, l));
    const assigned = active.filter((l) => isLeadInAssignedForUser(user, l));
    const converted = leads.filter((l) => l.status === 'Converted');
    const lost = leads.filter((l) => l.status === 'Lost');
    const today = toLocalDateKey(new Date());
    const todayEntries = getDirectorFollowUpsForDate(today, user.companyId ?? undefined);

    const seenLeadIds = new Set<string>();
    const uniqueTodayLeads: typeof leads = [];
    for (const entry of todayEntries) {
      if (!seenLeadIds.has(entry.lead.id)) {
        seenLeadIds.add(entry.lead.id);
        uniqueTodayLeads.push(entry.lead);
      }
    }

    return {
      stats: {
        pool: pool.length,
        assigned: assigned.length,
        converted: converted.length,
        lost: lost.length,
        followUpsToday: todayEntries.length,
      },
      followUpsTodayList: uniqueTodayLeads.slice(0, 5),
    };
  }, [leads, user, getDirectorFollowUpsForDate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh] p-6">
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

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title={`Welcome back, ${user.name.split(' ')[0]}`}
        description={todayLabel}
        actions={
          <>
            {hasPermission(user.role, 'IMPORT_LEADS') && (
              <Button size="sm" className="gap-2" onClick={() => navigate('/leads')}>
                <Plus className="h-4 w-4" />
                Add Lead
              </Button>
            )}
            <Button size="sm" variant="outline" className="gap-2" onClick={() => navigate('/calendar')}>
              <Calendar className="h-4 w-4" />
              Calendar
            </Button>
          </>
        }
      />

      <OnboardingChecklist />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="stat-card-pool shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <ClipboardList className="h-4 w-4" />
              Lead Pool
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-display">{stats.pool}</div>
          </CardContent>
        </Card>
        <Card className="stat-card-assigned shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <UserCheck className="h-4 w-4" />
              Assigned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-display">{stats.assigned}</div>
          </CardContent>
        </Card>
        {hasPermission(user.role, 'VIEW_CONVERTED_LEADS') && (
          <Card className="stat-card-converted shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                <CheckCircle className="h-4 w-4" />
                Converted
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display">{stats.converted}</div>
            </CardContent>
          </Card>
        )}
        <Card className="stat-card-followups shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Follow-ups Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-display">{stats.followUpsToday}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.lost} lost leads total</p>
          </CardContent>
        </Card>
      </div>

      <PipelineTrendChart leads={leads} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-semibold">Follow-ups due today</CardTitle>
            <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate('/calendar')}>
              View all <ArrowRight className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {followUpsTodayList.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No follow-ups scheduled for today.</p>
            ) : (
              <ul className="space-y-3">
                {followUpsTodayList.map((lead) => (
                  <li key={lead.id}>
                    <button
                      type="button"
                      className="w-full flex items-center justify-between gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
                      onClick={() => navigate('/assigned')}
                      aria-label={`Follow-up for ${lead.companyName}, status ${lead.status}`}
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{lead.companyName}</p>
                        <p className="text-xs text-muted-foreground">{lead.status}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Quick actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate('/leads')}>
              <ClipboardList className="h-5 w-5" />
              <span className="text-xs">Lead Pool</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate('/assigned')}>
              <UserCheck className="h-5 w-5" />
              <span className="text-xs">Assigned</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate('/reports')}>
              <CheckCircle className="h-5 w-5" />
              <span className="text-xs">Reports</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col gap-2" onClick={() => navigate('/lost')}>
              <XCircle className="h-5 w-5" />
              <span className="text-xs">Lost Leads</span>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
