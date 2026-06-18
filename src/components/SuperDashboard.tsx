import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useDebounce } from 'use-debounce';
import { useAuth } from './AuthContext';
import { useCompanies } from './CompanyContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Loader2 } from 'lucide-react';
import { usePageMeta } from './layout/PageMetaContext';
import { BentoStatCard } from './dashboard/BentoStatCard';

const normalizeCompanyId = (value: string | number | null | undefined) => {
  if (value === null || value === undefined) {
    return '';
  }
  const stringValue = String(value).trim();
  return stringValue.toLowerCase();
};

export function SuperDashboard() {
  const { user, users, isLoading: isAuthLoading } = useAuth();
  const { companies, isLoading: isCompaniesLoading } = useCompanies();
  const isLoading = isAuthLoading || isCompaniesLoading;
  const [searchParams, setSearchParams] = useSearchParams();
  const [isFiltering, setIsFiltering] = useState(false);

  // Get filter values from URL or use defaults
  const getFilterFromUrl = (key: string, defaultValue: string | string[]) => {
    const value = searchParams.get(key);
    if (!value) return defaultValue;
    if (Array.isArray(defaultValue)) {
      return value.split(',').filter(Boolean);
    }
    return value;
  };

  // State for filters with URL sync
  const [statusFilter, setStatusFilter] = useState<string>(
    () => getFilterFromUrl('status', 'all') as string
  );
  const [roleFilter, setRoleFilter] = useState<string[]>(
    () => getFilterFromUrl('roles', []) as string[]
  );
  const [companyFilter, setCompanyFilter] = useState<string>(
    () => getFilterFromUrl('company', 'all') as string
  );
  const [searchTerm, setSearchTerm] = useState(
    () => searchParams.get('search') || ''
  );
  
  // Debounce search term to prevent too many re-renders
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (roleFilter.length > 0) params.set('roles', roleFilter.join(','));
    if (companyFilter !== 'all') params.set('company', companyFilter);
    if (searchTerm) params.set('search', searchTerm);
    
    // Only update if there are params to avoid empty ? in URL
    const newSearch = params.toString();
    const currentSearch = searchParams.toString();
    
    if (newSearch !== currentSearch) {
      setSearchParams(params, { replace: true });
    }
  }, [statusFilter, roleFilter, companyFilter, searchTerm, searchParams, setSearchParams]);

  // Get users safely (exclude super admins)
  const allUsers = useMemo(() => {
    if (!users) {
      return [];
    }
    return users.filter(u => u.role !== 'super_admin');
  }, [users]);

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

  // Apply filters to users
  const filteredUsers = useMemo(() => {
    setIsFiltering(true);
    
    try {
      if (!allUsers.length) {
        return [];
      }

      const normalizedStatus = statusFilter;
      const normalizedRoles = roleFilter;
      const normalizedSearch = debouncedSearchTerm.trim().toLowerCase();

      const result = allUsers.filter(user => {
      // Status filter
      if (normalizedStatus === 'active' && !user.isActive) {
        return false;
      }
      if (normalizedStatus === 'inactive' && user.isActive) {
        return false;
      }

      // Role filter
      if (normalizedRoles.length > 0 && !normalizedRoles.includes(user.role)) {
        return false;
      }

      // Company filter
      if (companyFilter === 'all') {
        // Show all users - skip company filtering
      } else if (companyFilter === 'platform') {
        // Show only platform users (no companyId)
        if (user.companyId !== null && user.companyId !== undefined && String(user.companyId).trim() !== '') {
          return false;
        }
      } else {
        // Show users matching specific company - direct comparison
        if (user.companyId !== companyFilter) {
          return false;
        }
      }

      // Search filter
      if (normalizedSearch) {
        const normalizedName = String(user.name || '').toLowerCase();
        const normalizedEmail = String(user.email || '').toLowerCase();

        if (
          !normalizedName.includes(normalizedSearch) &&
          !normalizedEmail.includes(normalizedSearch)
        ) {
          return false;
        }
      }

        return true;
      });
      
      return result;
    } catch (error) {
      console.error('Error filtering users:', error);
      return [];
    } finally {
      setIsFiltering(false);
    }
  }, [allUsers, statusFilter, roleFilter, companyFilter, debouncedSearchTerm]);

  const companyFilterLabel = useMemo(() => {
    if (companyFilter === 'all') {
      return 'Viewing all companies';
    }
    
    if (companyFilter === 'platform') {
      return 'Viewing platform users';
    }

    const normalizedId = normalizeCompanyId(companyFilter);
    const companyName = companyNameLookup.get(normalizedId);

    return companyName
      ? `Currently viewing: ${companyName}`
      : 'Currently viewing: Selected company';
  }, [companyFilter, companyNameLookup]);

  // Reset all filters
  const resetFilters = useCallback(() => {
    setStatusFilter('all');
    setRoleFilter([]);
    setCompanyFilter('all');
    setSearchTerm('');
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  // Helper function to get company name
  const getCompanyName = (companyId: string | null) => {
    if (!companyId) return 'Platform';
    const company = companies.find(c => c.id === companyId);
    return company ? company.name : companyId;
  };

  // Role options for multi-select
  const roleOptions = [
    { value: 'platform_admin', label: 'Platform Admin' },
    { value: 'company_admin', label: 'Company Admin' },
    { value: 'team_lead', label: 'Team Leader' },
    { value: 'sales_user', label: 'Sales User' },
  ];

  // Calculate statistics
  const stats = {
    totalUsers: filteredUsers.length,
    activeUsers: filteredUsers.filter(u => u.isActive).length,
    inactiveUsers: filteredUsers.filter(u => !u.isActive).length,
    adminsCount: filteredUsers.filter(u => ['company_admin', 'platform_admin'].includes(u.role)).length,
    teamLeads: filteredUsers.filter(u => u.role === 'team_lead').length,
    salesUsers: filteredUsers.filter(u => u.role === 'sales_user').length,
  };

  usePageMeta({
    title: 'Super Dashboard',
    description: 'Platform-wide user overview across all companies',
    actions: (
      <Button variant="outline" onClick={resetFilters} className="gap-2">
        Reset Filters
      </Button>
    ),
  });

  // Show loading state
  if (isLoading) {
    return (
      <div className="p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Super Dashboard</h1>
          <div className="flex justify-center mt-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
          <p className="mt-2 text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    // You might want to use react-router's useNavigate here
    return null;
  }

  const activeRate =
    stats.totalUsers > 0
      ? `${Math.round((stats.activeUsers / stats.totalUsers) * 100)}% active in scope`
      : 'No users in current filter';

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="dashboard-bento">
        {/* Filter strip */}
        <div className="card-bento bento-span-full p-4 sm:p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Status</label>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Company</label>
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Select company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              <SelectItem value="platform">Platform</SelectItem>
              {companies.map(company => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Roles</label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select roles">
                {roleFilter.length > 0 
                  ? `${roleFilter.length} role${roleFilter.length > 1 ? 's' : ''} selected`
                  : 'All Roles'
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {roleOptions.map(option => (
                <div key={option.value} className="flex items-center space-x-2 p-2">
                  <Checkbox
                    id={option.value}
                    checked={roleFilter.includes(option.value)}
                    onCheckedChange={(checked: boolean) => {
                      if (checked) {
                        setRoleFilter(prev => [...prev, option.value]);
                      } else {
                        setRoleFilter(prev => prev.filter(r => r !== option.value));
                      }
                    }}
                  />
                  <label
                    htmlFor={option.value}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {option.label}
                  </label>
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Search</label>
          <div className="relative">
            <Input
              placeholder="Search name or email"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isFiltering}
              className={isFiltering ? 'pr-10' : ''}
            />
            {isFiltering && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
        </div>
        </div>

        <BentoStatCard
          className="bento-span-2"
          eyebrow="Platform overview"
          label="Total Users"
          value={stats.totalUsers}
          subtitle={activeRate}
          variant="primary"
          featured
        />

        <BentoStatCard
          label="Active Users"
          value={stats.activeUsers}
          subtitle="Currently enabled"
          variant="primary"
        />
        <BentoStatCard
          label="Inactive Users"
          value={stats.inactiveUsers}
          subtitle="Disabled accounts"
          variant="slate"
        />
        <BentoStatCard
          label="Admins"
          value={stats.adminsCount}
          subtitle="Platform & company admins"
          variant="warm"
        />
        <BentoStatCard
          label="Team Leads"
          value={stats.teamLeads}
          subtitle="Team leaders"
          variant="teal"
        />
        <BentoStatCard
          label="Sales Users"
          value={stats.salesUsers}
          subtitle="Sales team members"
          variant="rose"
        />

        {/* User Table */}
        <div className="card-bento bento-span-full overflow-hidden">
        <div className="px-5 py-3 border-b border-border text-sm text-muted-foreground">
          {companyFilterLabel}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border">
            <thead>
              <tr className="border-b border-border">
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Company</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-card">
              {filteredUsers.length > 0 ? (
                filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">{user.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="outline">{user.role}</Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getCompanyName(user.companyId)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={user.isActive ? 'success' : 'secondary'}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                    {allUsers.length === 0 ? 'Loading users...' : 'No users match the selected filters'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        </div>
      </div>
    </div>
  );
}