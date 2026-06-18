import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useLeads } from './LeadsContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { CheckCircle2, Circle, X, Users, ClipboardList, UserCheck } from 'lucide-react';
import { cn } from './ui/utils';

const storageKey = (userId: string) => `lms-onboarding-${userId}`;

interface OnboardingStep {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  complete: boolean;
}

export function OnboardingChecklist() {
  const { user, users } = useAuth();
  const { leads } = useLeads();
  const [dismissed, setDismissed] = useState(() => {
    if (!user) return true;
    try {
      const stored = localStorage.getItem(storageKey(user.id));
      return stored === 'dismissed' || stored === 'completed';
    } catch {
      return false;
    }
  });
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!user) {
      setDismissed(true);
      return;
    }
    try {
      const stored = localStorage.getItem(storageKey(user.id));
      setDismissed(stored === 'dismissed' || stored === 'completed');
    } catch {
      setDismissed(false);
    }
  }, [user?.id]);

  const steps: OnboardingStep[] = useMemo(() => {
    if (!user?.companyId) return [];
    const companyUsers = users.filter(
      (u) => u.companyId === user.companyId && u.isActive && u.id !== user.id
    );
    const companyLeads = leads.filter((l) => l.companyId === user.companyId);
    const hasAssigned = companyLeads.some((l) => l.isAssigned);

    return [
      {
        id: 'users',
        label: 'Add team members',
        description: 'Invite sales users and team leads to your company.',
        href: '/users',
        icon: Users,
        complete: companyUsers.length > 0,
      },
      {
        id: 'leads',
        label: 'Import or add leads',
        description: 'Add leads manually or import from Excel.',
        href: '/leads',
        icon: ClipboardList,
        complete: companyLeads.length > 0,
      },
      {
        id: 'assign',
        label: 'Assign a lead',
        description: 'Assign at least one lead to a team member.',
        href: '/leads',
        icon: UserCheck,
        complete: hasAssigned,
      },
    ];
  }, [user, users, leads]);

  useEffect(() => {
    if (!user || user.role !== 'company_admin' || dismissed) return;
    if (steps.length > 0 && steps.every((s) => s.complete)) {
      try {
        localStorage.setItem(storageKey(user.id), 'completed');
      } catch {
        /* ignore */
      }
      setDismissed(true);
    }
  }, [user, dismissed, steps]);

  if (!user || user.role !== 'company_admin' || dismissed || steps.length === 0) {
    return null;
  }

  const completedCount = steps.filter((s) => s.complete).length;

  const handleDismiss = () => {
    try {
      localStorage.setItem(storageKey(user.id), 'dismissed');
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">Getting started</CardTitle>
            <CardDescription>
              {completedCount} of {steps.length} steps complete
            </CardDescription>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? 'Expand onboarding checklist' : 'Collapse onboarding checklist'}
            >
              {collapsed ? 'Show' : 'Hide'}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleDismiss}
              aria-label="Dismiss onboarding checklist"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      {!collapsed && (
        <CardContent className="space-y-3 pt-0">
          {steps.map((step) => {
            const Icon = step.icon;
            const StatusIcon = step.complete ? CheckCircle2 : Circle;
            return (
              <div
                key={step.id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border',
                  step.complete ? 'bg-muted/40 border-border' : 'bg-background border-border'
                )}
              >
                <StatusIcon
                  className={cn(
                    'h-5 w-5 shrink-0 mt-0.5',
                    step.complete ? 'text-icon-success' : 'text-muted-foreground'
                  )}
                  aria-hidden
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{step.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                </div>
                {!step.complete && (
                  <Button variant="outline" size="sm" asChild className="shrink-0">
                    <Link to={step.href}>
                      <Icon className="h-4 w-4 mr-1" />
                      Go
                    </Link>
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}
