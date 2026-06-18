import { useMemo, useState } from 'react';
import { usePageMeta } from './layout/PageMetaContext';
import { Button } from './ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Download, TrendingUp, Users, Target } from 'lucide-react';
import { useLeads } from './LeadsContext';
import CompanyFilter from './CompanyFilter';
import { useAuth } from './AuthContext';
import { BentoStatCard } from './dashboard/BentoStatCard';
import { MonthlyTrendChart } from './reports/MonthlyTrendChart';
import { StatusDistributionChart } from './reports/StatusDistributionChart';
import { TeamPerformanceChart } from './reports/TeamPerformanceChart';
import { PipelineFunnelChart } from './reports/PipelineFunnelChart';
import { PerformanceSummaryTable } from './reports/PerformanceSummaryTable';
import {
  buildMonthlyTrend,
  buildPerformanceSummary,
  buildPipelineStages,
  buildStatusDistribution,
  buildTeamPerformance,
  filterLeadsByPeriod,
  filterLostLeadsByPeriod,
  type ReportPeriod,
} from '../utils/reports/analytics';
import { toast } from 'sonner';

export function Reports() {
  const { leads, lostLeads, getLeadsByCompany, getGlobalAggregates } = useLeads();
  const { user, users } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<ReportPeriod>('all');
  const [selectedCompany, setSelectedCompany] = useState('all');

  const scopedLeads = useMemo(() => {
    let reportLeads = selectedCompany === 'all' ? leads : getLeadsByCompany(selectedCompany);
    if (user?.role === 'sales_user') {
      reportLeads = reportLeads.filter((l) => l.assignedTo === user.id);
    }
    return reportLeads;
  }, [leads, selectedCompany, getLeadsByCompany, user]);

  const scopedLostLeads = useMemo(() => {
    let reportLostLeads =
      selectedCompany === 'all'
        ? lostLeads
        : lostLeads.filter((ll) => ll.lead.companyId === selectedCompany);
    if (user?.role === 'sales_user') {
      reportLostLeads = reportLostLeads.filter((ll) => ll.lostBy === user.id);
    }
    return reportLostLeads;
  }, [lostLeads, selectedCompany, user]);

  const filteredLeads = useMemo(
    () => filterLeadsByPeriod(scopedLeads, selectedPeriod),
    [scopedLeads, selectedPeriod],
  );

  const filteredLostLeads = useMemo(
    () => filterLostLeadsByPeriod(scopedLostLeads, selectedPeriod),
    [scopedLostLeads, selectedPeriod],
  );

  const totalLeads = filteredLeads.length;
  const convertedCount = filteredLeads.filter((l) => l.status === 'Converted').length;
  const lostCount = filteredLostLeads.length;
  const totalProcessed = convertedCount + lostCount;
  const conversionRate =
    totalProcessed > 0 ? ((convertedCount / totalProcessed) * 100).toFixed(1) : '0';

  const monthlyData = useMemo(() => buildMonthlyTrend(filteredLeads), [filteredLeads]);
  const statusDistribution = useMemo(
    () => buildStatusDistribution(filteredLeads, filteredLostLeads),
    [filteredLeads, filteredLostLeads],
  );
  const teamPerformance = useMemo(
    () => buildTeamPerformance(filteredLeads, filteredLostLeads, users),
    [filteredLeads, filteredLostLeads, users],
  );
  const pipelineStages = useMemo(() => buildPipelineStages(filteredLeads), [filteredLeads]);
  const performanceSummary = useMemo(
    () => buildPerformanceSummary(filteredLeads, filteredLostLeads, users),
    [filteredLeads, filteredLostLeads, users],
  );

  const handleExportReport = () => {
    toast.success('Report exported successfully!');
  };

  usePageMeta({
    title: 'Reports & Analytics',
    description: 'Comprehensive insights into your lead management performance',
    actions: (
      <>
        <CompanyFilter value={selectedCompany} onChange={setSelectedCompany} hideIfCompanyAdmin={true} />
        <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as ReportPeriod)}>
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

        <MonthlyTrendChart data={monthlyData} className="bento-span-2 bento-span-3" />
        <StatusDistributionChart data={statusDistribution} />
        <PipelineFunnelChart data={pipelineStages} className="bento-span-2-xl" />
        <TeamPerformanceChart data={teamPerformance} className="bento-span-2" />
        <PerformanceSummaryTable data={performanceSummary} />
      </div>
    </div>
  );
}
