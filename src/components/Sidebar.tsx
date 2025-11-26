import { 
  LayoutDashboard, 
  Calendar, 
  BarChart3, 
  FileSpreadsheet,
  Settings,
  UserCog,
  LogOut,
  XCircle,
  Building2,
  ClipboardList,
  UserCheck,
  CheckCircle,

} from 'lucide-react';
import { cn } from './ui/utils';
import { useAuth } from './AuthContext';
import { Badge } from './ui/badge';
import { getRoleLabel, getRoleBadgeVariant } from '../types/roles';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const { user, logout } = useAuth();
  
  // Base menu items for all users
  const baseMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['super_admin', 'platform_admin', 'company_admin', 'team_lead', 'sales_user'] },
    { id: 'leads', label: 'Lead Pool', icon: ClipboardList, roles: ['company_admin', 'team_lead', 'sales_user'] },
    { id: 'assigned', label: 'Assigned Leads', icon: UserCheck, roles: ['company_admin', 'team_lead', 'sales_user'] },
    { id: 'calendar', label: 'Follow-up Calendar', icon: Calendar, roles: ['company_admin', 'team_lead', 'sales_user'] },
    { id: 'converted', label: 'Converted Leads', icon: CheckCircle, roles: ['super_admin', 'platform_admin', 'company_admin'] },
    { id: 'lost', label: 'Lost Leads', icon: XCircle, roles: ['company_admin', 'team_lead', 'sales_user'] },
    { id: 'reports', label: 'Reports & Analytics', icon: BarChart3, roles: ['super_admin', 'platform_admin', 'company_admin', 'team_lead', 'sales_user'] },
  ];

  // Admin menu items
  const adminMenuItems = [
    { id: 'users', label: 'User Management', icon: UserCog, roles: ['super_admin', 'platform_admin', 'company_admin', 'team_lead'] },
    { id: 'companies', label: 'Companies', icon: Building2, roles: ['super_admin', 'platform_admin'] },
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['super_admin', 'platform_admin', 'company_admin'] },
  ];

  // Filter menu items based on user role
  let menuItems: Array<{id: string, label: string, icon: any, roles: string[]}> = [];
  let filteredAdminItems: Array<{id: string, label: string, icon: any, roles: string[]}> = [];
  
  if (user?.role === 'super_admin' || user?.role === 'platform_admin') {
    // Super Admin and Platform Admin see only specific items
    menuItems = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['super_admin', 'platform_admin'] },
      { id: 'leads', label: 'Lead Pool', icon: ClipboardList, roles: ['super_admin', 'platform_admin'] },
      { id: 'reports', label: 'Reports & Analytics', icon: BarChart3, roles: ['super_admin', 'platform_admin'] },
      { id: 'users', label: 'User Management', icon: UserCog, roles: ['super_admin', 'platform_admin'] },
      { id: 'companies', label: 'Companies', icon: Building2, roles: ['super_admin', 'platform_admin'] },
      { id: 'settings', label: 'Settings', icon: Settings, roles: ['super_admin', 'platform_admin'] },
    ];
  } else {
    // Other users see filtered items based on their roles
    const filteredBaseItems = baseMenuItems.filter(item => 
      user && item.roles.includes(user.role)
    );
    
    filteredAdminItems = adminMenuItems.filter(item => 
      user && item.roles.includes(user.role)
    );
    
    menuItems = [...filteredBaseItems, ...filteredAdminItems];
  }

  const getRoleBadge = () => {
    if (!user) return null;
    
    return (
      <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs">
        {getRoleLabel(user.role)}
      </Badge>
    );
  };

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col h-screen">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
            <FileSpreadsheet className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold">Lead Manager</h1>
            <p className="text-xs text-muted-foreground">Multi-Tenant LMS</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                    activeTab === item.id
                      ? "bg-primary text-primary-foreground shadow-md"
                      : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Divider - only show for non-admin users who have separate admin menu items */}
        {(user?.role !== 'super_admin' && user?.role !== 'platform_admin') && filteredAdminItems.length > 0 && (
          <div className="my-4 border-t border-border" />
        )}
      </nav>

      <div className="p-4 border-t border-border space-y-3">
        <div className="px-3 py-2 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium truncate pr-2">{user?.name}</p>
            {getRoleBadge()}
          </div>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          {user?.role !== 'super_admin' && user?.companyId && (
            <p className="text-xs text-muted-foreground">
              Company ID: {user.companyId.split('-')[1]}
            </p>
          )}
        </div>
        <button 
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-destructive hover:text-destructive-foreground text-muted-foreground transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span className="text-sm">Logout</span>
        </button>
      </div>
    </div>
  );
}
