import { Link, useLocation } from 'react-router-dom';
import { ClipboardList, UserCheck, Calendar, XCircle } from 'lucide-react';
import { useAuth } from '../AuthContext';
import { useIsMobile } from '../ui/use-mobile';
import { cn } from '../ui/utils';

const NAV_ITEMS = [
  { id: 'leads', label: 'Pool', href: '/leads', icon: ClipboardList },
  { id: 'assigned', label: 'Assigned', href: '/assigned', icon: UserCheck },
  { id: 'calendar', label: 'Calendar', href: '/calendar', icon: Calendar },
  { id: 'lost', label: 'Lost', href: '/lost', icon: XCircle },
] as const;

export function MobileBottomNav() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const location = useLocation();

  if (!isMobile || !user || user.role !== 'sales_user') {
    return null;
  }

  const activeTab = location.pathname.replace(/^\//, '').split('/')[0] || 'dashboard';

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden"
      aria-label="Mobile navigation"
    >
      <div className="flex items-stretch justify-around pb-[env(safe-area-inset-bottom)]">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <Link
              key={item.id}
              to={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-2.5 px-1 text-xs transition-colors',
                isActive
                  ? 'text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
