import { Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../ui/breadcrumb';
import { Button } from '../ui/button';
import { HelpCircle, Menu, Search } from 'lucide-react';

const TAB_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  leads: 'Lead Pool',
  assigned: 'Assigned Leads',
  calendar: 'Follow-up Calendar',
  converted: 'Converted Leads',
  lost: 'Lost Leads',
  reports: 'Reports & Analytics',
  users: 'User Management',
  companies: 'Companies',
  settings: 'Settings',
  subscription: 'Settings',
  help: 'Help',
};

interface AppShellProps {
  activeTab: string;
  onMenuClick: () => void;
  onCommandPalette: () => void;
  children: React.ReactNode;
}

export function AppShell({ activeTab, onMenuClick, onCommandPalette, children }: AppShellProps) {
  const label = TAB_LABELS[activeTab] ?? 'Dashboard';

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0">
      <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-4 lg:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden shrink-0"
          onClick={onMenuClick}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <Breadcrumb className="hidden sm:flex flex-1 min-w-0">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/dashboard">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {activeTab !== 'dashboard' && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>

        <h1 className="sm:hidden flex-1 text-sm font-semibold font-display truncate">{label}</h1>

        <div className="flex items-center gap-1 ml-auto shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="hidden md:flex gap-2 text-muted-foreground"
            onClick={onCommandPalette}
          >
            <Search className="h-4 w-4" />
            <span className="text-xs">Search</span>
            <kbd className="pointer-events-none hidden lg:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onCommandPalette}
            aria-label="Open command palette"
          >
            <Search className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" asChild aria-label="Help documentation">
            <Link to="/help">
              <HelpCircle className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain page-enter">
        {children}
      </div>
    </div>
  );
}
