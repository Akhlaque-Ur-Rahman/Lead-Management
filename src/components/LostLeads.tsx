import { useState } from 'react';
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

export function LostLeads() {
  const { user, users } = useAuth();
  const { lostLeads, restoreLostLead, permanentlyDeleteLost } = useLeads();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLostLead, setSelectedLostLead] = useState<any>(null);
  const [showLeadDetail, setShowLeadDetail] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<string | null>(null);

  // Filter lost leads based on user role and search
  const filteredLostLeads = lostLeads.filter(lostLead => {
    const matchesSearch = 
      lostLead.lead.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lostLead.lead.cin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lostLead.lead.directors && lostLead.lead.directors.some(d => 
        d.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.mobile.includes(searchTerm) ||
        d.email.toLowerCase().includes(searchTerm.toLowerCase())
      ));

    // Main Admin and Admin can see all lost leads
    // Regular users can only see leads they marked as lost (non-permanent)
    if (user?.role === 'main_admin' || user?.role === 'admin') {
      return matchesSearch;
    } else {
      return matchesSearch && lostLead.lostBy === user?.id && !lostLead.isPermanent;
    }
  });

  const handleRestore = (leadId: string) => {
    const lostLead = lostLeads.find(l => l.lead.id === leadId);
    
    if (!lostLead) return;

    if (lostLead.isPermanent) {
      toast.error('Permanent lost leads cannot be restored. Only Admin can delete them permanently.');
      return;
    }

    restoreLostLead(leadId);
    toast.success('Lead restored successfully!');
  };

  const handlePermanentDelete = (leadId: string) => {
    if (user?.role !== 'main_admin' && user?.role !== 'admin') {
      toast.error('Only Admin can permanently delete lost leads!');
      return;
    }

    setLeadToDelete(leadId);
    setShowConfirmDelete(true);
  };

  const confirmPermanentDelete = () => {
    if (leadToDelete) {
      permanentlyDeleteLost(leadToDelete);
      toast.success('Lost lead permanently deleted!');
      setShowConfirmDelete(false);
      setLeadToDelete(null);
    }
  };

  const handleViewLead = (lostLead: any) => {
    setSelectedLostLead(lostLead);
    setShowLeadDetail(true);
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user ? user.name : 'Unknown';
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1>Lost Leads</h1>
          <p className="text-muted-foreground">
            Manage leads marked as lost
          </p>
        </div>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Info:</strong> Regular users can restore leads they marked as lost. 
          Only Admins can permanently delete lost leads or mark them as permanently lost.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Lost Leads ({filteredLostLeads.length})</CardTitle>
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
                onChange={(e) => setSearchTerm(e.target.value)}
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
            <div className="rounded-md border">
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
                  {filteredLostLeads.map((lostLead) => (
                    <TableRow key={lostLead.lead.id}>
                      <TableCell className="font-medium">{lostLead.lead.companyName}</TableCell>
                      <TableCell>
                        {lostLead.lead.directors && lostLead.lead.directors.length > 0 ? (
                          <div className="space-y-2">
                            {lostLead.lead.directors.map((director, idx) => (
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
                      <TableCell className="font-mono text-sm">{lostLead.lead.cin}</TableCell>
                      <TableCell>{lostLead.lostDate}</TableCell>
                      <TableCell>{getUserName(lostLead.lostBy)}</TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate" title={lostLead.lostRemark}>
                          {lostLead.lostRemark || 'N/A'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={lostLead.isPermanent ? 'destructive' : 'secondary'}>
                          {lostLead.isPermanent ? 'Permanent' : 'Temporary'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewLead(lostLead)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {!lostLead.isPermanent && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRestore(lostLead.lead.id)}
                              title="Restore Lead"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                          {(user?.role === 'main_admin' || user?.role === 'admin') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePermanentDelete(lostLead.lead.id)}
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
          {selectedLostLead && (
            <LeadDetail
              lead={selectedLostLead.lead}
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
