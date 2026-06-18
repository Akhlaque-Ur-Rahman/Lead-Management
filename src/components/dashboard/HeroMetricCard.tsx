import { cn } from '../ui/utils';

interface HeroMetricCardProps {
  greeting: string;
  label: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: string; positive: boolean };
  className?: string;
}

export function HeroMetricCard({
  greeting,
  label,
  value,
  subtitle,
  trend,
  className,
}: HeroMetricCardProps) {
  return (
    <div className={cn('card-hero flex flex-col justify-between p-6 min-h-[7.5rem]', className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-semibold font-display text-hero">{greeting}</p>
          <p className="text-sm text-hero-muted mt-1">{label}</p>
        </div>
        {trend && (
          <span className="hero-trend-badge text-xs font-medium px-2 py-0.5 rounded-full shrink-0">
            {trend.value}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-4xl font-bold font-display tracking-tight text-hero">{value}</p>
        {subtitle && (
          <p className="text-sm text-hero-muted mt-2">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
