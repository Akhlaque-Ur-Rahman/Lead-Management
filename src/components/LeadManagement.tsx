import React, { useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useLeads, type Lead } from './LeadsContext';
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
import { Plus, Search, Filter, Download, Upload, Eye, Edit, Trash2, Users, FileDown, Info } from 'lucide-react';
import { LeadForm } from './LeadForm';
import { LeadDetail } from './LeadDetail';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export function LeadManagement() {
  const { user, users } = useAuth();
  const { leads, setLeads, fieldConfigs } = useLeads();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assignedFilter, setAssignedFilter] = useState<string>('all');
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showLeadDetail, setShowLeadDetail] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editMode, setEditMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         lead.cin.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (lead.directors && lead.directors.some(d => 
                           d.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           d.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           d.mobile.includes(searchTerm) ||
                           d.email.toLowerCase().includes(searchTerm.toLowerCase())
                         ));
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesAssignment = assignedFilter === 'all' || lead.assignedTo === assignedFilter;
    
    // Users can only see their own leads unless they are admin/main_admin
    const hasAccess = user?.role === 'main_admin' || user?.role === 'admin' || lead.assignedTo === user?.id;
    
    return matchesSearch && matchesStatus && matchesAssignment && hasAccess;
  });

  const handleAddLead = (leadData: Omit<Lead, 'id' | 'createdAt'>) => {
    const newLead: Lead = {
      ...leadData,
      id: (leads.length + 1).toString(),
      createdAt: new Date().toISOString().split('T')[0]
    };
    setLeads([...leads, newLead]);
    setShowLeadForm(false);
    toast.success('Lead added successfully!');
  };

  const handleEditLead = (leadData: Omit<Lead, 'id' | 'createdAt'>) => {
    if (selectedLead) {
      const updatedLeads = leads.map(lead => 
        lead.id === selectedLead.id 
          ? { ...lead, ...leadData }
          : lead
      );
      setLeads(updatedLeads);
      setShowLeadForm(false);
      setEditMode(false);
      setSelectedLead(null);
      toast.success('Lead updated successfully!');
    }
  };

  const handleDeleteLead = (leadId: string) => {
    setLeads(leads.filter(lead => lead.id !== leadId));
    toast.success('Lead deleted successfully!');
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

  const handleAssignLead = (leadId: string, userId: string) => {
    const updatedLeads = leads.map(lead => 
      lead.id === leadId ? { ...lead, assignedTo: userId } : lead
    );
    setLeads(updatedLeads);
    toast.success('Lead assigned successfully!');
  };

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

  const getAssignedUserName = (userId: string) => {
    const assignedUser = users.find(user => user.id === userId);
    return assignedUser ? assignedUser.name : 'Unassigned';
  };

  const handleImportExcel = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (!['xlsx', 'xls', 'csv'].includes(fileExtension || '')) {
      toast.error('Please upload a valid Excel (.xlsx, .xls) or CSV file');
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (e) => {
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
          setLeads(prevLeads => [...prevLeads, ...importedLeads]);
          const totalRows = jsonData.length;
          const skipped = totalRows - importedLeads.length;
          
          if (skipped > 0) {
            toast.success(`Successfully imported ${importedLeads.length} leads. ${skipped} rows skipped (empty or invalid data).`);
          } else {
            toast.success(`Successfully imported ${importedLeads.length} leads!`);
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
    let skippedCount = 0;
    let lastCompanyKey: string | null = null;


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
        case 'followUpDate':
          variations.push('Follow-up Date', 'Follow Up Date', 'followUpDate', 'Next Follow Up');
          break;
        case 'notes':
          variations.push('Notes', 'notes', 'Remarks', 'Comments');
          break;
      }
      
      return variations;
    };

    // First pass: Process all rows and group by company
    data.forEach((row, index) => {
      try {
        const hasAnyData = Object.values(row).some(val => val !== undefined && val !== null && val !== '');
        if (!hasAnyData) return;

        const companyName = findFieldValue(row, getFieldVariations(fieldConfigs.find(c => c.key === 'companyName')!));
const cin = findFieldValue(row, getFieldVariations(fieldConfigs.find(c => c.key === 'cin')!));

// ✅ Carry forward previous company key if this row has no company data
const companyKey = cin || companyName || lastCompanyKey;
if (!companyKey) {
  skippedCount++;
  return;
}

// Track last valid company for subsequent rows
if (cin || companyName) {
  lastCompanyKey = companyKey;
}
 // Use CIN if available, otherwise company name

        // If company doesn't exist in map, create it
        if (!companiesMap.has(companyKey)) {
          const leadData: any = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${index}`,
            createdAt: new Date().toISOString().split('T')[0],
            assignedTo: user?.id || '1',
            followUpHistory: [],
            directors: []
          };

          // Map company fields
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
          if (!leadData.followUpDate) {
            leadData.followUpDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          }
          if (!leadData.status) {
            leadData.status = 'Cold';
          }

          companiesMap.set(companyKey, leadData);
        }

        // Add director to this company
        const company = companiesMap.get(companyKey);
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
        }
      } catch (error) {
        console.error(`Error processing row ${index + 2}:`, error);
        skippedCount++;
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

    const successCount = importedLeads.length;
    console.log(`Import complete: ${successCount} companies imported with multiple directors, ${skippedCount} rows skipped`);
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
    try {
      // Export with multiple directors - create separate rows for each director
      const exportData: any[] = [];
      
      filteredLeads.forEach(lead => {
        if (lead.directors && lead.directors.length > 0) {
          // Create one row per director
          lead.directors.forEach((director, dirIndex) => {
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
      // Create template with multiple directors example
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
        followUpDate: '2025-10-15',
        notes: 'Sample lead entry - Multiple directors for same CIN'
      };

      const templateData: any[] = [];
      
      // Create one row per director to show multiple directors example
      sampleDirectors.forEach(director => {
        const templateRow: any = {};
        fieldConfigs.forEach(config => {
          if (config.showInExcel) {
            let value: any;
            
            if (config.key === 'din') {
              value = director.din;
            } else if (config.key === 'directorFirstName') {
              value = director.directorFirstName; // Use the correct property from sample data
            } else if (config.key === 'directorLastName') {
              value = director.directorLastName; // Use the correct property from sample data
            } else if (config.key === 'mobile') {
              value = director.mobile;
            } else if (config.key === 'directorEmail') {
              value = director.directorEmail;
            } else {
              value = companySampleData[config.key];
            }
            
            templateRow[config.excelHeader] = value || '';
          }
        });
        templateData.push(templateRow);
      });
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
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1>Lead Management</h1>
          <p className="text-muted-foreground">
            Manage your MCA leads and track follow-ups
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={handleDownloadTemplate}>
            <FileDown className="h-4 w-4" />
            Download Template
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleImportExcel}>
            <Upload className="h-4 w-4" />
            Import Excel
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleExportExcel}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => setShowLeadForm(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Import Instructions */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Import Tips:</strong> Download the template first to see the correct format. Your Excel file must have a "Company Name" column. 
          <br/>
          <strong>Multiple Directors:</strong> For companies with multiple directors, add multiple rows with the same CIN but different director details. The system will automatically group them by company.
          <br/>
          Supported columns: CIN, Company Name, Authorised Capital, Paid up Capital, Date of Incorporation, Registered Address, Company Email, DIN, F Name, L Name, Mobile, Director Email.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>All Leads</CardTitle>
          <CardDescription>
            Manage and track your lead pipeline
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
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
              <SelectTrigger className="w-48">
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
            {(user?.role === 'main_admin' || user?.role === 'admin') && (
              <Select value={assignedFilter} onValueChange={setAssignedFilter}>
                <SelectTrigger className="w-48">
                  <Users className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignees</SelectItem>
                  {users.filter(u => u.isActive).map(user => (
                    <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Table */}
          <div className="rounded-md border">
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
                      <Badge variant={getStatusColor(lead.status)}>
                        {lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {(user?.role === 'main_admin' || user?.role === 'admin') ? (
                        <Select 
                          value={lead.assignedTo} 
                          onValueChange={(value) => handleAssignLead(lead.id, value)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {users.filter(u => u.isActive).map(user => (
                              <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm">{getAssignedUserName(lead.assignedTo)}</span>
                      )}
                    </TableCell>
                    <TableCell>{lead.followUpDate}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewLead(lead)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClick(lead)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteLead(lead.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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