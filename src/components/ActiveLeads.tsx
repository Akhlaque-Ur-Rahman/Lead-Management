import { useState, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useLeads, Lead } from './LeadsContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { getFollowUpStatusClasses } from '../utils/followUpStatusColors';
import { cn } from './ui/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Building2, Search, Phone, Calendar, ArrowLeft } from 'lucide-react';
import { LeadDetail } from './LeadDetail';
import { toast } from 'sonner';

export function ActiveLeads() {
  const { user } = useAuth();
  const { leads } = useLeads();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  if (!user) return null;

  // Filter leads for Active Leads page
  const filteredLeads = useMemo(() => {
    return leads
      .filter(lead => {
        // Active Leads Definition:
        // 1. Must have at least 1 follow-up
        // 2. Must NOT be Converted
        // 3. Must NOT be Lost
        const hasFollowUps = (lead.followUpHistory?.length || 0) > 0;
        if (!hasFollowUps) return false;
        if (lead.status === 'Converted') return false;
        if (lead.status === 'Lost') return false;

        // Role-based filtering
        let hasAccess = false;
        if (user.role === 'super_admin' || user.role === 'company_admin' || user.role === 'team_lead') {
             // Admins and Team Leads see all active leads in their company
             // Super admin sees all if no companyId (or handle appropriately, assuming company context)
             if (user.companyId && lead.companyId === user.companyId) {
                 hasAccess = true;
             } else if (!user.companyId && user.role === 'super_admin') {
                 hasAccess = true; // Super admin sees all
             }
        } else if (user.role === 'sales_user') {
            // Sales Users see only their assigned leads
            if (lead.assignedTo === user.id) {
                hasAccess = true;
            }
        }

        if (!hasAccess) return false;

        const matchesSearch = 
          lead.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (lead.cin && lead.cin.toLowerCase().includes(searchQuery.toLowerCase())) ||
          lead.directors.some(d => 
            `${d.firstName} ${d.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
          );
        
        const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        // Sort by latest follow-up (newest first)
        const lastFUA = a.followUpHistory?.at(-1);
        const lastFUB = b.followUpHistory?.at(-1);
        const dateA = lastFUA ? new Date(lastFUA.createdAt).getTime() : 0;
        const dateB = lastFUB ? new Date(lastFUB.createdAt).getTime() : 0;
        return dateB - dateA;
      });
  }, [leads, searchQuery, statusFilter, user]);

  const getNextFollowUpDate = (lead: Lead) => {
    let earliestDate = lead.nextFollowUpDate || lead.followUpDate;
    let earliestTime = '';

    lead.directors.forEach(director => {
      if (director.nextFollowUpDate) {
        if (!earliestDate || director.nextFollowUpDate < earliestDate) {
          earliestDate = director.nextFollowUpDate;
          earliestTime = director.nextFollowUpTime || '';
        } else if (director.nextFollowUpDate === earliestDate && director.nextFollowUpTime) {
          if (!earliestTime || director.nextFollowUpTime < earliestTime) {
            earliestTime = director.nextFollowUpTime;
          }
        }
      }
    });

    return { date: earliestDate, time: earliestTime };
  };

  if (selectedLead) {
    return (
      <div className="p-4 sm:p-6">
        <Button
          variant="outline"
          onClick={() => setSelectedLead(null)}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Active Leads
        </Button>
        <Card>
          <CardContent className="p-6">
            <LeadDetail 
              lead={selectedLead} 
              onClose={() => setSelectedLead(null)}
              onEdit={() => {
                // Edit functionality can be added here
                toast.success('Edit functionality - Coming soon');
              }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1>Active Leads</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          View and manage leads with active follow-ups
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Active</CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{filteredLeads.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Leads with follow-ups
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900 border-red-200 dark:border-red-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Hot Leads</CardTitle>
            <Building2 className="h-4 w-4 text-red-600 dark:text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">
              {filteredLeads.filter(l => l.status === 'Hot').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              High priority
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900 border-orange-200 dark:border-orange-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Warm Leads</CardTitle>
            <Building2 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">
              {filteredLeads.filter(l => l.status === 'Warm').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Medium priority
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Cold Leads</CardTitle>
            <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">
              {filteredLeads.filter(l => l.status === 'Cold').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Low priority
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <CardTitle>Active Leads List</CardTitle>
              <CardDescription>{filteredLeads.length} leads found</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Hot">Hot</SelectItem>
                  <SelectItem value="Warm">Warm</SelectItem>
                  <SelectItem value="Cold">Cold</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search leads..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full sm:w-[250px]"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredLeads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No active leads found</p>
              {searchQuery && (
                <p className="text-sm mt-2">Try adjusting your search</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead className="hidden md:table-cell">Contact Person</TableHead>
                    <TableHead className="hidden lg:table-cell">Next Follow-up</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => {
                    const nextFollowUp = getNextFollowUpDate(lead);
                    return (
                      <TableRow 
                        key={lead.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedLead(lead)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div>
                              <p className="font-medium">{lead.companyName}</p>
                              <p className="text-xs text-muted-foreground">{lead.cin}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {lead.directors.length > 0 ? (
                            <div className="space-y-1">
                              <p className="text-sm">
                                {lead.directors[0].firstName} {lead.directors[0].lastName}
                              </p>
                              {lead.directors[0].mobile && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Phone className="h-3 w-3" />
                                  {lead.directors[0].mobile}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">No director</span>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {nextFollowUp.date ? (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">
                                {new Date(nextFollowUp.date).toLocaleDateString('en-IN', {
                                  day: 'numeric',
                                  month: 'short'
                                })}
                                {nextFollowUp.time && ` ${nextFollowUp.time}`}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Not scheduled</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn('text-xs', getFollowUpStatusClasses(lead.status))}>
                            {lead.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              setSelectedLead(lead);
                            }}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
