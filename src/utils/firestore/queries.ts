import {
    collection,
    query,
    where,
    orderBy,
    limit,
    Query,
    DocumentData,
    Firestore
} from 'firebase/firestore';
import type { User } from '../../components/AuthContext';

const MAX_LEADS_LIMIT = 5000;

export const buildLeadsQuery = (db: Firestore, user: User, limitVal: number = MAX_LEADS_LIMIT, view?: string): Query<DocumentData> => {
    const leadsRef = collection(db, 'leads');

    // Super Admin: See all (with limit)
    if (user.role === 'super_admin') {
        return query(leadsRef, orderBy('createdAt', 'desc'), limit(limitVal));
    }

    // Sales User:
    if (user.role === 'sales_user') {
        // Special Case: View Lost Leads
        if (view === 'lost') {
            // Note: We avoid orderBy('createdAt') here to prevent needing a composite index (lostBy + createdAt).
            // Data will be unsorted from Firestore, but client-side sorting can handle it if needed.
            return query(
                leadsRef,
                where('lostBy', '==', user.id),
                limit(limitVal)
            );
        }

        // Default: See ONLY assigned leads
        return query(
            leadsRef,
            where('assignedTo', '==', user.id),
            orderBy('createdAt', 'desc'),
            limit(limitVal)
        );
    }

    // Company Admin / Team Lead: See all leads for their company
    if (user.companyId) {
        return query(
            leadsRef,
            where('companyId', '==', user.companyId),
            orderBy('createdAt', 'desc'),
            limit(limitVal)
        );
    }

    return query(leadsRef, limit(10));
};
