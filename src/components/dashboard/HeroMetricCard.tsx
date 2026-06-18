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
          <p className="text-lg font-semibold font-display text-white/95">{greeting}</p>
          <p className="text-sm text-white/70 mt-1">{label}</p>
        </div>
        {trend && (
          <span
            className={cn(
              'text-xs font-medium px-2 py-0.5 rounded-full shrink-0',
              trend.positive ? 'bg-white/20 text-white' : 'bg-black/20 text-white'
            )}
          >
            {trend.value}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-4xl font-bold font-display tracking-tight">{value}</p>
        {subtitle && (
          <p className="text-sm text-white/75 mt-2">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
