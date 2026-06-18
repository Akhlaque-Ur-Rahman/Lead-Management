import { Building2, Clock, Phone, User } from 'lucide-react';
import { Badge } from '../ui/badge';
import { cn } from '../ui/utils';
import { getFollowUpStatusClasses } from '../../utils/followUpStatusColors';
import { isOverdueDate, type FollowUpEntry } from '../../utils/followups/calendar';

interface FollowUpAgendaCardProps {
  entry: FollowUpEntry;
  onClick: () => void;
  showOverdue?: boolean;
}

export function FollowUpAgendaCard({
  entry,
  onClick,
  showOverdue = true,
}: FollowUpAgendaCardProps) {
  const overdue =
    showOverdue && isOverdueDate(entry.followUp.date);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'card-bento w-full text-left p-3 sm:p-4 transition-colors cursor-pointer',
        'hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        overdue && 'border-l-[3px] border-l-[var(--status-warm-bg)]'
      )}
    >
      <div className="flex gap-3">
        <div className="flex flex-col items-center shrink-0 gap-1">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-1 text-xs font-semibold tabular-nums">
            <Clock className="h-3 w-3" aria-hidden />
            {entry.followUp.time}
          </span>
          {overdue && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 status-warm border-none">
              Overdue
            </Badge>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-1.5 min-w-0">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" aria-hidden />
              <div className="min-w-0">
                <p className="font-medium text-sm truncate">{entry.lead.companyName}</p>
                {entry.lead.cin && (
                  <p className="text-xs text-muted-foreground truncate">{entry.lead.cin}</p>
                )}
              </div>
            </div>
            <Badge
              className={cn(
                'text-xs border-none shadow-none shrink-0',
                getFollowUpStatusClasses(entry.lead.status)
              )}
            >
              {entry.lead.status}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <User className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">
              {entry.director.firstName} {entry.director.lastName}
            </span>
          </div>

          {entry.followUp.talkedTo && (
            <p className="text-xs text-foreground pl-5">
              Talked to: {entry.followUp.talkedTo}
            </p>
          )}

          {entry.director.mobile && (
            <a
              href={`tel:${entry.director.mobile.replace(/\s/g, '')}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline pl-5"
            >
              <Phone className="h-3.5 w-3.5" aria-hidden />
              {entry.director.mobile}
            </a>
          )}

          {entry.followUp.remark && (
            <p className="text-xs text-muted-foreground italic line-clamp-2 pl-5">
              &ldquo;{entry.followUp.remark}&rdquo;
            </p>
          )}
        </div>
      </div>
    </button>
  );
}
