import { useMemo } from 'react';
import type { Lead } from '../LeadsContext';
import { toLocalDateKey } from '../../utils/dates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface PipelineTrendChartProps {
  leads: Lead[];
}

function parseLeadDate(lead: Lead): Date | null {
  if (!lead.createdAt) return null;
  const d = new Date(lead.createdAt);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function PipelineTrendChart({ leads }: PipelineTrendChartProps) {
  const { chartData, hasActivity } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: { date: string; label: string; newLeads: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = toLocalDateKey(d);
      days.push({
        date: key,
        label: d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' }),
        newLeads: 0,
      });
    }

    const dayMap = new Map(days.map((d) => [d.date, d]));
    const rangeStart = days[0]?.date;

    leads.forEach((lead) => {
      const created = parseLeadDate(lead);
      if (!created) return;
      const key = toLocalDateKey(created);
      if (rangeStart && key >= rangeStart && dayMap.has(key)) {
        dayMap.get(key)!.newLeads += 1;
      }
    });

    const data = days;
    const activity = data.some((d) => d.newLeads > 0);
    return { chartData: data, hasActivity: activity };
  }, [leads]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">Pipeline activity (7 days)</CardTitle>
        <CardDescription>New leads added per day</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasActivity ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No new leads in the last 7 days.
          </p>
        ) : (
          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    color: 'var(--foreground)',
                  }}
                  labelStyle={{ color: 'var(--foreground)' }}
                />
                <Bar
                  dataKey="newLeads"
                  name="New leads"
                  fill="var(--chart-1)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
