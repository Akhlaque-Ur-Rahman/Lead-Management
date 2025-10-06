import { useState } from 'react';
import { useLeads } from './LeadsContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { cn } from './ui/utils';
import { toast } from 'sonner';

export function Calendar() {
  const { leads, updateLead } = useLeads();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false);
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');

  const today = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Get days in month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  // Generate calendar days
  const calendarDays = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null);
  }
  
  // Add days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(currentMonth - 1);
    } else {
      newDate.setMonth(currentMonth + 1);
    }
    setCurrentDate(newDate);
  };

  const getLeadsForDate = (day: number) => {
    const dateString = new Date(currentYear, currentMonth, day).toISOString().split('T')[0];
    return leads.filter(lead => lead.followUpDate === dateString);
  };

  const getSelectedDateLeads = () => {
    if (!selectedDate) return [];
    const dateString = selectedDate.toISOString().split('T')[0];
    return leads.filter(lead => lead.followUpDate === dateString);
  };

  const isToday = (day: number) => {
    return day === today.getDate() && 
           currentMonth === today.getMonth() && 
           currentYear === today.getFullYear();
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return day === selectedDate.getDate() && 
           currentMonth === selectedDate.getMonth() && 
           currentYear === selectedDate.getFullYear();
  };

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(currentYear, currentMonth, day);
    setSelectedDate(clickedDate);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Hot': return 'destructive';
      case 'Warm': return 'default';
      case 'Cold': return 'secondary';
      case 'Converted': return 'outline';
      case 'Lost': return 'secondary';
      default: return 'default';
    }
  };

  const handleSetNextFollowUp = (lead: any) => {
    setSelectedLead(lead);
    setNextFollowUpDate('');
    setShowFollowUpDialog(true);
  };

  const handleSubmitFollowUp = () => {
    if (!selectedLead || !nextFollowUpDate) {
      toast.error('Please select a follow-up date');
      return;
    }

    updateLead(selectedLead.id, { followUpDate: nextFollowUpDate });
    toast.success('Follow-up date updated successfully!');
    setShowFollowUpDialog(false);
    setSelectedLead(null);
    setNextFollowUpDate('');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1>Follow-up Calendar</h1>
          <p className="text-muted-foreground">
            Schedule and track your lead follow-ups
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  {monthNames[currentMonth]} {currentYear}
                </CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigateMonth('prev')}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigateMonth('next')}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 mb-4">
                {dayNames.map(day => (
                  <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => {
                  if (day === null) {
                    return <div key={`empty-${index}`} className="p-2 h-20"></div>;
                  }
                  
                  const dayLeads = getLeadsForDate(day);
                  const hasLeads = dayLeads.length > 0;
                  
                  return (
                    <button
                      key={`${currentYear}-${currentMonth}-${day}`}
                      onClick={() => handleDateClick(day)}
                      className={cn(
                        "p-2 h-20 border rounded-md text-left hover:bg-accent transition-colors",
                        isToday(day) && "bg-primary text-primary-foreground hover:bg-primary/90",
                        isSelected(day) && "ring-2 ring-primary",
                        hasLeads && !isToday(day) && "bg-accent"
                      )}
                    >
                      <div className="text-sm font-medium">{day}</div>
                      {hasLeads && (
                        <div className="mt-1">
                          <div className={cn(
                            "text-xs rounded px-1",
                            isToday(day) ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground"
                          )}>
                            {dayLeads.length} follow-up{dayLeads.length > 1 ? 's' : ''}
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Follow-ups for selected date */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedDate 
                  ? `Follow-ups for ${selectedDate.toLocaleDateString('en-IN')}`
                  : 'Today\'s Follow-ups'
                }
              </CardTitle>
              <CardDescription>
                Scheduled activities and leads
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(selectedDate ? getSelectedDateLeads() : getLeadsForDate(today.getDate())).map((lead) => (
                  <div key={lead.id} className="p-3 border rounded-lg space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <p className="font-medium text-sm">{lead.companyName}</p>
                        {lead.directors && lead.directors.length > 0 && (
                          <>
                            <p className="text-xs text-muted-foreground">
                              {lead.directors[0].firstName} {lead.directors[0].lastName}
                            </p>
                            <p className="text-xs text-muted-foreground">{lead.directors[0].mobile}</p>
                            {lead.directors.length > 1 && (
                              <p className="text-xs text-muted-foreground">+{lead.directors.length - 1} more</p>
                            )}
                          </>
                        )}
                      </div>
                      <Badge variant={getStatusColor(lead.status)} className="text-xs">
                        {lead.status}
                      </Badge>
                    </div>
                    
                    {lead.notes && (
                      <p className="text-xs text-muted-foreground">{lead.notes}</p>
                    )}

                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="w-full gap-2"
                      onClick={() => handleSetNextFollowUp(lead)}
                    >
                      <Clock className="h-3 w-3" />
                      Set Next Follow-up
                    </Button>
                  </div>
                ))}
                
                {(selectedDate ? getSelectedDateLeads() : getLeadsForDate(today.getDate())).length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-4">
                    No follow-ups scheduled for this date
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upcoming Follow-ups Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Follow-ups</CardTitle>
          <CardDescription>Next 7 days overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {leads
              .filter(lead => {
                const followUpDate = new Date(lead.followUpDate);
                const sevenDaysFromNow = new Date();
                sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
                return followUpDate >= today && followUpDate <= sevenDaysFromNow;
              })
              .slice(0, 4)
              .map((lead) => (
                <div key={lead.id} className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant={getStatusColor(lead.status)} className="text-xs">
                      {lead.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(lead.followUpDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="font-medium text-sm">{lead.companyName}</p>
                    {lead.directors && lead.directors.length > 0 && (
                      <>
                        <p className="text-xs text-muted-foreground">
                          {lead.directors[0].firstName} {lead.directors[0].lastName}
                        </p>
                        <p className="text-xs">{lead.directors[0].mobile}</p>
                        {lead.directors.length > 1 && (
                          <p className="text-xs text-muted-foreground">+{lead.directors.length - 1} more</p>
                        )}
                      </>
                    )}
                  </div>
                  
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={() => handleSetNextFollowUp(lead)}
                  >
                    <Clock className="h-3 w-3" />
                    Update
                  </Button>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Next Follow-up Dialog */}
      <Dialog open={showFollowUpDialog} onOpenChange={setShowFollowUpDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Next Follow-up</DialogTitle>
            <DialogDescription>
              {selectedLead && `Update follow-up date for ${selectedLead.companyName}`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nextFollowUp">Next Follow-up Date</Label>
              <Input
                id="nextFollowUp"
                type="date"
                value={nextFollowUpDate}
                onChange={(e) => setNextFollowUpDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowFollowUpDialog(false);
                  setSelectedLead(null);
                  setNextFollowUpDate('');
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmitFollowUp}>
                Update Follow-up
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
