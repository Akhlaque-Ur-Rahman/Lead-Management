import { useState, useEffect } from 'react';
import { PageHeader } from './layout/PageHeader';
import { useAuth } from './AuthContext';
import { useLeads } from './LeadsContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from './ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Search, RotateCcw, Trash2, Info, AlertCircle, Eye } from 'lucide-react';
import { LeadDetail } from './LeadDetail';

import { toast } from 'sonner';
import { hasPermission } from '../types/roles';


export function LostLeads() {
  const { user, users } = useAuth();
  const { leads, loadLeadsAll, restoreLostLead, permanentlyDeleteLost, refreshFlag } = useLeads();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLostLead, setSelectedLostLead] = useState<any>(null);
  const [showLeadDetail, setShowLeadDetail] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<string | null>(null);
  useEffect(() => {
    if (user) {
      loadLeadsAll('lost');
    }
  }, [user, refreshFlag]);

  // Check permission (now allows sales_user)
  if (!user?.role || !hasPermission(user.role, 'VIEW_LOST_LEADS')) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Access denied. You do not have permission to view lost leads.</p>
      </div>
    );
  }

  // Filter lost leads based on user role and search
  const filteredLostLeads = leads.filter(lead => {
    const matchesSearch = !searchTerm ||
      lead.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.cin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.directors && lead.directors.some(d => 
        d.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.mobile.includes(searchTerm) ||
        d.email.toLowerCase().includes(searchTerm.toLowerCase())
      ));

    return matchesSearch;
  }).sort((a, b) => {
    // Sort by lostAt desc (newest first)
    const dateA = a.lostAt ? new Date(a.lostAt).getTime() : 0;
    const dateB = b.lostAt ? new Date(b.lostAt).getTime() : 0;
    return dateB - dateA;
  });



  // Reset to page 0 when search changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleRestore = async (leadId: string) => {
    // Sales users cannot restore
    if (user?.role === 'sales_user') {
      toast.error('You do not have permission to restore lost leads.');
      return;
    }

    // For now, we don't have isPermanent flag on Lead object easily available without listener
    // So we skip that check or assume false. 
    // If strict check needed, we'd need to fetch lostLeads doc.
    // Assuming standard restore for now.

    const success = await restoreLostLead(leadId);
    if (success) {
      toast.success('Lead restored successfully!');
    } else {
      toast.error('Failed to restore lead');
    }
  };

  const handlePermanentDelete = (leadId: string) => {
    // Sales users cannot delete
    if (user?.role === 'sales_user') {
      toast.error('You do not have permission to delete lost leads.');
      return;
    }

    // Check permission for permanent delete (Team Lead and up)
    if (!user?.role || !['super_admin', 'company_admin', 'team_lead'].includes(user.role)) {
      toast.error('You don\'t have permission to permanently delete lost leads.');
      return;
    }

    setLeadToDelete(leadId);
    setShowConfirmDelete(true);
  };

  const confirmPermanentDelete = async () => {
    if (leadToDelete) {
      const success = await permanentlyDeleteLost(leadToDelete);
      if (success) {
        toast.success('Lost lead permanently deleted!');
      } else {
        toast.error('Failed to delete lead');
      }
      setShowConfirmDelete(false);
      setLeadToDelete(null);
    }
  };

  const handleViewLead = (lostLead: any) => {
    setSelectedLostLead(lostLead);
    setShowLeadDetail(true);
  };

  const getUserName = (userId: string) => {
    const foundUser = users.find(u => u.id === userId);
    return foundUser ? foundUser.name : 'Unknown';
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <PageHeader
        title="Lost Leads"
        description="Manage leads marked as lost"
      />

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Info:</strong> Team Leads and Admins can manage lost leads.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>All lost leads ({filteredLostLeads.length})</CardTitle>
          <CardDescription>
            View and manage leads that have been marked as lost
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search lost leads..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Table */}
          {filteredLostLeads.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No lost leads found</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company Name</TableHead>
                    <TableHead>Director</TableHead>
                    <TableHead>CIN</TableHead>
                    <TableHead>Lost Date</TableHead>
                    <TableHead>Lost By</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLostLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">{lead.companyName}</TableCell>
                      <TableCell>
                        {lead.directors && lead.directors.length > 0 ? (
                          <div className="space-y-2">
                            {lead.directors.map((director, idx) => (
                              <div key={director.id} className={idx > 0 ? 'pt-2 border-t border-border' : ''}>
                                <div>{director.firstName} {director.lastName}</div>
                                <div className="text-sm text-muted-foreground">{director.email}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{lead.cin}</TableCell>
                      <TableCell>{lead.lostAt ? new Date(lead.lostAt).toLocaleDateString() : 'N/A'}</TableCell>
                      <TableCell>{getUserName(lead.lostBy || '')}</TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate" title={lead.lostRemark || ''}>
                          {lead.lostRemark || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          Lost
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewLead(lead)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {user?.role !== 'sales_user' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRestore(lead.id)}
                              title="Restore Lead"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                          {user?.role !== 'sales_user' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePermanentDelete(lead.id)}
                              title="Permanently Delete"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>



      {/* Confirm Delete Dialog */}
      <Dialog open={showConfirmDelete} onOpenChange={setShowConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Confirm Permanent Deletion
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. The lost lead will be permanently deleted from the system.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmPermanentDelete}>
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lead Detail Dialog */}
      <Dialog open={showLeadDetail} onOpenChange={setShowLeadDetail}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="sr-only">
              {selectedLostLead ? `Lead details: ${selectedLostLead.companyName}` : 'Lead details'}
            </DialogTitle>
          </DialogHeader>
          {selectedLostLead && (
            <LeadDetail
              lead={selectedLostLead}
              onClose={() => {
                setShowLeadDetail(false);
                setSelectedLostLead(null);
              }}
              onEdit={() => {
                toast.info('Cannot edit lost leads. Restore the lead first.');
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
