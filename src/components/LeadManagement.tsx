import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useLeads, type Lead } from './LeadsContext';
import { calculateNextFollowUpDate } from '../utils/followups/calculations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion';
import { BentoTable } from './layout/BentoTable';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Plus, Search, Filter, Download, Upload, Eye, Edit, FileDown, Info, ClipboardList } from 'lucide-react';
import { LeadForm } from './LeadForm';
import { LeadDetail } from './LeadDetail';

import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { hasPermission, canAssignToUser } from '../types/roles';
import { getFollowUpStatusClasses } from '../utils/followUpStatusColors';
import { cn } from './ui/utils';
import { api } from '../api/client';
import { usePageMeta } from './layout/PageMetaContext';
import { BentoStatCard } from './dashboard/BentoStatCard';
import { EmptyState } from './layout/EmptyState';
import { LoadingTable } from './layout/LoadingTable';
import { LoadingCardList } from './layout/LoadingCardList';
import { PaginationControls } from './ui/pagination-controls';
import { usePagination } from '../hooks/usePagination';

export function LeadManagement() {
  const { user, users } = useAuth();
  const { 
    leads,
    loadLeadsAll,
    fieldConfigs, 
    addLead, 
    updateLead, 
    assignLead, 
    batchAddLeads,
    refreshFlag,
    isLoading,
  } = useLeads();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const [sortOption, setSortOption] = useState<"latest" | "oldest">("latest");
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showLeadDetail, setShowLeadDetail] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editMode, setEditMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Load leads on mount and when filters change
  useEffect(() => {
    if (user) {
      loadLeadsAll('pool', { status: statusFilter }, undefined, sortOption);
    }
  }, [user, statusFilter, sortOption, refreshFlag]);

  // Client-side search and assignment filtering
  const filteredLeads = leads.filter(lead => {
    if (searchTerm) {
      const matchesSearch = lead.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (lead.cin || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (lead.directors && lead.directors.some(d => 
                            d.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            d.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            d.mobile.includes(searchTerm) ||
                            d.email.toLowerCase().includes(searchTerm.toLowerCase())
                          ));
      if (!matchesSearch) return false;
    }

    const isAssigned = Boolean(lead.isAssigned && lead.assignedTo);
    if (assignmentFilter === 'assigned' && !isAssigned) return false;
    if (assignmentFilter === 'unassigned' && isAssigned) return false;

    return true;
  });

  const {
    paginatedItems: paginatedLeads,
    currentPage,
    pageSize,
    totalCount,
    totalPages,
    setPage,
    setPageSize,
    resetPage,
  } = usePagination(filteredLeads);

  useEffect(() => {
    resetPage();
  }, [searchTerm, statusFilter, assignmentFilter, sortOption, leads.length, resetPage]);

  const leadIdParam = searchParams.get('leadId');

  useEffect(() => {
    if (!leadIdParam || leads.length === 0) return;
    const lead = leads.find((l) => l.id === leadIdParam);
    if (lead) {
      setSelectedLead(lead);
      setShowLeadDetail(true);
    }
  }, [leadIdParam, leads]);

  const clearLeadIdParam = () => {
    if (searchParams.has('leadId')) {
      const next = new URLSearchParams(searchParams);
      next.delete('leadId');
      setSearchParams(next, { replace: true });
    }
  };

  const pageTitle = user?.role === 'sales_user' ? 'My Pending Leads' : 'Leads Needing Follow-Up';

  const handleAddLead = async (leadData: Omit<Lead, 'id' | 'createdAt' | 'isAssigned' | 'assignedTo'>) => {
    // Ensure tenant and uploader info
    const payload = {
      ...leadData,
      companyId: leadData.companyId || (user?.companyId || ''),
      uploadedBy: user?.id || '',
      isAssigned: true,  // Auto-assign to creator
      assignedTo: user?.id || null
    };

    // Add lead to Firestore
    const leadId = await addLead(payload);
    
    if (leadId) {
      setShowLeadForm(false);
      toast.success('Lead added and assigned to you successfully!');
    } else {
      toast.error('Failed to add lead. Please try again.');
    }
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

  const handleViewLead = (lead: Lead) => {
    setSelectedLead(lead);
    setShowLeadDetail(true);
    const next = new URLSearchParams(searchParams);
    next.set('leadId', lead.id);
    setSearchParams(next, { replace: true });
  };

  const closeLeadDetail = () => {
    setShowLeadDetail(false);
    setSelectedLead(null);
    clearLeadIdParam();
  };

  const handleEditClick = (lead: Lead) => {
    setSelectedLead(lead);
    setEditMode(true);
    setShowLeadForm(true);
  };

  const handleAssignLead = async (leadId: string, userId: string) => {
    // Validate assignment permission
    if (!user?.role) {
      toast.error('Unable to determine your role');
      return;
    }

    // Check if user has permission to assign leads
    if (!hasPermission(user.role, 'ASSIGN_LEADS')) {
      toast.error("You don't have permission to assign leads.");
      return;
    }

    // Find target user to check their role
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) {
      toast.error('Target user not found');
      return;
    }

    // Validate if current user can assign to target user
    if (!canAssignToUser(user.role, targetUser.role)) {
      if (user.role === 'team_lead') {
        toast.error('Team Leaders can only assign leads to Sales Users');
      } else {
        toast.error('You cannot assign leads to this user');
      }
      return;
    }

    const success = await assignLead(leadId, userId);
    if (success) {
      toast.success('Lead assigned successfully!');
    } else {
      toast.error('Failed to assign lead');
    }
  };



  const getAssignedUserName = (userId: string | null) => {
    if (!userId) return 'Not Assigned';
    const assignedUser = users.find(user => user.id === userId);
    return assignedUser ? assignedUser.name : 'Not Assigned';
  };

  const canAssignLeads = Boolean(user?.role && hasPermission(user.role, 'ASSIGN_LEADS'));

  const renderDesktopLeadRow = useCallback(
    (lead: Lead) => (
      <TableRow key={lead.id}>
        <TableCell className="font-medium whitespace-normal max-w-0">
          <span className="block truncate" title={lead.companyName}>{lead.companyName}</span>
        </TableCell>
        <TableCell className="hidden md:table-cell whitespace-normal">
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
        <TableCell className="hidden lg:table-cell whitespace-normal">
          {lead.directors && lead.directors.length > 0 ? (
            <div className="space-y-2">
              {lead.directors.map((director, idx) => (
                <div key={director.id} className={idx > 0 ? 'pt-2 border-t border-border' : ''}>
                  {director.mobile || 'N/A'}
                </div>
              ))}
            </div>
          ) : (
            <span className="text-muted-foreground">N/A</span>
          )}
        </TableCell>
        <TableCell>
          <Badge className={cn('text-xs', getFollowUpStatusClasses(lead.status))}>
            {lead.status}
          </Badge>
        </TableCell>
        <TableCell className="hidden sm:table-cell whitespace-normal">
          <div className="flex flex-col gap-2">
            {lead.isAssigned ? (
              <Badge variant="secondary" className="w-fit">
                Assigned
              </Badge>
            ) : (
              <Badge variant="outline" className="w-fit text-muted-foreground">
                Unassigned
              </Badge>
            )}

            {user?.role && hasPermission(user.role, 'ASSIGN_LEADS') ? (
              <Select
                value={lead.assignedTo || undefined}
                onValueChange={(value: string) => handleAssignLead(lead.id, value)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Assign to..." />
                </SelectTrigger>
                <SelectContent>
                  {users
                    .filter((u) => u.isActive && user.role && canAssignToUser(user.role, u.role))
                    .filter((u) => {
                      if (user.role === 'super_admin') return true;
                      return u.companyId === user.companyId;
                    })
                    .map((targetUser) => (
                      <SelectItem key={targetUser.id} value={targetUser.id}>
                        {targetUser.name} ({targetUser.role})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            ) : (
              <span className="text-sm">{getAssignedUserName(lead.assignedTo)}</span>
            )}
          </div>
        </TableCell>
        <TableCell className="hidden lg:table-cell">
          {calculateNextFollowUpDate(lead) ? (
            <span className="text-sm">
              {new Date(calculateNextFollowUpDate(lead)!).toLocaleDateString()}
            </span>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewLead(lead)}
              aria-label={`View ${lead.companyName}`}
            >
              <Eye className="h-4 w-4" />
            </Button>
            {(user?.role === 'company_admin' || user?.role === 'team_lead') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEditClick(lead)}
                aria-label={`Edit ${lead.companyName}`}
              >
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
    ),
    [user, users, getAssignedUserName, handleAssignLead, handleViewLead, handleEditClick]
  );

  const handleImportExcel = () => {
    // Check permission before allowing import
    if (!user?.role || !hasPermission(user.role, 'IMPORT_LEADS')) {
      toast.error("You don't have permission to import leads.");
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const MAX_IMPORT_BYTES = 5 * 1024 * 1024;
    if (file.size > MAX_IMPORT_BYTES) {
      toast.error('File too large. Maximum import size is 5 MB.');
      event.target.value = '';
      return;
    }

    // Validate permission
    if (!user?.role || !hasPermission(user.role, 'IMPORT_LEADS')) {
      toast.error("You don't have permission to import leads.");
      event.target.value = '';
      return;
    }

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (!['xlsx', 'xls', 'csv'].includes(fileExtension || '')) {
      toast.error('Please upload a valid Excel (.xlsx, .xls) or CSV file');
      return;
    }

    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        let workbook;
        let jsonData;

        if (fileExtension === 'csv') {
          const csvData = e.target?.result as string;
          const workbook = XLSX.read(csvData, { type: 'string' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          jsonData = XLSX.utils.sheet_to_json(worksheet);
        } else {
          // Handle Excel files
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          workbook = XLSX.read(data, { type: 'array' });
          const worksheet = workbook.Sheets[workbook.SheetNames[0]];
          jsonData = XLSX.utils.sheet_to_json(worksheet);
        }

        const importedLeads = processImportedData(jsonData);
        
        if (importedLeads.length > 0) {
          // OPTIMIZED: BATCH CIN DUPLICATE CHECK
          const validList: Lead[] = [];
          const duplicateList: Lead[] = [];
          
          // Show checking toast
          const checkToast = toast.loading(`Checking ${importedLeads.length} leads for duplicates...`);

          // Step 1: Filter leads with valid CINs and collect unique CINs
          const leadsWithCIN = importedLeads.filter(lead => {
            if (!lead.cin || lead.cin.trim() === "") {
              console.warn("Skipping lead without CIN", lead);
              return false;
            }
            return true;
          });

          if (leadsWithCIN.length === 0) {
            toast.dismiss(checkToast);
            toast.warning('No leads with valid CIN found in the file.');
            return;
          }

          // Step 2: Collect all CINs (normalize to lowercase for comparison)
          const allCINs = leadsWithCIN.map(lead => lead.cin.toLowerCase());
          const uniqueCINs = Array.from(new Set(allCINs));



          // Step 3: Batch query Firestore using 'in' operator (max 10 per query)
          const companyId = user?.companyId;
          if (!companyId) {
            toast.error('Company context required for import.');
            return;
          }

          const existingCINs = new Set<string>();
          const batchSize = 100;

          for (let i = 0; i < uniqueCINs.length; i += batchSize) {
            const cinBatch = uniqueCINs.slice(i, i + batchSize);
            try {
              const { duplicates } = await api.leads.checkDuplicatesScoped(companyId, cinBatch);
              duplicates.forEach((cin) => existingCINs.add(cin.toLowerCase()));
            } catch (error) {
              console.error(`Error checking CIN batch ${i / batchSize + 1}:`, error);
            }
          }



          // Step 4: Classify leads as valid or duplicate
          leadsWithCIN.forEach(lead => {
            const cinLower = lead.cin.toLowerCase();
            if (existingCINs.has(cinLower)) {
              duplicateList.push(lead);
            } else {
              validList.push(lead);
            }
          });

          toast.dismiss(checkToast);

          if (validList.length === 0 && duplicateList.length > 0) {
            toast.warning(`All ${duplicateList.length} leads were skipped as duplicates (CIN already exists).`);
            return;
          }

          if (validList.length === 0) {
             toast.warning('No valid leads to import.');
             return;
          }

          // Show loading toast
          const loadingToast = toast.loading(`Importing ${validList.length} leads... (${duplicateList.length} duplicates skipped)`);
          
          try {
            // Use batch import
            // FIX 6: REMOVE DOUBLE NORMALIZATION (already normalized in processImportedData)
            const successCount = await batchAddLeads(validList);

            // Dismiss loading toast
            toast.dismiss(loadingToast);
            
            // Show result
            if (duplicateList.length > 0) {
              toast.success(`[${successCount}] leads imported successfully. [${duplicateList.length}] duplicates skipped based on CIN.`);
            } else {
              toast.success(`Successfully imported ${successCount} leads!`);
            }
            

          } catch (error) {
            toast.dismiss(loadingToast);
            console.error('Import error:', error);
            toast.error('Error importing leads. Please try again.');
          }
        } else {
          toast.warning('No valid leads found in the file. Please check that your Excel file has a "Company Name" column.');
        }
        
      } catch (error) {
        console.error('Error parsing file:', error);
        toast.error('Error reading file. Please check the file format and try again.');
      }
    };

    if (fileExtension === 'csv') {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }

    // Clear the input
    event.target.value = '';
  };

  const processImportedData = (data: any[]): Lead[] => {
    const validStatuses = ['Hot', 'Warm', 'Cold'];
    const companiesMap = new Map<string, any>(); // Group by CIN or Company Name
    let currentCIN = ''; // Track the current CIN for sequential grouping
    let currentCompanyKey = ''; // Track the current company key

    // Helper function to get field variations
    const getFieldVariations = (config: any) => {
      const variations = [config.excelHeader, config.label, config.key];
      
      switch(config.key) {
        case 'cin':
          variations.push('CIN', 'cin', 'C.I.N', 'Company Identification Number');
          break;
        case 'companyName':
          variations.push('Company Name', 'Company name', 'companyName', 'Name', 'name', 'COMPANY NAME');
          break;
        case 'authorisedCapital':
          variations.push('Authorised Capital(₹)', 'Authorised Capital', 'authorisedCapital', 'Authorized Capital');
          break;
        case 'paidUpCapital':
          variations.push('Paid up Capital(₹)', 'Paid up Capital', 'paidUpCapital', 'Paid-up Capital');
          break;
        case 'dateOfIncorporation':
          variations.push('Date of Incorporation', 'dateOfIncorporation', 'Incorporation Date', 'DOI');
          break;
        case 'registeredAddress':
          variations.push('Registered Address', 'registeredAddress', 'Address', 'Reg Address');
          break;
        case 'companyEmail':
          variations.push('Company E-mail id', 'Company Email', 'companyEmail', 'Email');
          break;
        case 'din':
          variations.push('DIN', 'din', 'D.I.N', 'Director Identification Number');
          break;
        case 'directorFirstName':
          variations.push('F Name', 'First Name', 'directorFirstName', 'FirstName', 'Director First Name');
          break;
        case 'directorLastName':
          variations.push('L Name', 'Last Name', 'directorLastName', 'LastName', 'Director Last Name');
          break;
        case 'mobile':
          variations.push('Mobile', 'mobile', 'Phone', 'Contact', 'Mobile No', 'Contact Number');
          break;
        case 'directorEmail':
          variations.push('Director E-mail id', 'Director Email', 'directorEmail', 'Dir Email');
          break;
        case 'status':
          variations.push('Status', 'status', 'Lead Status');
          break;

        case 'notes':
          variations.push('Notes', 'notes', 'Remarks', 'Comments');
          break;
      }
      
      return variations;
    };

    // Sequential processing: Process rows in order and group directors by CIN
    data.forEach((row, index) => {
      try {
        // const rowNumber = index + 2; // +2 because index is 0-based and Excel has header row
        const hasAnyData = Object.values(row).some(val => val !== undefined && val !== null && val !== '');
        if (!hasAnyData) {


          return; // Don't count empty rows
        }

        // Extract CIN from current row
        const cinInRow = findFieldValue(row, getFieldVariations(fieldConfigs.find(c => c.key === 'cin')!));
        
        // If this row has a CIN, it's a new company (or the first occurrence of this company)
        if (cinInRow && cinInRow.trim() !== '') {
          currentCIN = cinInRow.trim();
          currentCompanyKey = currentCIN;

        } else {

        }
        // If no CIN in this row, use the current CIN from previous row
        // This handles the case where multiple directors share the same CIN

        // Get company name from row
        const companyName = findFieldValue(row, getFieldVariations(fieldConfigs.find(c => c.key === 'companyName')!));

        // Skip if we still don't have a valid company identifier
        if (!currentCompanyKey) {
          // Try to get company name as fallback
          if (companyName && companyName.length >= 2) {
            currentCompanyKey = companyName;
            currentCIN = '';

          } else {
            return;

            return;
          }
        }

        // If company doesn't exist in map, create it
        if (!companiesMap.has(currentCompanyKey)) {
          // For new companies, we need a company name
          if (!companyName || companyName.length < 2) {
            // If this is a subsequent director row without company name, use the current company key
            if (currentCIN) {
              // This shouldn't happen in normal MCA data, but let's be lenient
              // console.log(`Row ${rowNumber}: WARNING - No company name but has CIN context, adding director to existing company`);
              // Try to add director to existing company (will happen below)
            } else {
              return;

              return;
            }
          } else {


            const leadData: any = {
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${index}`,
              status: 'Cold',
              isAssigned: false,
              assignedTo: null,
              createdAt: new Date().toISOString(),
              directors: [],
              companyId: user?.companyId || ''
            };

            // Map company fields from the first row with this CIN
            fieldConfigs.forEach(config => {
              if (!['din', 'directorFirstName', 'directorLastName', 'mobile', 'directorEmail'].includes(config.key)) {
                const possibleHeaders = getFieldVariations(config);
                const value = findFieldValue(row, possibleHeaders);
                
                if (config.key === 'status') {
                  leadData[config.key] = validStatuses.find(s => 
                    s.toLowerCase() === (value || '').toLowerCase()
                  ) || 'Cold';
                } else if (config.type === 'date' && value) {
                  leadData[config.key] = formatDate(value) || '';
                } else {
                  leadData[config.key] = value || '';
                }
              }
            });

            // Set defaults
            if (!leadData.status || !validStatuses.includes(leadData.status)) {
              leadData.status = 'Cold';
            }

            companiesMap.set(currentCompanyKey, leadData);
          }
        }

        // Add director to the current company
        const company = companiesMap.get(currentCompanyKey);
        if (!company) {

          return;
          return;
        }

        const din = findFieldValue(row, getFieldVariations(fieldConfigs.find(c => c.key === 'din')!));
        const firstName = findFieldValue(row, getFieldVariations(fieldConfigs.find(c => c.key === 'directorFirstName')!));
        const lastName = findFieldValue(row, getFieldVariations(fieldConfigs.find(c => c.key === 'directorLastName')!));
        const mobile = findFieldValue(row, getFieldVariations(fieldConfigs.find(c => c.key === 'mobile')!));
        const email = findFieldValue(row, getFieldVariations(fieldConfigs.find(c => c.key === 'directorEmail')!));

        // Only add director if there's at least a name or contact info
        if (firstName || lastName || mobile || email) {
          const directorId = `${company.id}-dir-${company.directors.length + 1}`;
          company.directors.push({
            id: directorId,
            din: din || '',
            firstName: firstName || '',
            lastName: lastName || '',
            mobile: mobile || '',
            email: email || ''
          });

        } else {

        }
      } catch (error) {
        const rowNumber = index + 2;
        console.error(`Row ${rowNumber}: Error processing -`, error);

      }
    });

    // Convert map to array and update legacy fields
    const importedLeads = Array.from(companiesMap.values()).map(lead => {
      // Set legacy fields from first director
      if (lead.directors.length > 0) {
        const firstDirector = lead.directors[0];
        lead.din = firstDirector.din;
        lead.directorFirstName = firstDirector.firstName;
        lead.directorLastName = firstDirector.lastName;
        lead.mobile = firstDirector.mobile;
        lead.directorEmail = firstDirector.email;
      } else {
        // No directors, add empty one to maintain structure
        lead.directors = [{
          id: `${lead.id}-dir-1`,
          din: '',
          firstName: '',
          lastName: '',
          mobile: '',
          email: ''
        }];
        lead.din = '';
        lead.directorFirstName = '';
        lead.directorLastName = '';
        lead.mobile = '';
        lead.directorEmail = '';
      }
      return lead as Lead;
    });


    

    
    return importedLeads;
  };

  const findFieldValue = (row: any, possibleKeys: string[]): string => {
    // First, try exact matches
    for (const key of possibleKeys) {
      if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
        return String(row[key]).trim();
      }
    }
    
    // Then try case-insensitive matching with all row keys
    const rowKeys = Object.keys(row);
    for (const possibleKey of possibleKeys) {
      const normalizedPossibleKey = possibleKey.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      for (const rowKey of rowKeys) {
        const normalizedRowKey = rowKey.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        if (normalizedRowKey === normalizedPossibleKey) {
          const value = row[rowKey];
          if (value !== undefined && value !== null && value !== '') {
            return String(value).trim();
          }
        }
      }
    }
    
    return '';
  };

  const formatDate = (dateString: string): string | null => {
    if (!dateString) return null;
    
    try {
      // Try parsing various date formats
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        // Try parsing DD/MM/YYYY or DD-MM-YYYY
        const parts = dateString.split(/[\/\-]/);
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1; // Month is 0-indexed
          const year = parseInt(parts[2]);
          const parsedDate = new Date(year, month, day);
          if (!isNaN(parsedDate.getTime())) {
            return parsedDate.toISOString().split('T')[0];
          }
        }
        return null;
      }
      return date.toISOString().split('T')[0];
    } catch {
      return null;
    }
  };

  const handleExportExcel = () => {
    // Permission check: Only Company Admin and Super Admin can export
    if (!user?.role || !['company_admin', 'super_admin'].includes(user.role)) {
      toast.error("You don't have permission to export leads.");
      return;
    }

    try {
      // Export with multiple directors - create separate rows for each director
      const exportData: any[] = [];
      
      filteredLeads.forEach(lead => {
        if (lead.directors && lead.directors.length > 0) {
          // Create one row per director
          lead.directors.forEach((director) => {
            const row: any = {};
            
            fieldConfigs.forEach(config => {
              if (config.showInExcel) {
                let value: any;
                
                // Handle director-specific fields
                if (config.key === 'din') {
                  value = director.din;
                } else if (config.key === 'directorFirstName') {
                  value = director.firstName;
                } else if (config.key === 'directorLastName') {
                  value = director.lastName;
                } else if (config.key === 'mobile') {
                  value = director.mobile;
                } else if (config.key === 'directorEmail') {
                  value = director.email;
                } else if (config.key === 'assignedTo') {
                  value = getAssignedUserName(lead.assignedTo);
                } else {
                  value = lead[config.key];
                }
                
                row[config.excelHeader] = value || '';
              }
            });
            
            // Always add creation date
            row['Created Date'] = lead.createdAt;
            exportData.push(row);
          });
        } else {
          // No directors, export company data only
          const row: any = {};
          fieldConfigs.forEach(config => {
            if (config.showInExcel) {
              let value = lead[config.key];
              if (config.key === 'assignedTo') {
                value = getAssignedUserName(lead.assignedTo);
              }
              row[config.excelHeader] = value || '';
            }
          });
          row['Created Date'] = lead.createdAt;
          exportData.push(row);
        }
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'MCA Leads');
      
      const fileName = `mca_leads_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      toast.success('Leads exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Error exporting leads. Please try again.');
    }
  };

  const handleDownloadTemplate = () => {
    try {
      // Create template with multiple directors example showing the sequential grouping pattern
      const sampleDirectors = [
        {
          din: '08765432',
          directorFirstName: 'John',
          directorLastName: 'Doe',
          mobile: '+91 98765 43210',
          directorEmail: 'john@samplecompany.com',
        },
        {
          din: '08765433',
          directorFirstName: 'Jane',
          directorLastName: 'Smith',
          mobile: '+91 98765 43211',
          directorEmail: 'jane@samplecompany.com',
        },
        {
          din: '08765434',
          directorFirstName: 'Robert',
          directorLastName: 'Johnson',
          mobile: '+91 98765 43212',
          directorEmail: 'robert@anothercompany.com',
        }
      ];

      const companySampleData: any = {
        cin: 'U74999DL2020PTC123456',
        companyName: 'Sample Company Pvt Ltd',
        authorisedCapital: '10,00,000',
        paidUpCapital: '7,50,000',
        dateOfIncorporation: '2020-05-15',
        registeredAddress: 'Plot 123, Sector 18, Noida, UP 201301',
        companyEmail: 'info@samplecompany.com',
        status: 'Hot',

        notes: 'First company with two directors'
      };

      const company2SampleData: any = {
        cin: 'U74999MH2021PTC654321',
        companyName: 'Another Company Pvt Ltd',
        authorisedCapital: '5,00,000',
        paidUpCapital: '3,00,000',
        dateOfIncorporation: '2021-08-20',
        registeredAddress: 'Suite 456, Andheri, Mumbai, MH 400053',
        companyEmail: 'info@anothercompany.com',
        status: 'Warm',

        notes: 'Second company with one director'
      };

      const templateData: any[] = [];
      
      // Create first company row with CIN and first director
      const firstRow: any = {};
      fieldConfigs.forEach(config => {
        if (config.showInExcel) {
          let value: any;
          
          if (config.key === 'din') {
            value = sampleDirectors[0].din;
          } else if (config.key === 'directorFirstName') {
            value = sampleDirectors[0].directorFirstName;
          } else if (config.key === 'directorLastName') {
            value = sampleDirectors[0].directorLastName;
          } else if (config.key === 'mobile') {
            value = sampleDirectors[0].mobile;
          } else if (config.key === 'directorEmail') {
            value = sampleDirectors[0].directorEmail;
          } else {
            value = companySampleData[config.key];
          }
          
          firstRow[config.excelHeader] = value || '';
        }
      });
      templateData.push(firstRow);

      // Create second row with EMPTY CIN and second director (will group with first company)
      const secondRow: any = {};
      fieldConfigs.forEach(config => {
        if (config.showInExcel) {
          let value: any;
          
          if (config.key === 'cin') {
            // EMPTY CIN - this director will be grouped with the previous company
            value = '';
          } else if (config.key === 'din') {
            value = sampleDirectors[1].din;
          } else if (config.key === 'directorFirstName') {
            value = sampleDirectors[1].directorFirstName;
          } else if (config.key === 'directorLastName') {
            value = sampleDirectors[1].directorLastName;
          } else if (config.key === 'mobile') {
            value = sampleDirectors[1].mobile;
          } else if (config.key === 'directorEmail') {
            value = sampleDirectors[1].directorEmail;
          } else if (config.key === 'companyName' || config.key === 'notes') {
            // Optionally can be empty or same as previous row
            value = '';
          } else {
            value = '';
          }
          
          secondRow[config.excelHeader] = value || '';
        }
      });
      templateData.push(secondRow);

      // Create third row with NEW CIN (second company)
      const thirdRow: any = {};
      fieldConfigs.forEach(config => {
        if (config.showInExcel) {
          let value: any;
          
          if (config.key === 'din') {
            value = sampleDirectors[2].din;
          } else if (config.key === 'directorFirstName') {
            value = sampleDirectors[2].directorFirstName;
          } else if (config.key === 'directorLastName') {
            value = sampleDirectors[2].directorLastName;
          } else if (config.key === 'mobile') {
            value = sampleDirectors[2].mobile;
          } else if (config.key === 'directorEmail') {
            value = sampleDirectors[2].directorEmail;
          } else {
            value = company2SampleData[config.key];
          }
          
          thirdRow[config.excelHeader] = value || '';
        }
      });
      templateData.push(thirdRow);
      const worksheet = XLSX.utils.json_to_sheet(templateData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'MCA Leads Template');
      
      XLSX.writeFile(workbook, 'mca_leads_template.xlsx');
      
      toast.success('Template downloaded successfully! Use this format for imports.');
    } catch (error) {
      console.error('Template download error:', error);
      toast.error('Error downloading template.');
    }
  };

  usePageMeta({
    title: pageTitle,
    description:
      user?.role === 'sales_user' || user?.role === 'super_admin'
        ? `Showing ${filteredLeads.length} lead${filteredLeads.length !== 1 ? 's' : ''}`
        : `Available for assignment: ${filteredLeads.length}`,
    actions: (
      <>
        <Button variant="outline" size="sm" className="gap-2" onClick={handleDownloadTemplate}>
          <FileDown className="h-4 w-4" />
          <span className="hidden sm:inline">Template</span>
        </Button>
        {user?.role && hasPermission(user.role, 'IMPORT_LEADS') && (
          <Button variant="outline" size="sm" className="gap-2" onClick={handleImportExcel}>
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Import</span>
          </Button>
        )}
        {['company_admin', 'super_admin'].includes(user?.role || '') && (
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExportExcel}>
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        )}
        <Button onClick={() => setShowLeadForm(true)} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Lead</span>
        </Button>
      </>
    ),
  });

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      {user?.role && hasPermission(user.role, 'IMPORT_LEADS') && (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="import-tips" className="border rounded-lg px-4 bg-muted/30">
            <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">
              <span className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                Excel import guide
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground pb-4">
              <strong>Import Tips:</strong> Download the template first to see the correct format. Your Excel file must have a &quot;Company Name&quot; column.
              <br /><br />
              <strong>Multiple Directors:</strong> Put the CIN in the first director&apos;s row, then leave CIN empty in subsequent rows — they group with the previous CIN.
              <br /><br />
              Supported columns: CIN, Company Name, Authorised Capital, Paid up Capital, Date of Incorporation, Registered Address, Company Email, DIN, F Name, L Name, Mobile, Director Email.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      <div className="dashboard-bento">
        <BentoStatCard
          label="Total in Pool"
          value={filteredLeads.length}
          subtitle="Matching current filters"
          icon={<ClipboardList className="h-4 w-4" />}
          variant="primary"
        />
        <BentoStatCard
          label="Hot"
          value={filteredLeads.filter((l) => l.status === 'Hot').length}
          subtitle="High priority"
          variant="warm"
        />
        <BentoStatCard
          label="Warm"
          value={filteredLeads.filter((l) => l.status === 'Warm').length}
          subtitle="Medium priority"
          variant="rose"
        />
        <BentoStatCard
          label="Cold"
          value={filteredLeads.filter((l) => l.status === 'Cold').length}
          subtitle="Low priority"
          variant="teal"
        />
      </div>

      <Card className={cn('card-bento gap-0 border-0')}>
        <CardContent className="pt-6 px-5 pb-5">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Hot">Hot</SelectItem>
                <SelectItem value="Warm">Warm</SelectItem>
                <SelectItem value="Cold">Cold</SelectItem>
                <SelectItem value="Converted">Converted</SelectItem>
                <SelectItem value="Lost">Lost</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={assignmentFilter}
              onValueChange={(value: 'all' | 'assigned' | 'unassigned') => setAssignmentFilter(value)}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Assignment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignment</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortOption} onValueChange={(value: "latest" | "oldest") => setSortOption(value)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Latest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {isLoading ? (
            <>
              <LoadingCardList className="md:hidden" />
              <LoadingTable columns={8} rows={6} className="hidden md:block" />
            </>
          ) : filteredLeads.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="h-6 w-6" />}
              title="No leads found"
              description={searchTerm ? 'Try adjusting your search or filters.' : 'Add a lead or import from Excel to get started.'}
              action={
                user?.role && hasPermission(user.role, 'IMPORT_LEADS')
                  ? { label: 'Add Lead', onClick: () => setShowLeadForm(true) }
                  : undefined
              }
            />
          ) : (
          <>
          <div className="md:hidden space-y-3">
            {paginatedLeads.map((lead) => (
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
                  <p>Assignee: {getAssignedUserName(lead.assignedTo)}</p>
                  {calculateNextFollowUpDate(lead) && (
                    <p>Follow-up: {new Date(calculateNextFollowUpDate(lead)!).toLocaleDateString()}</p>
                  )}
                </div>
                <div className="flex gap-2 mt-3">
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => handleViewLead(lead)}>
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  {(user?.role === 'company_admin' || user?.role === 'team_lead') && (
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEditClick(lead)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
          <BentoTable className="hidden md:block">
            <Table className="table-fixed w-full">
              <colgroup>
                <col style={{ width: '16%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '10%' }} />
                <col style={{ width: '6%' }} />
              </colgroup>
              <TableHeader>
                <TableRow className="hover:bg-transparent even:bg-transparent">
                  <TableHead>Company Name</TableHead>
                  <TableHead className="hidden md:table-cell">Director</TableHead>
                  <TableHead>CIN</TableHead>
                  <TableHead className="hidden lg:table-cell">Mobile</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Assigned To</TableHead>
                  <TableHead className="hidden lg:table-cell">Follow-up Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLeads.map((lead) => renderDesktopLeadRow(lead))}
              </TableBody>
            </Table>
          </BentoTable>
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalCount={totalCount}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            isLoading={isLoading}
            itemLabel="leads"
          />
          </>
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
            onSubmit={editMode ? handleEditLead : handleAddLead}
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
      <Dialog open={showLeadDetail} onOpenChange={(open) => !open && closeLeadDetail()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lead Details</DialogTitle>
            <DialogDescription>View and manage lead information</DialogDescription>
          </DialogHeader>
          {selectedLead && (
            <LeadDetail
              lead={selectedLead}
              onClose={closeLeadDetail}
              onEdit={() => {
                closeLeadDetail();
                handleEditClick(selectedLead);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Hidden file input for Excel import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".xlsx,.xls,.csv"
        style={{ display: 'none' }}
      />
    </div>
  );
}
