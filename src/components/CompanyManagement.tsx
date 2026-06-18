import { useState } from 'react';
import { PageHeader } from './layout/PageHeader';
import CompanyFilter from './CompanyFilter';
import { useLeads } from './LeadsContext';
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
import { AlertCircle, Plus, Users, CheckCircle, BarChart3, Building2, Copy, Mail, Phone, Edit, Trash2, Ban } from 'lucide-react';
import { hasPermission } from '../types/roles';
import { toast } from 'sonner';
import { BentoStatCard } from './dashboard/BentoStatCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
export function CompanyManagement() {
  const { user, getUsersByCompany, users, addUser, isLoading } = useAuth();
  const { companies, addCompany, updateCompany, deleteCompany, planPricing } = useCompanies();
  const { getGlobalAggregates } = useLeads();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('all');
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    subscriptionPlan: 'basic' as 'basic' | 'professional' | 'enterprise' | 'custom',
    maxUsers: planPricing.maxUsers.basic,
    monthlyPrice: planPricing.prices.basic,
    isActive: true,
  });

  const handleSubscriptionPlanChange = (value: string) => {
    const plan = value as 'basic' | 'professional' | 'enterprise' | 'custom';
    
    const planConfig = {
      basic: { 
        maxUsers: planPricing.maxUsers.basic, 
        monthlyPrice: planPricing.prices.basic 
      },
      professional: { 
        maxUsers: planPricing.maxUsers.professional, 
        monthlyPrice: planPricing.prices.professional 
      },
      enterprise: { 
        maxUsers: planPricing.maxUsers.enterprise, 
        monthlyPrice: planPricing.prices.enterprise 
      },
      custom: { 
        maxUsers: formData.maxUsers, 
        monthlyPrice: formData.monthlyPrice || 0 
      }
    }[plan];
    
    setFormData(prev => ({
      ...prev,
      subscriptionPlan: plan,
      maxUsers: planConfig.maxUsers,
      monthlyPrice: planConfig.monthlyPrice
    }));
  };

  const isPlatformOrSuperAdmin = user?.role === 'super_admin' || user?.role === 'platform_admin';

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

  // Loading guard - check this BEFORE permission check
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
            <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Loading company management...</p>
        </div>
      </div>
    );
  }

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
      maxUsers: planPricing.maxUsers.basic,
      monthlyPrice: planPricing.prices.basic,
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

  const handleAdd = async () => {
    if (isSubmitting) return;

    const trimmedName = formData.name.trim();
    const trimmedEmail = formData.email.trim();
    const trimmedPhone = formData.phone.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPhone) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate custom plan
    if (formData.subscriptionPlan === 'custom' && (!formData.maxUsers || formData.maxUsers <= 0)) {
      toast.error('Please enter a valid number of users for the custom plan');
      return;
    }

    // Check if company name already exists (client-side check; backend also validates)
    if (companies.some(c => c.name.trim().toLowerCase() === trimmedName.toLowerCase())) {
      toast.error('A company with this name already exists');
      return;
    }

    try {
      setIsSubmitting(true);

      // Prepare company data
      const companyData = {
        ...formData,
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        isActive: true,
        ...(formData.subscriptionPlan === 'custom' && formData.monthlyPrice != null
          ? { monthlyPrice: formData.monthlyPrice }
          : {})
      };

      // If user is not allowed to change plan, force defaults
      if (!isPlatformOrSuperAdmin) {
        companyData.subscriptionPlan = 'basic';
        companyData.maxUsers = planPricing.maxUsers.basic;
        companyData.monthlyPrice = planPricing.prices.basic;
      }

      // Add the company
      const newCompany = await addCompany(companyData);

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

      // Create primary admin if details provided
      if (createAdmin) {
        await addUser({
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
    } catch (error) {
      console.error(error);
      if (error instanceof Error) {
        if (error.message === 'COMPANY_NAME_ALREADY_EXISTS') {
          toast.error('A company with this name already exists');
        } else if (error.message === 'COMPANY_EMAIL_ALREADY_EXISTS') {
          toast.error('A company with this email already exists. Please use a different email.');
        } else if (error.message === 'COMPANY_NAME_REQUIRED') {
          toast.error('Company name is required');
        } else {
          toast.error('Failed to create company');
        }
      } else {
        toast.error('Failed to create company');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (company: Company) => {
    setSelectedCompany(company);
    setFormData({
      name: company.name,
      email: company.email,
      phone: company.phone,
      address: company.address || '',
      subscriptionPlan: company.subscriptionPlan,
      maxUsers: company.maxUsers,
      monthlyPrice: company.monthlyPrice || 0,
      isActive: company.isActive,
    });
    setShowEditDialog(true);
  };

  const handleUpdate = async () => {
    if (!selectedCompany) return;

    // Validate custom plan
    if (formData.subscriptionPlan === 'custom' && (!formData.maxUsers || formData.maxUsers <= 0)) {
      toast.error('Please enter a valid number of users for the custom plan');
      return;
    }

    // Prepare update data
    const updateData: any = { ...formData };
    // Only include monthlyPrice for custom plans
    if (formData.subscriptionPlan !== 'custom') {
      delete updateData.monthlyPrice;
    }

    // Prevent non-super/platform admins from changing subscriptionPlan/maxUsers/monthlyPrice
    if (!isPlatformOrSuperAdmin) {
      delete updateData.subscriptionPlan;
      delete updateData.maxUsers;
      delete updateData.monthlyPrice;
    }

    try {
      const isActiveChanged = typeof updateData.isActive === 'boolean' && updateData.isActive !== selectedCompany.isActive;
      if (isActiveChanged && updateData.isActive === false && !updateData.blockReason) {
        updateData.blockReason = 'Marked inactive by admin';
      }
      if (isActiveChanged && updateData.isActive === true) {
        delete updateData.blockReason;
      }

      Object.keys(updateData).forEach((k) => {
        // @ts-ignore
        if (updateData[k] === undefined) delete updateData[k];
      });

      await updateCompany(selectedCompany.id, updateData);

      toast.success('Company updated successfully');
      setShowEditDialog(false);
      setSelectedCompany(null);
      resetForm();
    } catch (err: any) {
      console.error('Failed to update company', err);
      const msg = err?.message || String(err) || 'Unknown error';
      toast.error(`Failed to update company: ${msg}`);
    }
  };

  const { deleteUsersByCompanyId } = useAuth();
  
  const handleDeleteCompany = async (company: Company) => {
    setCompanyToDelete(company);
    setDeleteConfirmText('');
  };

  const confirmBlockCompany = async () => {
    if (!companyToBlock) return;

    // Allow empty reason but provide a default note
    const reason = blockReason.trim() || 'Marked inactive by admin';

    try {
      await updateCompany(companyToBlock.id, {
        isActive: false,
        blockReason: reason,
      });

      toast.success(`Company "${companyToBlock.name}" has been marked inactive. All users are now blocked from logging in.`);
      setShowBlockDialog(false);
      setCompanyToBlock(null);
      setBlockReason('');
    } catch (err: any) {
      console.error('Failed to mark company inactive', err);
      const msg = err?.message || String(err) || 'Unknown error';
      toast.error(`Failed to mark company inactive: ${msg}`);
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

  const deleteDialogUserCount = companyToDelete ? getUsersByCompany(companyToDelete.id).length : 0;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <PageHeader
        title="Company Management"
        description="Manage all companies in the multi-tenant system"
        actions={
          <Button onClick={() => setShowAddDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Company
          </Button>
        }
      />

      {/* Filter Section (compact row) */}
      <div className="card-bento p-4 sm:p-5">
          <div className="flex items-center gap-3 flex-wrap md:flex-nowrap">
            <CompanyFilter value={selectedCompanyId} onChange={setSelectedCompanyId} hideIfCompanyAdmin={true} />

            <div className="w-[220px]">
              
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

            <div className="w-[220px]">
              
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

            <div className="flex-1 min-w-[200px]">
              
              <Input
                placeholder="Search by name or email"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 w-full"
              />
            </div>

            <div className="ml-auto">
              <Label className="text-sm font-medium">&nbsp;</Label>
              <Button variant="outline" onClick={resetFilters}>Reset Filters</Button>
            </div>
          </div>
      </div>

      {/* Stats Cards (company + lead aggregates) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Lead aggregates (global or per selected company) */}
        {(() => {
          const agg = getGlobalAggregates(selectedCompanyId === 'all' ? undefined : selectedCompanyId);
          const inactiveUsersCount = selectedCompanyId === 'all'
            ? users.filter(u => !u.isActive).length
            : getUsersByCompany(selectedCompanyId).filter(u => !u.isActive).length;
          return (
            <>
              <BentoStatCard
                label="Total Leads"
                value={agg.totalLeads}
                subtitle="Leads in scope"
                icon={<Users className="h-4 w-4" />}
                index={0}
              />
              <BentoStatCard
                label="Converted Leads"
                value={agg.convertedLeads}
                subtitle="Successfully closed"
                icon={<CheckCircle className="h-4 w-4" />}
                index={1}
              />
              <BentoStatCard
                label="Conversion Rate"
                value={`${agg.conversionRate}%`}
                subtitle="Converted / (Converted + Lost)"
                icon={<BarChart3 className="h-4 w-4" />}
                index={2}
              />
              <BentoStatCard
                label="Active Users"
                value={agg.activeUsers}
                subtitle="Users active in scope"
                icon={<Users className="h-4 w-4" />}
                index={3}
              />
              <BentoStatCard
                label="Inactive Users"
                value={inactiveUsersCount}
                subtitle="Users inactive in scope"
                icon={<Users className="h-4 w-4" />}
                index={4}
              />
            </>
          );
        })()}

        {/* Existing company count cards */}
        <BentoStatCard
          label="Total Companies"
          value={stats.total}
          subtitle="Companies"
          icon={<Building2 className="h-4 w-4" />}
          index={5}
        />
        <BentoStatCard
          label="Active Companies"
          value={stats.active}
          subtitle="Running"
          icon={<Building2 className="h-4 w-4" />}
          index={6}
        />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Inactive</CardTitle>
            <Building2 className="h-4 w-4 text-icon-muted" />
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
                            {company.isActive ? 'Active' : 'Inactive'}
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
                            onClick={() => handleDeleteCompany(company)}
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
                onValueChange={handleSubscriptionPlanChange}
                disabled={!isPlatformOrSuperAdmin}
              >
                <SelectTrigger id="plan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">
                    <div className="flex justify-between w-full">
                      <span>Basic</span>
                      <span className="text-muted-foreground">₹{planPricing.prices.basic}/mo</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Up to {planPricing.maxUsers.basic} users</p>
                  </SelectItem>
                  <SelectItem value="professional">
                    <div className="flex justify-between w-full">
                      <span>Professional</span>
                      <span className="text-muted-foreground">₹{planPricing.prices.professional}/mo</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Up to {planPricing.maxUsers.professional} users</p>
                  </SelectItem>
                  <SelectItem value="enterprise">
                    <div className="flex justify-between w-full">
                      <span>Enterprise</span>
                      <span className="text-muted-foreground">₹{planPricing.prices.enterprise}/mo</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Up to {planPricing.maxUsers.enterprise} users</p>
                  </SelectItem>
                  <SelectItem value="custom">
                    <div className="flex justify-between w-full">
                      <span>Custom</span>
                      <span className="text-muted-foreground">Custom pricing</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Custom number of users</p>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.subscriptionPlan === 'custom' ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="maxUsers">Max Users *</Label>
                  <Input
                    id="maxUsers"
                    type="number"
                    min="1"
                    value={formData.maxUsers || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      maxUsers: parseInt(e.target.value) || 0
                    }))}
                    disabled={!isPlatformOrSuperAdmin}
                    placeholder="Enter number of users"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthlyPrice">Monthly Price (₹)</Label>
                  <div className="relative">
                    <Input
                      id="monthlyPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.monthlyPrice || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        monthlyPrice: parseFloat(e.target.value) || 0
                      }))}
                      disabled={!isPlatformOrSuperAdmin}
                      className="pl-8"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Plan Details</Label>
                  <span className="text-sm font-medium">
                    {formData.subscriptionPlan === 'basic' ? `₹${planPricing.prices.basic}/month` : 
                     formData.subscriptionPlan === 'professional' ? `₹${planPricing.prices.professional}/month` :
                     formData.subscriptionPlan === 'enterprise' ? `₹${planPricing.prices.enterprise}/month` :
                     formData.monthlyPrice ? `₹${formData.monthlyPrice}/month` : 'Custom pricing'}
                  </span>
                </div>
                <div className="bg-muted/50 p-4 rounded-md space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">{formData.maxUsers} users</span> included
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formData.subscriptionPlan === 'enterprise' 
                      ? 'Contact us for additional users or custom requirements.'
                      : 'Additional users can be added for ₹500/user/month.'}
                  </p>
                </div>
              </div>
            )}

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
            <Button onClick={handleAdd} disabled={isSubmitting} className="w-full sm:w-auto">
              Add Company
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Company Dialog */}
      <Dialog
        open={!!companyToDelete}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setCompanyToDelete(null);
            setDeleteConfirmText('');
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Company
            </DialogTitle>
            <DialogDescription>
              This will permanently delete the company
              {companyToDelete ? ` "${companyToDelete.name}"` : ''} and all its users
              ({deleteDialogUserCount} account{deleteDialogUserCount === 1 ? '' : 's'}). This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm">
              Type <span className="font-semibold">DELETE</span> to confirm.
            </p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
            />
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setCompanyToDelete(null);
                setDeleteConfirmText('');
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmText !== 'DELETE' || !companyToDelete}
              onClick={async () => {
                if (!companyToDelete || deleteConfirmText !== 'DELETE') return;
                try {
                  await deleteUsersByCompanyId(companyToDelete.id);
                  await deleteCompany(companyToDelete.id);
                  toast.success(
                    `Company "${companyToDelete.name}" and ${deleteDialogUserCount} user account(s) deleted successfully.`
                  );
                } catch (error) {
                  console.error('Error deleting company:', error);
                } finally {
                  setCompanyToDelete(null);
                  setDeleteConfirmText('');
                }
              }}
              className="w-full sm:w-auto"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block Company Dialog */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-icon-warning" />
              Mark Company Inactive
            </DialogTitle>
            <DialogDescription>
              This will mark the company as inactive and prevent its users from logging in
            </DialogDescription>
          </DialogHeader>

          {companyToBlock && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Marking <strong>{companyToBlock.name}</strong> as inactive will prevent all company users (Company Admin, Team Leaders, and Sales Users) from accessing the system.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="blockReason">Reason for Inactivation (optional)</Label>
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
              Mark Inactive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Confirmation Dialog */}
      <Dialog open={!!createdCompany} onOpenChange={() => setCreatedCompany(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-icon-success" />
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
                onValueChange={handleSubscriptionPlanChange}
                disabled={!isPlatformOrSuperAdmin}
              >
                <SelectTrigger id="edit-plan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">
                    <div className="flex justify-between w-full">
                      <span>Basic</span>
                      <span className="text-muted-foreground">₹{planPricing.prices.basic}/mo</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Up to {planPricing.maxUsers.basic} users</p>
                  </SelectItem>
                  <SelectItem value="professional">
                    <div className="flex justify-between w-full">
                      <span>Professional</span>
                      <span className="text-muted-foreground">₹{planPricing.prices.professional}/mo</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Up to {planPricing.maxUsers.professional} users</p>
                  </SelectItem>
                  <SelectItem value="enterprise">
                    <div className="flex justify-between w-full">
                      <span>Enterprise</span>
                      <span className="text-muted-foreground">₹{planPricing.prices.enterprise}/mo</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Up to {planPricing.maxUsers.enterprise} users</p>
                  </SelectItem>
                  <SelectItem value="custom">
                    <div className="flex justify-between w-full">
                      <span>Custom</span>
                      <span className="text-muted-foreground">Custom pricing</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Custom number of users</p>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.subscriptionPlan === 'custom' ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-maxUsers">Max Users *</Label>
                  <Input
                    id="edit-maxUsers"
                    type="number"
                    min="1"
                    value={formData.maxUsers || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      maxUsers: parseInt(e.target.value) || 0
                    }))}
                    disabled={!isPlatformOrSuperAdmin}
                    placeholder="Enter number of users"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-monthlyPrice">Monthly Price (₹)</Label>
                  <div className="relative">
                    <Input
                      id="edit-monthlyPrice"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.monthlyPrice || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        monthlyPrice: parseFloat(e.target.value) || 0
                      }))}
                      disabled={!isPlatformOrSuperAdmin}
                      className="pl-8"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Plan Details</Label>
                  <span className="text-sm font-medium">
                    {formData.subscriptionPlan === 'basic' ? `₹${planPricing.prices.basic}/month` : 
                     formData.subscriptionPlan === 'professional' ? `₹${planPricing.prices.professional}/month` :
                     formData.subscriptionPlan === 'enterprise' ? `₹${planPricing.prices.enterprise}/month` :
                     formData.monthlyPrice ? `₹${formData.monthlyPrice}/month` : 'Custom pricing'}
                  </span>
                </div>
                <div className="bg-muted/50 p-4 rounded-md space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">{formData.maxUsers} users</span> included
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formData.subscriptionPlan === 'enterprise' 
                      ? 'Contact us for additional users or custom requirements.'
                      : 'Additional users can be added for ₹500/user/month.'}
                  </p>
                </div>
              </div>
            )}

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
