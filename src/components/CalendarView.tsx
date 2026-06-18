import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useLeads, type Lead } from './LeadsContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from './ui/sheet';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { cn } from './ui/utils';
import { toLocalDateKey } from '../utils/dates';
import {
  computeCalendarStats,
  dedupeLatestActivePerLead,
  filterFollowUpsByRole,
  formatDayAriaLabel,
  getDayCounts,
  getDaysInMonthGrid,
  getHeatLevel,
  getMonthDateKeys,
  getSelectedDayAgenda,
  getWeekDays,
  getWeekdayLabels,
  type FollowUpEntry,
} from '../utils/followups/calendar';
import { LeadDetail } from './LeadDetail';
import { usePageMeta } from './layout/PageMetaContext';
import { BentoStatCard } from './dashboard/BentoStatCard';
import { FollowUpAgendaCard } from './calendar/FollowUpAgendaCard';
import { EmptyState } from './layout/EmptyState';
import { useIsMobile } from './ui/use-mobile';

type ViewMode = 'month' | 'week';

function formatSelectedDateLabel(dateKey: string): string {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

interface DayAgendaPanelProps {
  selectedDate: string | null;
  isLoading: boolean;
  latestActiveFollowUps: FollowUpEntry[];
  filteredFollowUps: FollowUpEntry[];
  followUpsByHour: Record<string, FollowUpEntry[]>;
  availableHours: string[];
  filterHour: string;
  onFilterHourChange: (hour: string) => void;
  onLeadClick: (lead: Lead) => void;
  onClearDate?: () => void;
  showClear?: boolean;
  className?: string;
}

function DayAgendaPanel({
  selectedDate,
  isLoading,
  latestActiveFollowUps,
  filteredFollowUps,
  followUpsByHour,
  availableHours,
  filterHour,
  onFilterHourChange,
  onLeadClick,
  onClearDate,
  showClear = true,
  className,
}: DayAgendaPanelProps) {
  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center py-16', className)}>
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading follow-ups" />
      </div>
    );
  }

  if (!selectedDate) {
    return (
      <EmptyState
        className={cn('py-12', className)}
        icon={<CalendarIcon className="h-6 w-6" />}
        title="Select a date"
        description="Choose a day on the calendar to view scheduled follow-ups."
      />
    );
  }

  if (latestActiveFollowUps.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div
        role="tablist"
        aria-label="Filter follow-ups by hour"
        className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin"
      >
        <button
          type="button"
          role="tab"
          aria-selected={filterHour === 'all'}
          onClick={() => onFilterHourChange('all')}
          className={cn(
            'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors',
            filterHour === 'all'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
          )}
        >
          All ({latestActiveFollowUps.length})
        </button>
        {availableHours.map((hour) => (
          <button
            key={hour}
            type="button"
            role="tab"
            aria-selected={filterHour === hour}
            onClick={() => onFilterHourChange(hour)}
            className={cn(
              'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors tabular-nums',
              filterHour === hour
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
            )}
          >
            {hour}:00 ({followUpsByHour[hour]?.length ?? 0})
          </button>
        ))}
      </div>

      <div className="space-y-3 max-h-[min(500px,60vh)] overflow-y-auto pr-1">
        {filteredFollowUps.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No follow-ups in this hour.
          </p>
        ) : (
          filteredFollowUps.map((entry, index) => (
            <FollowUpAgendaCard
              key={`${entry.lead.id}-${entry.director.id}-${index}`}
              entry={entry}
              onClick={() => onLeadClick(entry.lead)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function Calendar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const {
    getDirectorFollowUpsForDate,
    leads,
    loadLeadsAll,
    refreshFlag,
    isLoading,
  } = useLeads();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(() => toLocalDateKey(new Date()));
  const [filterHour, setFilterHour] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [weekStartsOn, setWeekStartsOn] = useState<0 | 1>(0);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [showLeadDetail, setShowLeadDetail] = useState(false);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadLeadsAll('assigned');
    }
  }, [user, loadLeadsAll, refreshFlag]);

  const calendarUser = useMemo(
    () =>
      user
        ? { id: user.id, role: user.role, companyId: user.companyId }
        : null,
    [user]
  );

  const stats = useMemo(() => {
    if (!calendarUser) {
      return { today: 0, thisWeek: 0, thisMonth: 0, overdue: 0 };
    }
    return computeCalendarStats(
      getDirectorFollowUpsForDate,
      calendarUser,
      currentDate,
      leads,
      weekStartsOn
    );
  }, [
    calendarUser,
    getDirectorFollowUpsForDate,
    currentDate,
    leads,
    weekStartsOn,
  ]);

  const monthDedupedTotal = useMemo(() => {
    if (!calendarUser) return 0;
    const keys = getMonthDateKeys(currentDate);
    let total = 0;
    for (const key of keys) {
      const entries = filterFollowUpsByRole(
        getDirectorFollowUpsForDate(key, calendarUser.companyId || undefined),
        calendarUser
      );
      total += dedupeLatestActivePerLead(entries).length;
    }
    return total;
  }, [calendarUser, currentDate, getDirectorFollowUpsForDate, leads]);

  const agenda = useMemo(() => {
    if (!calendarUser) {
      return {
        latestActiveFollowUps: [] as FollowUpEntry[],
        followUpsByHour: {} as Record<string, FollowUpEntry[]>,
        filteredFollowUps: [] as FollowUpEntry[],
        availableHours: [] as string[],
      };
    }
    return getSelectedDayAgenda(
      selectedDate,
      filterHour,
      getDirectorFollowUpsForDate,
      calendarUser
    );
  }, [
    calendarUser,
    selectedDate,
    filterHour,
    getDirectorFollowUpsForDate,
    leads,
  ]);

  usePageMeta({
    title: 'Follow-up Calendar',
    description: `${stats.thisMonth} follow-up${stats.thisMonth === 1 ? '' : 's'} this month`,
  });

  const monthName = currentDate.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  const monthDays = useMemo(
    () => getDaysInMonthGrid(currentDate, weekStartsOn),
    [currentDate, weekStartsOn]
  );

  const weekDays = useMemo(
    () =>
      getWeekDays(
        selectedDate ? new Date(`${selectedDate}T00:00:00`) : currentDate,
        weekStartsOn
      ),
    [selectedDate, currentDate, weekStartsOn]
  );

  const displayDays = viewMode === 'month' ? monthDays : weekDays;

  const getEntriesForDay = useCallback(
    (day: Date) => {
      if (!calendarUser) return { deduped: 0, total: 0, entries: [] as FollowUpEntry[] };
      const dateString = toLocalDateKey(day);
      const raw = filterFollowUpsByRole(
        getDirectorFollowUpsForDate(dateString, calendarUser.companyId || undefined),
        calendarUser
      );
      const counts = getDayCounts(raw);
      return { ...counts, entries: raw };
    },
    [calendarUser, getDirectorFollowUpsForDate, leads]
  );

  const handleDateClick = useCallback(
    (day: Date) => {
      const dateString = toLocalDateKey(day);
      setSelectedDate(dateString);
      setFilterHour('all');
      if (isMobile) {
        setMobileSheetOpen(true);
      }
    },
    [isMobile]
  );

  const handleLeadClick = useCallback((lead: Lead) => {
    setDetailLead(lead);
    setShowLeadDetail(true);
    setMobileSheetOpen(false);
  }, []);

  const handleEditLead = () => {
    if (detailLead) {
      setShowLeadDetail(false);
      navigate(`/leads?leadId=${detailLead.id}`);
    }
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(toLocalDateKey(today));
    setFilterHour('all');
  };

  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    } else {
      const anchor = selectedDate
        ? new Date(`${selectedDate}T00:00:00`)
        : currentDate;
      anchor.setDate(anchor.getDate() - 7);
      setCurrentDate(anchor);
      setSelectedDate(toLocalDateKey(anchor));
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    } else {
      const anchor = selectedDate
        ? new Date(`${selectedDate}T00:00:00`)
        : currentDate;
      anchor.setDate(anchor.getDate() + 7);
      setCurrentDate(anchor);
      setSelectedDate(toLocalDateKey(anchor));
    }
  };

  const handleGridKeyDown = (e: React.KeyboardEvent) => {
    if (!selectedDate) return;
    const current = new Date(`${selectedDate}T00:00:00`);
    let next: Date | null = null;

    switch (e.key) {
      case 'ArrowLeft':
        next = new Date(current);
        next.setDate(current.getDate() - 1);
        break;
      case 'ArrowRight':
        next = new Date(current);
        next.setDate(current.getDate() + 1);
        break;
      case 'ArrowUp':
        next = new Date(current);
        next.setDate(current.getDate() - 7);
        break;
      case 'ArrowDown':
        next = new Date(current);
        next.setDate(current.getDate() + 7);
        break;
      case 'Home':
        goToToday();
        e.preventDefault();
        return;
      case 'PageUp':
        handlePrev();
        e.preventDefault();
        return;
      case 'PageDown':
        handleNext();
        e.preventDefault();
        return;
      default:
        return;
    }

    if (next) {
      e.preventDefault();
      handleDateClick(next);
      if (viewMode === 'month') {
        setCurrentDate(new Date(next.getFullYear(), next.getMonth(), 1));
      }
    }
  };

  if (!user || !calendarUser) return null;

  const weekdayLabels = getWeekdayLabels(weekStartsOn);
  const weekLabel =
    viewMode === 'week'
      ? `${weekDays[0].toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${weekDays[6].toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
      : monthName;

  const agendaPanelProps: DayAgendaPanelProps = {
    selectedDate,
    isLoading,
    ...agenda,
    filterHour,
    onFilterHourChange: setFilterHour,
    onLeadClick: handleLeadClick,
    onClearDate: () => setSelectedDate(null),
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="dashboard-bento">
        <BentoStatCard
          label="Today"
          value={stats.today}
          subtitle="Scheduled for today"
          variant="primary"
        />
        <BentoStatCard
          label="This Week"
          value={stats.thisWeek}
          subtitle={weekStartsOn === 1 ? 'Mon start week' : 'Sun start week'}
          variant="teal"
        />
        <BentoStatCard
          label="This Month"
          value={stats.thisMonth}
          subtitle={monthName}
          variant="warm"
        />
        <BentoStatCard
          label="Overdue"
          value={stats.overdue}
          subtitle="Past due dates"
          variant="rose"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div className="lg:col-span-2">
          <Card className={cn('card-bento gap-0 border-0')}>
            <CardHeader className="px-5 pt-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle>{weekLabel}</CardTitle>
                  {viewMode === 'month' && monthDedupedTotal > 0 && (
                    <CardDescription className="mt-1">
                      {monthDedupedTotal} follow-up{monthDedupedTotal === 1 ? '' : 's'} this month
                    </CardDescription>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div
                    className="inline-flex rounded-lg border border-border p-0.5 bg-muted/40"
                    role="group"
                    aria-label="Calendar view mode"
                  >
                    <Button
                      type="button"
                      variant={viewMode === 'month' ? 'default' : 'ghost'}
                      size="sm"
                      className="h-8 px-3"
                      onClick={() => setViewMode('month')}
                    >
                      Month
                    </Button>
                    <Button
                      type="button"
                      variant={viewMode === 'week' ? 'default' : 'ghost'}
                      size="sm"
                      className="h-8 px-3"
                      onClick={() => setViewMode('week')}
                    >
                      Week
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setWeekStartsOn((w) => (w === 0 ? 1 : 0))}
                    aria-label="Toggle week start day"
                  >
                    {weekStartsOn === 0 ? 'Sun start' : 'Mon start'}
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={handlePrev} aria-label="Previous">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8" onClick={goToToday}>
                    Today
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={handleNext} aria-label="Next">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <div
                ref={gridRef}
                role="grid"
                aria-label="Follow-up calendar"
                tabIndex={0}
                onKeyDown={handleGridKeyDown}
                className={cn(
                  'grid grid-cols-7 gap-1 sm:gap-2 outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg',
                  viewMode === 'week' && 'gap-2'
                )}
              >
                {weekdayLabels.map((day) => (
                  <div
                    key={day}
                    role="columnheader"
                    className="text-center text-xs sm:text-sm font-medium text-muted-foreground py-2"
                  >
                    {day}
                  </div>
                ))}

                {displayDays.map((day, index) => {
                  if (!day) {
                    return (
                      <div
                        key={`empty-${index}`}
                        className="aspect-square"
                        role="gridcell"
                        aria-hidden
                      />
                    );
                  }

                  const dateString = toLocalDateKey(day);
                  const { deduped, total } = getEntriesForDay(day);
                  const isToday = toLocalDateKey(new Date()) === dateString;
                  const isSelected = selectedDate === dateString;
                  const heatLevel = getHeatLevel(deduped);

                  return (
                    <button
                      key={dateString}
                      type="button"
                      role="gridcell"
                      onClick={() => handleDateClick(day)}
                      aria-label={formatDayAriaLabel(day, deduped, total)}
                      aria-pressed={isSelected}
                      aria-current={isToday ? 'date' : undefined}
                      className={cn(
                        'aspect-square p-1 sm:p-2 rounded-lg border transition-all relative',
                        'hover:bg-accent hover:border-primary cursor-pointer',
                        viewMode === 'week' && 'min-h-[4.5rem] sm:min-h-[5.5rem]',
                        isToday && !isSelected && 'border-primary border-2',
                        isSelected && 'bg-primary text-primary-foreground border-primary',
                        !isToday && !isSelected && 'border-border',
                        !isSelected && `calendar-heat-${heatLevel}`
                      )}
                    >
                      <div className="flex flex-col h-full items-start">
                        <span
                          className={cn(
                            'text-xs sm:text-sm',
                            isSelected && 'font-bold',
                            viewMode === 'week' && 'text-sm sm:text-base font-medium'
                          )}
                        >
                          {day.getDate()}
                        </span>
                        {deduped > 0 && (
                          <>
                            <span
                              className={cn(
                                'text-[10px] sm:text-xs font-medium mt-auto tabular-nums',
                                isSelected ? 'text-primary-foreground' : 'text-foreground'
                              )}
                            >
                              {deduped}
                            </span>
                            {total > deduped && !isSelected && (
                              <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary/70" aria-hidden />
                            )}
                          </>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Activity (companies):</span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded calendar-heat-1 border border-border" aria-hidden />
                  Low (1–2)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded calendar-heat-2 border border-border" aria-hidden />
                  Medium (3–5)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded calendar-heat-3 border border-border" aria-hidden />
                  High (6+)
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="hidden lg:block lg:col-span-1">
          <Card className={cn('card-bento gap-0 border-0 sticky top-[calc(var(--app-header-offset)+0.5rem)]')}>
            <CardHeader className="px-5 pt-5">
              <CardTitle>
                {selectedDate ? formatSelectedDateLabel(selectedDate) : 'Day agenda'}
              </CardTitle>
              {selectedDate && agenda.latestActiveFollowUps.length > 0 && (
                <CardDescription>
                  {agenda.latestActiveFollowUps.length} follow-up
                  {agenda.latestActiveFollowUps.length !== 1 ? 's' : ''} scheduled
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {agenda.latestActiveFollowUps.length === 0 && selectedDate && !isLoading ? (
                <EmptyState
                  className="py-10"
                  icon={<CalendarIcon className="h-6 w-6" />}
                  title="No follow-ups scheduled"
                  description="There are no active follow-ups on this date."
                  action={{
                    label: 'View assigned leads',
                    onClick: () => navigate('/assigned'),
                  }}
                />
              ) : (
                <DayAgendaPanel {...agendaPanelProps} showClear={false} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>
              {selectedDate ? formatSelectedDateLabel(selectedDate) : 'Day agenda'}
            </SheetTitle>
            {selectedDate && agenda.latestActiveFollowUps.length > 0 && (
              <SheetDescription>
                {agenda.latestActiveFollowUps.length} follow-up
                {agenda.latestActiveFollowUps.length !== 1 ? 's' : ''} scheduled
              </SheetDescription>
            )}
          </SheetHeader>
          <div className="px-4 pb-6">
            {agenda.latestActiveFollowUps.length === 0 && selectedDate && !isLoading ? (
              <EmptyState
                className="py-8"
                icon={<CalendarIcon className="h-6 w-6" />}
                title="No follow-ups scheduled"
                description="There are no active follow-ups on this date."
                action={{
                  label: 'View assigned leads',
                  onClick: () => {
                    setMobileSheetOpen(false);
                    navigate('/assigned');
                  },
                }}
              />
            ) : (
              <DayAgendaPanel {...agendaPanelProps} showClear={false} />
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={showLeadDetail} onOpenChange={setShowLeadDetail}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">
              {detailLead ? `Lead details: ${detailLead.companyName}` : 'Lead details'}
            </DialogTitle>
          </DialogHeader>
          {detailLead && (
            <LeadDetail
              lead={detailLead}
              onClose={() => {
                setShowLeadDetail(false);
                setDetailLead(null);
              }}
              onEdit={handleEditLead}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
