import type { User } from '../../components/AuthContext';
import { api } from '../../api/client';

export type EventType = 'LEAD_UPDATE' | 'LEAD_ASSIGN' | 'LEAD_DELETE' | 'FOLLOWUP_ADD';

export interface SystemEvent {
  id?: string;
  type: EventType;
  companyId: string;
  actorId: string;
  payload?: any;
  createdAt: string;
}

export const subscribeToEvents = (
  _db: unknown,
  user: User,
  onEvent: (event: SystemEvent) => void
) => {
  if (!user.companyId) return () => {};

  let lastSeen = new Date().toISOString();
  const interval = setInterval(async () => {
    try {
      const { event } = await api.events.latest(lastSeen);
      if (event && event.id) {
        lastSeen = event.createdAt;
        onEvent(event);
      }
    } catch {
      /* ignore polling errors */
    }
  }, 3000);

  return () => clearInterval(interval);
};

export const triggerUpdateEvent = async (
  _db: unknown,
  user: User,
  type: EventType,
  payload?: any
) => {
  if (!user.companyId) return;
  try {
    await api.events.emit(type, payload);
  } catch (error) {
    console.error('Failed to trigger update event:', error);
  }
};
