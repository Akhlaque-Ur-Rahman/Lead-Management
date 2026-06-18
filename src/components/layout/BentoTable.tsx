import * as React from 'react';
import { cn } from '../ui/utils';

interface BentoTableProps {
  children: React.ReactNode;
  caption?: React.ReactNode;
  scrollable?: boolean;
  maxHeight?: string;
  stickyHeader?: boolean;
  className?: string;
  scrollRef?: React.Ref<HTMLDivElement>;
}

export function BentoTable({
  children,
  caption,
  scrollable = false,
  maxHeight,
  stickyHeader = false,
  className,
  scrollRef,
}: BentoTableProps) {
  return (
    <div className={cn('w-full', className)}>
      {caption != null && caption !== '' && (
        <div className="border-b border-[var(--table-border)] px-5 py-3 text-sm text-muted-foreground">
          {caption}
        </div>
      )}
      <div
        ref={scrollRef}
        data-sticky-header={stickyHeader ? 'true' : undefined}
        className={cn(
          'table-bento-shell',
          scrollable && 'overflow-auto',
          '[&_[data-slot=table-container]]:overflow-visible',
        )}
        style={maxHeight ? { maxHeight } : undefined}
      >
        {children}
      </div>
    </div>
  );
}
