export const initBackgroundSync = (onSyncNeeded: () => void) => {
    let lastVisibleTime = Date.now();
    const SYNC_THRESHOLD_MS = 15000; // 15 seconds

    const handleVisibilityChange = () => {
        if (document.hidden) {
            lastVisibleTime = Date.now();
        } else {
            const now = Date.now();
            const timeHidden = now - lastVisibleTime;

            if (timeHidden > SYNC_THRESHOLD_MS) {
                console.log(`Tab was hidden for ${timeHidden}ms. Triggering sync.`);
                onSyncNeeded();
            }
        }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
};
