import { BarChart3, TrendingUp, Users, Shield } from 'lucide-react';

interface LoginBrandPanelProps {
  brandName: string;
  logoUrl?: string | null;
}

export function LoginBrandPanel({ brandName, logoUrl }: LoginBrandPanelProps) {
  return (
    <div className="relative hidden lg:flex flex-col justify-between bg-sidebar text-sidebar-foreground p-12 overflow-hidden min-h-dvh">
      <div className="absolute inset-0 bg-gradient-to-br from-sidebar-primary/15 via-transparent to-transparent pointer-events-none" />
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-sidebar-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute bottom-20 right-0 h-56 w-56 rounded-full bg-sidebar-primary/5 blur-3xl" />

      <div className="relative z-10">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="" className="h-11 w-11 rounded-xl object-cover border border-sidebar-border" />
          ) : (
            <div className="h-11 w-11 rounded-xl bg-sidebar-primary flex items-center justify-center shadow-lg shadow-sidebar-primary/30">
              <BarChart3 className="h-6 w-6 text-sidebar-primary-foreground" />
            </div>
          )}
          <span className="font-display font-semibold text-lg">{brandName}</span>
        </div>
      </div>

      <div className="relative z-10 space-y-8 max-w-md">
        <h2 className="text-4xl font-bold font-display leading-tight tracking-tight">
          Manage your lead pipeline with confidence
        </h2>
        <p className="text-sidebar-foreground-muted text-lg leading-relaxed">
          Industry-grade multi-tenant LMS for MCA data — from acquisition to conversion.
        </p>
        <ul className="space-y-4">
          {[
            { icon: TrendingUp, text: 'Track Hot, Warm & Cold leads through your pipeline' },
            { icon: Users, text: 'Role-based teams with assignment & follow-up calendar' },
            { icon: Shield, text: 'Enterprise RBAC with multi-company isolation' },
          ].map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3 text-sm text-sidebar-foreground-subtle">
              <Icon className="h-5 w-5 text-sidebar-primary shrink-0 mt-0.5" />
              {text}
            </li>
          ))}
        </ul>
      </div>

      <p className="relative z-10 text-xs text-sidebar-foreground-muted">
        Multi-Tenant Lead Management System
      </p>
    </div>
  );
}
