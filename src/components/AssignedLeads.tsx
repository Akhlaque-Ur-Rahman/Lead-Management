import { useState } from 'react';
import { useAuth } from './AuthContext';
import { useLeads, Lead } from './LeadsContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { canAssignToUser } from '../types/roles';
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
import { Building2, User, Search, Phone, Calendar, ArrowLeft } from 'lucide-react';
import { LeadDetail } from './LeadDetail';
import { toast } from 'sonner';

export function AssignedLeads() {
  const { user, users } = useAuth();
  const { getAssignedLeads, getLeadsAssignedToUser, assignLead } = useLeads();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  if (!user) return null;

  // Get leads based on user role
  let allAssignedLeads: Lead[] = [];
  
  if (user.role === 'sales_user') {
    // Sales Users see only their own leads
    allAssignedLeads = getLeadsAssignedToUser(user.id);
  } else if (user.role === 'team_lead') {
    // Team Leaders see their own leads + Sales Users' leads in their company
    const companyLeads = user.companyId ? getAssignedLeads(user.companyId) : [];
    allAssignedLeads = companyLeads.filter(lead => {
      const assignedUser = users.find(u => u.id === lead.assignedTo);
      return lead.assignedTo === user.id || (assignedUser && assignedUser.role === 'sales_user');
    });
  } else if (user.role === 'company_admin' || user.role === 'super_admin') {
    // Company Admin and Super Admin see all leads in their company
    allAssignedLeads = user.companyId ? getAssignedLeads(user.companyId) : [];
  }

  // Filter by selected user (for admins)
  const leads = selectedUser === 'all' 
    ? allAssignedLeads
    : allAssignedLeads.filter(lead => lead.assignedTo === selectedUser);

  // Filter by search
  const filteredLeads = leads.filter(lead => 
    lead.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.cin.toLowerCase().includes(searchQuery.toLowerCase()) ||
    lead.directors.some(d => 
      `${d.firstName} ${d.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Hot': return 'destructive';
      case 'Warm': return 'default';
      case 'Cold': return 'secondary';
      case 'Converted': return 'default';
      default: return 'secondary';
    }
  };

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

  if (selectedLead) {
    return (
      <div className="p-4 sm:p-6">
        <Button
          variant="outline"
          onClick={() => setSelectedLead(null)}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Assigned Leads
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
        <h1>Assigned Leads</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          View and manage leads assigned to team members
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Assigned</CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{allAssignedLeads.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all users
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
              {allAssignedLeads.filter(l => l.status === 'Hot').length}
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
              {allAssignedLeads.filter(l => l.status === 'Warm').length}
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
              {allAssignedLeads.filter(l => l.status === 'Cold').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Low priority
            </p>
          </CardContent>
        </Card>
      </div>

      {/* User-wise Distribution (for Admins) */}
      {user.role !== 'sales_user' && userStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Team Distribution</CardTitle>
            <CardDescription>Leads assigned to each team member</CardDescription>
          </CardHeader>
          <CardContent>
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
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <CardTitle>All Assigned Leads</CardTitle>
              <CardDescription>{filteredLeads.length} leads found</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {user.role !== 'sales_user' && (
                <Select value={selectedUser} onValueChange={setSelectedUser}>
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
              <p>No assigned leads found</p>
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
                    {user.role !== 'sales_user' && (
                      <TableHead className="hidden sm:table-cell">Assigned To</TableHead>
                    )}
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
                          <Badge variant={getStatusColor(lead.status)}>
                            {lead.status}
                          </Badge>
                        </TableCell>
                        {user.role !== 'sales_user' && (
                          <TableCell className="hidden sm:table-cell" onClick={(e) => e.stopPropagation()}>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
