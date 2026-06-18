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
import { ThemeSwitcher } from '../ThemeSwitcher';
import { HelpCircle, Menu, Search } from 'lucide-react';
import { usePageMetaState } from './PageMetaContext';
import { cn } from '../ui/utils';

interface AppShellProps {
  onMenuClick: () => void;
  onCommandPalette: () => void;
  children: React.ReactNode;
}

export function AppShell({ onMenuClick, onCommandPalette, children }: AppShellProps) {
  const { title, description, actions } = usePageMetaState();

  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0">
      <header
        className={cn(
          'sticky top-0 z-30 shrink-0 border-b border-border/80',
          'bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/75',
          'shadow-[inset_0_-1px_0_var(--card-border-glow)]'
        )}
      >
        {/* Utility row */}
        <div className="flex h-12 items-center gap-3 px-4 lg:px-6">
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
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="truncate max-w-[12rem] lg:max-w-none">
                  {title}
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <h1 className="sm:hidden flex-1 text-sm font-semibold font-display truncate">
            {title}
          </h1>

          <div className="flex items-center gap-1 ml-auto shrink-0">
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'hidden md:flex gap-2 h-8 rounded-full px-3',
                'border-border/80 bg-muted/40 text-muted-foreground',
                'hover:bg-muted/70 hover:text-foreground'
              )}
              onClick={onCommandPalette}
            >
              <Search className="h-3.5 w-3.5" />
              <span className="text-xs">Search</span>
              <kbd className="pointer-events-none hidden lg:inline-flex h-5 select-none items-center gap-1 rounded-full border border-border/60 bg-background/80 px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                ⌘K
              </kbd>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-8 w-8"
              onClick={onCommandPalette}
              aria-label="Open command palette"
            >
              <Search className="h-4 w-4" />
            </Button>
            <ThemeSwitcher variant="ghost" className="h-8 w-8 border-transparent bg-transparent" />
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild aria-label="Help documentation">
              <Link to="/help">
                <HelpCircle className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Page meta row */}
        <div className="border-t border-border/50 px-4 lg:px-6 py-3 sm:py-3.5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 hidden sm:block">
              <h1 className="text-xl lg:text-2xl font-semibold font-display tracking-tight truncate">
                {title}
              </h1>
              {description && (
                <p className="text-muted-foreground text-sm mt-0.5 line-clamp-2">
                  {description}
                </p>
              )}
            </div>
            {description && (
              <p className="text-muted-foreground text-sm sm:hidden line-clamp-2">
                {description}
              </p>
            )}
            {actions && (
              <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:shrink-0 sm:justify-end">
                {actions}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="app-surface flex-1 min-h-0 overflow-y-auto overscroll-contain page-enter">
        <div className="app-mesh" aria-hidden>
          <div className="app-mesh-blob app-mesh-blob--primary" />
          <div className="app-mesh-blob app-mesh-blob--accent" />
          <div className="app-mesh-blob app-mesh-blob--teal" />
        </div>
        <div className="relative z-10 min-h-full">{children}</div>
      </div>
    </div>
  );
}
