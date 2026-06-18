import type { ReactNode } from 'react';
import { cn } from '../ui/utils';

export const BENTO_VARIANTS = ['primary', 'teal', 'warm', 'rose', 'slate'] as const;
export type BentoStatVariant = (typeof BENTO_VARIANTS)[number];

const VARIANT_CLASS: Record<BentoStatVariant, string> = {
  primary: 'card-bento-v-primary',
  teal: 'card-bento-v-teal',
  warm: 'card-bento-v-warm',
  rose: 'card-bento-v-rose',
  slate: 'card-bento-v-slate',
};

interface BentoStatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  eyebrow?: string;
  featured?: boolean;
  trend?: { value: string; positive: boolean };
  icon?: ReactNode;
  variant?: BentoStatVariant;
  index?: number;
  className?: string;
}

export function BentoStatCard({
  label,
  value,
  subtitle,
  eyebrow,
  featured = false,
  trend,
  icon,
  variant,
  index = 0,
  className,
}: BentoStatCardProps) {
  const resolvedVariant = variant ?? BENTO_VARIANTS[((index % BENTO_VARIANTS.length) + BENTO_VARIANTS.length) % BENTO_VARIANTS.length];

  return (
    <div
      className={cn(
        'card-bento flex flex-col gap-3 min-h-[7.5rem]',
        featured ? 'p-6' : 'p-5',
        VARIANT_CLASS[resolvedVariant],
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {eyebrow && (
            <p className={cn(
              'font-semibold font-display text-foreground',
              featured ? 'text-lg' : 'text-sm'
            )}>
              {eyebrow}
            </p>
          )}
          <p className={cn(
            'font-medium text-muted-foreground',
            eyebrow ? 'text-sm mt-1' : 'text-sm'
          )}>
            {label}
          </p>
        </div>
        {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
        {trend && !featured && (
          <span
            className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full shrink-0',
              trend.positive ? 'stat-trend-up' : 'stat-trend-down'
            )}
          >
            {trend.value}
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-2 mt-auto">
        <div>
          <p className={cn(
            'font-bold font-display text-foreground leading-none',
            featured ? 'text-4xl tracking-tight' : 'text-3xl'
          )}>
            {value}
          </p>
          {subtitle && (
            <p className={cn(
              'text-muted-foreground mt-2',
              featured ? 'text-sm' : 'text-xs'
            )}>
              {subtitle}
            </p>
          )}
        </div>
        {trend && featured && (
          <span
            className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full shrink-0',
              trend.positive ? 'stat-trend-up' : 'stat-trend-down'
            )}
          >
            {trend.value}
          </span>
        )}
      </div>
    </div>
  );
}
