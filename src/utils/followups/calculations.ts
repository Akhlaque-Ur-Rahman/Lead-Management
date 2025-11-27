import type { Lead } from '../../components/LeadsContext';

export const calculateNextFollowUpDate = (lead: Lead): string | null => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const futureActiveFollowUps: { date: string, time: string }[] = [];

    lead.directors?.forEach(director => {
        (director.followUps || []).forEach(followUp => {
            const isActive = !followUp.status || followUp.status === "active";
            if (isActive && new Date(followUp.date) >= today) {
                futureActiveFollowUps.push({ date: followUp.date, time: followUp.time });
            }
        });
    });

    if (futureActiveFollowUps.length === 0) return null;

    // Sort and return earliest
    futureActiveFollowUps.sort((a, b) => {
        return new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime();
    });

    return futureActiveFollowUps[0].date;
};
