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
  const { fieldConfigs, leads } = useLeads();
  
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

    notes: initialData?.notes || '',
    assignedTo: initialData?.assignedTo || user?.id || '',

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
      // Check for duplicate CIN
      if (formData.cin) {
        const duplicate = leads.find(l => 
          l.cin && 
          l.cin.toLowerCase() === formData.cin.toLowerCase() && 
          l.id !== initialData?.id // Exclude current lead if editing
        );

        if (duplicate) {
          toast.error('This company already exists in your database.');
          return;
        }
      }

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
                onValueChange={(val: string) => handleChange(config.key, val)}
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



  const followUpFields = fieldConfigs.filter(c => 
    ['status', 'notes'].includes(c.key)
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
          <div className="space-y-4">
            {formData.directors.map((director: Director, index: number) => (
              <Card key={director.id} className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm">Director {index + 1}</h4>
                  {formData.directors.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeDirector(director.id)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor={`din-${director.id}`}>DIN</Label>
                    <Input
                      id={`din-${director.id}`}
                      type="text"
                      value={director.din}
                      onChange={(e) => updateDirector(director.id, 'din', e.target.value)}
                      placeholder="Enter DIN"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor={`firstName-${director.id}`}>First Name</Label>
                      <Input
                        id={`firstName-${director.id}`}
                        type="text"
                        value={director.firstName}
                        onChange={(e) => updateDirector(director.id, 'firstName', e.target.value)}
                        placeholder="First name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`lastName-${director.id}`}>Last Name</Label>
                      <Input
                        id={`lastName-${director.id}`}
                        type="text"
                        value={director.lastName}
                        onChange={(e) => updateDirector(director.id, 'lastName', e.target.value)}
                        placeholder="Last name"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`mobile-${director.id}`}>Mobile</Label>
                    <Input
                      id={`mobile-${director.id}`}
                      type="tel"
                      value={director.mobile}
                      onChange={(e) => updateDirector(director.id, 'mobile', e.target.value)}
                      placeholder="Enter mobile number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`email-${director.id}`}>Email</Label>
                    <Input
                      id={`email-${director.id}`}
                      type="email"
                      value={director.email}
                      onChange={(e) => updateDirector(director.id, 'email', e.target.value)}
                      placeholder="Enter email"
                    />
                  </div>
                </div>
              </Card>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addDirector}
              className="w-full gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Another Director
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="followup" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            {followUpFields.find(c => c.key === 'status') && renderField(followUpFields.find(c => c.key === 'status')!)}
            
            {(user?.role === 'super_admin' || user?.role === 'company_admin' || user?.role === 'team_lead') && (
              <div className="space-y-2">
                <Label htmlFor="assignedTo">Assign To *</Label>
                <Select 
                  value={formData.assignedTo} 
                  onValueChange={(value: string) => handleChange('assignedTo', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select user" />
                  </SelectTrigger>
                  <SelectContent>
                    {(user?.role === 'super_admin'
                      ? users.filter(u => u.isActive)
                      : users.filter(u => u.isActive && u.companyId === user?.companyId)
                    ).map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.assignedTo && (
                  <p className="text-sm text-destructive">{errors.assignedTo}</p>
                )}
              </div>
            )}
          </div>


          
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
