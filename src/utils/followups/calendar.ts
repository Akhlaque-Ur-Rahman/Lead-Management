import type { Lead, Director, FollowUp } from '../../components/LeadsContext';
import { toLocalDateKey } from '../dates';

export type FollowUpEntry = {
  lead: Lead;
  director: Director;
  followUp: FollowUp;
};

export type CalendarUser = {
  id: string;
  role: string;
  companyId?: string | null;
};

export type CalendarStats = {
  today: number;
  thisWeek: number;
  thisMonth: number;
  overdue: number;
};

export function isActiveFollowUp(followUp: FollowUp): boolean {
  return !followUp.status || followUp.status === 'active';
}

export function filterFollowUpsByRole(
  entries: FollowUpEntry[],
  user: CalendarUser
): FollowUpEntry[] {
  if (user.role === 'sales_user' || user.role === 'team_lead') {
    return entries.filter((item) => item.lead.assignedTo === user.id);
  }
  return entries;
}

export function dedupeLatestActivePerLead(entries: FollowUpEntry[]): FollowUpEntry[] {
  const seen = new Map<string, FollowUpEntry>();

  entries.forEach((entry) => {
    if (!isActiveFollowUp(entry.followUp)) return;
    const key = entry.lead.id;
    const existing = seen.get(key);
    if (
      !existing ||
      new Date(entry.followUp.createdAt).getTime() >
        new Date(existing.followUp.createdAt).getTime()
    ) {
      seen.set(key, entry);
    }
  });

  return Array.from(seen.values()).sort((a, b) =>
    a.followUp.time.localeCompare(b.followUp.time)
  );
}

export function getDayCounts(entries: FollowUpEntry[]): {
  deduped: number;
  total: number;
} {
  const active = entries.filter((e) => isActiveFollowUp(e.followUp));
  return {
    deduped: dedupeLatestActivePerLead(active).length,
    total: active.length,
  };
}

export function getHeatLevel(count: number): 0 | 1 | 2 | 3 {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  return 3;
}

export function isOverdueDate(dateKey: string): boolean {
  return dateKey < toLocalDateKey(new Date());
}

export function formatDayAriaLabel(
  date: Date,
  deduped: number,
  total: number
): string {
  const formatted = date.toLocaleDateString('en-IN', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  if (deduped === 0) {
    return `${formatted}, no follow-ups scheduled`;
  }
  if (total === deduped) {
    return `${formatted}, ${deduped} follow-up${deduped === 1 ? '' : 's'}`;
  }
  return `${formatted}, ${deduped} companies, ${total} follow-ups`;
}

function countDedupedForDateKeys(
  getDirectorFollowUpsForDate: (date: string, companyId?: string) => FollowUpEntry[],
  user: CalendarUser,
  dateKeys: string[]
): number {
  let total = 0;
  for (const key of dateKeys) {
    const entries = filterFollowUpsByRole(
      getDirectorFollowUpsForDate(key, user.companyId || undefined),
      user
    );
    total += dedupeLatestActivePerLead(entries).length;
  }
  return total;
}

export function getWeekStart(date: Date, weekStartsOn: 0 | 1): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const diff = weekStartsOn === 1 ? (day === 0 ? -6 : 1 - day) : -day;
  start.setDate(start.getDate() + diff);
  return start;
}

export function getWeekDays(anchor: Date, weekStartsOn: 0 | 1): Date[] {
  const start = getWeekStart(anchor, weekStartsOn);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export function getMonthDateKeys(monthDate: Date): string[] {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: lastDay }, (_, i) =>
    toLocalDateKey(new Date(year, month, i + 1))
  );
}

export function getDaysInMonthGrid(date: Date, weekStartsOn: 0 | 1): (Date | null)[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  let startingDayOfWeek = firstDay.getDay();
  if (weekStartsOn === 1) {
    startingDayOfWeek = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
  }

  const days: (Date | null)[] = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }
  return days;
}

export function getWeekdayLabels(weekStartsOn: 0 | 1): string[] {
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  if (weekStartsOn === 1) {
    return [...labels.slice(1), labels[0]];
  }
  return labels;
}

export function computeOverdueCount(leads: Lead[], user: CalendarUser): number {
  const todayKey = toLocalDateKey(new Date());
  const entries: FollowUpEntry[] = [];

  for (const lead of leads) {
    if (lead.status === 'Converted' || lead.status === 'Lost') continue;
    if (user.role === 'sales_user' || user.role === 'team_lead') {
      if (lead.assignedTo !== user.id) continue;
    }
    if (user.companyId && lead.companyId !== user.companyId) continue;

    for (const director of lead.directors ?? []) {
      for (const followUp of director.followUps ?? []) {
        if (isActiveFollowUp(followUp) && followUp.date < todayKey) {
          entries.push({ lead, director, followUp });
        }
      }
    }
  }

  return dedupeLatestActivePerLead(entries).length;
}

export function computeCalendarStats(
  getDirectorFollowUpsForDate: (date: string, companyId?: string) => FollowUpEntry[],
  user: CalendarUser,
  monthDate: Date,
  leads: Lead[],
  weekStartsOn: 0 | 1 = 0
): CalendarStats {
  const todayKey = toLocalDateKey(new Date());
  const todayEntries = filterFollowUpsByRole(
    getDirectorFollowUpsForDate(todayKey, user.companyId || undefined),
    user
  );

  const weekKeys = getWeekDays(new Date(), weekStartsOn).map(toLocalDateKey);
  const monthKeys = getMonthDateKeys(monthDate);

  return {
    today: dedupeLatestActivePerLead(todayEntries).length,
    thisWeek: countDedupedForDateKeys(getDirectorFollowUpsForDate, user, weekKeys),
    thisMonth: countDedupedForDateKeys(getDirectorFollowUpsForDate, user, monthKeys),
    overdue: computeOverdueCount(leads, user),
  };
}

export function groupFollowUpsByHour(
  entries: FollowUpEntry[]
): Record<string, FollowUpEntry[]> {
  const byHour: Record<string, FollowUpEntry[]> = {};
  entries.forEach((entry) => {
    const hour = entry.followUp.time.split(':')[0];
    if (!byHour[hour]) byHour[hour] = [];
    byHour[hour].push(entry);
  });
  return byHour;
}

export function getSelectedDayAgenda(
  selectedDate: string | null,
  filterHour: string,
  getDirectorFollowUpsForDate: (date: string, companyId?: string) => FollowUpEntry[],
  user: CalendarUser
): {
  latestActiveFollowUps: FollowUpEntry[];
  followUpsByHour: Record<string, FollowUpEntry[]>;
  filteredFollowUps: FollowUpEntry[];
  availableHours: string[];
} {
  if (!selectedDate) {
    return {
      latestActiveFollowUps: [],
      followUpsByHour: {},
      filteredFollowUps: [],
      availableHours: [],
    };
  }

  let selectedDateFollowUps = filterFollowUpsByRole(
    getDirectorFollowUpsForDate(selectedDate, user.companyId || undefined),
    user
  );
  const latestActive = dedupeLatestActivePerLead(selectedDateFollowUps);
  const byHour = groupFollowUpsByHour(latestActive);
  const filtered =
    filterHour === 'all' ? latestActive : byHour[filterHour] ?? [];

  return {
    latestActiveFollowUps: latestActive,
    followUpsByHour: byHour,
    filteredFollowUps: filtered,
    availableHours: Object.keys(byHour).sort(),
  };
}
