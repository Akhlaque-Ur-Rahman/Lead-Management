import { useState } from 'react';
import { useAuth } from './AuthContext';
import { useLeads, type FieldConfig } from './LeadsContext';
import { useCompanies, type PlanPricing } from './CompanyContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Settings as SettingsIcon, Save, AlertCircle, FileSpreadsheet, FormInput, CreditCard, FileText } from 'lucide-react';
import { hasPermission } from '../types/roles';
import { toast } from 'sonner';

type PlanType = 'basic' | 'professional' | 'enterprise';

interface PlanPricingState {
  basic: number;
  professional: number;
  enterprise: number;
}

type SettingsTab = 'general' | 'fields' | 'subscription' | 'billing';

export function Settings() {
  const { user, isLoading } = useAuth();
  const { fieldConfigs, setFieldConfigs } = useLeads();
  const { planPricing, updatePlanPricing } = useCompanies();

  const [localConfigs, setLocalConfigs] = useState<FieldConfig[]>([...fieldConfigs]);
  const [prices, setPrices] = useState<PlanPricingState>({
    basic: planPricing.prices.basic,
    professional: planPricing.prices.professional,
    enterprise: planPricing.prices.enterprise,
  });
  const [maxUsers, setMaxUsers] = useState<PlanPricingState>({
    basic: planPricing.maxUsers.basic,
    professional: planPricing.maxUsers.professional,
    enterprise: planPricing.maxUsers.enterprise,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  // Loading guard - check this BEFORE user check
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" role="status">
            <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">Loading...</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const canAccessSettings = hasPermission(user.role, 'MANAGE_SETTINGS');
  if (!canAccessSettings) {
    return (
      <div className="p-4 sm:p-6">
        <div className="flex items-center gap-2 p-3 rounded-lg border">
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm">Access Denied: Only admins can access settings.</p>
        </div>
      </div>
    );
  }

  // Field settings handlers
  const handleUpdateLabel = (fieldId: string, value: string) => {
    setLocalConfigs(prev => prev.map(f => (f.id === fieldId ? { ...f, label: value } : f)));
  };
  const handleUpdateExcelHeader = (fieldId: string, value: string) => {
    setLocalConfigs(prev => prev.map(f => (f.id === fieldId ? { ...f, excelHeader: value } : f)));
  };
  const handleToggleFormField = (fieldId: string) => {
    setLocalConfigs(prev => prev.map(f => (f.id === fieldId ? { ...f, showInForm: !f.showInForm } : f)));
  };
  const handleToggleExcelField = (fieldId: string) => {
    setLocalConfigs(prev => prev.map(f => (f.id === fieldId ? { ...f, showInExcel: !f.showInExcel } : f)));
  };
  const handleToggleRequired = (fieldId: string) => {
    setLocalConfigs(prev => prev.map(f => (f.id === fieldId ? { ...f, required: !f.required } : f)));
  };

  // Subscription handlers
  const handlePriceChange = (plan: PlanType, value: string) => {
    const num = Number(value);
    setPrices(prev => ({ ...prev, [plan]: Number.isFinite(num) ? num : 0 }));
  };

  const handleMaxUsersChange = (plan: PlanType, value: string) => {
    const num = Number(value);
    if (!isNaN(num) && num > 0) {
      setMaxUsers(prev => ({
        ...prev,
        [plan]: num
      }));
    }
  };

  const handleSavePricing = async () => {
    try {
      setIsSaving(true);
      
      // Create the updates object with default values
      const updates: Partial<PlanPricing> = {
        prices: {
          basic: planPricing.prices.basic,
          professional: planPricing.prices.professional,
          enterprise: planPricing.prices.enterprise
        },
        maxUsers: {
          basic: planPricing.maxUsers.basic,
          professional: planPricing.maxUsers.professional,
          enterprise: planPricing.maxUsers.enterprise
        }
      };

      // Check for price changes and update if needed
      let hasPriceChanges = false;
      if (prices.basic !== planPricing.prices.basic) {
        updates.prices!.basic = prices.basic;
        hasPriceChanges = true;
      }
      if (prices.professional !== planPricing.prices.professional) {
        updates.prices!.professional = prices.professional;
        hasPriceChanges = true;
      }
      if (prices.enterprise !== planPricing.prices.enterprise) {
        updates.prices!.enterprise = prices.enterprise;
        hasPriceChanges = true;
      }

      // Check for max users changes and update if needed
      let hasUserChanges = false;
      if (maxUsers.basic !== planPricing.maxUsers.basic) {
        updates.maxUsers!.basic = maxUsers.basic;
        hasUserChanges = true;
      }
      if (maxUsers.professional !== planPricing.maxUsers.professional) {
        updates.maxUsers!.professional = maxUsers.professional;
        hasUserChanges = true;
      }
      if (maxUsers.enterprise !== planPricing.maxUsers.enterprise) {
        updates.maxUsers!.enterprise = maxUsers.enterprise;
        hasUserChanges = true;
      }
      
      if (hasPriceChanges || hasUserChanges) {
        await updatePlanPricing(updates);
        toast.success('Subscription plans updated successfully');
      } else {
        toast.info('No changes to save');
      }
    } catch (e) {
      console.error('Error updating plan pricing:', e);
      toast.error('Failed to update subscription plans');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = () => {
    setFieldConfigs(localConfigs);
    toast.success('Field settings saved');
  };
  const handleReset = () => {
    setLocalConfigs([...fieldConfigs]);
  };
  const hasChanges = JSON.stringify(localConfigs) !== JSON.stringify(fieldConfigs);

  // Tabs renderers
  const renderGeneralSettings = () => {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>Configure general application settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <AlertCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <p className="text-sm text-muted-foreground">
                Configure general settings that affect the entire application. Changes will be applied immediately.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Application Name</Label>
                <Input placeholder="Your Application Name" defaultValue="Lead Management System" />
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                  <option value="UTC">UTC</option>
                  <option value="IST">India Standard Time (IST)</option>
                  <option value="EST">Eastern Time (EST)</option>
                  <option value="PST">Pacific Time (PST)</option>
                </select>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end border-t px-6 py-4">
            <Button>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  };

  const renderFieldSettings = () => {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Field Settings</CardTitle>
            <CardDescription>Control fields for forms and Excel</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Configure visibility and requirements for each field. Changes will affect all users in your company.</p>
            </div>

            <div className="space-y-4">
              {localConfigs.map((field) => (
                <div key={field.id} className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor={`label-${field.id}`}>Field Label</Label>
                        <Input id={`label-${field.id}`} value={field.label} onChange={(e) => handleUpdateLabel(field.id, e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`excel-${field.id}`}>Excel Header</Label>
                        <Input id={`excel-${field.id}`} value={field.excelHeader} onChange={(e) => handleUpdateExcelHeader(field.id, e.target.value)} />
                      </div>
                    </div>

                    <div className="space-y-4 flex flex-col items-end">
                      <div className="flex items-center space-x-2">
                        <Switch id={`form-${field.id}`} checked={field.showInForm} onCheckedChange={() => handleToggleFormField(field.id)} />
                        <Label htmlFor={`form-${field.id}`} className="flex items-center gap-2">
                          <FormInput className="h-4 w-4" />
                          Form
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id={`excel-${field.id}`} checked={field.showInExcel} onCheckedChange={() => handleToggleExcelField(field.id)} />
                        <Label htmlFor={`excel-${field.id}`} className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4" />
                          Excel
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch id={`required-${field.id}`} checked={field.required} onCheckedChange={() => handleToggleRequired(field.id)} />
                        <Label htmlFor={`required-${field.id}`}>Required</Label>
                      </div>
                    </div>
                  </div>
                  <Separator />
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleReset}>Reset</Button>
              <Button onClick={handleSave} disabled={!hasChanges}>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderSubscriptionSettings = () => {
    if (!canManageSubscription) {
      return (
        <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
          <CreditCard className="h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-medium">Subscription Management</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            You don't have permission to manage subscription plans. Please contact your administrator for access.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Subscription Plans</CardTitle>
            <CardDescription>Configure pricing for different tiers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="basic-price">Monthly Price (₹)</Label>
                    <div>
                      <Input 
                        id="basic-price" 
                        type="number" 
                        min={0} 
                        step={1}
                        value={prices.basic}
                        onChange={(e) => handlePriceChange('basic', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="basic-max-users">Max Users</Label>
                    <Input 
                      id="basic-max-users"
                      type="number"
                      min="1"
                      value={maxUsers.basic}
                      onChange={(e) => handleMaxUsersChange('basic', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Professional</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="professional-price">Monthly Price (₹)</Label>
                    <div>
                      <Input 
                        id="professional-price" 
                        type="number" 
                        min={prices.basic + 1} 
                        step={1}
                        value={prices.professional}
                        onChange={(e) => handlePriceChange('professional', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="professional-max-users">Max Users</Label>
                    <Input 
                      id="professional-max-users"
                      type="number"
                      min="1"
                      value={maxUsers.professional}
                      onChange={(e) => handleMaxUsersChange('professional', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Enterprise</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="enterprise-price">Monthly Price (₹)</Label>
                    <div>
                      <Input 
                        id="enterprise-price" 
                        type="number" 
                        min={prices.professional + 1} 
                        step={1}
                        value={prices.enterprise}
                        onChange={(e) => handlePriceChange('enterprise', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="enterprise-max-users">Max Users</Label>
                    <Input 
                      id="enterprise-max-users"
                      type="number"
                      min="1"
                      value={maxUsers.enterprise}
                      onChange={(e) => handleMaxUsersChange('enterprise', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end border-t px-6 py-4">
            <Button onClick={handleSavePricing} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Subscription Plans'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  };

  // Check if user has permission to access subscription settings
  const canManageSubscription = hasPermission(user.role, 'MANAGE_SUBSCRIPTION_PLANS');

  const renderBillingSettings = () => {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Billing Information</CardTitle>
            <CardDescription>Manage your billing and payment methods</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Current Plan</Label>
                <div className="p-4 border rounded-md bg-muted/50">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">Professional Plan</h4>
                      <p className="text-sm text-muted-foreground">Billed monthly</p>
                    </div>
                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary text-primary-foreground hover:bg-primary/80">
                      Active
                    </span>
                  </div>
                  <Separator className="my-4" />
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Next Billing Date</p>
                      <p className="font-medium">Jan 15, 2025</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Amount</p>
                      <p className="font-medium">₹29,900.00</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <div className="p-4 border rounded-md bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="h-10 w-16 rounded-md bg-white flex items-center justify-center border">
                        <CreditCard className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">Visa ending in 4242</p>
                        <p className="text-sm text-muted-foreground">Expires 12/25</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Change
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end border-t px-6 py-4">
            <Button variant="outline" className="mr-2">
              Download Invoice
            </Button>
            <Button variant="destructive">
              Cancel Subscription
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  };

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return renderGeneralSettings();
      case 'fields':
        return renderFieldSettings();
      case 'subscription':
        return renderSubscriptionSettings();
      case 'billing':
        return renderBillingSettings();
      default:
        return renderGeneralSettings();
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <SettingsIcon className="h-6 w-6" />
            Settings
          </h1>
          <p className="text-muted-foreground text-sm">Configure application settings and subscription plans</p>
        </div>
      </div>

      <div className="flex flex-col space-y-4">
        <Tabs 
          value={activeTab} 
          onValueChange={(value: string) => setActiveTab(value as SettingsTab)}
          className="w-full"
        >
          <div className="border-b">
            <TabsList className="w-full justify-start p-0 bg-transparent rounded-none">
              <TabsTrigger 
                value="general" 
                className="py-4 px-1 mr-4 border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none"
              >
                <FileText className="h-4 w-4 mr-2" />
                General
              </TabsTrigger>
              <TabsTrigger 
                value="fields" 
                className="py-4 px-1 mr-4 border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none"
              >
                <FormInput className="h-4 w-4 mr-2" />
                Field Settings
              </TabsTrigger>
              {canManageSubscription && (
                <TabsTrigger 
                  value="subscription" 
                  className="py-4 px-1 mr-4 border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Subscription Plans
                </TabsTrigger>
              )}
            </TabsList>
          </div>
        </Tabs>

        <div className="pt-4">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}

