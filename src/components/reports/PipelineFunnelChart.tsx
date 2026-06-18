import { Filter } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '../ui/chart';
import { cn } from '../ui/utils';
import {
  pipelineChartConfig,
  type PipelineStageRow,
} from '../../utils/reports/analytics';

interface PipelineFunnelChartProps {
  data: PipelineStageRow[];
  className?: string;
}

export function PipelineFunnelChart({ data, className }: PipelineFunnelChartProps) {
  const hasData = data.some((row) => row.count > 0);

  return (
    <Card className={cn('card-bento gap-0 border-0', className)}>
      <CardHeader className="px-5 pt-5">
        <CardTitle>Lead Pipeline</CardTitle>
        <CardDescription>Funnel progression through stages</CardDescription>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {!hasData ? (
          <div className="flex h-[280px] md:h-[300px] flex-col items-center justify-center gap-2 text-muted-foreground">
            <Filter className="h-8 w-8 opacity-50" />
            <p className="text-sm">No pipeline data in the selected period</p>
          </div>
        ) : (
          <ChartContainer config={pipelineChartConfig} className="aspect-auto h-[280px] md:h-[300px] w-full">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis
                dataKey="stage"
                type="category"
                tickLine={false}
                axisLine={false}
                width={90}
                tickMargin={8}
              />
              <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="stageKey" />} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {data.map((entry) => (
                  <Cell
                    key={entry.stageKey}
                    fill={
                      entry.count > 0
                        ? `var(--color-${entry.stageKey})`
                        : 'var(--muted)'
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
