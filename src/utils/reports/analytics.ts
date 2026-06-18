import type { ChartConfig } from '../../components/ui/chart';
import type { Lead, LostLead } from '../../components/LeadsContext';
import type { User } from '../../components/AuthContext';

export type ReportPeriod = 'all' | 'month' | 'quarter' | 'year';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const d = new Date(value as string);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isInPeriod(date: Date, period: ReportPeriod, now = new Date()): boolean {
  if (period === 'all') return true;
  if (period === 'month') {
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }
  if (period === 'year') {
    return date.getFullYear() === now.getFullYear();
  }
  const quarter = Math.floor(now.getMonth() / 3);
  const dateQuarter = Math.floor(date.getMonth() / 3);
  return date.getFullYear() === now.getFullYear() && dateQuarter === quarter;
}

export function filterLeadsByPeriod(leads: Lead[], period: ReportPeriod): Lead[] {
  if (period === 'all') return leads;
  return leads.filter((lead) => {
    const created = parseDate(lead.createdAt);
    return created ? isInPeriod(created, period) : false;
  });
}

export function filterLostLeadsByPeriod(lostLeads: LostLead[], period: ReportPeriod): LostLead[] {
  if (period === 'all') return lostLeads;
  return lostLeads.filter((ll) => {
    const lostDate = parseDate(ll.lostDate) ?? parseDate(ll.lead.lostAt);
    return lostDate ? isInPeriod(lostDate, period) : false;
  });
}

export interface MonthlyTrendRow {
  month: string;
  monthKey: string;
  total: number;
  converted: number;
}

export function buildMonthlyTrend(leads: Lead[], monthsBack = 6): MonthlyTrendRow[] {
  const now = new Date();
  const buckets: MonthlyTrendRow[] = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    buckets.push({
      month: MONTH_LABELS[d.getMonth()],
      monthKey,
      total: 0,
      converted: 0,
    });
  }

  const bucketMap = new Map(buckets.map((b) => [b.monthKey, b]));

  leads.forEach((lead) => {
    const created = parseDate(lead.createdAt);
    if (!created) return;

    const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;
    const bucket = bucketMap.get(key);
    if (!bucket) return;

    bucket.total += 1;

    const convertedAt = parseDate(lead.convertedAt);
    if (convertedAt) {
      const convertedKey = `${convertedAt.getFullYear()}-${String(convertedAt.getMonth() + 1).padStart(2, '0')}`;
      const convertedBucket = bucketMap.get(convertedKey);
      if (convertedBucket) convertedBucket.converted += 1;
    } else if (lead.status === 'Converted') {
      bucket.converted += 1;
    }
  });

  return buckets;
}

export interface StatusDistributionRow {
  statusKey: string;
  name: string;
  value: number;
}

export function buildStatusDistribution(leads: Lead[], lostLeads: LostLead[]): StatusDistributionRow[] {
  const convertedCount = leads.filter((l) => l.status === 'Converted').length;
  const lostCount = lostLeads.length;

  return [
    { statusKey: 'Hot', name: 'Hot', value: leads.filter((l) => l.status === 'Hot').length },
    { statusKey: 'Warm', name: 'Warm', value: leads.filter((l) => l.status === 'Warm').length },
    { statusKey: 'Cold', name: 'Cold', value: leads.filter((l) => l.status === 'Cold').length },
    { statusKey: 'Converted', name: 'Converted', value: convertedCount },
    { statusKey: 'Lost', name: 'Lost', value: lostCount },
  ].filter((item) => item.value > 0);
}

export interface TeamPerformanceRow {
  userId: string;
  name: string;
  leads: number;
  converted: number;
  lost: number;
}

export function buildTeamPerformance(leads: Lead[], lostLeads: LostLead[], users: User[]): TeamPerformanceRow[] {
  return users
    .map((u) => {
      const userLeads = leads.filter((l) => l.assignedTo === u.id);
      const userConverted = userLeads.filter((l) => l.status === 'Converted').length;
      const userLost = lostLeads.filter((l) => l.lostBy === u.id).length;

      return {
        userId: u.id,
        name: u.name.split(' ')[0],
        leads: userLeads.length,
        converted: userConverted,
        lost: userLost,
      };
    })
    .filter((item) => item.leads > 0 || item.lost > 0)
    .sort((a, b) => b.leads - a.leads);
}

export function isTeamPerformanceSkewed(data: TeamPerformanceRow[]): boolean {
  if (data.length === 0) return false;
  const total = data.reduce((sum, row) => sum + row.leads, 0);
  if (total === 0) return false;
  const max = Math.max(...data.map((row) => row.leads));
  return max / total > 0.8;
}

export interface PipelineStageRow {
  stageKey: string;
  stage: string;
  count: number;
}

export function buildPipelineStages(leads: Lead[]): PipelineStageRow[] {
  const convertedCount = leads.filter((l) => l.status === 'Converted').length;

  return [
    { stageKey: 'new', stage: 'New', count: leads.filter((l) => l.status === 'Cold').length },
    { stageKey: 'contacted', stage: 'Contacted', count: leads.filter((l) => l.status === 'Warm').length },
    { stageKey: 'qualified', stage: 'Qualified', count: leads.filter((l) => l.status === 'Hot').length },
    { stageKey: 'converted', stage: 'Converted', count: convertedCount },
  ];
}

export interface PerformanceSummaryRow {
  userId: string;
  name: string;
  leads: number;
  converted: number;
  lost: number;
  conversionRate: number;
}

export function buildPerformanceSummary(
  leads: Lead[],
  lostLeads: LostLead[],
  users: User[],
): PerformanceSummaryRow[] {
  return users
    .map((u) => {
      const userLeads = leads.filter((l) => l.assignedTo === u.id);
      const userConverted = userLeads.filter((l) => l.status === 'Converted').length;
      const userLost = lostLeads.filter((l) => l.lostBy === u.id).length;
      const closed = userConverted + userLost;
      const conversionRate = closed > 0 ? Math.round((userConverted / closed) * 100) : 0;

      return {
        userId: u.id,
        name: u.name,
        leads: userLeads.length,
        converted: userConverted,
        lost: userLost,
        conversionRate,
      };
    })
    .filter((item) => item.leads > 0 || item.lost > 0)
    .sort((a, b) => b.leads - a.leads);
}

export const monthlyTrendChartConfig: ChartConfig = {
  total: { label: 'Total Leads', color: 'var(--chart-1)' },
  converted: { label: 'Converted', color: 'var(--status-converted-bg)' },
};

export const statusChartConfig: ChartConfig = {
  Hot: { label: 'Hot', color: 'var(--status-hot-bg)' },
  Warm: { label: 'Warm', color: 'var(--status-warm-bg)' },
  Cold: { label: 'Cold', color: 'var(--status-cold-bg)' },
  Converted: { label: 'Converted', color: 'var(--status-converted-bg)' },
  Lost: { label: 'Lost', color: 'var(--status-lost-bg)' },
};

export const teamPerformanceChartConfig: ChartConfig = {
  leads: { label: 'Total Leads', color: 'var(--chart-1)' },
  converted: { label: 'Converted', color: 'var(--status-converted-bg)' },
  lost: { label: 'Lost', color: 'var(--status-lost-bg)' },
};

export const pipelineChartConfig: ChartConfig = {
  new: { label: 'New', color: 'var(--status-cold-bg)' },
  contacted: { label: 'Contacted', color: 'var(--status-warm-bg)' },
  qualified: { label: 'Qualified', color: 'var(--status-hot-bg)' },
  converted: { label: 'Converted', color: 'var(--status-converted-bg)' },
};
