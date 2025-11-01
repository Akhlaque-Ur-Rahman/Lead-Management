import { useState } from 'react';
import { useAuth } from './AuthContext';
import { useLeads, Lead, Director, FollowUp } from './LeadsContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
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
  DialogDescription,
  DialogFooter,
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
import { toast } from 'sonner';
import { cn } from './ui/utils';

interface FollowUpEntry {
  lead: Lead;
  director: Director;
  followUp: FollowUp;
}

export function Calendar() {
  const { user } = useAuth();
  const { getDirectorFollowUpsForDate, addDirectorFollowUp } = useLeads();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<{ lead: Lead; director: Director } | null>(null);
  const [filterHour, setFilterHour] = useState<string>('all');
  
  // Follow-up form
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('');
  const [followUpRemark, setFollowUpRemark] = useState('');

  if (!user) return null;

  const getLocalDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

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
    const dateString = getLocalDateString(date);
    let followUps = getDirectorFollowUpsForDate(
      dateString,
      user.companyId || undefined
    );
    
    // Filter for sales users - only show their assigned leads' follow-ups
    if (user.role === 'sales_user') {
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
    const dateString = getLocalDateString(date);
    setSelectedDate(dateString);
    setFilterHour('all');
  };

  const handleLeadClick = (lead: Lead, director: Director) => {
    setSelectedLead({ lead, director });
    setShowFollowUpDialog(true);
    
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setFollowUpDate(getLocalDateString(tomorrow));
    setFollowUpTime('10:00');
  };

  const handleAddFollowUp = () => {
    if (!selectedLead || !followUpDate || !followUpTime || !followUpRemark.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    addDirectorFollowUp(selectedLead.lead.id, selectedLead.director.id, {
      date: followUpDate,
      time: followUpTime,
      remark: followUpRemark,
      createdBy: user.id,
      createdAt: new Date().toISOString(),
      directorId: selectedLead.director.id,
      directorName: `${selectedLead.director.firstName} ${selectedLead.director.lastName}`,
    });

    toast.success('Follow-up scheduled successfully!');
    setShowFollowUpDialog(false);
    setSelectedLead(null);
    setFollowUpDate('');
    setFollowUpTime('');
    setFollowUpRemark('');
  };

  const days = getDaysInMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  
  // Get follow-ups for selected date
  let selectedDateFollowUps = selectedDate ? getDirectorFollowUpsForDate(
    selectedDate,
    user.companyId || undefined
  ) : [];
  
  // Filter for sales users
  if (user.role === 'sales_user' && selectedDate) {
    selectedDateFollowUps = selectedDateFollowUps.filter(item => item.lead.assignedTo === user.id);
  }

  // Group by hour
  const followUpsByHour: Record<string, FollowUpEntry[]> = {};
  selectedDateFollowUps.forEach(entry => {
    const hour = entry.followUp.time.split(':')[0];
    if (!followUpsByHour[hour]) {
      followUpsByHour[hour] = [];
    }
    followUpsByHour[hour].push(entry);
  });

  // Filter by hour
  const filteredFollowUps = filterHour === 'all'
    ? selectedDateFollowUps
    : (followUpsByHour[filterHour] || []);

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const availableHours = Object.keys(followUpsByHour).sort();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Hot': return 'bg-red-500';
      case 'Warm': return 'bg-orange-500';
      case 'Cold': return 'bg-blue-500';
      case 'Converted': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="flex items-center gap-2">
          <CalendarIcon className="h-6 w-6" />
          Follow-up Calendar
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Schedule and manage follow-ups with leads
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Calendar Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
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
            <CardContent>
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

                  const dateString = getLocalDateString(day);
                  const followUpsForDay = getFollowUpsForDay(day);
                  const isToday = getLocalDateString(new Date()) === dateString;
                  const isSelected = selectedDate === dateString;
                  const hasFollowUps = followUpsForDay.length > 0;

                  return (
                    <button
                      key={dateString}
                      onClick={() => handleDateClick(day)}
                      className={cn(
                        'aspect-square p-1 sm:p-2 rounded-lg border transition-all relative',
                        'hover:bg-accent hover:border-primary cursor-pointer',
                        isToday && 'border-primary border-2 bg-primary/5',
                        isSelected && 'bg-primary text-primary-foreground border-primary',
                        !isToday && !isSelected && 'border-border'
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
                          <div className="flex-1 flex items-center justify-center">
                            <div className={cn(
                              'w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full',
                              isSelected ? 'bg-primary-foreground' : 'bg-primary'
                            )} />
                          </div>
                        )}
                        {hasFollowUps && (
                          <span className="text-[10px] sm:text-xs opacity-75">
                            {followUpsForDay.length}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Follow-ups List Section */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
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
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </CardTitle>
              {selectedDate && selectedDateFollowUps.length > 0 && (
                <CardDescription>
                  {selectedDateFollowUps.length} follow-up{selectedDateFollowUps.length !== 1 ? 's' : ''} scheduled
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {!selectedDate ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Click on a date to view follow-ups</p>
                </div>
              ) : selectedDateFollowUps.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
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
                        <SelectItem value="all">All Hours ({selectedDateFollowUps.length})</SelectItem>
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
                        onClick={() => handleLeadClick(entry.lead, entry.director)}
                        className="w-full text-left p-3 border rounded-lg hover:bg-accent transition-colors cursor-pointer"
                      >
                        <div className="space-y-2">
                          {/* Time */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-primary" />
                              <span className="font-medium">{entry.followUp.time}</span>
                            </div>
                            <Badge
                              variant="outline"
                              className={cn('border-2', getStatusColor(entry.lead.status))}
                            >
                              {entry.lead.status}
                            </Badge>
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

      {/* Add Follow-up Dialog */}
      <Dialog open={showFollowUpDialog} onOpenChange={setShowFollowUpDialog}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Schedule Follow-up</DialogTitle>
            <DialogDescription>
              {selectedLead && (
                <>
                  For {selectedLead.lead.companyName} - {selectedLead.director.firstName}{' '}
                  {selectedLead.director.lastName}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fu-date">Follow-up Date *</Label>
                <Input
                  id="fu-date"
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  min={getLocalDateString(new Date())}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fu-time">Time *</Label>
                <Input
                  id="fu-time"
                  type="time"
                  value={followUpTime}
                  onChange={(e) => setFollowUpTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fu-remark">Remark *</Label>
              <Textarea
                id="fu-remark"
                value={followUpRemark}
                onChange={(e) => setFollowUpRemark(e.target.value)}
                placeholder="Enter follow-up notes..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowFollowUpDialog(false);
                setSelectedLead(null);
                setFollowUpDate('');
                setFollowUpTime('');
                setFollowUpRemark('');
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button onClick={handleAddFollowUp} className="w-full sm:w-auto">
              Schedule Follow-up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
