import { z } from 'zod';
import type { FieldConfig } from '../components/LeadsContext';

const COMPANY_KEYS = [
  'cin',
  'companyName',
  'authorisedCapital',
  'paidUpCapital',
  'dateOfIncorporation',
  'registeredAddress',
  'companyEmail',
] as const;

export const directorSchema = z.object({
  id: z.string(),
  din: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  mobile: z.string().optional(),
  email: z.string().optional(),
});

export type DirectorFormValues = z.infer<typeof directorSchema>;

export function buildCompanyStepSchema(fieldConfigs: FieldConfig[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  fieldConfigs.forEach((config) => {
    if (!config.showInForm || !COMPANY_KEYS.includes(config.key as (typeof COMPANY_KEYS)[number])) {
      return;
    }
    if (config.required) {
      shape[config.key] = z.string().min(1, `${config.label} is required`);
    } else {
      shape[config.key] = z.string().optional();
    }
  });
  return z.object(shape);
}

export function buildAssignmentStepSchema(fieldConfigs: FieldConfig[]) {
  const shape: Record<string, z.ZodTypeAny> = {
    assignedTo: z.string().min(1, 'Please assign this lead to a user'),
    directors: z.array(directorSchema).min(1),
  };

  fieldConfigs.forEach((config) => {
    if (!config.showInForm) return;
    if (config.key === 'status' || config.key === 'notes') {
      if (config.required) {
        shape[config.key] = z.string().min(1, `${config.label} is required`);
      } else {
        shape[config.key] = z.string().optional();
      }
    }
  });

  return z.object(shape);
}

export function buildLeadFormSchema(fieldConfigs: FieldConfig[]) {
  const companyShape: Record<string, z.ZodTypeAny> = {};
  const extraShape: Record<string, z.ZodTypeAny> = {
    directors: z.array(directorSchema).min(1),
    assignedTo: z.string().min(1, 'Please assign this lead to a user'),
    din: z.string().optional(),
    directorFirstName: z.string().optional(),
    directorLastName: z.string().optional(),
    mobile: z.string().optional(),
    directorEmail: z.string().optional(),
  };

  fieldConfigs.forEach((config) => {
    if (!config.showInForm) return;
    const field = config.key;
    const zodField = config.required
      ? z.string().min(1, `${config.label} is required`)
      : z.string().optional();

    if (COMPANY_KEYS.includes(field as (typeof COMPANY_KEYS)[number])) {
      companyShape[field] = zodField;
    } else if (field === 'status' || field === 'notes') {
      extraShape[field] = zodField;
    }
  });

  return z.object({ ...companyShape, ...extraShape });
}

export function getCompanyStepFields(fieldConfigs: FieldConfig[]): string[] {
  return fieldConfigs
    .filter(
      (c) =>
        c.showInForm && COMPANY_KEYS.includes(c.key as (typeof COMPANY_KEYS)[number])
    )
    .map((c) => c.key);
}

export function getAssignmentStepFields(fieldConfigs: FieldConfig[]): string[] {
  const fields = ['assignedTo'];
  fieldConfigs.forEach((c) => {
    if (c.showInForm && (c.key === 'status' || c.key === 'notes')) {
      fields.push(c.key);
    }
  });
  return fields;
}

export { COMPANY_KEYS };
