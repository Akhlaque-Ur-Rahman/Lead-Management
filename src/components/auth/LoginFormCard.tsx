import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { BarChart3, Loader2, Eye, EyeOff } from 'lucide-react';

interface LoginFormCardProps {
  brandName: string;
  logoUrl?: string | null;
  email: string;
  password: string;
  showPassword: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onTogglePassword: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

function BrandLogo({ brandName, logoUrl }: { brandName: string; logoUrl?: string | null }) {
  const initial = brandName.trim().charAt(0).toUpperCase() || 'L';

  return (
    <div className="login-brand-logo-wrap">
      <div className="login-brand-logo-glow" aria-hidden />
      {logoUrl ? (
        <div className="login-brand-logo">
          <img src={logoUrl} alt="" />
        </div>
      ) : (
        <div className="login-brand-logo">
          {initial !== 'L' ? (
            <span className="font-semibold text-lg">{initial}</span>
          ) : (
            <BarChart3 className="h-5 w-5" />
          )}
        </div>
      )}
    </div>
  );
}

export function LoginFormCard({
  brandName,
  logoUrl,
  email,
  password,
  showPassword,
  isLoading,
  isSubmitting,
  onEmailChange,
  onPasswordChange,
  onTogglePassword,
  onSubmit,
}: LoginFormCardProps) {
  return (
    <div className="login-card rounded-2xl">
      <div className="login-brand">
        <BrandLogo brandName={brandName} logoUrl={logoUrl} />
        <h1 className="login-brand-title">{brandName}</h1>
        <p className="login-brand-subtitle">Sign in to continue</p>
      </div>

      <form onSubmit={onSubmit} aria-label="Sign in" className="login-form">
        <div className="login-field">
          <Label htmlFor="email" className="login-label">
            Email address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            disabled={isLoading}
            autoComplete="email"
          />
        </div>

        <div className="login-field">
          <Label htmlFor="password" className="login-label">
            Password
          </Label>
          <div className="login-password-field">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              className="pr-12"
              disabled={isLoading}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={onTogglePassword}
              className="login-password-toggle"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <Button type="submit" className="login-submit" disabled={isLoading || isSubmitting}>
          {isLoading || isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign in'
          )}
        </Button>
      </form>
    </div>
  );
}
