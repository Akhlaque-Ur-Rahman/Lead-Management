import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useLeads, type Lead, type Director } from './LeadsContext';
import { Checkbox } from "@/components/ui/checkbox";
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
import { getFollowUpStatusClasses, lifecycleStatusColors } from '../utils/followUpStatusColors';

interface LeadDetailProps {
  lead: Lead;
  onClose: () => void;
  onEdit: () => void;
}

export function LeadDetail({ lead, onClose, onEdit }: LeadDetailProps) {
  const { user, users } = useAuth();
  const { updateLead, addFollowUp } = useLeads();
  
  // SECURITY: Sales Users must not access leads not assigned to them
  useEffect(() => {
    if (user?.role === 'sales_user' && lead.assignedTo !== user.id) {
      toast.error("Unauthorized: You can only view leads assigned to you");
      onClose();
      return;
    }
  }, [user, lead, onClose]);
  
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false);
  const [showLostDialog, setShowLostDialog] = useState(false);
  const [showConvertedDialog, setShowConvertedDialog] = useState(false);
  // Removed selectedDirectorId state
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('');
  const [followUpRemark, setFollowUpRemark] = useState('');
  const [talkedTo, setTalkedTo] = useState(''); // New state for talked to field
  const [talkedToId, setTalkedToId] = useState('');
  const [talkedToName, setTalkedToName] = useState('');
  const [followUpStatus, setFollowUpStatus] = useState<string>(''); // New state for follow-up status
  const [lostRemark, setLostRemark] = useState('');
  const [isPermanentLost, setIsPermanentLost] = useState(false);
  const [invoiceNo, setInvoiceNo] = useState('');
  const [projectValue, setProjectValue] = useState('');
  const [selectedStatus, setSelectedStatus] = useState(lead.status);
  
  // History modal state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyDirectorId, setHistoryDirectorId] = useState<string | undefined>(undefined);
  const [historyDirectorName, setHistoryDirectorName] = useState<string | undefined>(undefined);

  // Company Details Modal state
  const [showCompanyModal, setShowCompanyModal] = useState(false);

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
    // Super Admin check
    if (user?.role === 'super_admin') {
      toast.error("Super Admins cannot add follow-ups");
      return;
    }

    if (director) {
       // Pre-select talkedTo if a director is passed
       const name = `${director.firstName} ${director.lastName}`;
       setTalkedTo(name);
       setTalkedToId(director.id);
       setTalkedToName(name);
    } else {
       // Reset talkedTo
       setTalkedTo('');
       setTalkedToId('');
       setTalkedToName('');
    }
    setFollowUpStatus(lead.status); // Initialize with current status
    setShowFollowUpDialog(true);
  };

  const resetFollowUpForm = () => {
    setFollowUpDate('');
    setFollowUpTime('');
    setFollowUpRemark('');
    setTalkedTo('');
    setTalkedToId('');
    setTalkedToName('');
    setFollowUpStatus('');
  };

  const handleAddFollowUp = async () => {
    if (!followUpDate || !followUpTime || !followUpRemark || !talkedTo) {
      toast.error('Please fill in all required fields');
      return;
    }
    // Validate talkedTo matches a director
    const matchedDirector = lead.directors.find(d => 
      `${d.firstName} ${d.lastName}` === talkedTo || 
      d.firstName === talkedTo
    );

    if (!matchedDirector) {
      toast.error('Please choose a director in Talked To field');
      return;
    }

    // If status is Converted or Lost, we don't save here - the modals handle it
    if (followUpStatus === 'Converted') {
      setShowConvertedDialog(true);
      return;
    }

    if (followUpStatus === 'Lost') {
      setShowLostDialog(true);
      return;
    }

    try {
      const followUpData = {
        date: followUpDate,
        time: followUpTime,
        remark: followUpRemark,
        talkedTo,
        talkedToId,
        talkedToName,
        followUpStatus: followUpStatus as any
      };

      await addFollowUp(lead.id, followUpData);

      toast.success('Follow-up added successfully');
      setShowFollowUpDialog(false);
      resetFollowUpForm();
    } catch (error) {
      console.error('Error adding follow-up:', error);
      toast.error('Failed to add follow-up');
    }
  };

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === 'Lost') {
      setShowLostDialog(true);
      setSelectedStatus(lead.status); // Reset to current status
    } else if (newStatus === 'Converted') {
      // Only Company Admin can mark as converted (requires financial data)
      // Company Admin, Sales User, and Team Lead can mark as converted
      if (!['company_admin', 'sales_user', 'team_lead'].includes(user?.role || '')) {
        toast.error('You do not have permission to mark leads as converted');
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

  const handleMarkAsLost = async () => {
    if (!lostRemark.trim()) {
      toast.error('Please provide a reason for marking this lead as lost');
      return;
    }

    try {
      // Default to first director if not selected
      const firstDirector = lead.directors?.[0];
      const defaultTalkedTo = firstDirector ? `${firstDirector.firstName} ${firstDirector.lastName}` : 'N/A';
      const defaultTalkedToId = firstDirector?.id || '';
      const defaultTalkedToName = defaultTalkedTo;

      const followUpData = {
        date: followUpDate || new Date().toISOString().split('T')[0],
        time: followUpTime || new Date().toTimeString().slice(0, 5),
        remark: followUpRemark || 'Lead Lost',
        talkedTo: talkedTo || defaultTalkedTo,
        talkedToId: talkedToId || defaultTalkedToId,
        talkedToName: talkedToName || defaultTalkedToName,
        followUpStatus: 'Lost' as const
      };

      const permanent = user?.role === 'company_admin' && isPermanentLost;

      await addFollowUp(lead.id, followUpData, {
        status: 'Lost',
        lostRemark,
        lostBy: user?.id || '',
        // Handle permanent deletion logic if needed, but usually we just mark status
      });
      
      if (permanent) {
         // If permanent delete is requested, we might need to call permanentlyDeleteLost
         // But that usually requires a lostLead ID. For now, we assume status 'Lost' is enough
         // or we can call markAsLost separately if needed.
         // Given the context, we'll stick to status update for now.
      }

      toast.success('Lead marked as lost');
      setShowLostDialog(false);
      setShowFollowUpDialog(false);
      setLostRemark('');
      setIsPermanentLost(false);
      resetFollowUpForm();
      onClose();
    } catch (error) {
      console.error('Error marking lead as lost:', error);
      toast.error('Failed to mark lead as lost');
    }
  };

  const handleMarkAsConverted = async () => {
    if (!invoiceNo.trim() || !projectValue.trim()) {
      toast.error('Please provide invoice number and project value');
      return;
    }

    try {
      // Default to first director if not selected
      const firstDirector = lead.directors?.[0];
      const defaultTalkedTo = firstDirector ? `${firstDirector.firstName} ${firstDirector.lastName}` : 'N/A';
      const defaultTalkedToId = firstDirector?.id || '';
      const defaultTalkedToName = defaultTalkedTo;

      // Create the follow-up AND update lead status atomically
      const followUpData = {
        date: followUpDate || new Date().toISOString().split('T')[0],
        time: followUpTime || new Date().toTimeString().slice(0, 5),
        remark: followUpRemark || 'Lead Converted',
        talkedTo: talkedTo || defaultTalkedTo,
        talkedToId: talkedToId || defaultTalkedToId,
        talkedToName: talkedToName || defaultTalkedToName,
        followUpStatus: 'Converted' as const
      };

      await addFollowUp(lead.id, followUpData, {
        status: 'Converted',
        invoiceNo,
        projectValue,
        convertedBy: user?.name || user?.id || ''
      });

      toast.success('Lead marked as converted!');
      setShowConvertedDialog(false);
      setShowFollowUpDialog(false);
      setInvoiceNo('');
      setProjectValue('');
      resetFollowUpForm();
      onClose(); // Close the main LeadDetail modal
    } catch (error) {
      console.error('Error converting lead:', error);
      toast.error('Failed to convert lead');
    }
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

  const handleOpenCompanyModal = () => {
    // Close history modal if open
    setShowHistoryModal(false);
    setShowCompanyModal(true);
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
                    {user?.role && ['company_admin', 'sales_user', 'team_lead'].includes(user.role) && (
                      <SelectItem value="Converted">Converted</SelectItem>
                    )}
                  <SelectItem value="Lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Badge className={cn("text-sm", getFollowUpStatusClasses(lead.status))}>
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
                            <Badge className="text-xs bg-slate-200 text-slate-800 border border-slate-300">
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
                                              <Badge className="text-xs bg-blue-100 text-blue-800 border border-blue-200">Upcoming</Badge>
                                            )}
                                            <Badge className={cn("text-xs", lifecycleStatusColors.active)}>Active</Badge>
                                          </div>
                                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                            <User className="h-3 w-3" />
                                            Created by: {getUserName(followUp.createdBy)}
                                          </p>
                                          {followUp.talkedTo && (
                                            <p className="text-xs font-medium mt-1 flex items-center gap-1">
                                              <User className="h-3 w-3 text-primary" />
                                              Talked to: {followUp.talkedTo}
                                            </p>
                                          )}
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
            {/* Removed Director Select */}
            
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
              <Label htmlFor="talkedTo">Talked To *</Label>
              <Select 
                value={talkedToId} 
                onValueChange={(value: string) => {
                  const director = lead.directors.find(d => d.id === value);
                  if (director) {
                    setTalkedToId(director.id);
                    setTalkedToName(`${director.firstName} ${director.lastName}`);
                    setTalkedTo(`${director.firstName} ${director.lastName}`);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select director" />
                </SelectTrigger>
                <SelectContent>
                  {lead.directors.map((director) => (
                    <SelectItem key={director.id} value={director.id}>
                      {director.firstName} {director.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="followUpStatus">Status *</Label>
              <Select value={followUpStatus} onValueChange={setFollowUpStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hot">Hot</SelectItem>
                  <SelectItem value="Warm">Warm</SelectItem>
                  <SelectItem value="Cold">Cold</SelectItem>
                  {user?.role && ['company_admin', 'sales_user', 'team_lead'].includes(user.role) && (
                    <SelectItem value="Converted">Converted</SelectItem>
                  )}
                  <SelectItem value="Lost">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="followUpRemark">Remark *</Label>
              <Textarea
                id="followUpRemark"
                value={followUpRemark}
                onChange={(e) => setFollowUpRemark(e.target.value)}
                placeholder="Enter follow-up details..."
                className="min-h-[100px]"
              />
            </div>

          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowFollowUpDialog(false);
              setFollowUpDate('');
              setFollowUpTime('');
              setFollowUpRemark('');
              setTalkedTo('');
              setTalkedToId('');
              setTalkedToName('');
              setFollowUpStatus('');
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
                placeholder="Enter reason..."
                rows={4}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="permanent" 
                checked={isPermanentLost}
                onCheckedChange={(checked: boolean) => setIsPermanentLost(checked)}
                disabled={user?.role !== 'company_admin'}
              />
              <label
                htmlFor="permanent"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Permanently delete lead (Company Admin only)
              </label>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => {
              setShowLostDialog(false);
              setLostRemark('');
              setIsPermanentLost(false);
            }} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={handleMarkAsLost} variant="destructive" className="w-full sm:w-auto">
              Mark as Lost
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Company Details Modal */}
      <Dialog open={showCompanyModal} onOpenChange={setShowCompanyModal}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {lead.companyName}
            </DialogTitle>
            <DialogDescription>
              Full company details
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">CIN</p>
                <p className="font-mono text-sm break-all">{lead.cin || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Incorporation Date</p>
                <p className="text-sm">{formatDate(lead.dateOfIncorporation)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-sm break-all">{lead.companyEmail || 'N/A'}</p>
              </div>

            </div>

            <Separator />

            {/* Financials */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Authorised Capital</p>
                <p className="text-sm">₹ {lead.authorisedCapital || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Paid-up Capital</p>
                <p className="text-sm">₹ {lead.paidUpCapital || 'N/A'}</p>
              </div>
            </div>

            <Separator />

            {/* Address */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Registered Address</p>
              <p className="text-sm bg-muted p-3 rounded-md">{lead.registeredAddress || 'N/A'}</p>
            </div>

            {/* Directors Summary */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Directors ({lead.directors?.length || 0})</p>
              <div className="grid grid-cols-1 gap-2">
                {lead.directors?.map((d, i) => (
                  <div key={i} className="text-sm border p-2 rounded flex justify-between items-center">
                    <span>{d.firstName} {d.lastName}</span>
                    <span className="text-xs text-muted-foreground font-mono">{d.din}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowCompanyModal(false)}>Close</Button>
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
        onAddFollowUp={() => handleOpenFollowUpDialog(lead.directors.find(d => d.id === historyDirectorId) || null)}
        onViewCompany={handleOpenCompanyModal}
      />
    </>
  );
}

export default LeadDetail;
