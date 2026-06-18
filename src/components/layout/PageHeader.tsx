import type { ReactNode } from 'react';
import { cn } from '../ui/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4', className)}>
      <div>
        <h1 className="text-2xl font-semibold font-display tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground text-sm sm:text-base mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2 w-full sm:w-auto">{actions}</div>}
    </div>
  );
}
