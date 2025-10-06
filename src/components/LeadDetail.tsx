import { useState } from 'react';
import { useAuth } from './AuthContext';
import { useLeads, type Lead } from './LeadsContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from './ui/dialog';
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from './ui/dialog';
import { 
  Building2, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  Edit,
  Clock,
  MapPin,
  IndianRupee,
  Plus,
  MessageSquare,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface LeadDetailProps {
  lead: Lead;
  onClose: () => void;
  onEdit: () => void;
}

export function LeadDetail({ lead, onClose, onEdit }: LeadDetailProps) {
  const { user, users } = useAuth();
  const { addFollowUp, markAsLost } = useLeads();
  
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false);
  const [showLostDialog, setShowLostDialog] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpRemark, setFollowUpRemark] = useState('');
  const [lostRemark, setLostRemark] = useState('');
  const [isPermanentLost, setIsPermanentLost] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Hot': return 'destructive';
      case 'Warm': return 'default';
      case 'Cold': return 'secondary';
      case 'Converted': return 'outline';
      case 'Lost': return 'secondary';
      default: return 'secondary';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUserName = (userId: string) => {
    const foundUser = users.find(u => u.id === userId);
    return foundUser ? foundUser.name : 'Unknown';
  };

  const handleAddFollowUp = () => {
    if (!followUpDate || !followUpRemark.trim()) {
      toast.error('Please fill in both date and remark');
      return;
    }

    addFollowUp(lead.id, {
      date: followUpDate,
      remark: followUpRemark,
      createdBy: user?.id || '',
      createdAt: new Date().toISOString()
    });

    toast.success('Follow-up added successfully!');
    setShowFollowUpDialog(false);
    setFollowUpDate('');
    setFollowUpRemark('');
  };

  const handleMarkAsLost = () => {
    if (!lostRemark.trim()) {
      toast.error('Please provide a reason for marking this lead as lost');
      return;
    }

    // Only admins can mark as permanent
    const permanent = (user?.role === 'main_admin' || user?.role === 'admin') && isPermanentLost;

    markAsLost(lead.id, lostRemark, user?.id || '', permanent);
    
    if (permanent) {
      toast.success('Lead permanently marked as lost');
    } else {
      toast.success('Lead marked as lost (temporary)');
    }
    
    setShowLostDialog(false);
    setLostRemark('');
    setIsPermanentLost(false);
    onClose();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          {lead.companyName}
        </DialogTitle>
        <DialogDescription>
          Lead details and contact information
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 max-h-[70vh] overflow-y-auto">
        {/* Status and Actions */}
        <div className="flex items-center justify-between">
          <Badge variant={getStatusColor(lead.status)} className="text-sm">
            {lead.status}
          </Badge>
          <div className="flex gap-2">
            <Button onClick={() => setShowFollowUpDialog(true)} variant="outline" size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Follow-up
            </Button>
            <Button onClick={() => setShowLostDialog(true)} variant="outline" size="sm" className="gap-2">
              <XCircle className="h-4 w-4" />
              Mark as Lost
            </Button>
            <Button onClick={onEdit} variant="outline" size="sm" className="gap-2">
              <Edit className="h-4 w-4" />
              Edit Lead
            </Button>
          </div>
        </div>

        <Separator />

        {/* Company Information */}
        <div className="space-y-4">
          <h3 className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Company Information
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Company Name</p>
              <p className="font-medium">{lead.companyName}</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">CIN</p>
              <p className="font-mono text-sm">{lead.cin || 'N/A'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <IndianRupee className="h-3 w-3" />
                Authorised Capital
              </p>
              <p className="font-medium">₹ {lead.authorisedCapital || 'N/A'}</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <IndianRupee className="h-3 w-3" />
                Paid up Capital
              </p>
              <p className="font-medium">₹ {lead.paidUpCapital || 'N/A'}</p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Date of Incorporation</p>
            <p className="font-medium">{formatDate(lead.dateOfIncorporation)}</p>
          </div>

          {lead.registeredAddress && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Registered Address
              </p>
              <p className="text-sm bg-muted p-2 rounded">{lead.registeredAddress}</p>
            </div>
          )}

          {lead.companyEmail && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" />
                Company Email
              </p>
              <p className="font-medium">
                <a 
                  href={`mailto:${lead.companyEmail}`} 
                  className="text-primary hover:underline"
                >
                  {lead.companyEmail}
                </a>
              </p>
            </div>
          )}
        </div>

        <Separator />

        {/* Director Information */}
        <div className="space-y-4">
          <h3 className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Director Information {lead.directors && lead.directors.length > 0 && `(${lead.directors.length})`}
          </h3>
          
          {lead.directors && lead.directors.length > 0 ? (
            <div className="space-y-4">
              {lead.directors.map((director, index) => (
                <div key={director.id} className="bg-muted p-4 rounded-md space-y-3">
                  <div className="flex items-center gap-2">
                    <h4>Director {index + 1}</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Name</p>
                      <p className="font-medium">{director.firstName} {director.lastName}</p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">DIN</p>
                      <p className="font-mono text-sm">{director.din || 'N/A'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        Mobile
                      </p>
                      <p className="font-medium">
                        {director.mobile ? (
                          <a 
                            href={`tel:${director.mobile}`} 
                            className="text-primary hover:underline"
                          >
                            {director.mobile}
                          </a>
                        ) : 'N/A'}
                      </p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        Email
                      </p>
                      <p className="font-medium">
                        {director.email ? (
                          <a 
                            href={`mailto:${director.email}`} 
                            className="text-primary hover:underline"
                          >
                            {director.email}
                          </a>
                        ) : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No director information available</p>
          )}
        </div>

        <Separator />

        {/* Timeline Information */}
        <div className="space-y-3">
          <h3 className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Timeline
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Created On
              </p>
              <p className="font-medium">{formatDate(lead.createdAt)}</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Next Follow-up
              </p>
              <p className="font-medium">{formatDate(lead.followUpDate)}</p>
            </div>
          </div>
        </div>

        {/* Follow-up History */}
        {lead.followUpHistory && lead.followUpHistory.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Follow-up History ({lead.followUpHistory.length})
              </h3>
              <div className="space-y-3">
                {lead.followUpHistory.map((followUp) => (
                  <div key={followUp.id} className="bg-muted p-3 rounded-md space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium">{formatDate(followUp.date)}</p>
                        <p className="text-xs text-muted-foreground">
                          by {getUserName(followUp.createdBy)} • {formatDateTime(followUp.createdAt)}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm">{followUp.remark}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Notes */}
        {lead.notes && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3>Notes</h3>
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm">{lead.notes}</p>
              </div>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 sticky bottom-0 bg-background pb-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onEdit} className="gap-2">
            <Edit className="h-4 w-4" />
            Edit Lead
          </Button>
        </div>
      </div>

      {/* Add Follow-up Dialog */}
      <Dialog open={showFollowUpDialog} onOpenChange={setShowFollowUpDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Follow-up</DialogTitle>
            <DialogDescription>
              Record a follow-up activity for this lead
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="followUpDate">Follow-up Date</Label>
              <Input
                id="followUpDate"
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="followUpRemark">Remark</Label>
              <Textarea
                id="followUpRemark"
                value={followUpRemark}
                onChange={(e) => setFollowUpRemark(e.target.value)}
                placeholder="Enter follow-up notes..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFollowUpDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddFollowUp}>
              Add Follow-up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as Lost Dialog */}
      <Dialog open={showLostDialog} onOpenChange={setShowLostDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Lead as Lost</DialogTitle>
            <DialogDescription>
              Provide a reason for marking this lead as lost
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lostRemark">Reason</Label>
              <Textarea
                id="lostRemark"
                value={lostRemark}
                onChange={(e) => setLostRemark(e.target.value)}
                placeholder="Enter reason for marking as lost..."
                rows={4}
              />
            </div>
            {(user?.role === 'main_admin' || user?.role === 'admin') && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <input
                  type="checkbox"
                  id="isPermanent"
                  checked={isPermanentLost}
                  onChange={(e) => setIsPermanentLost(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="isPermanent" className="cursor-pointer">
                  Mark as permanently lost (cannot be restored)
                </Label>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLostDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleMarkAsLost}>
              Mark as Lost
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
