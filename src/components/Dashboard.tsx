import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useLeads } from './LeadsContext';
import { toLocalDateKey } from '../utils/dates';
import { isLeadInPoolForUser, isLeadInAssignedForUser } from '../utils/role/visibility';
import { Navigate } from 'react-router-dom';
import { Button } from './ui/button';
import { ClipboardList, UserCheck, CheckCircle, XCircle, Calendar, Plus, ArrowRight } from 'lucide-react';
import { hasPermission } from '../types/roles';
import { SuperDashboard } from './SuperDashboard';
import { PageHeader } from './layout/PageHeader';
import { OnboardingChecklist } from './OnboardingChecklist';
import { PipelineTrendChart } from './dashboard/PipelineTrendChart';
import { BentoStatCard } from './dashboard/BentoStatCard';
import { HeroMetricCard } from './dashboard/HeroMetricCard';
import type { Lead } from './LeadsContext';

function computeLeadTrend(leads: Lead[]): { value: string; positive: boolean } | undefined {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let recent = 0;
  let prior = 0;

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = toLocalDateKey(d);
    const count = leads.filter((l) => {
      if (!l.createdAt) return false;
      const created = new Date(l.createdAt);
      return !Number.isNaN(created.getTime()) && toLocalDateKey(created) === key;
    }).length;

    if (i < 3) recent += count;
    else prior += count;
  }

  if (recent === 0 && prior === 0) return undefined;
  if (prior === 0) return { value: `+${recent}`, positive: true };

  const pct = Math.round(((recent - prior) / prior) * 100);
  if (pct === 0) return { value: '0%', positive: true };
  return { value: `${pct > 0 ? '+' : ''}${pct}%`, positive: pct >= 0 };
}

export function Dashboard() {
  const { user, isLoading } = useAuth();
  const { leads, loadLeadsForDashboard, refreshFlag, getDirectorFollowUpsForDate } = useLeads();
  const navigate = useNavigate();

  useEffect(() => {
    loadLeadsForDashboard();
  }, [loadLeadsForDashboard, refreshFlag]);

  const { stats, followUpsTodayList, leadTrend } = useMemo(() => {
    if (!user) {
      return {
        stats: { pool: 0, assigned: 0, converted: 0, lost: 0, followUpsToday: 0 },
        followUpsTodayList: [],
        leadTrend: undefined,
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
      leadTrend: computeLeadTrend(leads),
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

  const firstName = user.name.split(' ')[0];
  const canViewConverted = hasPermission(user.role, 'VIEW_CONVERTED_LEADS');
  const heroSubtitle = canViewConverted
    ? `${stats.converted} converted · ${stats.lost} lost`
    : `${stats.lost} lost leads total`;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title={`Welcome back, ${firstName}`}
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

      <div className="dashboard-bento">
        <HeroMetricCard
          className="bento-span-2"
          greeting={`Hey, ${firstName}`}
          label="Lead Pool"
          value={stats.pool}
          subtitle={heroSubtitle}
          trend={leadTrend}
        />
        <BentoStatCard
          label="Assigned"
          value={stats.assigned}
          subtitle="Active in your queue"
          icon={<UserCheck className="h-4 w-4" />}
        />
        <BentoStatCard
          label="Follow-ups Today"
          value={stats.followUpsToday}
          subtitle="Scheduled for today"
          icon={<Calendar className="h-4 w-4" />}
        />

        <PipelineTrendChart leads={leads} className="bento-span-3" />

        <div className="card-bento flex flex-col">
          <div className="flex flex-row items-center justify-between pb-2 px-5 pt-5">
            <h3 className="text-base font-semibold font-display">Follow-ups due today</h3>
            <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate('/calendar')}>
              View all <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="px-5 pb-5">
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
          </div>
        </div>

        <div className="card-bento flex flex-col">
          <div className="pb-2 px-5 pt-5">
            <h3 className="text-base font-semibold font-display">Quick actions</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 px-5 pb-5">
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
          </div>
        </div>
      </div>
    </div>
  );
}
