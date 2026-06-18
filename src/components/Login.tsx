import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useTheme } from '../context/ThemeContext';
import { toast } from 'sonner';
import { LoginFormCard } from './auth/LoginFormCard';

export function Login() {
  const { login, isLoading, systemName, systemLogoUrl } = useAuth();
  const { setTheme } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setTheme('system');
  }, [setTheme]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter both email and password');
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await login(email, password);
      if (!result.success) {
        toast.error(result.error || 'Login failed');
      }
    } catch {
      toast.error('Unable to login right now. Please try later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const brandName = systemName || 'Lead Management System';

  return (
    <div className="login-page bg-background">
      <div className="login-mesh" aria-hidden>
        <div className="login-mesh-blob login-mesh-blob--primary" />
        <div className="login-mesh-blob login-mesh-blob--accent" />
        <div className="login-mesh-blob login-mesh-blob--center" />
      </div>

      <div className="login-card-wrap">
        <LoginFormCard
          brandName={brandName}
          logoUrl={systemLogoUrl}
          email={email}
          password={password}
          showPassword={showPassword}
          isLoading={isLoading}
          isSubmitting={isSubmitting}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onTogglePassword={() => setShowPassword((v) => !v)}
          onSubmit={handleSubmit}
        />

        <p className="login-footer">Secure multi-tenant workspace</p>
      </div>
    </div>
  );
}
