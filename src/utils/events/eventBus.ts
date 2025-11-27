import {
    collection,
    onSnapshot,
    query,
    where,
    orderBy,
    limit,
    addDoc,
    serverTimestamp,
    Firestore,
    Timestamp
} from 'firebase/firestore';
import type { User } from '../../components/AuthContext';

export type EventType = 'LEAD_UPDATE' | 'LEAD_ASSIGN' | 'LEAD_DELETE' | 'FOLLOWUP_ADD';

export interface SystemEvent {
    id?: string;
    type: EventType;
    companyId: string;
    actorId: string;
    payload?: any;
    createdAt: Timestamp;
}

export const subscribeToEvents = (
    db: Firestore,
    user: User,
    onEvent: (event: SystemEvent) => void
) => {
    if (!user.companyId) return () => { };

    // Listen to events for this company created in the last minute (to avoid fetching old history on reload)
    // Actually, we just want "new" events.
    // A simple way is to listen to the 'events' collection ordered by createdAt desc limit 1.
    // But for real-time, we just attach the listener.

    // Index: companyId + createdAt
    const eventsRef = collection(db, 'events');
    const q = query(
        eventsRef,
        where('companyId', '==', user.companyId),
        orderBy('createdAt', 'desc'),
        limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
                const eventData = change.doc.data() as SystemEvent;
                // Avoid reacting to own events if needed, but usually we want to refresh anyway to be safe
                // or we can optimistically update and ignore own events.
                // For now, let's just pass it through.
                onEvent(eventData);
            }
        });
    });

    return unsubscribe;
};

export const triggerUpdateEvent = async (
    db: Firestore,
    user: User,
    type: EventType,
    payload?: any
) => {
    if (!user.companyId) return;

    try {
        await addDoc(collection(db, 'events'), {
            type,
            companyId: user.companyId,
            actorId: user.id,
            payload: payload || {},
            createdAt: serverTimestamp()
        });
    } catch (error) {
        console.error("Failed to trigger update event:", error);
        // Non-blocking error, app should continue
    }
};
