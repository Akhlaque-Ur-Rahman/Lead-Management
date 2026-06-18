import { useState, useMemo } from 'react';
import { useAuth, type User } from './AuthContext';
import { useCompanies } from './CompanyContext';
import { type RoleKey, getRoleLabel, getRoleBadgeVariant, hasPermission, getAssignableRoles } from '../types/roles';
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
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Separator } from './ui/separator';
import { cn } from './ui/utils';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  AlertCircle, 
  Mail, 
  Shield, 
  X, 
  Building2,
  CheckCircle2,
  User as UserIcon,
  ChevronDown,
  SlidersHorizontal
} from 'lucide-react';
import { toast } from 'sonner';
import FilterBadge from './ui/filter-badge';
import { PaginationControls } from './ui/pagination-controls';
import { EmptyState } from './layout/EmptyState';
import { PageHeader } from './layout/PageHeader';
import { BentoStatCard } from './dashboard/BentoStatCard';
import { usePagination } from '../hooks/usePagination';

// Helper function to normalize company IDs for comparison
const normalizeCompanyId = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim().toLowerCase();
};

export function UserManagement() {
  const { user, users, addUser, updateUser, deleteUser, isLoading } = useAuth();
  const { companies, planPricing } = useCompanies();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  
  // Filter states
  const [filters, setFilters] = useState({
    company: 'all',
    role: 'all',
    status: 'all',
    search: '',
  });

  // Reset all filters
  const resetFilters = () => {
    setFilters({
      company: 'all',
      role: 'all',
      status: 'all',
      search: '',
    });
  };

  // Check if any filter is active
  const isFilterActive = 
    filters.company !== 'all' || 
    filters.role !== 'all' || 
    filters.status !== 'all' || 
    filters.search !== '';
    
  // Count active filters for the badge
  const filtersAppliedCount = [
    filters.company !== 'all',
    filters.role !== 'all',
    filters.status !== 'all',
    filters.search !== ''
  ].filter(Boolean).length;
  
  const [formData, setFormData] = useState<{
    id?: string;
    name: string;
    email: string;
    role: RoleKey;
    companyId: string;
    password: string;
    isActive: boolean;
  }>({
    name: '',
    email: '',
    role: 'sales_user',
    companyId: user?.companyId || '',
    password: '',
    isActive: true,
  });

  const canManageUsers = user ? hasPermission(user.role, 'MANAGE_USERS') : false;

  // Get base users based on role
  const baseUsers = useMemo(() => {
    if (!user || !users) return [];
    
    if (user.role === 'super_admin') {
      return [...users]; // Super admin sees all users
    } else if (user.role === 'platform_admin') {
      return users.filter(u => u.role !== 'super_admin'); // Platform admin sees all except super_admin
    } else {
      return users.filter(u => u.companyId === user.companyId); // Company users see only their company
    }
  }, [users, user.role, user.companyId]);

  // Create company name lookup
  const companyNameLookup = useMemo(() => {
    const map = new Map<string, string>();
    const seen = new Set<string>();

    companies.forEach(company => {
      const normalizedId = normalizeCompanyId(company.id);
      if (!normalizedId || seen.has(normalizedId)) {
        return;
      }
      seen.add(normalizedId);
      map.set(normalizedId, company.name);
    });

    return map;
  }, [companies]);

  // Apply filters
  const filteredUsers = useMemo(() => {
    if (!baseUsers.length) return [];

    const normalizedSearch = filters.search.trim().toLowerCase();
    
    return baseUsers.filter(u => {
      // Filter by company
      if (filters.company !== 'all') {
        if (filters.company === 'platform') {
          // Show platform users (super_admin and platform_admin with companyId = null)
          if (u.role !== 'super_admin' && u.role !== 'platform_admin') return false;
          if (u.companyId !== null) return false;
        } else if (u.companyId !== filters.company) {
          return false;
        }
      }
      
      // Filter by role
      if (filters.role !== 'all' && u.role !== filters.role) return false;
      
      // Filter by status
      if (filters.status === 'active' && !u.isActive) return false;
      if (filters.status === 'inactive' && u.isActive) return false;
      
      // Filter by search term (name or email)
      if (normalizedSearch) {
        const normalizedName = String(u.name || '').toLowerCase();
        const normalizedEmail = String(u.email || '').toLowerCase();
        
        if (!normalizedName.includes(normalizedSearch) && 
            !normalizedEmail.includes(normalizedSearch)) {
          return false;
        }
      }
      
      return true;
    });
  }, [baseUsers, filters]);

  // Calculate statistics
  const stats = useMemo(() => ({
    totalUsers: filteredUsers.length,
    activeUsers: filteredUsers.filter(u => u.isActive).length,
    inactiveUsers: filteredUsers.filter(u => !u.isActive).length,
    adminsCount: filteredUsers.filter(u => ['company_admin', 'platform_admin'].includes(u.role)).length,
    teamLeads: filteredUsers.filter(u => u.role === 'team_lead').length,
    salesUsers: filteredUsers.filter(u => u.role === 'sales_user').length,
  }), [filteredUsers]);

  // Get company name for a user
  const getCompanyName = (companyId: string | null): string => {
    if (!companyId) return 'Platform';
    const normalizedId = normalizeCompanyId(companyId);
    return companyNameLookup.get(normalizedId) || companyId;
  };

  // Alias for display
  const displayUsers = filteredUsers || [];

  const {
    paginatedItems: paginatedUsers,
    currentPage,
    pageSize,
    totalCount,
    totalPages,
    setPage,
    setPageSize,
    resetPage,
  } = usePagination(displayUsers);

  // Get available companies for user creation
  const availableCompanies = useMemo(() => {
    if (!user) return [];
    return user?.role === 'super_admin' 
      ? companies 
      : companies.filter(c => c.id === user?.companyId);
  }, [user, companies]);

  const resetForm = () => {
    if (!user) return;
    
    setFormData({
      name: '',
      email: '',
      role: 'sales_user',
      companyId: user?.role === 'super_admin' ? '' : user?.companyId || '',
      password: '',
      isActive: true,
    });
  };

  const handleAdd = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (user?.role !== 'super_admin' && formData.role === 'super_admin') {
      toast.error('Only Super Admin can create Super Admin users');
      return;
    }

    if (formData.role !== 'super_admin' && !formData.companyId) {
      toast.error('Please select a company');
      return;
    }

    // Check if email already exists
    if (users.some(u => u.email === formData.email)) {
      toast.error('Email already exists');
      return;
    }

    // Check user limit for the company's plan
    if (formData.companyId) {
      const company = companies.find(c => c.id === formData.companyId);
      if (company) {
        const companyUsers = users.filter(u => u.companyId === company.id);
        const maxUsers = company.subscriptionPlan === 'basic' ? planPricing.maxUsers.basic :
                        company.subscriptionPlan === 'professional' ? planPricing.maxUsers.professional :
                        company.subscriptionPlan === 'enterprise' ? planPricing.maxUsers.enterprise :
                        company.maxUsers;
        
        if (companyUsers.length >= maxUsers) {
          toast.error(`This company's plan only allows up to ${maxUsers} users. Please upgrade the plan to add more users.`);
          return;
        }
      }
    }

    const userData = {
      name: formData.name,
      email: formData.email,
      role: formData.role,
      companyId: formData.role === 'super_admin' ? null : formData.companyId,
      password: formData.password,
      isActive: formData.isActive,
    };

    try {
      await addUser(userData);
      setShowAddDialog(false);
      resetForm();
    } catch (err) {
      // addUser handles toasts for errors/success; keep UI state if needed
    }
  };

  const handleEdit = (userToEdit: User) => {
    if (!user) return;
    
    setSelectedUser(userToEdit);
    setFormData({
      id: userToEdit.id,
      name: userToEdit.name,
      email: userToEdit.email,
      role: userToEdit.role,
      companyId: userToEdit.companyId || '',
      password: '',
      isActive: userToEdit.isActive,
    });
    setShowEditDialog(true);
  };

  const handleUpdate = async () => {
    if (!selectedUser || !user) return;
    
    // Check if the current user is trying to edit a super admin
    if (selectedUser.role === 'super_admin' && user?.role !== 'super_admin') {
      toast.error('You do not have permission to edit this user.');
      return;
    }
    
    // Check if a platform admin is trying to edit a super admin
    if (user?.role === 'platform_admin' && selectedUser.role === 'super_admin') {
      toast.error('You do not have permission to edit super admin users.');
      return;
    }

    if (!formData.name || !formData.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    const updates: Partial<User> & { password?: string } = {
      name: formData.name,
      email: formData.email,
      role: formData.role,
      companyId: formData.role === 'super_admin' ? null : formData.companyId,
      isActive: formData.isActive,
    };

    if (formData.password && formData.password.trim()) {
      updates.password = formData.password;
    }

    try {
      await updateUser(selectedUser.id, updates);
      setShowEditDialog(false);
      setSelectedUser(null);
      resetForm();
    } catch (err) {
      // updateUser will show toasts; keep UI state if needed
    }
  };

  const handleDelete = (userToDelete: User) => {
    if (!user) return;
    if (userToDelete.id === user.id) {
      toast.error('You cannot delete your own account');
      return;
    }

    // Platform admin cannot delete super admin
    if (user?.role === 'platform_admin' && userToDelete.role === 'super_admin') {
      toast.error('Platform Admin cannot delete Super Admin users');
      return;
    }

    setUserToDelete(userToDelete);
    setDeleteConfirmText('');
  };

  // Using utility functions from roles.ts for role labels and badge variants

  
  // Get unique companies for filter dropdown
  const companyOptions = useMemo(() => {
    if (!user) return [{ value: 'all', label: 'All Companies' }];
    return [
    { value: 'all', label: 'All Companies' },
    ...(user.role === 'super_admin' 
      ? [
          { value: 'platform', label: 'Platform Users' },
          ...companies.map(c => ({
            value: c.id,
            label: c.name
          }))
        ]
      : user.role === 'platform_admin'
      ? [
          { value: 'platform', label: 'Platform Users' },
          ...companies.map(c => ({
            value: c.id,
            label: c.name
          }))
        ]
      : companies
          .filter(c => c.id === user.companyId)
          .map(c => ({
            value: c.id,
            label: c.name
          }))
    )
  ];
  }, [companies, user]);
  
  // Role options for filter
  const roleOptions = useMemo(() => [
    { value: 'all', label: 'All Roles' },
    ...(user?.role === 'super_admin' ? [{ value: 'super_admin', label: 'Super Admin' }] : []),
    { value: 'platform_admin', label: 'Platform Admin' },
    { value: 'company_admin', label: 'Company Admin' },
    { value: 'team_lead', label: 'Team Lead' },
    { value: 'sales_user', label: 'Sales User' },
  ], [user?.role]);

  const assignableRoleOptions = useMemo(() => {
    if (!user) return [];
    return getAssignableRoles(user.role);
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" role="status" />
          <p className="mt-2 text-sm text-muted-foreground">Loading user management...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (!canManageUsers) {
    return (
      <div className="p-4 sm:p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Access Denied: You don't have permission to manage users.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <PageHeader
        title="User Management"
        description={
          user.role === 'super_admin'
            ? 'Manage users across all companies'
            : 'Manage users in your company'
        }
        actions={
          <Button onClick={() => setShowAddDialog(true)} size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            <span>Add User</span>
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <BentoStatCard
          label="Total Users"
          value={filteredUsers.filter(u => u.role !== 'super_admin').length}
          subtitle={user.role === 'super_admin' ? 'Across all companies' : 'In your company'}
          icon={<Users className="h-4 w-4" />}
        />
        <BentoStatCard
          label="Active Users"
          value={stats.activeUsers}
          subtitle={`${stats.inactiveUsers} inactive`}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <BentoStatCard
          label="Admins"
          value={stats.adminsCount}
          subtitle="Platform & Company Admins"
          icon={<Shield className="h-4 w-4" />}
        />
        <BentoStatCard
          label="Team Members"
          value={stats.teamLeads + stats.salesUsers}
          subtitle={`${stats.teamLeads} team leads, ${stats.salesUsers} sales users`}
          icon={<UserIcon className="h-4 w-4" />}
        />
      </div>

      {/* User Table */}
      <div className="card-bento overflow-hidden">
        <div className="p-4 pb-2">
          <p className="text-sm text-muted-foreground">
            {stats.totalUsers} user{stats.totalUsers !== 1 ? 's' : ''} found
            {isFilterActive && ' (filtered)'}
          </p>
        </div>
        <div className="px-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="search"
                  placeholder="Search by name or email..."
                  className="w-full h-10 px-4 py-2 text-sm bg-background/95 backdrop-blur-sm rounded-md border border-border transition-colors duration-200 ease-in-out
                    hover:border-primary/50 focus:border-primary focus:ring-1 focus:ring-ring focus:ring-offset-1
                    placeholder:text-placeholder-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
            </div>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="gap-2 h-10 px-4 border-border/60 hover:border-primary/60 hover:bg-accent/50 transition-colors duration-200"
                >
                  <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Filters</span>
                  {isFilterActive && <FilterBadge count={filtersAppliedCount} />}
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" align="end">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none">Filters</h4>
                    <p className="text-sm text-muted-foreground">
                      Narrow down user list
                    </p>
                  </div>
                  <Separator />
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="company-filter" className="mb-2 block">Company</Label>
                      <Select
                        value={filters.company}
                        onValueChange={(value: string) => 
                          setFilters({ ...filters, company: value })
                        }
                      >
                        <SelectTrigger id="company-filter" className="w-full">
                          <Building2 className="h-4 w-4 text-muted-foreground mr-2" />
                          <SelectValue placeholder="All Companies" />
                        </SelectTrigger>
                        <SelectContent>
                          {companyOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="role-filter" className="mb-2 block">Role</Label>
                      <Select
                        value={filters.role}
                        onValueChange={(value: string) => 
                          setFilters({ ...filters, role: value as RoleKey })
                        }
                      >
                        <SelectTrigger id="role-filter" className="w-full">
                          <Shield className="h-4 w-4 text-muted-foreground mr-2" />
                          <SelectValue placeholder="All Roles" />
                        </SelectTrigger>
                        <SelectContent>
                          {roleOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="status-filter" className="mb-2 block">Status</Label>
                      <Select
                        value={filters.status}
                        onValueChange={(value: 'all' | 'active' | 'inactive') => 
                          setFilters({ ...filters, status: value })
                        }
                      >
                        <SelectTrigger id="status-filter" className="w-full">
                          <Users className="h-4 w-4 text-muted-foreground mr-2" />
                          <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Status</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full mt-2"
                      onClick={resetFilters}
                      disabled={!isFilterActive}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear Filters
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div className="md:hidden space-y-3">
            {paginatedUsers.length === 0 ? (
              <EmptyState
                icon={<Users className="h-6 w-6" />}
                title="No users found"
                description="Adjust filters or add a new user to get started."
                action={canManageUsers ? { label: 'Add User', onClick: () => setShowAddDialog(true) } : undefined}
              />
            ) : (
              paginatedUsers.map((u) => (
                <Card key={u.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-medium text-primary">
                          {u.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{u.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                    </div>
                    <Badge variant={getRoleBadgeVariant(u.role)} className="shrink-0 text-xs">
                      {getRoleLabel(u.role)}
                    </Badge>
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                    <p>Company: {u.companyId ? getCompanyName(u.companyId) : 'Platform'}</p>
                    <p className="flex items-center gap-1.5">
                      <span
                        className={cn(
                          'h-2 w-2 rounded-full',
                          u.isActive ? 'bg-green-500' : 'bg-gray-400'
                        )}
                      />
                      {u.isActive ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(u)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    {u.id !== user?.id && !(user?.role === 'platform_admin' && u.role === 'super_admin') && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(u)}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <EmptyState
                        icon={<Users className="h-6 w-6" />}
                        title="No users found"
                        description="Adjust filters or add a new user to get started."
                        action={canManageUsers ? { label: 'Add User', onClick: () => setShowAddDialog(true) } : undefined}
                      />
                    </TableCell>
                  </TableRow>
                ) : paginatedUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {u.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{u.name}</p>
                          <p className="text-xs text-muted-foreground md:hidden">
                            {u.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{u.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(u.role)}>
                        {getRoleLabel(u.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {u.companyId ? (
                          <>
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span>{getCompanyName(u.companyId)}</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">Platform</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {u.isActive ? (
                          <>
                            <div className="h-2 w-2 rounded-full bg-green-500"></div>
                            <span>Active</span>
                          </>
                        ) : (
                          <>
                            <div className="h-2 w-2 rounded-full bg-gray-400"></div>
                            <span>Inactive</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(u)}
                          aria-label={`Edit ${u.name}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {u.id !== user?.id && !(user?.role === 'platform_admin' && u.role === 'super_admin') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(u)}
                            aria-label={`Delete ${u.name}`}
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
          {displayUsers.length > 0 && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalCount={totalCount}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              itemLabel="users"
            />
          )}
        </div>
      </div>

      {/* Add User Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Add a new user to the system. Required fields are marked with *
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="john@company.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value: RoleKey) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {user.role === 'super_admin' && (
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  )}
                  {assignableRoleOptions.map((role) => (
                    <SelectItem key={role.key} value={role.key}>{role.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.role !== 'super_admin' && (
              <div className="space-y-2">
                <Label htmlFor="company">Company *</Label>
                <Select
                  value={formData.companyId}
                  onValueChange={(value: string) => setFormData({ ...formData, companyId: value })}
                >
                  <SelectTrigger id="company">
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCompanies.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4"
              />
              <Label htmlFor="isActive">Active</Label>
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
              Add User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user details. Leave password empty to keep the current one.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name *</Label>
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
              <Label htmlFor="edit-password">Password (leave blank to keep current)</Label>
              <Input
                id="edit-password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter new password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-role">Role *</Label>
              <Select
                value={formData.role}
                onValueChange={(value: RoleKey) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger id="edit-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {user.role === 'super_admin' && (
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  )}
                  {assignableRoleOptions.map((role) => (
                    <SelectItem key={role.key} value={role.key}>{role.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.role !== 'super_admin' && (
              <div className="space-y-2">
                <Label htmlFor="edit-company">Company *</Label>
                <Select
                  value={formData.companyId}
                  onValueChange={(value: string) => setFormData({ ...formData, companyId: value })}
                >
                  <SelectTrigger id="edit-company">
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCompanies.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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
                setSelectedUser(null);
                resetForm();
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button onClick={handleUpdate} className="w-full sm:w-auto">
              Update User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog
        open={!!userToDelete}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setUserToDelete(null);
            setDeleteConfirmText('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              This will permanently delete this user from the system. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm">
              Type <span className="font-semibold">DELETE</span> to confirm deleting{' '}
              <span className="font-semibold">{userToDelete?.name}</span>.
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
                setUserToDelete(null);
                setDeleteConfirmText('');
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmText !== 'DELETE' || !userToDelete}
              onClick={async () => {
                if (!userToDelete || deleteConfirmText !== 'DELETE') return;
                try {
                  await deleteUser(userToDelete.id);
                } catch {
                  // Errors are handled inside deleteUser
                } finally {
                  setUserToDelete(null);
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
    </div>
  );
}
