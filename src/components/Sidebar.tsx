import { useState, useEffect, useCallback } from 'react';
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
  PanelLeft,
} from 'lucide-react';
import { cn } from './ui/utils';
import { useAuth } from './AuthContext';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Button } from './ui/button';
import { getRoleLabel, getRoleBadgeVariant } from '../types/roles';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

const SIDEBAR_COLLAPSED_KEY = 'lms-sidebar-collapsed';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

type MenuItem = { id: string; label: string; icon: React.ComponentType<{ className?: string }> };

const OVERVIEW_ITEMS: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
];

const PIPELINE_ITEMS: MenuItem[] = [
  { id: 'leads', label: 'Lead Pool', icon: ClipboardList },
  { id: 'assigned', label: 'Assigned Leads', icon: UserCheck },
  { id: 'calendar', label: 'Follow-up Calendar', icon: Calendar },
  { id: 'converted', label: 'Converted Leads', icon: CheckCircle },
  { id: 'lost', label: 'Lost Leads', icon: XCircle },
];

const ADMIN_ITEMS: MenuItem[] = [
  { id: 'users', label: 'User Management', icon: UserCog },
  { id: 'companies', label: 'Companies', icon: Building2 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

function filterByRole(items: MenuItem[], role: string, allowedIds: Set<string>) {
  return items.filter((item) => allowedIds.has(item.id));
}

export function Sidebar({ activeTab, setActiveTab, collapsed: collapsedProp, onCollapsedChange }: SidebarProps) {
  const { user, logout, systemName, systemLogoUrl, companyDisplayName } = useAuth();
  const [collapsedInternal, setCollapsedInternal] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const collapsed = collapsedProp ?? collapsedInternal;

  const setCollapsed = useCallback(
    (value: boolean) => {
      if (onCollapsedChange) {
        onCollapsedChange(value);
      } else {
        setCollapsedInternal(value);
      }
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(value));
      } catch {
        /* ignore */
      }
    },
    [onCollapsedChange]
  );

  useEffect(() => {
    if (collapsedProp === undefined) return;
    setCollapsedInternal(collapsedProp);
  }, [collapsedProp]);

  if (!user) return null;

  const platformAdmin = user.role === 'super_admin' || user.role === 'platform_admin';
  const allowedIds = new Set<string>(['dashboard', 'reports']);

  if (platformAdmin) {
    [...PIPELINE_ITEMS, ...ADMIN_ITEMS].forEach((i) => allowedIds.add(i.id));
  } else {
    const roleMap: Record<string, string[]> = {
      company_admin: ['leads', 'assigned', 'calendar', 'converted', 'lost', 'users', 'settings'],
      team_lead: ['leads', 'assigned', 'calendar', 'converted', 'lost', 'users'],
      sales_user: ['leads', 'assigned', 'calendar', 'lost'],
    };
    (roleMap[user.role] ?? []).forEach((id) => allowedIds.add(id));
  }

  const overview = filterByRole(OVERVIEW_ITEMS, user.role, allowedIds);
  const pipeline = filterByRole(PIPELINE_ITEMS, user.role, allowedIds);
  const admin = filterByRole(ADMIN_ITEMS, user.role, allowedIds);

  const nameToShow = user.role === 'super_admin' ? systemName : (companyDisplayName || 'Dashboard');
  const initials = user.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'U';

  const CollapseToggle = ({ className }: { className?: string }) => (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        'hidden lg:inline-flex h-9 w-9 shrink-0 text-sidebar-foreground-subtle hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        className
      )}
      onClick={() => setCollapsed(!collapsed)}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      <PanelLeft className={cn('h-4 w-4', collapsed && 'rotate-180')} />
    </Button>
  );

  const NavButton = ({ item, isActive }: { item: MenuItem; isActive: boolean }) => {
    const Icon = item.icon;
    const button = (
      <button
        type="button"
        onClick={() => setActiveTab(item.id)}
        aria-current={isActive ? 'page' : undefined}
        aria-label={collapsed ? item.label : undefined}
        className={cn(
          'relative w-full flex items-center rounded-lg text-sm transition-colors duration-150',
          collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
          isActive
            ? 'bg-accent/60 text-primary font-medium'
            : 'text-sidebar-foreground-subtle hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
        )}
      >
        <Icon className={cn('h-4 w-4 flex-shrink-0', isActive && 'text-primary')} />
        {!collapsed && <span className="truncate">{item.label}</span>}
        {isActive && !collapsed && (
          <span
            className="absolute right-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-primary"
            aria-hidden
          />
        )}
        {isActive && collapsed && (
          <span
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-primary"
            aria-hidden
          />
        )}
      </button>
    );

    if (!collapsed) return button;

    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  };

  const NavGroup = ({ label, items }: { label: string; items: MenuItem[] }) => {
    if (!items.length) return null;
    return (
      <div className="mb-4">
        {!collapsed && (
          <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground-muted">
            {label}
          </p>
        )}
        <ul className="space-y-0.5">
          {items.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <li key={item.id}>
                <NavButton item={item} isActive={isActive} />
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  const brandLogo =
    user.role === 'super_admin' && systemLogoUrl ? (
      <img
        src={systemLogoUrl}
        alt=""
        className="h-9 w-9 rounded-lg object-cover border border-sidebar-border flex-shrink-0"
      />
    ) : (
      <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
        <FileSpreadsheet className="h-5 w-5 text-primary-foreground" />
      </div>
    );

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col h-full min-h-0 transition-[width] duration-300',
          collapsed ? 'w-[var(--sidebar-width-collapsed)]' : 'w-64'
        )}
      >
        <div
          className={cn(
            'border-b border-sidebar-border shrink-0',
            collapsed ? 'flex flex-col items-center gap-2 p-3' : 'flex items-center gap-2 p-4 pr-3'
          )}
        >
          {collapsed ? (
            <>
              <CollapseToggle />
              {brandLogo}
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {brandLogo}
                <div className="min-w-0">
                  <p className="font-semibold text-sm leading-tight line-clamp-2" title={nameToShow}>
                    {nameToShow}
                  </p>
                  <p className="text-[11px] text-sidebar-foreground-muted truncate">Multi-Tenant LMS</p>
                </div>
              </div>
              <CollapseToggle />
            </>
          )}
        </div>

        <nav className="flex-1 min-h-0 p-3 overflow-y-auto sidebar-scroll" aria-label="Main navigation">
          <NavGroup label="Overview" items={overview} />
          <NavGroup label="Pipeline" items={pipeline} />
          <NavGroup label="Administration" items={admin} />
        </nav>

        <div className="shrink-0 p-3 border-t border-sidebar-border">
          {!collapsed ? (
            <div className="rounded-xl bg-sidebar-accent/80 p-3 space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 border border-sidebar-border">
                  <AvatarFallback className="bg-background text-foreground text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate text-sidebar-foreground">{user.name}</p>
                  <Badge variant={getRoleBadgeVariant(user.role)} className="mt-0.5 text-[10px] px-1.5 py-0">
                    {getRoleLabel(user.role)}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-col gap-0.5 border-t border-sidebar-border pt-2">
                {allowedIds.has('settings') && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('settings')}
                    className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-sidebar-foreground-subtle hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors text-left"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </button>
                )}
                <button
                  type="button"
                  onClick={logout}
                  className="flex items-center gap-2 px-2 py-2 rounded-lg text-sm text-sidebar-foreground-subtle hover:bg-destructive/10 hover:text-destructive transition-colors text-left"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex justify-center">
                    <Avatar className="h-9 w-9 border border-sidebar-border">
                      <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-xs">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">{user.name}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={logout}
                    aria-label="Logout"
                    className="mx-auto flex h-10 w-10 min-h-10 min-w-10 text-sidebar-foreground-subtle hover:bg-destructive/20 hover:text-destructive"
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Logout</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
