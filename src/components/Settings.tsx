import { useState } from 'react';
import { useAuth } from './AuthContext';
import { useLeads, FieldConfig } from './LeadsContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Alert, AlertDescription } from './ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from './ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Settings as SettingsIcon, Save, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function Settings() {
  const { user } = useAuth();
  const { fieldConfigs, setFieldConfigs } = useLeads();
  const [editedConfigs, setEditedConfigs] = useState<FieldConfig[]>([...fieldConfigs]);

  // Check if user is Main Admin
  if (user?.role !== 'main_admin') {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Access Denied: Only Main Admin can access settings.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleToggleField = (configId: string, field: 'showInForm' | 'showInExcel' | 'required') => {
    setEditedConfigs(prev => prev.map(config =>
      config.id === configId
        ? { ...config, [field]: !config[field] }
        : config
    ));
  };

  const handleUpdateLabel = (configId: string, newLabel: string) => {
    setEditedConfigs(prev => prev.map(config =>
      config.id === configId
        ? { ...config, label: newLabel }
        : config
    ));
  };

  const handleUpdateExcelHeader = (configId: string, newHeader: string) => {
    setEditedConfigs(prev => prev.map(config =>
      config.id === configId
        ? { ...config, excelHeader: newHeader }
        : config
    ));
  };

  const handleSaveSettings = () => {
    // Validate that at least company name is required and shown
    const companyNameConfig = editedConfigs.find(c => c.key === 'companyName');
    if (!companyNameConfig?.required || !companyNameConfig?.showInForm) {
      toast.error('Company Name must be required and shown in form!');
      return;
    }

    setFieldConfigs(editedConfigs);
    toast.success('Settings saved successfully!');
  };

  const handleResetToDefault = () => {
    if (confirm('Are you sure you want to reset all field configurations to default?')) {
      window.location.reload(); // This will reset to default configs
      toast.success('Settings reset to default!');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="flex items-center gap-2">
            <SettingsIcon className="h-6 w-6" />
            System Settings
          </h1>
          <p className="text-muted-foreground">
            Configure form fields and Excel import/export columns
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleResetToDefault}>
            Reset to Default
          </Button>
          <Button onClick={handleSaveSettings} className="gap-2">
            <Save className="h-4 w-4" />
            Save Settings
          </Button>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> Changes to field configuration will affect the lead entry form and Excel import/export functionality. 
          Make sure to communicate changes to your team.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Field Configuration</CardTitle>
          <CardDescription>
            Customize which fields appear in the lead form and Excel files
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Form Label</TableHead>
                  <TableHead className="w-[200px]">Excel Header</TableHead>
                  <TableHead className="w-[100px]">Field Type</TableHead>
                  <TableHead className="w-[100px] text-center">Required</TableHead>
                  <TableHead className="w-[100px] text-center">Show in Form</TableHead>
                  <TableHead className="w-[100px] text-center">Show in Excel</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {editedConfigs.map((config) => (
                  <TableRow key={config.id}>
                    <TableCell>
                      <Input
                        value={config.label}
                        onChange={(e) => handleUpdateLabel(config.id, e.target.value)}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={config.excelHeader}
                        onChange={(e) => handleUpdateExcelHeader(config.id, e.target.value)}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground capitalize">{config.type}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={config.required}
                        onCheckedChange={() => handleToggleField(config.id, 'required')}
                        disabled={config.key === 'companyName'} // Company name must always be required
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={config.showInForm}
                        onCheckedChange={() => handleToggleField(config.id, 'showInForm')}
                        disabled={config.key === 'companyName'} // Company name must always be shown
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={config.showInExcel}
                        onCheckedChange={() => handleToggleField(config.id, 'showInExcel')}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 p-4 bg-muted rounded-md space-y-2">
            <h4>Configuration Guide:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li><strong>Form Label:</strong> The label shown in the lead entry form</li>
              <li><strong>Excel Header:</strong> The column header used in Excel import/export</li>
              <li><strong>Required:</strong> Whether the field must be filled in the form</li>
              <li><strong>Show in Form:</strong> Whether the field appears in the lead entry form</li>
              <li><strong>Show in Excel:</strong> Whether the field is included in Excel import/export</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
