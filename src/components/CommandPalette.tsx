import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ClipboardList,
  UserCheck,
  Calendar,
  CheckCircle,
  XCircle,
  BarChart3,
  UserCog,
  Building2,
  Settings,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from './ui/command';
import { useAuth } from './AuthContext';
import { hasPermission, PERMISSIONS } from '../types/roles';

type PermissionKey = keyof typeof PERMISSIONS;

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type NavItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: PermissionKey;
};

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'leads', label: 'Lead Pool', icon: ClipboardList },
  { id: 'assigned', label: 'Assigned Leads', icon: UserCheck },
  { id: 'calendar', label: 'Follow-up Calendar', icon: Calendar },
  { id: 'converted', label: 'Converted Leads', icon: CheckCircle, permission: 'VIEW_CONVERTED_LEADS' },
  { id: 'lost', label: 'Lost Leads', icon: XCircle },
  { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
  { id: 'users', label: 'User Management', icon: UserCog, permission: 'MANAGE_USERS' },
  { id: 'companies', label: 'Companies', icon: Building2, permission: 'MANAGE_COMPANIES' },
  { id: 'settings', label: 'Settings', icon: Settings, permission: 'MANAGE_SETTINGS' },
];

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const items = useMemo(() => {
    if (!user) return [];
    return NAV_ITEMS.filter((item) => {
      if (!item.permission) return true;
      return hasPermission(user.role, item.permission);
    });
  }, [user]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [open, onOpenChange]);

  const go = (tab: string) => {
    navigate(`/${tab}`);
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Command palette" description="Navigate LMS">
      <CommandInput placeholder="Search pages and actions..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem key={item.id} onSelect={() => go(item.id)}>
                <Icon className="mr-2 h-4 w-4" />
                {item.label}
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          {hasPermission(user?.role ?? 'sales_user', 'IMPORT_LEADS') && (
            <CommandItem onSelect={() => go('leads')}>
              <ClipboardList className="mr-2 h-4 w-4" />
              Go to Lead Pool to add or import
              <CommandShortcut>↵</CommandShortcut>
            </CommandItem>
          )}
          <CommandItem onSelect={() => go('calendar')}>
            <Calendar className="mr-2 h-4 w-4" />
            View follow-up calendar
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
