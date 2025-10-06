import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  BarChart3, 
  FileSpreadsheet,
  Settings,
  UserCog,
  LogOut,
  XCircle
} from 'lucide-react';
import { cn } from './ui/utils';
import { useAuth } from './AuthContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const { user, logout } = useAuth();
  
  const baseMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'leads', label: 'Lead Management', icon: Users },
    { id: 'calendar', label: 'Follow-up Calendar', icon: Calendar },
    { id: 'lost', label: 'Lost Leads', icon: XCircle },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ];

  const adminMenuItems = [];
  
  if (user?.role === 'main_admin' || user?.role === 'admin') {
    adminMenuItems.push({ id: 'users', label: 'User Management', icon: UserCog });
  }
  
  if (user?.role === 'main_admin') {
    adminMenuItems.push({ id: 'settings', label: 'Settings', icon: Settings });
  }

  const menuItems = [...baseMenuItems, ...adminMenuItems];

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-8 w-8 text-primary" />
          <div>
            <h1 className="font-semibold">MCA Lead Manager</h1>
            <p className="text-sm text-muted-foreground">Lead Management System</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                    activeTab === item.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent hover:text-accent-foreground text-muted-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-border space-y-2">
        <div className="px-3 py-2">
          <p className="text-sm font-medium">{user?.name}</p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
          <p className="text-xs text-muted-foreground capitalize">{user?.role.replace('_', ' ')}</p>
        </div>
        <button 
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-destructive hover:text-destructive-foreground text-muted-foreground transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>
    </div>
  );
}