import { PieChart as PieChartIcon } from 'lucide-react';
import { Cell, Label, Pie, PieChart } from 'recharts';
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
  statusChartConfig,
  type StatusDistributionRow,
} from '../../utils/reports/analytics';

interface StatusDistributionChartProps {
  data: StatusDistributionRow[];
  className?: string;
}

export function StatusDistributionChart({ data, className }: StatusDistributionChartProps) {
  const total = data.reduce((sum, row) => sum + row.value, 0);

  return (
    <Card className={cn('card-bento gap-0 border-0', className)}>
      <CardHeader className="px-5 pt-5">
        <CardTitle>Lead Status Distribution</CardTitle>
        <CardDescription>Breakdown by current status</CardDescription>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {data.length === 0 ? (
          <div className="flex h-[280px] flex-col items-center justify-center gap-2 text-muted-foreground">
            <PieChartIcon className="h-8 w-8 opacity-50" />
            <p className="text-sm">No data available</p>
          </div>
        ) : (
          <ChartContainer config={statusChartConfig} className="aspect-auto h-[280px] w-full">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="statusKey" />} />
              <ChartLegend content={<ChartLegendContent nameKey="statusKey" />} />
              <Pie
                data={data}
                dataKey="value"
                nameKey="statusKey"
                innerRadius={60}
                outerRadius={90}
                strokeWidth={2}
                label={({ percent, name }) =>
                  percent >= 0.05
                    ? `${statusChartConfig[name as string]?.label ?? name} ${(percent * 100).toFixed(0)}%`
                    : ''
                }
              >
                {data.map((entry) => (
                  <Cell key={entry.statusKey} fill={`var(--color-${entry.statusKey})`} />
                ))}
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                          <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-bold">
                            {total}
                          </tspan>
                          <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 20} className="fill-muted-foreground text-xs">
                            Total
                          </tspan>
                        </text>
                      );
                    }
                    return null;
                  }}
                />
              </Pie>
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
