import { useState, useMemo, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useLeads, type Lead } from './LeadsContext';
import { calculateNextFollowUpDate } from '../utils/followups/calculations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { canAssignToUser } from '../types/roles';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { Building2, User, Search, Phone, Calendar } from 'lucide-react';
import { LeadDetail } from './LeadDetail';
import { LeadForm } from './LeadForm';
import { PaginationControls } from './ui/pagination-controls';
import { usePagination } from '../hooks/usePagination';
import { usePageMeta } from './layout/PageMetaContext';
import { BentoStatCard } from './dashboard/BentoStatCard';

import { toast } from 'sonner';

export function AssignedLeads() {
  const { user, users } = useAuth();
  const { 
    getAssignedLeads, 
    getLeadsAssignedToUser, 
    assignLead,
    updateLead,
    leads,
    loadLeadsAll,
    refreshFlag,
    getLatestActiveFollowUpForCompany
  } = useLeads();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [statusFilter] = useState<string>('all'); 
  const [sortOption, setSortOption] = useState<"latest" | "oldest">("latest");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [editMode, setEditMode] = useState(false);

  usePageMeta({
    title: 'Assigned Leads',
    description: 'View and manage leads assigned to team members',
  });

  if (!user) return null;

  // 1. Load Leads (Server-Side)
  useEffect(() => {
    if (user) {
      loadLeadsAll('assigned', { status: statusFilter }, undefined, sortOption);
    }
  }, [user, statusFilter, sortOption, refreshFlag]);

  // 2. Client-Side Search & Sort
  const displayLeads = useMemo(() => {
    let filtered = leads;

    // Search
    if (searchQuery) {
      filtered = filtered.filter(lead => 
        lead.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (lead.cin && lead.cin.toLowerCase().includes(searchQuery.toLowerCase())) ||
        lead.directors.some(d => 
          `${d.firstName} ${d.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    // Filter by User
    if (selectedUser !== 'all') {
      filtered = filtered.filter(lead => lead.assignedTo === selectedUser);
    }

    // Sort by Latest Follow-up (Desc)
    return filtered.sort((a, b) => {
        const lastA = getLatestActiveFollowUpForCompany(a);
        const lastB = getLatestActiveFollowUpForCompany(b);
        const timeA = lastA ? new Date(`${lastA.date}T${lastA.time}`).getTime() : 0;
        const timeB = lastB ? new Date(`${lastB.date}T${lastB.time}`).getTime() : 0;
        return timeB - timeA;
    });
  }, [leads, searchQuery, selectedUser, getLatestActiveFollowUpForCompany]);

  const {
    paginatedItems: paginatedLeads,
    currentPage,
    pageSize,
    totalCount,
    totalPages,
    setPage,
    setPageSize,
  } = usePagination(displayLeads);

  // 3. Stats Logic (Kept using full list for accurate counts)
  // Get leads based on user role for STATS ONLY
  let allAssignedLeads: Lead[] = [];
  
  if (user.role === 'sales_user') {
    allAssignedLeads = getLeadsAssignedToUser(user.id);
  } else if (user.role === 'team_lead') {
    const companyLeads = user.companyId ? getAssignedLeads(user.companyId) : [];
    allAssignedLeads = companyLeads.filter(lead => {
      const assignedUser = users.find(u => u.id === lead.assignedTo);
      return lead.assignedTo === user.id || (assignedUser && assignedUser.role === 'sales_user');
    });
  } else if (user.role === 'company_admin' || user.role === 'super_admin') {
    allAssignedLeads = user.companyId ? getAssignedLeads(user.companyId) : [];
  }

  // Reset to page 0 when filters change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleUserFilterChange = (value: string) => {
    setSelectedUser(value);
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return 'Unassigned';
    const foundUser = users.find(u => u.id === userId);
    return foundUser ? foundUser.name : 'Unknown';
  };

  const handleReassign = (leadId: string, newUserId: string) => {
    // Validation
    if (!user?.role) {
      toast.error('Unable to determine your role');
      return;
    }

    const targetUser = users.find(u => u.id === newUserId);
    if (!targetUser) {
      toast.error('Target user not found');
      return;
    }

    // Check if current user can assign to target user
    if (!canAssignToUser(user.role, targetUser.role)) {
      if (user.role === 'team_lead') {
        toast.error('Team Leaders can only reassign leads to Sales Users.');
      } else {
        toast.error('You cannot assign leads to this user');
      }
      return;
    }

    assignLead(leadId, newUserId);
    toast.success(`Lead reassigned to ${targetUser.name}`);
  };



  const getNextFollowUpDate = (lead: Lead) => {
    const nextDate = calculateNextFollowUpDate(lead);
    return { date: nextDate, time: '' };
  };

  // Stats by user - filter based on role
  let companyUsers = user.companyId ? users.filter(u => u.companyId === user.companyId) : [];
  
  // Team Leaders should only see themselves and Sales Users in the distribution
  if (user.role === 'team_lead') {
    companyUsers = companyUsers.filter(u => 
      u.id === user.id || u.role === 'sales_user'
    );
  }
  
  const userStats = companyUsers
    .map(u => ({
      user: u,
      count: allAssignedLeads.filter(l => l.assignedTo === u.id).length
    }))
    .filter(stat => stat.count > 0); // Only show users with assigned leads

  // Inline view removed in favor of Dialog below

  const handleEditClick = (lead: Lead) => {
    setSelectedLead(lead);
    setEditMode(true);
    setShowLeadForm(true);
  };

  const handleEditLead = async (leadData: Omit<Lead, 'id' | 'createdAt' | 'isAssigned' | 'assignedTo'>) => {
    if (selectedLead) {
      const success = await updateLead(selectedLead.id, { ...leadData });
      if (success) {
        setShowLeadForm(false);
        setEditMode(false);
        setSelectedLead(null);
        toast.success('Lead updated successfully!');
      } else {
        toast.error('Failed to update lead. Please try again.');
      }
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Stats Cards */}
      <div className="dashboard-bento">
        <BentoStatCard
          label="Total Assigned"
          value={allAssignedLeads.length}
          subtitle="Across all users"
          icon={<Building2 className="h-4 w-4" />}
          index={0}
        />
        <BentoStatCard
          label="Hot Leads"
          value={allAssignedLeads.filter(l => l.status === 'Hot').length}
          subtitle="High priority"
          icon={<Building2 className="h-4 w-4 text-icon-warning" />}
          index={1}
        />
        <BentoStatCard
          label="Warm Leads"
          value={allAssignedLeads.filter(l => l.status === 'Warm').length}
          subtitle="Medium priority"
          icon={<Building2 className="h-4 w-4 text-icon-warning" />}
          index={2}
        />
        <BentoStatCard
          label="Cold Leads"
          value={allAssignedLeads.filter(l => l.status === 'Cold').length}
          subtitle="Low priority"
          icon={<Building2 className="h-4 w-4 text-icon-info" />}
          index={3}
        />
      </div>

      {/* User-wise Distribution (for Admins) */}
      {user.role !== 'sales_user' && userStats.length > 0 && (
        <Card className="card-bento border-0 gap-0">
          <CardHeader className="px-5 pt-5">
            <CardTitle>Team Distribution</CardTitle>
            <CardDescription>Leads assigned to each team member</CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {userStats.map(({ user: u, count }) => (
                <div key={u.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{u.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{u.role.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <Badge className="badge-neutral text-xs">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Search */}
      <Card className="card-bento border-0 gap-0">
        <CardHeader className="px-5 pt-5">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <CardTitle>All Assigned Leads</CardTitle>
              <CardDescription>{leads.length} leads found</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {user.role !== 'sales_user' && (
                <Select value={selectedUser} onValueChange={handleUserFilterChange}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by user" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    {companyUsers.map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search leads..."
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 w-full sm:w-[250px]"
                />
              </div>
              <Select value={sortOption} onValueChange={(value: "latest" | "oldest") => setSortOption(value)}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="latest">Latest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {displayLeads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p>No assigned leads found</p>
              {searchQuery && (
                <p className="text-sm mt-2">Try adjusting your search</p>
              )}
            </div>
          ) : (
            <>
            <div className="md:hidden space-y-3">
              {paginatedLeads.map((lead) => {
                const nextFollowUp = getNextFollowUpDate(lead);
                return (
                  <Card key={lead.id} className="card-bento border-0 gap-0 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{lead.companyName}</p>
                        <p className="text-xs font-mono text-muted-foreground mt-0.5">{lead.cin}</p>
                      </div>
                      <Badge className={cn('text-xs shrink-0', getFollowUpStatusClasses(lead.status))}>
                        {lead.status}
                      </Badge>
                    </div>
                    <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                      {user.role !== 'sales_user' && (
                        <p>Assignee: {getUserName(lead.assignedTo)}</p>
                      )}
                      {nextFollowUp.date ? (
                        <p>
                          Follow-up:{' '}
                          {new Date(nextFollowUp.date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </p>
                      ) : (
                        <p>Follow-up: Not scheduled</p>
                      )}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setSelectedLead(lead)}
                      >
                        View
                      </Button>
                      {(user.role === 'company_admin' || user.role === 'team_lead') && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleEditClick(lead)}
                        >
                          Edit
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Next Follow-up</TableHead>
                    <TableHead>Status</TableHead>
                    {user.role !== 'sales_user' && (
                      <TableHead>Assigned To</TableHead>
                    )}
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedLeads.map((lead) => {
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
                        <TableCell>
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
                        <TableCell>
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
                        {user.role !== 'sales_user' && (
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            {(user.role === 'company_admin' || user.role === 'team_lead') ? (
                              <Select 
                                value={lead.assignedTo || undefined} 
                                onValueChange={(value: string) => handleReassign(lead.id, value)}
                              >
                                <SelectTrigger className="w-[160px]">
                                  <SelectValue placeholder="Reassign..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {users
                                    .filter(u => u.isActive && canAssignToUser(user.role!, u.role))
                                    .filter(u => {
                                      // For non-super admins, only show users from same company
                                      if (user.role === 'super_admin') return true;
                                      return u.companyId === user.companyId;
                                    })
                                    .map(targetUser => (
                                      <SelectItem key={targetUser.id} value={targetUser.id}>
                                        {targetUser.name}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">{getUserName(lead.assignedTo)}</span>
                              </div>
                            )}
                          </TableCell>
                        )}
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
            </>
          )}
          {displayLeads.length > 0 && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalCount={totalCount}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              itemLabel="leads"
            />
          )}
        </CardContent>
      </Card>


      {/* Lead Form Dialog */}
      <Dialog open={showLeadForm} onOpenChange={setShowLeadForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Edit Lead' : 'Add New Lead'}</DialogTitle>
            <DialogDescription>
              {editMode ? 'Update lead information' : 'Add a new lead to your pipeline'}
            </DialogDescription>
          </DialogHeader>
          <LeadForm
            onSubmit={handleEditLead}
            onCancel={() => {
              setShowLeadForm(false);
              setEditMode(false);
              setSelectedLead(null);
            }}
            initialData={editMode ? selectedLead : undefined}
          />
        </DialogContent>
      </Dialog>

      {/* Lead Detail Dialog */}
      <Dialog open={!!selectedLead && !showLeadForm} onOpenChange={(open: boolean) => !open && setSelectedLead(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="sr-only">
              {selectedLead ? `Lead details: ${selectedLead.companyName}` : 'Lead details'}
            </DialogTitle>
          </DialogHeader>
          {selectedLead && (
            <LeadDetail 
              lead={selectedLead} 
              onClose={() => setSelectedLead(null)}
              onEdit={() => {
                handleEditClick(selectedLead);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

