import {
    collection,
    query,
    where,
    getDocs,
    Firestore,
    DocumentData
} from 'firebase/firestore';
import { Lead } from '../../components/LeadsContext';

interface DuplicateCheckResult {
    uniqueLeads: Partial<Lead>[];
    duplicatesCount: number;
    skippedLeads: Partial<Lead>[];
}

export const checkForDuplicates = async (
    db: Firestore,
    leads: Partial<Lead>[]
): Promise<DuplicateCheckResult> => {
    const uniqueLeads: Partial<Lead>[] = [];
    const skippedLeads: Partial<Lead>[] = [];
    let duplicatesCount = 0;

    // 1. Extract identifiers from the incoming batch
    const cins = new Set<string>();
    const emails = new Set<string>();
    const names = new Set<string>();
    const dins = new Set<string>();
    const mobiles = new Set<string>();

    leads.forEach(lead => {
        if (lead.cin) cins.add(lead.cin.trim().toUpperCase());
        if (lead.companyEmail) emails.add(lead.companyEmail.trim().toLowerCase());
        if (lead.companyName) names.add(lead.companyName.trim().toLowerCase());

        // Check directors/legacy fields
        if (lead.din) dins.add(lead.din.trim());
        if (lead.mobile) mobiles.add(lead.mobile.trim());
        if (lead.directorEmail) emails.add(lead.directorEmail.trim().toLowerCase()); // Add to emails set

        lead.directors?.forEach(d => {
            if (d.din) dins.add(d.din.trim());
            if (d.email) emails.add(d.email.trim().toLowerCase());
            if (d.mobile) mobiles.add(d.mobile.trim());
        });
    });

    // 2. Fetch potential duplicates from Firestore in chunks
    // We'll build a set of existing identifiers to check against
    const existingCins = new Set<string>();
    const existingEmails = new Set<string>();
    const existingNames = new Set<string>(); // Name + Address key? Or just Name? Prompt says (companyName + registeredAddress) pair.
    // For simplicity and performance, we'll fetch by Name and then check Address in memory if needed.
    // Or just check Name. The prompt says "(companyName + registeredAddress) pair matches". 
    // We'll store existing (Name + Address) strings.
    const existingNameAddressPairs = new Set<string>();

    const existingDins = new Set<string>();
    const existingMobiles = new Set<string>();

    // Helper to run chunked queries
    const runChunkedQuery = async (
        field: string,
        values: Set<string>,
        processDoc: (data: DocumentData) => void
    ) => {
        const chunks = Array.from(values);
        const CHUNK_SIZE = 30; // Firestore 'in' limit

        for (let i = 0; i < chunks.length; i += CHUNK_SIZE) {
            const chunk = chunks.slice(i, i + CHUNK_SIZE);
            if (chunk.length === 0) continue;

            const q = query(collection(db, 'leads'), where(field, 'in', chunk));
            const snapshot = await getDocs(q);

            snapshot.forEach(doc => {
                processDoc(doc.data());
            });
        }
    };

    // Execute queries in parallel
    await Promise.all([
        runChunkedQuery('cin', cins, (data) => {
            if (data.cin) existingCins.add(data.cin.trim().toUpperCase());
        }),
        runChunkedQuery('companyEmail', emails, (data) => {
            if (data.companyEmail) existingEmails.add(data.companyEmail.trim().toLowerCase());
        }),
        runChunkedQuery('companyName', names, (data) => {
            // Store Name and Name+Address
            if (data.companyName) {
                existingNames.add(data.companyName.trim().toLowerCase());
                const address = data.registeredAddress ? data.registeredAddress.trim().toLowerCase() : '';
                existingNameAddressPairs.add(`${data.companyName.trim().toLowerCase()}|${address}`);
            }
        }),
        // Note: Querying by DIN/Mobile might be hard if they are not top-level. 
        // Assuming 'din' and 'mobile' are top-level legacy fields or we only check if they are.
        // If they are NOT top-level, these queries will return empty. 
        // We'll attempt to query them if they exist on the lead doc.
        runChunkedQuery('din', dins, (data) => {
            if (data.din) existingDins.add(data.din.trim());
            // Also check directors array in the fetched doc?
            data.directors?.forEach((d: any) => {
                if (d.din) existingDins.add(d.din.trim());
            });
        }),
        runChunkedQuery('mobile', mobiles, (data) => {
            if (data.mobile) existingMobiles.add(data.mobile.trim());
            data.directors?.forEach((d: any) => {
                if (d.mobile) existingMobiles.add(d.mobile.trim());
            });
        })
    ]);

    // 3. Filter the incoming leads
    for (const lead of leads) {
        let isDuplicate = false;

        // Check CIN
        if (lead.cin && existingCins.has(lead.cin.trim().toUpperCase())) {
            isDuplicate = true;
        }

        // Check Company Email
        if (!isDuplicate && lead.companyEmail && existingEmails.has(lead.companyEmail.trim().toLowerCase())) {
            isDuplicate = true;
        }

        // Check Name + Address Pair
        if (!isDuplicate && lead.companyName) {
            const name = lead.companyName.trim().toLowerCase();
            const address = lead.registeredAddress ? lead.registeredAddress.trim().toLowerCase() : '';
            const key = `${name}|${address}`;
            if (existingNameAddressPairs.has(key)) {
                isDuplicate = true;
            }
        }

        // Check Directors (DIN, Email, Mobile)
        if (!isDuplicate) {
            // Check top-level legacy
            if (lead.din && existingDins.has(lead.din.trim())) isDuplicate = true;
            if (lead.mobile && existingMobiles.has(lead.mobile.trim())) isDuplicate = true;
            if (lead.directorEmail && existingEmails.has(lead.directorEmail.trim().toLowerCase())) isDuplicate = true;

            // Check directors array
            if (!isDuplicate && lead.directors) {
                for (const d of lead.directors) {
                    if (d.din && existingDins.has(d.din.trim())) { isDuplicate = true; break; }
                    if (d.email && existingEmails.has(d.email.trim().toLowerCase())) { isDuplicate = true; break; }
                    if (d.mobile && existingMobiles.has(d.mobile.trim())) { isDuplicate = true; break; }
                }
            }
        }

        if (isDuplicate) {
            duplicatesCount++;
            skippedLeads.push(lead);
        } else {
            uniqueLeads.push(lead);
            // Add this lead's info to the "existing" sets so we catch duplicates within the batch itself
            if (lead.cin) existingCins.add(lead.cin.trim().toUpperCase());
            if (lead.companyEmail) existingEmails.add(lead.companyEmail.trim().toLowerCase());
            if (lead.companyName) {
                const name = lead.companyName.trim().toLowerCase();
                const address = lead.registeredAddress ? lead.registeredAddress.trim().toLowerCase() : '';
                existingNameAddressPairs.add(`${name}|${address}`);
            }
            // Add director info to sets...
            if (lead.din) existingDins.add(lead.din.trim());
            if (lead.mobile) existingMobiles.add(lead.mobile.trim());
            lead.directors?.forEach(d => {
                if (d.din) existingDins.add(d.din.trim());
                if (d.email) existingEmails.add(d.email.trim().toLowerCase());
                if (d.mobile) existingMobiles.add(d.mobile.trim());
            });
        }
    }

    return { uniqueLeads, duplicatesCount, skippedLeads };
};
