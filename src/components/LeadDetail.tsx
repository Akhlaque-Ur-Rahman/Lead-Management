import { useState } from 'react';
import { useAuth } from './AuthContext';
import { useLeads, type Lead, type Director } from './LeadsContext';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion';
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
  MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from './ui/utils';
import { hasPermission } from '../types/roles';
import { HistoryModal } from './HistoryModal';

interface LeadDetailProps {
  lead: Lead;
  onClose: () => void;
  onEdit: () => void;
}

export function LeadDetail({ lead, onClose, onEdit }: LeadDetailProps) {
  const { user, users } = useAuth();
  const { addDirectorFollowUp, markAsLost, markAsConverted, updateLead, getActiveFollowUps } = useLeads();
  
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false);
  const [showLostDialog, setShowLostDialog] = useState(false);
  const [showConvertedDialog, setShowConvertedDialog] = useState(false);
  const [selectedDirectorId, setSelectedDirectorId] = useState<string>('overall');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('');
  const [followUpRemark, setFollowUpRemark] = useState('');
  const [lostRemark, setLostRemark] = useState('');
  const [isPermanentLost, setIsPermanentLost] = useState(false);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [projectValue, setProjectValue] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(lead.status);
  
  // History modal state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyDirectorId, setHistoryDirectorId] = useState<string | undefined>(undefined);
  const [historyDirectorName, setHistoryDirectorName] = useState<string | undefined>(undefined);

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

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string, time?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    
    if (time) {
      // Convert 24-hour time to 12-hour with AM/PM
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${dateStr} at ${hour12}:${minutes} ${ampm}`;
    }
    
    return dateStr;
  };

  const getUserName = (userId: string | null) => {
    if (!userId) return 'Not Assigned';
    const foundUser = users.find(u => u.id === userId);
    return foundUser ? foundUser.name : 'Unknown';
  };

  const handleOpenFollowUpDialog = (director: Director | null = null) => {

    if (director) {
      setSelectedDirectorId(director.id);
    } else {
      setSelectedDirectorId('overall');
    }
    setShowFollowUpDialog(true);
  };

  const handleAddFollowUp = () => {
    if (!followUpDate || !followUpTime || !followUpRemark.trim()) {
      toast.error('Please fill in date, time, and remark');
      return;
    }

    if (selectedDirectorId === 'overall') {
      toast.error('Please select a specific director');
      return;
    }

    const director = lead.directors.find(d => d.id === selectedDirectorId);
    if (!director) {
      toast.error('Director not found');
      return;
    }

    const directorName = `${director.firstName} ${director.lastName}`;
    
    addDirectorFollowUp(lead.id, selectedDirectorId, {
      date: followUpDate,
      time: followUpTime,
      remark: followUpRemark,
      directorId: selectedDirectorId,
      directorName: directorName
    });

    toast.success(`Follow-up added for ${directorName}`);
    setShowFollowUpDialog(false);
    setFollowUpDate('');
    setFollowUpTime('');
    setFollowUpRemark('');
    setFollowUpRemark('');
    setSelectedDirectorId('overall');
  };

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === 'Lost') {
      setShowLostDialog(true);
      setSelectedStatus(lead.status); // Reset to current status
    } else if (newStatus === 'Converted') {
      // Only Company Admin can mark as converted (requires financial data)
      if (user?.role !== 'company_admin') {
        toast.error('Only Company Admin can mark leads as converted');
        setSelectedStatus(lead.status);
        return;
      }
      setShowConvertedDialog(true);
      setSelectedStatus(lead.status); // Reset to current status
    } else {
      // Hot, Warm, Cold - update directly
      updateLead(lead.id, { status: newStatus as Lead['status'] });
      setSelectedStatus(newStatus as Lead['status']);
      toast.success(`Lead status updated to ${newStatus}`);
    }
  };

  const handleMarkAsLost = () => {
    if (!lostRemark.trim()) {
      toast.error('Please provide a reason for marking this lead as lost');
      return;
    }

    // Only Company Admin can mark as permanent
    const permanent = user?.role === 'company_admin' && isPermanentLost;

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

  const handleMarkAsConverted = () => {
    if (!invoiceNo.trim() || !projectValue.trim()) {
      toast.error('Please provide invoice number and project value');
      return;
    }

    markAsConverted(lead.id, invoiceNo, projectValue, user?.name || user?.id || '');
    setSelectedStatus('Converted');
    toast.success('Lead marked as converted!');
    
    setShowConvertedDialog(false);
    setInvoiceNo('');
    setProjectValue('');
  };

  const getNextFollowUp = (director: Director) => {
    if (!director.followUps || director.followUps.length === 0) return null;
    
    // Find the nearest future ACTIVE follow-up
    const now = new Date();
    const futureFollowUps = director.followUps
      .filter(fu => {
        // Only consider active follow-ups (backward compatible: treat missing status as active)
        const isActive = !fu.status || fu.status === "active";
        return isActive;
      })
      .map(fu => ({
        ...fu,
        datetime: new Date(`${fu.date}T${fu.time}`)
      }))
      .filter(fu => fu.datetime > now)
      .sort((a, b) => a.datetime.getTime() - b.datetime.getTime());
    
    return futureFollowUps[0] || null;
  };

  return (
    <>
      {/* Title Section */}
      <div className="space-y-2 mb-4">
        <h2 className="flex items-center gap-2 flex-wrap text-xl font-semibold">
          <Building2 className="h-5 w-5 flex-shrink-0" />
          <span className="break-words">{lead.companyName}</span>
        </h2>
        <p className="text-sm text-muted-foreground">
          Lead details and contact information
        </p>
      </div>

      <div className="space-y-4 sm:space-y-6 max-h-[70vh] overflow-y-auto pr-2">
        {/* Status and Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <span className="text-sm text-muted-foreground">Status:</span>
            {user?.role !== 'super_admin' ? (
              <Select value={selectedStatus} onValueChange={handleStatusChange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hot">Hot</SelectItem>
                  <SelectItem value="Warm">Warm</SelectItem>
                  <SelectItem value="Cold">Cold</SelectItem>
                  {user?.role === 'company_admin' && (
                    <SelectItem value="Converted">Converted</SelectItem>
                  )}
                  <SelectItem value="Lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge variant={getStatusColor(lead.status)} className="text-sm">
                {lead.status}
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {(user?.role === 'company_admin' || user?.role === 'team_lead') && (
              <Button onClick={onEdit} variant="outline" size="sm" className="gap-2 flex-1 sm:flex-none">
                <Edit className="h-4 w-4" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
            )}
          </div>
        </div>

        <Separator />

        {/* Company Information */}
        <div className="space-y-3 sm:space-y-4">
          <h3 className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Company Information
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Company Name</p>
              <p className="break-words">{lead.companyName}</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">CIN</p>
              <p className="font-mono text-sm break-all">{lead.cin || 'N/A'}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <IndianRupee className="h-3 w-3" />
                Authorised Capital
              </p>
              <p>₹ {lead.authorisedCapital || 'N/A'}</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <IndianRupee className="h-3 w-3" />
                Paid up Capital
              </p>
              <p>₹ {lead.paidUpCapital || 'N/A'}</p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Date of Incorporation</p>
            <p>{formatDate(lead.dateOfIncorporation)}</p>
          </div>

          {lead.registeredAddress && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Registered Address
              </p>
              <p className="text-sm bg-muted p-2 rounded break-words">{lead.registeredAddress}</p>
            </div>
          )}

          {lead.companyEmail && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" />
                Company Email
              </p>
              <p className="break-all">
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

        {/* Directors Information with Follow-ups */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <h3 className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Directors {lead.directors && lead.directors.length > 0 && `(${lead.directors.length})`}
            </h3>
            {user?.role !== 'super_admin' && (
              <Button 
                onClick={() => handleOpenFollowUpDialog(null)} 
                size="sm" 
                className="gap-2"
                variant="outline"
              >
                <Plus className="h-4 w-4" />
                Add Follow-up
              </Button>
            )}
          </div>
          
          {lead.directors && lead.directors.length > 0 ? (
            <Accordion type="multiple" className="w-full space-y-2">
              {lead.directors.map((director, index) => {
                const nextFollowUp = getNextFollowUp(director);
                const followUpCount = director.followUps?.length || 0;
                
                return (
                  <AccordionItem key={director.id} value={`director-${index}`} className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full pr-2">
                        <div className="flex items-center gap-2 text-left">
                          <span>{director.firstName} {director.lastName}</span>
                          {followUpCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {followUpCount} follow-ups
                            </Badge>
                          )}
                        </div>
                        {nextFollowUp && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDateTime(nextFollowUp.date, nextFollowUp.time)}
                          </span>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-4">
                      {/* Director Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">DIN</p>
                          <p className="font-mono text-sm">{director.din || 'N/A'}</p>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            Mobile
                          </p>
                          <p className="break-all">
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

                        <div className="space-y-1 sm:col-span-2">
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            Email
                          </p>
                          <p className="break-all">
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

                      {/* Add Follow-up Button */}
                      <div className="flex gap-2 flex-wrap">
                        {user?.role !== 'super_admin' && (
                          <Button 
                            onClick={() => handleOpenFollowUpDialog(director)} 
                            size="sm" 
                            className="gap-2"
                          >
                            <Plus className="h-4 w-4" />
                            Add Follow-up
                          </Button>
                        )}
                        
                        {/* View History Button */}
                        {director.followUps && director.followUps.length > 0 && (
                          <Button 
                            onClick={() => {
                              setHistoryDirectorId(director.id);
                              setHistoryDirectorName(`${director.firstName} ${director.lastName}`);
                              setShowHistoryModal(true);
                            }}
                            size="sm" 
                            variant="outline"
                            className="gap-2"
                          >
                            <MessageSquare className="h-4 w-4" />
                            View History ({director.followUps.length})
                          </Button>
                        )}
                      </div>

                      {/* Active Follow-ups Only */}
                      {(() => {
                        const activeFollowUps = (director.followUps || []).filter(fu => {
                          const isActive = !fu.status || fu.status === "active";
                          return isActive;
                        });
                        
                        return activeFollowUps.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm flex items-center gap-2">
                              <Clock className="h-3 w-3" />
                              Active Follow-ups ({activeFollowUps.length})
                            </h4>
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                              {activeFollowUps
                                .sort((a, b) => {
                                  const dateA = new Date(`${a.date}T${a.time}`);
                                  const dateB = new Date(`${b.date}T${b.time}`);
                                  return dateA.getTime() - dateB.getTime(); // Earliest first
                                })
                                .map((followUp) => {
                                  const isPast = new Date(`${followUp.date}T${followUp.time}`) < new Date();
                                  return (
                                    <div key={followUp.id} className={cn(
                                      "p-3 rounded-md space-y-2 text-sm border",
                                      isPast ? "bg-muted/30" : "bg-primary/5 border-primary/20"
                                    )}>
                                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <p className="flex items-center gap-1">
                                              <Calendar className="h-3 w-3" />
                                              <span className="font-medium">{formatDateTime(followUp.date, followUp.time)}</span>
                                            </p>
                                            {!isPast && (
                                              <Badge variant="outline" className="text-xs">Upcoming</Badge>
                                            )}
                                            <Badge variant="default" className="text-xs bg-blue-600">Active</Badge>
                                          </div>
                                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                            <User className="h-3 w-3" />
                                            Created by: {getUserName(followUp.createdBy)}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="bg-background/50 p-2 rounded border">
                                        <p className="text-sm whitespace-pre-wrap break-words">{followUp.remark}</p>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        );
                      })()}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
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
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Created On
              </p>
              <p>{formatDate(lead.createdAt)}</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <User className="h-3 w-3" />
                Assigned To
              </p>
              <p>{getUserName(lead.assignedTo)}</p>
            </div>
          </div>
        </div>

        {/* Converted Lead Information - Financial data hidden for Team Leaders */}
        {lead.status === 'Converted' && (
          <>
            <Separator />
            <div className="space-y-3">
              <h3 className="flex items-center gap-2">
                <IndianRupee className="h-4 w-4" />
                Conversion Details
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {user?.role && hasPermission(user.role, 'VIEW_FINANCIAL_DATA') ? (
                  <>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Invoice Number</p>
                      <p className="font-mono">{lead.invoiceNo || 'N/A'}</p>
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <IndianRupee className="h-3 w-3" />
                        Project Value
                      </p>
                      <p>₹ {lead.projectValue || 'N/A'}</p>
                    </div>
                  </>
                ) : (
                  <div className="col-span-2 p-3 bg-muted/50 rounded-md border border-border">
                    <p className="text-sm text-muted-foreground">
                      Financial data is restricted. Contact your Company Admin for details.
                    </p>
                  </div>
                )}
                
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Converted By
                  </p>
                  <p>{lead.convertedBy || 'N/A'}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Converted On
                  </p>
                  <p>{lead.convertedAt ? formatDate(lead.convertedAt) : 'N/A'}</p>
                </div>
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
                <p className="text-sm whitespace-pre-wrap break-words">{lead.notes}</p>
              </div>
            </div>
          </>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-4 sticky bottom-0 bg-background pb-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Close
          </Button>
          {(user?.role === 'company_admin' || user?.role === 'team_lead') && (
            <Button onClick={onEdit} className="gap-2 w-full sm:w-auto">
              <Edit className="h-4 w-4" />
              Edit Lead
            </Button>
          )}
        </div>
      </div>

      {/* Add Follow-up Dialog */}
      <Dialog open={showFollowUpDialog} onOpenChange={setShowFollowUpDialog}>
        <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Follow-up</DialogTitle>
            <DialogDescription>
              Schedule follow-up for {lead.companyName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="directorSelect">Director *</Label>
              <Select value={selectedDirectorId} onValueChange={setSelectedDirectorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select director" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overall">Overall Company</SelectItem>
                  {lead.directors.map(director => (
                    <SelectItem key={director.id} value={director.id}>
                      {director.firstName} {director.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="followUpDate">Date *</Label>
                <Input
                  id="followUpDate"
                  type="date"
                  value={followUpDate}
                  onChange={(e) => setFollowUpDate(e.target.value)}
                  min={(() => {
                    const today = new Date();
                    const year = today.getFullYear();
                    const month = String(today.getMonth() + 1).padStart(2, '0');
                    const day = String(today.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                  })()}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="followUpTime">Time *</Label>
                <Input
                  id="followUpTime"
                  type="time"
                  value={followUpTime}
                  onChange={(e) => setFollowUpTime(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="followUpRemark">Remark *</Label>
              <Textarea
                id="followUpRemark"
                value={followUpRemark}
                onChange={(e) => setFollowUpRemark(e.target.value)}
                placeholder="Enter follow-up notes..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => {
              setShowFollowUpDialog(false);
              setFollowUpDate('');
              setFollowUpTime('');
              setFollowUpRemark('');
              setFollowUpRemark('');
              setSelectedDirectorId('overall');
            }} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleAddFollowUp} className="w-full sm:w-auto">
              Add Follow-up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Converted Modal */}
      <Dialog open={showConvertedDialog} onOpenChange={setShowConvertedDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Mark Lead as Converted</DialogTitle>
            <DialogDescription>
              Provide invoice and project details for this conversion
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invoiceNo">Invoice Number *</Label>
              <Input
                id="invoiceNo"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                placeholder="Enter invoice number..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="projectValue">Total Project Value (₹) *</Label>
              <Input
                id="projectValue"
                type="text"
                value={projectValue}
                onChange={(e) => setProjectValue(e.target.value)}
                placeholder="Enter project value..."
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => {
              setShowConvertedDialog(false);
              setInvoiceNo('');
              setProjectValue('');
            }} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleMarkAsConverted} className="w-full sm:w-auto">
              Mark as Converted
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as Lost Dialog */}
      <Dialog open={showLostDialog} onOpenChange={setShowLostDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Mark Lead as Lost</DialogTitle>
            <DialogDescription>
              Provide a reason for marking this lead as lost
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lostRemark">Reason *</Label>
              <Textarea
                id="lostRemark"
                value={lostRemark}
                onChange={(e) => setLostRemark(e.target.value)}
                placeholder="Enter reason for marking as lost..."
                rows={4}
              />
            </div>
            {user?.role === 'company_admin' && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
                <input
                  type="checkbox"
                  id="isPermanent"
                  checked={isPermanentLost}
                  onChange={(e) => setIsPermanentLost(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="isPermanent" className="cursor-pointer text-sm">
                  Mark as permanently lost (cannot be restored)
                </Label>
              </div>
            )}
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowLostDialog(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleMarkAsLost} className="w-full sm:w-auto">
              Mark as Lost
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Modal */}
      <HistoryModal
        open={showHistoryModal}
        onOpenChange={setShowHistoryModal}
        lead={lead}
        directorId={historyDirectorId}
        directorName={historyDirectorName}
      />
    </>
  );
}
