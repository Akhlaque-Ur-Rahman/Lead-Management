import { Skeleton } from '../ui/skeleton';
import { cn } from '../ui/utils';

interface LoadingStatCardsProps {
  count?: number;
  className?: string;
}

export function LoadingStatCards({ count = 4, className }: LoadingStatCardsProps) {
  return (
    <div
      className={cn('dashboard-bento', className)}
      aria-hidden="true"
      aria-label="Loading statistics"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card-bento border-0 gap-0 p-5 space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  );
}
