import { api } from '../../api/client';

const CHUNK_SIZE = 10;

export async function checkForDuplicates(
  _db: unknown,
  leads: Partial<{ cin?: string; companyEmail?: string; companyName?: string; din?: string; mobile?: string }>[]
) {
  const fields = ['cin', 'companyEmail', 'companyName', 'din', 'mobile'] as const;
  const existingValues = new Set<string>();
  const skippedLeads: typeof leads = [];
  const uniqueLeads: typeof leads = [];

  for (const field of fields) {
    const values = leads
      .map((l) => l[field])
      .filter((v): v is string => !!v && v.trim() !== '');
    if (!values.length) continue;

    for (let i = 0; i < values.length; i += CHUNK_SIZE) {
      const chunk = values.slice(i, i + CHUNK_SIZE);
      const { duplicates } = await api.leads.checkDuplicates(field, chunk);
      duplicates.forEach((d) => existingValues.add(`${field}:${d.toLowerCase()}`));
    }
  }

  const seenInBatch = new Set<string>();
  for (const lead of leads) {
    let isDuplicate = false;
    for (const field of fields) {
      const val = lead[field];
      if (val && existingValues.has(`${field}:${val.toLowerCase()}`)) {
        isDuplicate = true;
        break;
      }
      const batchKey = `${field}:${(val || '').toLowerCase()}`;
      if (val && seenInBatch.has(batchKey)) {
        isDuplicate = true;
        break;
      }
      if (val) seenInBatch.add(batchKey);
    }
    if (isDuplicate) skippedLeads.push(lead);
    else uniqueLeads.push(lead);
  }

  return { uniqueLeads, duplicatesCount: skippedLeads.length, skippedLeads };
}
