import { Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '../ui/chart';
import { cn } from '../ui/utils';
import {
  isTeamPerformanceSkewed,
  teamPerformanceChartConfig,
  type TeamPerformanceRow,
} from '../../utils/reports/analytics';

interface TeamPerformanceChartProps {
  data: TeamPerformanceRow[];
  className?: string;
}

export function TeamPerformanceChart({ data, className }: TeamPerformanceChartProps) {
  const skewed = isTeamPerformanceSkewed(data);

  return (
    <Card className={cn('card-bento gap-0 border-0', className)}>
      <CardHeader className="px-5 pt-5">
        <CardTitle>Team Performance</CardTitle>
        <CardDescription>
          {skewed
            ? 'Leads assigned to each team member — one member holds most of the volume'
            : 'Leads assigned to each team member'}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {data.length === 0 ? (
          <div className="flex h-[280px] md:h-[300px] flex-col items-center justify-center gap-2 text-muted-foreground">
            <Users className="h-8 w-8 opacity-50" />
            <p className="text-sm">No user data available</p>
          </div>
        ) : (
          <ChartContainer config={teamPerformanceChartConfig} className="aspect-auto h-[280px] md:h-[300px] w-full">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                allowDecimals={false}
                width={40}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="leads" fill="var(--color-leads)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="converted" fill="var(--color-converted)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="lost" fill="var(--color-lost)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
