import { useMemo, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from './AuthContext';
import { useLeads, type Lead } from './LeadsContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { X, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { Progress } from './ui/progress';
import { Card } from './ui/card';
import { toast } from 'sonner';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import {
  buildLeadFormSchema,
  getCompanyStepFields,
  getAssignmentStepFields,
  type DirectorFormValues,
} from '../schemas/leadFormSchemas';

interface LeadFormProps {
  onSubmit: (leadData: Omit<Lead, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
  initialData?: Lead | null;
}

type LeadFormValues = z.infer<ReturnType<typeof buildLeadFormSchema>>;

const defaultDirector = (): DirectorFormValues => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  din: '',
  firstName: '',
  lastName: '',
  mobile: '',
  email: '',
});

export function LeadForm({ onSubmit, onCancel, initialData }: LeadFormProps) {
  const { user, users } = useAuth();
  const { fieldConfigs, leads } = useLeads();

  const schema = useMemo(() => buildLeadFormSchema(fieldConfigs), [fieldConfigs]);
  const companyStepFields = useMemo(() => getCompanyStepFields(fieldConfigs), [fieldConfigs]);
  const assignmentStepFields = useMemo(() => getAssignmentStepFields(fieldConfigs), [fieldConfigs]);

  const form = useForm<LeadFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      cin: initialData?.cin || '',
      companyName: initialData?.companyName || '',
      authorisedCapital: initialData?.authorisedCapital || '',
      paidUpCapital: initialData?.paidUpCapital || '',
      dateOfIncorporation: initialData?.dateOfIncorporation || '',
      registeredAddress: initialData?.registeredAddress || '',
      companyEmail: initialData?.companyEmail || '',
      directors: initialData?.directors?.length
        ? initialData.directors
        : [defaultDirector()],
      din: initialData?.din || '',
      directorFirstName: initialData?.directorFirstName || '',
      directorLastName: initialData?.directorLastName || '',
      mobile: initialData?.mobile || '',
      directorEmail: initialData?.directorEmail || '',
      status: initialData?.status || 'Cold',
      notes: initialData?.notes || '',
      assignedTo: initialData?.assignedTo || user?.id || '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'directors',
  });

  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const STEPS = ['Company', 'Directors', 'Assignment'];
  const stepProgress = ((step + 1) / STEPS.length) * 100;

  const companyFields = fieldConfigs.filter((c) =>
    ['cin', 'companyName', 'authorisedCapital', 'paidUpCapital', 'dateOfIncorporation', 'registeredAddress', 'companyEmail'].includes(c.key)
  );
  const followUpFields = fieldConfigs.filter((c) => ['status', 'notes'].includes(c.key));

  const renderDynamicField = (config: (typeof fieldConfigs)[0]) => {
    if (!config.showInForm) return null;

    return (
      <FormField
        key={config.id}
        control={form.control}
        name={config.key as keyof LeadFormValues}
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {config.label} {config.required && '*'}
            </FormLabel>
            <FormControl>
              {config.type === 'textarea' ? (
                <Textarea
                  {...field}
                  value={(field.value as string) || ''}
                  placeholder={`Enter ${config.label.toLowerCase()}`}
                  rows={3}
                />
              ) : config.type === 'select' && config.key === 'status' ? (
                <Select value={(field.value as string) || ''} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={`Select ${config.label.toLowerCase()}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {config.options?.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : config.type === 'date' ? (
                <Input type="date" {...field} value={(field.value as string) || ''} />
              ) : (
                <Input
                  type={config.type === 'email' ? 'email' : config.type === 'tel' ? 'tel' : 'text'}
                  {...field}
                  value={(field.value as string) || ''}
                  placeholder={`Enter ${config.label.toLowerCase()}`}
                />
              )}
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  const handleFormSubmit = async (values: LeadFormValues) => {
    setIsSubmitting(true);
    try {
      if (values.cin) {
        const duplicate = leads.find(
          (l) =>
            l.cin &&
            l.cin.toLowerCase() === String(values.cin).toLowerCase() &&
            l.id !== initialData?.id
        );
        if (duplicate) {
          toast.error('This company already exists in your database.');
          setStep(0);
          return;
        }
      }

      const firstDirector = values.directors[0];
      const dataToSubmit = {
        ...values,
        din: firstDirector?.din || '',
        directorFirstName: firstDirector?.firstName || '',
        directorLastName: firstDirector?.lastName || '',
        mobile: firstDirector?.mobile || '',
        directorEmail: firstDirector?.email || '',
      };
      onSubmit(dataToSubmit as Omit<Lead, 'id' | 'createdAt'>);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = async () => {
    if (step === 0) {
      const valid = await form.trigger(companyStepFields as (keyof LeadFormValues)[]);
      if (valid) setStep(1);
    } else if (step === 1) {
      setStep(2);
    }
  };

  const errorCount = Object.keys(form.formState.errors).length;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              Step {step + 1} of {STEPS.length}: {STEPS[step]}
            </span>
          </div>
          <Progress value={stepProgress} className="h-1.5" />
          <div className="flex gap-1">
            {STEPS.map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => setStep(i)}
                className={`flex-1 text-center text-[10px] py-1 rounded ${i === step ? 'bg-primary text-primary-foreground font-medium' : 'bg-muted text-muted-foreground'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {errorCount > 0 && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2" role="alert">
            Please fix {errorCount} error{errorCount > 1 ? 's' : ''} before submitting.
          </p>
        )}

        <Tabs value={['company', 'director', 'followup'][step]} className="w-full">
          <TabsList className="sr-only">
            <TabsTrigger value="company">Company</TabsTrigger>
            <TabsTrigger value="director">Directors</TabsTrigger>
            <TabsTrigger value="followup">Assignment</TabsTrigger>
          </TabsList>

          <TabsContent value="company" className="space-y-4 mt-4">
            {companyFields.map((config) => {
              if (config.key === 'authorisedCapital') {
                const paidUpConfig = fieldConfigs.find((c) => c.key === 'paidUpCapital');
                if (paidUpConfig?.showInForm) {
                  return (
                    <div key="capital-group" className="grid grid-cols-2 gap-4">
                      {renderDynamicField(config)}
                      {renderDynamicField(paidUpConfig)}
                    </div>
                  );
                }
              }
              if (config.key === 'paidUpCapital') return null;
              return renderDynamicField(config);
            })}
          </TabsContent>

          <TabsContent value="director" className="space-y-4 mt-4">
            <div className="space-y-4">
              {fields.map((director, index) => (
                <Card key={director.id} className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm">Director {index + 1}</h4>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (fields.length === 1) {
                            toast.error('At least one director is required');
                            return;
                          }
                          remove(index);
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <FormField
                      control={form.control}
                      name={`directors.${index}.din`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>DIN</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Enter DIN" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name={`directors.${index}.firstName`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="First name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`directors.${index}.lastName`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Last name" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name={`directors.${index}.mobile`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mobile</FormLabel>
                          <FormControl>
                            <Input type="tel" {...field} placeholder="Enter mobile number" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`directors.${index}.email`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} placeholder="Enter email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </Card>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={() => append(defaultDirector())}
                className="w-full gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Another Director
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="followup" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              {followUpFields.find((c) => c.key === 'status') &&
                renderDynamicField(followUpFields.find((c) => c.key === 'status')!)}

              {(user?.role === 'super_admin' || user?.role === 'company_admin' || user?.role === 'team_lead') && (
                <FormField
                  control={form.control}
                  name="assignedTo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign To *</FormLabel>
                      <Select value={field.value || ''} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select user" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(user?.role === 'super_admin'
                            ? users.filter((u) => u.isActive)
                            : users.filter((u) => u.isActive && u.companyId === user?.companyId)
                          ).map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {followUpFields.find((c) => c.key === 'notes') &&
              renderDynamicField(followUpFields.find((c) => c.key === 'notes')!)}
          </TabsContent>
        </Tabs>

        <div className="flex justify-between gap-3 pt-4 border-t">
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            {step > 0 && (
              <Button type="button" variant="outline" onClick={() => setStep(step - 1)} className="gap-1">
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
            )}
          </div>
          {step < STEPS.length - 1 ? (
            <Button type="button" onClick={handleNext} className="gap-1">
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              disabled={isSubmitting}
              onClick={async () => {
                const valid = await form.trigger(assignmentStepFields as (keyof LeadFormValues)[]);
                if (valid) form.handleSubmit(handleFormSubmit)();
              }}
            >
              {isSubmitting ? 'Saving...' : initialData ? 'Update Lead' : 'Add Lead'}
            </Button>
          )}
        </div>
      </form>
    </Form>
  );
}
