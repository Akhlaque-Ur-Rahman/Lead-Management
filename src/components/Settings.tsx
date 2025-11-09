import { useState } from 'react';
import { useAuth } from './AuthContext';
import { useLeads, FieldConfig } from './LeadsContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Alert, AlertDescription } from './ui/alert';
import { Separator } from './ui/separator';
import { Settings as SettingsIcon, Save, AlertCircle, Eye, FileSpreadsheet, FormInput } from 'lucide-react';
import { hasPermission } from '../types/roles';
import { toast } from 'sonner';

export function Settings() {
  const { user } = useAuth();
  const { fieldConfigs, setFieldConfigs } = useLeads();
  const [localConfigs, setLocalConfigs] = useState<FieldConfig[]>([...fieldConfigs]);

  if (!user) return null;

  // Check if user can manage settings
  const canAccessSettings = hasPermission(user.role, 'MANAGE_SETTINGS');

  if (!canAccessSettings) {
    return (
      <div className="p-4 sm:p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Access Denied: Only admins can access settings.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleToggleFormField = (fieldId: string) => {
    setLocalConfigs(prev =>
      prev.map(field =>
        field.id === fieldId
          ? { ...field, showInForm: !field.showInForm }
          : field
      )
    );
  };

  const handleToggleExcelField = (fieldId: string) => {
    setLocalConfigs(prev =>
      prev.map(field =>
        field.id === fieldId
          ? { ...field, showInExcel: !field.showInExcel }
          : field
      )
    );
  };

  const handleToggleRequired = (fieldId: string) => {
    setLocalConfigs(prev =>
      prev.map(field =>
        field.id === fieldId
          ? { ...field, required: !field.required }
          : field
      )
    );
  };

  const handleUpdateLabel = (fieldId: string, newLabel: string) => {
    setLocalConfigs(prev =>
      prev.map(field =>
        field.id === fieldId
          ? { ...field, label: newLabel }
          : field
      )
    );
  };

  const handleUpdateExcelHeader = (fieldId: string, newHeader: string) => {
    setLocalConfigs(prev =>
      prev.map(field =>
        field.id === fieldId
          ? { ...field, excelHeader: newHeader }
          : field
      )
    );
  };

  const handleSave = () => {
    setFieldConfigs(localConfigs);
    toast.success('Settings saved successfully!');
  };

  const handleReset = () => {
    setLocalConfigs([...fieldConfigs]);
    toast.info('Changes reset');
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="flex items-center gap-2">
            <SettingsIcon className="h-6 w-6" />
            Settings
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Configure field visibility and lead management settings
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={handleReset} className="flex-1 sm:flex-none">
            Reset
          </Button>
          <Button onClick={handleSave} className="gap-2 flex-1 sm:flex-none">
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Field Configuration</CardTitle>
          <CardDescription>
            Control which fields appear in lead forms and Excel imports/exports
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Configure visibility for each field in lead entry forms and Excel operations. 
              Changes will affect all users in your company.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            {localConfigs.map((field, index) => (
              <div key={field.id}>
                {index > 0 && <Separator className="my-4" />}
                <div className="space-y-4">
                  {/* Field Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor={`label-${field.id}`}>Field Label</Label>
                        <Input
                          id={`label-${field.id}`}
                          value={field.label}
                          onChange={(e) => handleUpdateLabel(field.id, e.target.value)}
                          placeholder="Field label"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`excel-${field.id}`}>Excel Header</Label>
                        <Input
                          id={`excel-${field.id}`}
                          value={field.excelHeader}
                          onChange={(e) => handleUpdateExcelHeader(field.id, e.target.value)}
                          placeholder="Excel column header"
                        />
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      {field.type}
                    </div>
                  </div>

                  {/* Field Toggles */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div className="flex items-center justify-between space-x-2 p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <FormInput className="h-4 w-4 text-muted-foreground" />
                        <Label
                          htmlFor={`form-${field.id}`}
                          className="cursor-pointer text-sm"
                        >
                          Show in Form
                        </Label>
                      </div>
                      <Switch
                        id={`form-${field.id}`}
                        checked={field.showInForm}
                        onCheckedChange={() => handleToggleFormField(field.id)}
                      />
                    </div>

                    <div className="flex items-center justify-between space-x-2 p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
                        <Label
                          htmlFor={`excel-toggle-${field.id}`}
                          className="cursor-pointer text-sm"
                        >
                          Show in Excel
                        </Label>
                      </div>
                      <Switch
                        id={`excel-toggle-${field.id}`}
                        checked={field.showInExcel}
                        onCheckedChange={() => handleToggleExcelField(field.id)}
                      />
                    </div>

                    <div className="flex items-center justify-between space-x-2 p-3 border rounded-lg">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        <Label
                          htmlFor={`required-${field.id}`}
                          className="cursor-pointer text-sm"
                        >
                          Required
                        </Label>
                      </div>
                      <Switch
                        id={`required-${field.id}`}
                        checked={field.required}
                        onCheckedChange={() => handleToggleRequired(field.id)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preview Section */}
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>
            Preview of visible fields in different contexts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm">
              <FormInput className="h-4 w-4" />
              Form Fields ({localConfigs.filter(f => f.showInForm).length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {localConfigs
                .filter(f => f.showInForm)
                .map(f => (
                  <div
                    key={f.id}
                    className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm flex items-center gap-1"
                  >
                    {f.label}
                    {f.required && <span className="text-destructive">*</span>}
                  </div>
                ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm">
              <FileSpreadsheet className="h-4 w-4" />
              Excel Columns ({localConfigs.filter(f => f.showInExcel).length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {localConfigs
                .filter(f => f.showInExcel)
                .map(f => (
                  <div
                    key={f.id}
                    className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm"
                  >
                    {f.excelHeader}
                  </div>
                ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button at Bottom */}
      <div className="flex justify-end gap-2 sticky bottom-4 bg-background/80 backdrop-blur-sm p-4 rounded-lg border">
        <Button variant="outline" onClick={handleReset}>
          Reset Changes
        </Button>
        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}
