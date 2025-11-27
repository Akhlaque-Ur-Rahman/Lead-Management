import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useLeads, type Lead } from './LeadsContext';
import { calculateNextFollowUpDate } from '../utils/followups/calculations';
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
import { Plus, Search, Filter, Download, Upload, Eye, Edit, FileDown, Info } from 'lucide-react';
import { LeadForm } from './LeadForm';
import { LeadDetail } from './LeadDetail';

import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { hasPermission, canAssignToUser } from '../types/roles';
import { getFollowUpStatusClasses } from '../utils/followUpStatusColors';
import { cn } from './ui/utils';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

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
    refreshFlag
  } = useLeads();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showLeadDetail, setShowLeadDetail] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editMode, setEditMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load leads on mount and when filters change
  useEffect(() => {
    if (user) {
      loadLeadsAll('pool', { status: statusFilter });
    }
  }, [user, statusFilter, refreshFlag]);

  // Client-side search and status filtering
  const filteredLeads = leads.filter(lead => {
    // Search Filter
    if (searchTerm) {
      const matchesSearch = lead.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          lead.cin.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (lead.directors && lead.directors.some(d => 
                            d.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            d.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            d.mobile.includes(searchTerm) ||
                            d.email.toLowerCase().includes(searchTerm.toLowerCase())
                          ));
      if (!matchesSearch) return false;
    }
    


    return true;
  });

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
          // Handle CSV files
          const csvData = e.target?.result as string;
          const lines = csvData.split('\n');
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          
          jsonData = lines.slice(1)
            .filter(line => line.trim())
            .map(line => {
              const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
              const row: any = {};
              headers.forEach((header, index) => {
                row[header] = values[index] || '';
              });
              return row;
            });
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
          const existingCINs = new Set<string>();
          const batchSize = 10; // Firestore 'in' operator limit

          for (let i = 0; i < uniqueCINs.length; i += batchSize) {
            const cinBatch = uniqueCINs.slice(i, i + batchSize);
            
            try {
              const q = query(
                collection(db, "leads"),
                where("companyId", "==", user?.companyId),
                where("cin", "in", cinBatch)
              );

              const snap = await getDocs(q);
              
              // Collect existing CINs
              snap.docs.forEach(doc => {
                const cin = doc.data().cin?.toLowerCase();
                if (cin) {
                  existingCINs.add(cin);
                }
              });
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
          const loadingToast = toast.loading(`Importing ${validList.length} leads to Firestore... (${duplicateList.length} duplicates skipped)`);
          
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
              toast.success(`Successfully imported ${successCount} leads to Firestore!`);
            }
            

          } catch (error) {
            toast.dismiss(loadingToast);
            console.error('Import error:', error);
            toast.error('Error importing leads to Firestore. Please try again.');
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
    const validStatuses = ['Hot', 'Warm', 'Cold', 'Converted', 'Lost'];
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
            if (!leadData.status) {
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

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1>{user?.role === 'sales_user' ? 'My Pending Leads' : 'Leads Needing Follow-Up'}</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            {user?.role === 'sales_user' || user?.role === 'super_admin'
              ? `Showing: ${filteredLeads.length} lead${filteredLeads.length !== 1 ? 's' : ''}`
              : `Available for assignment: ${filteredLeads.length}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" className="gap-2 flex-1 sm:flex-none" onClick={handleDownloadTemplate}>
            <FileDown className="h-4 w-4" />
            <span className="hidden sm:inline">Template</span>
          </Button>
          {user?.role && hasPermission(user.role, 'IMPORT_LEADS') && (
            <Button variant="outline" size="sm" className="gap-2 flex-1 sm:flex-none" onClick={handleImportExcel}>
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Import</span>
            </Button>
          )}
          {['company_admin', 'super_admin'].includes(user?.role || '') && (
            <Button variant="outline" size="sm" className="gap-2 flex-1 sm:flex-none" onClick={handleExportExcel}>
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          )}
          <Button onClick={() => setShowLeadForm(true)} size="sm" className="gap-2 flex-1 sm:flex-none">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Lead</span>
          </Button>
        </div>
      </div>

      {/* Import Instructions - Only for roles that can import */}
      {user?.role && hasPermission(user.role, 'IMPORT_LEADS') && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Import Tips:</strong> Download the template first to see the correct format. Your Excel file must have a "Company Name" column. 
            <br/>
            <strong>Multiple Directors:</strong> For companies with multiple directors, put the CIN in the first director's row, then leave the CIN column empty in subsequent director rows. All rows with empty CINs will be grouped with the previous CIN automatically.
            <br/>
            <strong>Example:</strong> Row 1: CIN=U12345, Director A | Row 2: CIN=(empty), Director B | Row 3: CIN=U67890, Director C - This creates 2 companies: First with Directors A & B, Second with Director C.
            <br/>
            Supported columns: CIN, Company Name, Authorised Capital, Paid up Capital, Date of Incorporation, Registered Address, Company Email, DIN, F Name, L Name, Mobile, Director Email.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{user?.role === 'sales_user' ? 'My Pending Leads' : 'Leads Needing Follow-Up'}</CardTitle>
          <CardDescription>
            {user?.role === 'sales_user' 
              ? 'Your assigned leads' 
              : user?.role === 'super_admin'
              ? 'Leads assigned to you'
              : 'Unassigned leads available for assignment'}
          </CardDescription>
        </CardHeader>
        <CardContent>
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
          </div>

          {/* Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Director</TableHead>
                  <TableHead>CIN</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Follow-up Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
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
                    <TableCell>
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
                    <TableCell>
                      <div className="flex flex-col gap-2">
                        {/* FIX C: Assignment Status Icon */}
                        {lead.isAssigned ? (
                          <Badge variant="secondary" className="w-fit bg-blue-100 text-blue-800 hover:bg-blue-200">
                            Assigned
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="w-fit text-gray-500">
                            Unassigned
                          </Badge>
                        )}
                        
                        {(user?.role && hasPermission(user.role, 'ASSIGN_LEADS')) ? (
                          <Select 
                            value={lead.assignedTo || undefined} 
                            onValueChange={(value: string) => handleAssignLead(lead.id, value)}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue placeholder="Assign to..." />
                            </SelectTrigger>
                            <SelectContent>
                              {users
                                .filter(u => u.isActive && user.role && canAssignToUser(user.role, u.role))
                                .filter(u => {
                                  // For non-super admins, only show users from same company
                                  if (user.role === 'super_admin') return true;
                                  return u.companyId === user.companyId;
                                })
                                .map(targetUser => (
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
                    <TableCell>
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
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {(user?.role === 'company_admin' || user?.role === 'team_lead') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(lead)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>



      {/* Lead Form Dialog */}
      <Dialog open={showLeadForm} onOpenChange={setShowLeadForm}>
        <DialogContent className="max-w-md">
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
      <Dialog open={showLeadDetail} onOpenChange={setShowLeadDetail}>
        <DialogContent className="max-w-2xl">
          {selectedLead && (
            <LeadDetail
              lead={selectedLead}
              onClose={() => {
                setShowLeadDetail(false);
                setSelectedLead(null);
              }}
              onEdit={() => {
                setShowLeadDetail(false);
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
