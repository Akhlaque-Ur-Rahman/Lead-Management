import { BarChart3, User } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { BentoTable } from '../layout/BentoTable';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { cn } from '../ui/utils';
import type { PerformanceSummaryRow } from '../../utils/reports/analytics';

interface PerformanceSummaryTableProps {
  data: PerformanceSummaryRow[];
  className?: string;
}

function ConversionRateCell({ rate }: { rate: number }) {
  return (
    <div className="flex min-w-[120px] items-center gap-3">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-[var(--status-converted-bg)] transition-all"
          style={{ width: `${Math.min(rate, 100)}%` }}
        />
      </div>
      <span className="w-10 text-right font-medium tabular-nums">{rate}%</span>
    </div>
  );
}

export function PerformanceSummaryTable({ data, className }: PerformanceSummaryTableProps) {
  return (
    <Card className={cn('card-bento gap-0 border-0 bento-span-full', className)}>
      <CardHeader className="px-5 pt-5">
        <CardTitle>Performance Summary</CardTitle>
        <CardDescription>Detailed breakdown by team members</CardDescription>
      </CardHeader>
      <CardContent className="px-5 pb-5">
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <BarChart3 className="mb-2 h-8 w-8 opacity-50" />
            <p className="text-sm">No performance data available</p>
          </div>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {data.map((row) => (
                <div
                  key={row.userId}
                  className="rounded-xl border border-border/60 bg-card p-4 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground shrink-0" />
                    <p className="font-medium">{row.name}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Total</p>
                      <p className="font-medium tabular-nums">{row.leads}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Converted</p>
                      <p className="font-medium tabular-nums text-[var(--status-converted-bg)]">{row.converted}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Lost</p>
                      <p className="font-medium tabular-nums">{row.lost}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <ConversionRateCell rate={row.conversionRate} />
                    <Badge variant={row.conversionRate > 50 ? 'default' : 'secondary'}>
                      {row.conversionRate > 50 ? 'Excellent' : 'Good'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            <BentoTable className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent even:bg-transparent">
                    <TableHead>Team Member</TableHead>
                    <TableHead className="text-right">Total Leads</TableHead>
                    <TableHead className="text-right">Converted</TableHead>
                    <TableHead className="text-right">Lost</TableHead>
                    <TableHead>Conversion Rate</TableHead>
                    <TableHead className="text-right">Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row) => (
                    <TableRow key={row.userId}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="font-medium">{row.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.leads}</TableCell>
                      <TableCell className="text-right tabular-nums text-[var(--status-converted-bg)]">
                        {row.converted}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.lost}</TableCell>
                      <TableCell>
                        <ConversionRateCell rate={row.conversionRate} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={row.conversionRate > 50 ? 'default' : 'secondary'}>
                          {row.conversionRate > 50 ? 'Excellent' : 'Good'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </BentoTable>
          </>
        )}
      </CardContent>
    </Card>
  );
}
