import { Skeleton } from '../ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { BentoTable } from './BentoTable';

interface LoadingTableProps {
  columns: number;
  rows?: number;
  className?: string;
}

export function LoadingTable({ columns, rows = 5, className }: LoadingTableProps) {
  return (
    <BentoTable className={className}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent even:bg-transparent">
            {Array.from({ length: columns }).map((_, i) => (
              <TableHead key={i}>
                <Skeleton className="h-4 w-20" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, row) => (
            <TableRow key={row}>
              {Array.from({ length: columns }).map((_, col) => (
                <TableCell key={col}>
                  <Skeleton className="h-4 w-full max-w-[120px]" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </BentoTable>
  );
}
