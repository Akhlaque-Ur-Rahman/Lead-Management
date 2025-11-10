import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { type RoleKey } from '../types/roles';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Lock, Mail, AlertCircle, BarChart3, Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function Login() {
  const { login, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showDemoCredentials, setShowDemoCredentials] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Clear error when form fields change
  useEffect(() => {
    setError('');
  }, [email, password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const result = await login(email, password);
      
      if (result.success) {
        toast.success('Login successful! Welcome to LMS.');
      } else {
        // Error message is already set by the AuthContext
        setError(result.error || 'Login failed. Please try again.');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('An unexpected error occurred. Please try again.');
      toast.error('Login failed!');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async (role: RoleKey, companyId?: string) => {
    const demoCredentials = {
      super_admin: { email: 'superadmin@lms.com', password: 'super123' },
      platform_admin: { email: 'platformadmin@lms.com', password: 'platform123' },
      company_admin_1: { email: 'rajesh@abcmotors.com', password: 'admin123' },
      company_admin_2: { email: 'vikram@xyzauto.com', password: 'admin123' },
      company_admin_3: { email: 'arjun@pqrenterprises.com', password: 'admin123' },
      team_lead: { email: 'priya@abcmotors.com', password: 'lead123' },
      sales_user: { email: 'amit@abcmotors.com', password: 'user123' },
    };

    let creds;
    if (role === 'super_admin') {
      creds = demoCredentials.super_admin;
    } else if (role === 'platform_admin') {
      creds = demoCredentials.platform_admin;
    } else if (role === 'company_admin') {
      creds = companyId === 'company-1' 
        ? demoCredentials.company_admin_1 
        : companyId === 'company-2' 
        ? demoCredentials.company_admin_2 
        : demoCredentials.company_admin_3;
    } else if (role === 'team_lead') {
      creds = demoCredentials.team_lead;
    } else {
      creds = demoCredentials.sales_user;
    }

    setEmail(creds.email);
    setPassword(creds.password);
    
    const result = await login(creds.email, creds.password);
    if (result.success) {
      toast.success(`Logged in as ${role.replace('_', ' ')}!`);
    } else {
      setError(result.error || 'Login failed');
      toast.error('Login failed!');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo/Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
            <BarChart3 className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl tracking-tight">Lead Management System</h1>
          <p className="text-muted-foreground">
            Industry-Level Multi-Tenant LMS Platform
          </p>
        </div>

        {/* Login Card */}
        <Card className="shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Sign In</CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access your company's LMS
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="mt-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                    <AlertDescription className="text-sm">
                      {error}
                    </AlertDescription>
                  </div>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading || isSubmitting}
              >
                {isLoading || isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

            {/* Demo Credentials Toggle */}
            <div className="mt-6">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowDemoCredentials(!showDemoCredentials)}
                type="button"
              >
                {showDemoCredentials ? 'Hide' : 'Show'} Demo Credentials
              </Button>

              {showDemoCredentials && (
                <div className="mt-4 p-4 bg-muted rounded-lg space-y-3 max-h-[400px] overflow-y-auto">
                  <p className="text-sm font-medium">Quick Demo Login:</p>
                  
                  {/* Super Admin */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-primary">Platform Admin:</p>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left h-auto py-2"
                      onClick={() => handleDemoLogin('super_admin')}
                      type="button"
                    >
                      <div className="flex flex-col items-start w-full">
                        <span className="font-medium">Super Admin</span>
                        <span className="text-xs text-muted-foreground">
                          superadmin@lms.com / super123
                        </span>
                      </div>
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left h-auto py-2"
                      onClick={() => handleDemoLogin('platform_admin')}
                      type="button"
                    >
                      <div className="flex flex-col items-start w-full">
                        <span className="font-medium">Platform Admin</span>
                        <span className="text-xs text-muted-foreground">
                          platformadmin@lms.com / platform123
                        </span>
                      </div>
                    </Button>
                  </div>

                  {/* Company 1 - ABC Motors */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-primary flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      ABC Motors Pvt Ltd:
                    </p>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left h-auto py-2"
                      onClick={() => handleDemoLogin('company_admin', 'company-1')}
                      type="button"
                    >
                      <div className="flex flex-col items-start w-full">
                        <span className="font-medium">Company Admin - Rajesh Kumar</span>
                        <span className="text-xs text-muted-foreground">
                          rajesh@abcmotors.com / admin123
                        </span>
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full justify-start text-left h-auto py-2"
                      onClick={() => handleDemoLogin('team_lead')}
                      type="button"
                    >
                      <div className="flex flex-col items-start w-full">
                        <span className="font-medium">Team Lead - Priya Sharma</span>
                        <span className="text-xs text-muted-foreground">
                          priya@abcmotors.com / lead123
                        </span>
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full justify-start text-left h-auto py-2"
                      onClick={() => handleDemoLogin('sales_user')}
                      type="button"
                    >
                      <div className="flex flex-col items-start w-full">
                        <span className="font-medium">Sales User - Amit Singh</span>
                        <span className="text-xs text-muted-foreground">
                          amit@abcmotors.com / user123
                        </span>
                      </div>
                    </Button>
                  </div>

                  {/* Company 2 - XYZ Auto */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-primary flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      XYZ Auto Solutions:
                    </p>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left h-auto py-2"
                      onClick={() => handleDemoLogin('company_admin', 'company-2')}
                      type="button"
                    >
                      <div className="flex flex-col items-start w-full">
                        <span className="font-medium">Company Admin - Vikram Patel</span>
                        <span className="text-xs text-muted-foreground">
                          vikram@xyzauto.com / admin123
                        </span>
                      </div>
                    </Button>
                  </div>

                  {/* Company 3 - PQR */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-primary flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      PQR Enterprises:
                    </p>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left h-auto py-2"
                      onClick={() => handleDemoLogin('company_admin', 'company-3')}
                      type="button"
                    >
                      <div className="flex flex-col items-start w-full">
                        <span className="font-medium">Company Admin - Arjun Mehta</span>
                        <span className="text-xs text-muted-foreground">
                          arjun@pqrenterprises.com / admin123
                        </span>
                      </div>
                    </Button>
                  </div>

                  <div className="pt-3 border-t">
                    <p className="text-xs text-muted-foreground">
                      <strong>Role Hierarchy:</strong><br/>
                      • Super Admin: Manage all companies<br/>
                      • Company Admin: Full access to company data<br/>
                      • Team Lead: Manage team and view reports<br/>
                      • Sales User: Manage assigned leads only
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Multi-Tenant Lead Management System • Industry-Grade Solution
        </p>
      </div>
    </div>
  );
}
