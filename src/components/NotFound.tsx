import { Link, useNavigate } from 'react-router-dom';
import { Button } from './ui/button';
import { ArrowLeft, LayoutDashboard, MapPinOff } from 'lucide-react';

export function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="login-page bg-background">
      <div className="login-mesh" aria-hidden>
        <div className="login-mesh-blob login-mesh-blob--primary" />
        <div className="login-mesh-blob login-mesh-blob--accent" />
        <div className="login-mesh-blob login-mesh-blob--center" />
      </div>

      <div className="w-full max-w-lg px-4 relative z-10">
        <p
          className="not-found-hero text-center font-display font-bold leading-none tracking-tighter bg-gradient-to-br from-primary via-primary/80 to-muted-foreground bg-clip-text text-transparent motion-reduce:animate-none"
          aria-hidden
        >
          404
        </p>

        <div className="login-card mt-6 text-center">
          <div className="login-brand-logo-wrap mx-auto mb-5">
            <div className="login-brand-logo-glow animate-pulse motion-reduce:animate-none" />
            <div className="login-brand-logo">
              <MapPinOff className="h-6 w-6 text-muted-foreground" aria-hidden />
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl font-semibold font-display tracking-tight">
            This page went cold.
          </h1>
          <p className="mt-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
            We tracked the URL like a lead. It never converted. Pretty sure it never existed.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild className="gap-2">
              <Link to="/dashboard">
                <LayoutDashboard className="h-4 w-4" />
                Back to Dashboard
              </Link>
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
              Go back
            </Button>
          </div>
        </div>

        <p className="login-footer font-mono text-[11px] tracking-wide uppercase">
          Error code: LOST_ROUTE_NOT_FOUND
        </p>
      </div>
    </div>
  );
}
