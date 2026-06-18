import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useLeads, Lead, Director, FollowUp } from './LeadsContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  Building2,
  User,
  Phone,
  Filter,
  X
} from 'lucide-react';
import { cn } from './ui/utils';
import { getFollowUpStatusClasses } from '../utils/followUpStatusColors';
import { toLocalDateKey } from '../utils/dates';
import { LeadDetail } from './LeadDetail';
import { PageHeader } from './layout/PageHeader';

interface FollowUpEntry {
  lead: Lead;
  director: Director;
  followUp: FollowUp;
}

export function Calendar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    getDirectorFollowUpsForDate,
    leads,
    loadLeadsAll,
    refreshFlag
  } = useLeads();
  
  useEffect(() => {
    if (user) {
      loadLeadsAll('assigned');
    }
  }, [user, refreshFlag]);
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [filterHour, setFilterHour] = useState<string>('all');
  
  // Lead Detail Modal state
  const [showLeadDetail, setShowLeadDetail] = useState(false);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);

  if (!user) return null;

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getFollowUpsForDay = (date: Date) => {
    const dateString = toLocalDateKey(date);
    let followUps = getDirectorFollowUpsForDate(
      dateString,
      user.companyId || undefined
    );
    
    // Filter for sales users AND team leads - only show their assigned leads' follow-ups
    if (user.role === 'sales_user' || user.role === 'team_lead') {
      followUps = followUps.filter(item => item.lead.assignedTo === user.id);
    }
    
    return followUps;
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleDateClick = (date: Date) => {
    const dateString = toLocalDateKey(date);
    setSelectedDate(dateString);
    setFilterHour('all');
  };

  const handleLeadClick = (lead: Lead) => {
    setDetailLead(lead);
    setShowLeadDetail(true);
  };

  const handleEditLead = () => {
    if (detailLead) {
      setShowLeadDetail(false);
      navigate(`/leads?leadId=${detailLead.id}`);
    }
  };

  const getHeatLevel = (count: number): 0 | 1 | 2 | 3 => {
    if (count === 0) return 0;
    if (count <= 2) return 1;
    if (count <= 5) return 2;
    return 3;
  };

  const days = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  
  // Get follow-ups for selected date - wrapped in useMemo to re-compute when leads change
  const { latestActiveFollowUps, followUpsByHour, filteredFollowUps, availableHours } = useMemo(() => {
    let selectedDateFollowUps = selectedDate ? getDirectorFollowUpsForDate(
      selectedDate,
      user.companyId || undefined
    ) : [];
    
    // Filter for sales users AND team leads
    if ((user.role === 'sales_user' || user.role === 'team_lead') && selectedDate) {
      selectedDateFollowUps = selectedDateFollowUps.filter(item => item.lead.assignedTo === user.id);
    }

    // COMPANY-LEVEL SINGLETON: Filter to show only ONE active follow-up per company
    const latestActive: FollowUpEntry[] = [];
    const seenCompanies = new Map<string, FollowUpEntry>();
    
    selectedDateFollowUps.forEach(entry => {
      const companyKey = entry.lead.id;
      const existing = seenCompanies.get(companyKey);
      
      const isActive = !entry.followUp.status || entry.followUp.status === 'active';
      
      if (isActive) {
        if (!existing || 
            new Date(entry.followUp.createdAt).getTime() > new Date(existing.followUp.createdAt).getTime()) {
          seenCompanies.set(companyKey, entry);
        }
      }
    });
    
    seenCompanies.forEach(entry => latestActive.push(entry));

    // Group by hour
    const byHour: Record<string, FollowUpEntry[]> = {};
    latestActive.forEach(entry => {
      const hour = entry.followUp.time.split(':')[0];
      if (!byHour[hour]) {
        byHour[hour] = [];
      }
      byHour[hour].push(entry);
    });

    // Filter by hour
    const filtered = filterHour === 'all'
      ? latestActive
      : (byHour[filterHour] || []);

    const hours = Object.keys(byHour).sort();

    return {
      latestActiveFollowUps: latestActive,
      followUpsByHour: byHour,
      filteredFollowUps: filtered,
      availableHours: hours
    };
  }, [selectedDate, user.companyId, user.role, user.id, filterHour, getDirectorFollowUpsForDate, leads]);

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <PageHeader
        title="Follow-up Calendar"
        description="Schedule and manage follow-ups with leads"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Calendar Section */}
        <div className="lg:col-span-2">
          <Card className={cn('card-bento gap-0 border-0')}>
            <CardHeader className="px-5 pt-5">
              <div className="flex items-center justify-between">
                <CardTitle>{monthName}</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handlePrevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentDate(new Date())}
                  >
                    Today
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleNextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {/* Day Headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs sm:text-sm font-medium text-muted-foreground py-2"
                  >
                    {day}
                  </div>
                ))}
                
                {/* Calendar Days */}
                {days.map((day, index) => {
                  if (!day) {
                    return <div key={`empty-${index}`} className="aspect-square" />;
                  }

                  const dateString = toLocalDateKey(day);
                  const followUpsForDay = getFollowUpsForDay(day);
                  const isToday = toLocalDateKey(new Date()) === dateString;
                  const isSelected = selectedDate === dateString;
                  const hasFollowUps = followUpsForDay.length > 0;

                  const formattedDate = day.toLocaleDateString('en-IN', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  });
                  const followUpLabel =
                    followUpsForDay.length === 0
                      ? 'no follow-ups scheduled'
                      : followUpsForDay.length === 1
                        ? '1 follow-up'
                        : `${followUpsForDay.length} follow-ups`;

                  const heatLevel = getHeatLevel(followUpsForDay.length);

                  return (
                    <button
                      key={dateString}
                      type="button"
                      onClick={() => handleDateClick(day)}
                      aria-label={`${formattedDate}, ${followUpLabel}`}
                      aria-pressed={isSelected}
                      className={cn(
                        'aspect-square p-1 sm:p-2 rounded-lg border transition-all relative',
                        'hover:bg-accent hover:border-primary cursor-pointer',
                        isToday && !isSelected && 'border-primary border-2',
                        isSelected && 'bg-primary text-primary-foreground border-primary',
                        !isToday && !isSelected && 'border-border',
                        !isSelected && `calendar-heat-${heatLevel}`
                      )}
                    >
                      <div className="flex flex-col h-full">
                        <span className={cn(
                          'text-xs sm:text-sm',
                          isSelected && 'font-bold'
                        )}>
                          {day.getDate()}
                        </span>
                        {hasFollowUps && (
                          <span className={cn(
                            'text-[10px] sm:text-xs font-medium mt-auto',
                            isSelected ? 'text-primary-foreground' : 'text-foreground'
                          )}>
                            {followUpsForDay.length}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Activity:</span>
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

        {/* Follow-ups List Section */}
        <div className="lg:col-span-1">
          <Card className={cn('card-bento gap-0 border-0 sticky top-4')}>
            <CardHeader className="px-5 pt-5">
              <CardTitle className="flex items-center justify-between">
                <span>
                  {selectedDate
                    ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })
                    : 'Select a Date'}
                </span>
                {selectedDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedDate(null)}
                    aria-label="Clear selected date"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </CardTitle>
              {selectedDate && latestActiveFollowUps.length > 0 && (
                <CardDescription>
                  {latestActiveFollowUps.length} follow-up{latestActiveFollowUps.length !== 1 ? 's' : ''} scheduled
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {!selectedDate ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm">Click on a date to view follow-ups</p>
                </div>
              ) : latestActiveFollowUps.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm">No follow-ups scheduled</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Hour Filter */}
                  <div className="space-y-2">
                    <Label htmlFor="hour-filter" className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      Filter by Hour
                    </Label>
                    <Select value={filterHour} onValueChange={setFilterHour}>
                      <SelectTrigger id="hour-filter">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Hours ({latestActiveFollowUps.length})</SelectItem>
                        {availableHours.map(hour => (
                          <SelectItem key={hour} value={hour}>
                            {hour}:00 ({followUpsByHour[hour].length})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Follow-ups List */}
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                    {filteredFollowUps.map((entry, index) => (
                      <button
                        key={`${entry.lead.id}-${entry.director.id}-${index}`}
                        onClick={() => handleLeadClick(entry.lead)}
                        className="w-full text-left p-3 border rounded-lg hover:bg-accent transition-colors cursor-pointer"
                      >
                        <div className="space-y-2">
                          {/* Time */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-primary" />
                              <span className="font-medium">{entry.followUp.time}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                className={cn('text-xs border-none shadow-none', getFollowUpStatusClasses(entry.lead.status))}
                              >
                                {entry.lead.status}
                              </Badge>
                            </div>
                          </div>

                          {/* Company */}
                          <div className="flex items-start gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {entry.lead.companyName}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {entry.lead.cin}
                              </p>
                            </div>
                          </div>

                          {/* Director */}
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm truncate">
                              {entry.director.firstName} {entry.director.lastName}
                            </span>
                          </div>

                          {/* Talked To */}
                          {entry.followUp.talkedTo && (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-primary flex-shrink-0" />
                              <span className="text-sm font-medium">
                                Talked to: {entry.followUp.talkedTo}
                              </span>
                            </div>
                          )}

                          {/* Phone */}
                          {entry.director.mobile && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm text-muted-foreground">
                                {entry.director.mobile}
                              </span>
                            </div>
                          )}

                          {/* Remark */}
                          {entry.followUp.remark && (
                            <p className="text-xs text-muted-foreground italic line-clamp-2 pl-6">
                              "{entry.followUp.remark}"
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>


      {/* Lead Detail Dialog */}
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
