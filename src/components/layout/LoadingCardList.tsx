import { Skeleton } from '../ui/skeleton';
import { cn } from '../ui/utils';

interface LoadingCardListProps {
  count?: number;
  className?: string;
}

export function LoadingCardList({ count = 4, className }: LoadingCardListProps) {
  return (
    <div className={cn('space-y-3', className)} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card-bento border-0 gap-0 p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/5 max-w-[200px]" />
              <Skeleton className="h-3 w-2/5 max-w-[120px]" />
            </div>
            <Skeleton className="h-5 w-14 shrink-0 rounded-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-4/5 max-w-[240px]" />
            <Skeleton className="h-3 w-1/2 max-w-[160px]" />
          </div>
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-9 flex-1 rounded-md" />
            <Skeleton className="h-9 flex-1 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}
