import { useState } from 'react';
import { useAuth } from './AuthContext';
import { useLeads, type Lead, type Director } from './LeadsContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { X, Plus } from 'lucide-react';
import { Card } from './ui/card';
import { toast } from 'sonner';

interface LeadFormProps {
  onSubmit: (leadData: Omit<Lead, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
  initialData?: Lead | null;
}

export function LeadForm({ onSubmit, onCancel, initialData }: LeadFormProps) {
  const { user, users } = useAuth();
  const { fieldConfigs } = useLeads();
  
  const [formData, setFormData] = useState<any>({
    cin: initialData?.cin || '',
    companyName: initialData?.companyName || '',
    authorisedCapital: initialData?.authorisedCapital || '',
    paidUpCapital: initialData?.paidUpCapital || '',
    dateOfIncorporation: initialData?.dateOfIncorporation || '',
    registeredAddress: initialData?.registeredAddress || '',
    companyEmail: initialData?.companyEmail || '',
    directors: initialData?.directors || [{
      id: '1',
      din: '',
      firstName: '',
      lastName: '',
      mobile: '',
      email: ''
    }],
    // Legacy fields for backward compatibility
    din: initialData?.din || '',
    directorFirstName: initialData?.directorFirstName || '',
    directorLastName: initialData?.directorLastName || '',
    mobile: initialData?.mobile || '',
    directorEmail: initialData?.directorEmail || '',
    status: initialData?.status || 'Cold',
    followUpDate: initialData?.followUpDate || '',
    nextFollowUpDate: initialData?.nextFollowUpDate || '',
    notes: initialData?.notes || '',
    assignedTo: initialData?.assignedTo || user?.id || '',
    followUpHistory: initialData?.followUpHistory || []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    // Validate based on field configs
    fieldConfigs.forEach(config => {
      if (config.required && config.showInForm) {
        const value = formData[config.key];
        if (!value || (typeof value === 'string' && !value.trim())) {
          newErrors[config.key] = `${config.label} is required`;
        }
      }
    });

    // Always require assignment
    if (!formData.assignedTo) {
      newErrors.assignedTo = 'Please assign this lead to a user';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addDirector = () => {
    const newDirector: Director = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      din: '',
      firstName: '',
      lastName: '',
      mobile: '',
      email: ''
    };
    setFormData((prev: any) => ({
      ...prev,
      directors: [...prev.directors, newDirector]
    }));
  };

  const removeDirector = (directorId: string) => {
    if (formData.directors.length === 1) {
      toast.error('At least one director is required');
      return;
    }
    setFormData((prev: any) => ({
      ...prev,
      directors: prev.directors.filter((d: Director) => d.id !== directorId)
    }));
  };

  const updateDirector = (directorId: string, field: keyof Director, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      directors: prev.directors.map((d: Director) => 
        d.id === directorId ? { ...d, [field]: value } : d
      )
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validate()) {
      // Update legacy fields from first director for backward compatibility
      const firstDirector = formData.directors[0];
      const dataToSubmit = {
        ...formData,
        din: firstDirector?.din || '',
        directorFirstName: firstDirector?.firstName || '',
        directorLastName: firstDirector?.lastName || '',
        mobile: firstDirector?.mobile || '',
        directorEmail: firstDirector?.email || ''
      };
      onSubmit(dataToSubmit);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const renderField = (config: typeof fieldConfigs[0]) => {
    if (!config.showInForm) return null;

    const value = formData[config.key] || '';
    const error = errors[config.key];

    switch (config.type) {
      case 'textarea':
        return (
          <div key={config.id} className="space-y-2">
            <Label htmlFor={config.key}>
              {config.label} {config.required && '*'}
            </Label>
            <Textarea
              id={config.key}
              value={value}
              onChange={(e) => handleChange(config.key, e.target.value)}
              placeholder={`Enter ${config.label.toLowerCase()}`}
              rows={3}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        );

      case 'select':
        if (config.key === 'status') {
          return (
            <div key={config.id} className="space-y-2">
              <Label htmlFor={config.key}>
                {config.label} {config.required && '*'}
              </Label>
              <Select 
                value={value} 
                onValueChange={(val) => handleChange(config.key, val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${config.label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {config.options?.map(option => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {error && <p className="text-sm text-destructive">{error}</p>}
            </div>
          );
        }
        return null;

      case 'date':
        return (
          <div key={config.id} className="space-y-2">
            <Label htmlFor={config.key}>
              {config.label} {config.required && '*'}
            </Label>
            <Input
              id={config.key}
              type="date"
              value={value}
              onChange={(e) => handleChange(config.key, e.target.value)}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        );

      case 'email':
      case 'tel':
      case 'text':
      default:
        return (
          <div key={config.id} className="space-y-2">
            <Label htmlFor={config.key}>
              {config.label} {config.required && '*'}
            </Label>
            <Input
              id={config.key}
              type={config.type}
              value={value}
              onChange={(e) => handleChange(config.key, e.target.value)}
              placeholder={`Enter ${config.label.toLowerCase()}`}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        );
    }
  };

  // Group fields by category
  const companyFields = fieldConfigs.filter(c => 
    ['cin', 'companyName', 'authorisedCapital', 'paidUpCapital', 
     'dateOfIncorporation', 'registeredAddress', 'companyEmail'].includes(c.key)
  );

  const directorFields = fieldConfigs.filter(c => 
    ['din', 'directorFirstName', 'directorLastName', 'mobile', 'directorEmail'].includes(c.key)
  );

  const followUpFields = fieldConfigs.filter(c => 
    ['status', 'followUpDate', 'notes'].includes(c.key)
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Tabs defaultValue="company" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="company">Company Info</TabsTrigger>
          <TabsTrigger value="director">Director Info</TabsTrigger>
          <TabsTrigger value="followup">Follow-up</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-4 mt-4">
          {companyFields.map(config => {
            // Special layout for capital fields
            if (config.key === 'authorisedCapital') {
              const paidUpConfig = fieldConfigs.find(c => c.key === 'paidUpCapital');
              if (paidUpConfig?.showInForm) {
                return (
                  <div key="capital-group" className="grid grid-cols-2 gap-4">
                    {renderField(config)}
                    {renderField(paidUpConfig)}
                  </div>
                );
              }
            }
            // Skip paidUpCapital as it's handled above
            if (config.key === 'paidUpCapital') return null;
            
            return renderField(config);
          })}
        </TabsContent>

        <TabsContent value="director" className="space-y-4 mt-4">
          {directorFields.map(config => {
            // Special layout for name fields
            if (config.key === 'directorFirstName') {
              const lastNameConfig = fieldConfigs.find(c => c.key === 'directorLastName');
              if (lastNameConfig?.showInForm) {
                return (
                  <div key="name-group" className="grid grid-cols-2 gap-4">
                    {renderField(config)}
                    {renderField(lastNameConfig)}
                  </div>
                );
              }
            }
            // Skip directorLastName as it's handled above
            if (config.key === 'directorLastName') return null;
            
            return renderField(config);
          })}
        </TabsContent>

        <TabsContent value="followup" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            {followUpFields.find(c => c.key === 'status') && renderField(followUpFields.find(c => c.key === 'status')!)}
            
            {(user?.role === 'main_admin' || user?.role === 'admin') && (
              <div className="space-y-2">
                <Label htmlFor="assignedTo">Assign To *</Label>
                <Select 
                  value={formData.assignedTo} 
                  onValueChange={(value) => handleChange('assignedTo', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.filter(u => u.isActive).map(user => (
                      <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.assignedTo && (
                  <p className="text-sm text-destructive">{errors.assignedTo}</p>
                )}
              </div>
            )}
          </div>

          {followUpFields.find(c => c.key === 'followUpDate') && renderField(followUpFields.find(c => c.key === 'followUpDate')!)}
          
          {followUpFields.find(c => c.key === 'notes') && renderField(followUpFields.find(c => c.key === 'notes')!)}
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {initialData ? 'Update Lead' : 'Add Lead'}
        </Button>
      </div>
    </form>
  );
}
