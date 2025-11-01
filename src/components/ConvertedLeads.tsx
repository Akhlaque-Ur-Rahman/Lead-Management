import { useState } from 'react';
import { useAuth } from './AuthContext';
import { useLeads, Lead } from './LeadsContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
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
import { Alert, AlertDescription } from './ui/alert';
import { Building2, Search, CheckCircle, IndianRupee, Calendar, User, Info, Download, ArrowUpDown } from 'lucide-react';
import { LeadDetail } from './LeadDetail';
import { toast } from 'sonner';

export function ConvertedLeads() {
  const { user, users } = useAuth();
  const { getConvertedLeads } = useLeads();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'value'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  if (!user || user.role !== 'company_admin') {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Access denied. This page is only available to Company Admins.</p>
      </div>
    );
  }

  // Get converted leads for the company
  const convertedLeads = user.companyId ? getConvertedLeads(user.companyId) : [];

  // Filter by search
  const filteredLeads = convertedLeads.filter(lead =>
    lead.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.invoiceNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.convertedBy?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (lead.directors && lead.directors.some(d => 
      d.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.lastName.toLowerCase().includes(searchTerm.toLowerCase())
    ))
  );

  // Sort leads
  const sortedLeads = [...filteredLeads].sort((a, b) => {
    if (sortBy === 'date') {
      const dateA = a.convertedAt || '';
      const dateB = b.convertedAt || '';
      return sortOrder === 'asc' 
        ? dateA.localeCompare(dateB)
        : dateB.localeCompare(dateA);
    } else {
      const valueA = parseFloat(a.projectValue?.replace(/,/g, '') || '0');
      const valueB = parseFloat(b.projectValue?.replace(/,/g, '') || '0');
      return sortOrder === 'asc' 
        ? valueA - valueB
        : valueB - valueA;
    }
  });

  const getUserName = (userId: string | null | undefined) => {
    if (!userId) return 'Unknown';
    const foundUser = users.find(u => u.id === userId);
    return foundUser ? foundUser.name : 'Unknown';
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatCurrency = (value: string | undefined) => {
    if (!value) return '₹0';
    return `₹${value}`;
  };

  const calculateTotalValue = () => {
    return sortedLeads.reduce((sum, lead) => {
      const value = parseFloat(lead.projectValue?.replace(/,/g, '') || '0');
      return sum + value;
    }, 0);
  };

  const handleExport = () => {
    toast.success('Converted leads exported successfully!');
    // In real implementation, this would generate and download an Excel file
  };

  const toggleSort = (field: 'date' | 'value') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  if (selectedLead) {
    return (
      <div className="p-4 sm:p-6">
        <Button
          variant="outline"
          onClick={() => setSelectedLead(null)}
          className="mb-4 gap-2"
        >
          ← Back to Converted Leads
        </Button>
        <Card>
          <CardContent className="p-6">
            <LeadDetail 
              lead={selectedLead} 
              onClose={() => setSelectedLead(null)}
              onEdit={() => {
                toast.info('Converted leads cannot be edited');
              }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-600" />
            Converted Leads
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Successfully converted opportunities with financial details
          </p>
        </div>
        <Button onClick={handleExport} className="gap-2 w-full sm:w-auto">
          <Download className="h-4 w-4" />
          Export to Excel
        </Button>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Financial Data:</strong> This page contains sensitive financial information including invoice numbers and project values. 
          Only Company Admins have access to this data.
        </AlertDescription>
      </Alert>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Converted</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{convertedLeads.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Successful conversions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total Project Value</CardTitle>
            <IndianRupee className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{calculateTotalValue().toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all conversions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Average Deal Size</CardTitle>
            <IndianRupee className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{convertedLeads.length > 0 
                ? Math.round(calculateTotalValue() / convertedLeads.length).toLocaleString('en-IN')
                : '0'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Per conversion
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div>
              <CardTitle>Converted Leads ({sortedLeads.length})</CardTitle>
              <CardDescription>
                Detailed view of all successfully converted opportunities
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Select value={sortBy} onValueChange={(value: 'date' | 'value') => setSortBy(value)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Conversion Date</SelectItem>
                  <SelectItem value="value">Project Value</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-[250px]"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {sortedLeads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No converted leads yet</p>
              {searchTerm && (
                <p className="text-sm mt-2">Try adjusting your search</p>
              )}
              {!searchTerm && (
                <p className="text-sm mt-2">Converted leads will appear here when leads are marked as converted</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company Name</TableHead>
                    <TableHead className="hidden md:table-cell">Contact Person</TableHead>
                    <TableHead>Invoice No.</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => toggleSort('value')}>
                      <div className="flex items-center gap-1">
                        Project Value
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hidden lg:table-cell" onClick={() => toggleSort('date')}>
                      <div className="flex items-center gap-1">
                        Converted Date
                        <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead className="hidden sm:table-cell">Converted By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedLeads.map((lead) => (
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
                          <div>
                            <p className="text-sm">
                              {lead.directors[0].firstName} {lead.directors[0].lastName}
                            </p>
                            {lead.directors[0].mobile && (
                              <p className="text-xs text-muted-foreground">{lead.directors[0].mobile}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">No contact</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <p className="font-mono text-sm">{lead.invoiceNo || 'N/A'}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <IndianRupee className="h-3 w-3 text-muted-foreground" />
                          <span className="font-semibold text-green-600">
                            {formatCurrency(lead.projectValue)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{formatDate(lead.convertedAt)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{getUserName(lead.convertedBy)}</span>
                        </div>
                      </TableCell>
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
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
