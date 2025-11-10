import { useState } from 'react';
import { useAuth } from './AuthContext';
import { useCompanies, Company } from './CompanyContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Building2, Plus, Edit, Trash2, Users, AlertCircle, Phone, Mail, Search, Copy, CheckCircle, Ban, CheckCircle2, HelpCircle } from 'lucide-react';
import { hasPermission } from '../types/roles';
import { toast } from 'sonner';

export function CompanyManagement() {
  const { user, getUsersByCompany, users, addUser, updateUser } = useAuth();
  const { companies, addCompany, updateCompany, deleteCompany } = useCompanies();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    subscriptionPlan: 'basic' as 'basic' | 'professional' | 'enterprise',
    maxUsers: 20,
    isActive: true,
  });

  // Primary admin form state
  const [adminFormData, setAdminFormData] = useState({
    adminName: '',
    adminEmail: '',
    adminPassword: '',
  });

  // Success state for showing created company details
  const [createdCompany, setCreatedCompany] = useState<{
    companyId: string;
    name: string;
    adminEmail?: string;
  } | null>(null);

  // Block/Unblock company states
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [companyToBlock, setCompanyToBlock] = useState<Company | null>(null);
  const [blockReason, setBlockReason] = useState('');

  // Check if user can manage companies
  if (!user || !hasPermission(user.role, 'MANAGE_COMPANIES')) {
    return (
      <div className="p-4 sm:p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Access Denied: Only authorized users can manage companies.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      subscriptionPlan: 'basic',
      maxUsers: 20,
      isActive: true,
    });
    setAdminFormData({
      adminName: '',
      adminEmail: '',
      adminPassword: '',
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Company ID copied to clipboard!', {
        description: text,
        duration: 3000,
      });
    }).catch(() => {
      toast.error('Failed to copy to clipboard');
    });
  };

  const handleAdd = () => {
    if (!formData.name || !formData.email || !formData.phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Check if company name already exists
    if (companies.some(c => c.name.toLowerCase() === formData.name.toLowerCase())) {
      toast.error('A company with this name already exists');
      return;
    }

    // Validate admin details if provided
    const createAdmin = adminFormData.adminEmail || adminFormData.adminName;
    if (createAdmin) {
      if (!adminFormData.adminName || !adminFormData.adminEmail || !adminFormData.adminPassword) {
        toast.error('Please fill in all admin fields or leave them all empty');
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(adminFormData.adminEmail)) {
        toast.error('Please enter a valid admin email address');
        return;
      }

      // Check if admin email already exists
      if (users.some(u => u.email.toLowerCase() === adminFormData.adminEmail.toLowerCase())) {
        toast.error('This admin email is already in use');
        return;
      }
    }

    // Create the company
    const newCompany = addCompany(formData);

    // Create primary admin if details provided
    if (createAdmin) {
      addUser({
        name: adminFormData.adminName,
        email: adminFormData.adminEmail,
        role: 'company_admin',
        companyId: newCompany.id,
        password: adminFormData.adminPassword,
        isActive: true,
      });
    }

    // Show success message with company details
    setCreatedCompany({
      companyId: newCompany.companyId,
      name: newCompany.name,
      adminEmail: createAdmin ? adminFormData.adminEmail : undefined,
    });

    toast.success(`Company "${formData.name}" created successfully!`);
    setShowAddDialog(false);
    resetForm();
  };

  const handleEdit = (company: Company) => {
    setSelectedCompany(company);
    setFormData({
      name: company.name,
      email: company.email,
      phone: company.phone,
      address: company.address,
      subscriptionPlan: company.subscriptionPlan,
      maxUsers: company.maxUsers,
      isActive: company.isActive,
    });
    setShowEditDialog(true);
  };

  const handleUpdate = () => {
    if (!selectedCompany) return;

    if (!formData.name || !formData.email || !formData.phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    updateCompany(selectedCompany.id, formData);
    toast.success(`Company "${formData.name}" updated successfully!`);
    setShowEditDialog(false);
    setSelectedCompany(null);
    resetForm();
  };

  const handleDelete = (company: Company) => {
    const companyUsers = getUsersByCompany(company.id);
    const userCount = companyUsers.length;
    
    const confirmMessage = `⚠️ PERMANENT DELETION WARNING ⚠️\n\n` +
      `You are about to permanently delete "${company.name}".\n\n` +
      `This will:\n` +
      `• Delete the company record\n` +
      `• Deactivate ${userCount} user account(s)\n` +
      `• Block all users from logging in\n` +
      `• Remove all associated data\n\n` +
      `This action CANNOT be undone.\n\n` +
      `Type "DELETE" to confirm.`;
    
    const userInput = prompt(confirmMessage);
    
    if (userInput === 'DELETE') {
      // Deactivate all company users
      companyUsers.forEach(user => {
        updateUser(user.id, { isActive: false });
      });
      
      // Delete the company
      deleteCompany(company.id);
      
      toast.success(`Company "${company.name}" deleted successfully. ${userCount} user account(s) deactivated.`);
    } else if (userInput !== null) {
      toast.error('Deletion cancelled. You must type "DELETE" to confirm.');
    }
  };

  const handleBlockCompany = (company: Company) => {
    setCompanyToBlock(company);
    setBlockReason('');
    setShowBlockDialog(true);
  };

  const confirmBlockCompany = () => {
    if (!companyToBlock) return;

    if (!blockReason.trim()) {
      toast.error('Please provide a reason for disabling this company');
      return;
    }

    updateCompany(companyToBlock.id, {
      isActive: false,
      blockReason: blockReason.trim(),
    });

    toast.success(`Company "${companyToBlock.name}" has been disabled. All users are now blocked from logging in.`);
    setShowBlockDialog(false);
    setCompanyToBlock(null);
    setBlockReason('');
  };

  const handleUnblockCompany = (company: Company) => {
    if (confirm(`Are you sure you want to enable "${company.name}"? All users will be able to log in again.`)) {
      updateCompany(company.id, {
        isActive: true,
        blockReason: undefined,
      });
      toast.success(`Company "${company.name}" has been enabled. Users can now log in.`);
    }
  };

  const getPlanBadgeVariant = (plan: string) => {
    switch (plan) {
      case 'enterprise': return 'default';
      case 'professional': return 'secondary';
      case 'basic': return 'outline';
      default: return 'secondary';
    }
  };

  // Filter companies based on search and filters
  const filteredCompanies = companies.filter(company => {
    // Status filter
    if (statusFilter === 'active' && !company.isActive) return false;
    if (statusFilter === 'inactive' && company.isActive) return false;

    // Plan filter
    if (planFilter !== 'all' && company.subscriptionPlan !== planFilter) return false;

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesName = company.name.toLowerCase().includes(search);
      const matchesEmail = company.email.toLowerCase().includes(search);
      if (!matchesName && !matchesEmail) return false;
    }

    return true;
  });

  // Calculate stats from filtered companies
  const stats = {
    total: filteredCompanies.length,
    active: filteredCompanies.filter(c => c.isActive).length,
    inactive: filteredCompanies.filter(c => !c.isActive).length,
    enterprise: filteredCompanies.filter(c => c.subscriptionPlan === 'enterprise').length,
    professional: filteredCompanies.filter(c => c.subscriptionPlan === 'professional').length,
    basic: filteredCompanies.filter(c => c.subscriptionPlan === 'basic').length,
  };

  // Reset all filters
  const resetFilters = () => {
    setStatusFilter('all');
    setPlanFilter('all');
    setSearchTerm('');
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1>Company Management</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage all companies in the multi-tenant system
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Company
        </Button>
      </div>

      {/* Filter Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Plan</Label>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Plans" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Search</Label>
              <div className="relative">
                
                <Input
                  placeholder="Search by name or email"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">&nbsp;</Label>
              <Button
                variant="outline"
                onClick={resetFilters}
                className="w-full"
              >
                Reset Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Total</CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Companies
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Active</CardTitle>
            <Building2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{stats.active}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Running
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Inactive</CardTitle>
            <Building2 className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{stats.inactive}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Paused
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Enterprise</CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{stats.enterprise}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Premium
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Professional</CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{stats.professional}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Mid-tier
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Basic</CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{stats.basic}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Starter
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Companies Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Companies</CardTitle>
          <CardDescription>
            {filteredCompanies.length} compan{filteredCompanies.length !== 1 ? 'ies' : 'y'} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead className="hidden sm:table-cell">Company ID</TableHead>
                      <TableHead className="hidden md:table-cell">Contact</TableHead>
                      <TableHead className="hidden lg:table-cell">Plan</TableHead>
                      <TableHead className="hidden lg:table-cell">Users</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCompanies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No companies match the selected filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCompanies.map((company) => {
                  const companyUsers = getUsersByCompany(company.id);
                  return (
                    <TableRow key={company.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div>
                            <p className="font-medium">{company.name}</p>
                            <div className="flex items-center gap-1 sm:hidden">
                              <span className="text-xs text-muted-foreground">{company.companyId}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(company.companyId);
                                }}
                                className="p-0.5 hover:bg-muted rounded transition-colors"
                                aria-label="Copy Company ID"
                              >
                                <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center gap-2">
                          <div className="relative group">
                            <div className="flex items-center gap-1">
                              <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                                {company.companyId}
                              </code>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(company.companyId);
                                }}
                                className="p-1 hover:bg-muted rounded transition-colors"
                                aria-label="Copy Company ID"
                              >
                                <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                              </button>
                            </div>
                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-64 p-2 text-xs bg-popover text-popover-foreground rounded-md shadow-lg border z-10">
                              <p className="font-medium">Company ID</p>
                              <p className="text-muted-foreground mt-1">Use this ID when contacting support or for system integrations.</p>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3" />
                            <span className="text-muted-foreground">{company.email}</span>
                          </div>
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="h-3 w-3" />
                            <span className="text-muted-foreground">{company.phone}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge variant={getPlanBadgeVariant(company.subscriptionPlan)}>
                          {company.subscriptionPlan}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-muted-foreground" />
                          <span>{companyUsers.length} / {company.maxUsers}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge variant={company.isActive ? 'default' : 'secondary'}>
                            {company.isActive ? 'Active' : 'Disabled'}
                          </Badge>
                          {!company.isActive && company.blockReason && (
                            <p className="text-xs text-muted-foreground max-w-[200px] truncate" title={company.blockReason}>
                              {company.blockReason}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {company.isActive ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleBlockCompany(company)}
                              title="Disable Company"
                            >
                              <Ban className="h-4 w-4 text-orange-600" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUnblockCompany(company)}
                              title="Enable Company"
                            >
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(company)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(company)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Company Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Company</DialogTitle>
            <DialogDescription>
              Register a new company in the multi-tenant system
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="ABC Motors Pvt Ltd"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="info@company.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98765 43210"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Sector 18, Noida, UP"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan">Subscription Plan</Label>
              <Select
                value={formData.subscriptionPlan}
                onValueChange={(value: any) => {
                  const maxUsers = value === 'enterprise' ? 100 : value === 'professional' ? 50 : 20;
                  setFormData({ ...formData, subscriptionPlan: value, maxUsers });
                }}
              >
                <SelectTrigger id="plan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic (20 users)</SelectItem>
                  <SelectItem value="professional">Professional (50 users)</SelectItem>
                  <SelectItem value="enterprise">Enterprise (100 users)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="maxUsers">Max Users</Label>
              <Input
                id="maxUsers"
                type="number"
                value={formData.maxUsers}
                onChange={(e) => setFormData({ ...formData, maxUsers: parseInt(e.target.value) })}
              />
            </div>

            {/* Divider */}
            <div className="border-t pt-4 mt-4">
              <h3 className="font-medium mb-4">Primary Admin (Optional)</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="adminName">Admin Name</Label>
                  <Input
                    id="adminName"
                    value={adminFormData.adminName}
                    onChange={(e) => setAdminFormData({ ...adminFormData, adminName: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminEmail">Admin Email</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    value={adminFormData.adminEmail}
                    onChange={(e) => setAdminFormData({ ...adminFormData, adminEmail: e.target.value })}
                    placeholder="admin@company.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="adminPassword">Admin Password</Label>
                  <Input
                    id="adminPassword"
                    type="password"
                    value={adminFormData.adminPassword}
                    onChange={(e) => setAdminFormData({ ...adminFormData, adminPassword: e.target.value })}
                    placeholder="Enter password"
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  Leave empty to skip admin creation. If you fill any field, all admin fields are required.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                resetForm();
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button onClick={handleAdd} className="w-full sm:w-auto">
              Add Company
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block Company Dialog */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-orange-600" />
              Disable Company
            </DialogTitle>
            <DialogDescription>
              This will block all users from this company from logging in
            </DialogDescription>
          </DialogHeader>

          {companyToBlock && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Disabling <strong>{companyToBlock.name}</strong> will prevent all company users (Company Admin, Team Leaders, and Sales Users) from accessing the system.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="blockReason">Reason for Disabling *</Label>
                <Input
                  id="blockReason"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="e.g., Payment overdue, Contract expired, etc."
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  This reason will be shown to users when they attempt to log in.
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowBlockDialog(false);
                setCompanyToBlock(null);
                setBlockReason('');
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              onClick={confirmBlockCompany} 
              variant="destructive"
              className="w-full sm:w-auto"
            >
              Disable Company
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Confirmation Dialog */}
      <Dialog open={!!createdCompany} onOpenChange={() => setCreatedCompany(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Company Created Successfully!
            </DialogTitle>
            <DialogDescription>
              Your company has been registered in the system
            </DialogDescription>
          </DialogHeader>
          
          {createdCompany && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Company Name</Label>
                  <p className="font-medium">{createdCompany.name}</p>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">Company ID</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 bg-background px-3 py-2 rounded border font-mono text-sm">
                      {createdCompany.companyId}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(createdCompany.companyId)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {createdCompany.adminEmail && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Primary Admin</Label>
                    <p className="font-medium">{createdCompany.adminEmail}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Admin account created successfully. They can now log in with their credentials.
                    </p>
                  </div>
                )}
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Please save the Company ID for your records. You'll need it for configuration and reporting.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setCreatedCompany(null)} className="w-full sm:w-auto">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Company Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
            <DialogDescription>
              Update company information
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Company Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">Email *</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone *</Label>
              <Input
                id="edit-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-plan">Subscription Plan</Label>
              <Select
                value={formData.subscriptionPlan}
                onValueChange={(value: any) => {
                  const maxUsers = value === 'enterprise' ? 100 : value === 'professional' ? 50 : 20;
                  setFormData({ ...formData, subscriptionPlan: value, maxUsers });
                }}
              >
                <SelectTrigger id="edit-plan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic (20 users)</SelectItem>
                  <SelectItem value="professional">Professional (50 users)</SelectItem>
                  <SelectItem value="enterprise">Enterprise (100 users)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-maxUsers">Max Users</Label>
              <Input
                id="edit-maxUsers"
                type="number"
                value={formData.maxUsers}
                onChange={(e) => setFormData({ ...formData, maxUsers: parseInt(e.target.value) })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="edit-isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="edit-isActive">Active</Label>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false);
                setSelectedCompany(null);
                resetForm();
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button onClick={handleUpdate} className="w-full sm:w-auto">
              Update Company
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
