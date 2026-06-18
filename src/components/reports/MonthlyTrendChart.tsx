import { TrendingUp } from 'lucide-react';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
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
  monthlyTrendChartConfig,
  type MonthlyTrendRow,
} from '../../utils/reports/analytics';

interface MonthlyTrendChartProps {
  data: MonthlyTrendRow[];
  className?: string;
}

export function MonthlyTrendChart({ data, className }: MonthlyTrendChartProps) {
  const hasData = data.some((row) => row.total > 0 || row.converted > 0);

  return (
    <Card className={cn('card-bento gap-0 border-0', className)}>
      <CardHeader className="px-5 pt-5">
        <CardTitle>Monthly Lead Trend</CardTitle>
        <CardDescription>Lead acquisition and conversion over time</CardDescription>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {!hasData ? (
          <div className="flex h-[280px] flex-col items-center justify-center gap-2 text-muted-foreground">
            <TrendingUp className="h-8 w-8 opacity-50" />
            <p className="text-sm">No lead activity in the selected period</p>
          </div>
        ) : (
          <ChartContainer config={monthlyTrendChartConfig} className="aspect-auto h-[280px] w-full">
            <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="month"
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
              <Line
                type="monotone"
                dataKey="total"
                stroke="var(--color-total)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="converted"
                stroke="var(--color-converted)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
