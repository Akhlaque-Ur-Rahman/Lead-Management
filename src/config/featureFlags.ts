/**
 * Feature Flags Configuration
 * 
 * Centralized feature toggles for easy rollback and experimentation
 */

export const FEATURE_FLAGS = {
    /**
     * Enable/disable real-time Firestore listeners for leads and lostLeads
     * 
     * When false: Uses one-time getDocs() fetches
     * When true: Uses onSnapshot() for real-time updates
     * 
     * @default false
     */
    USE_LISTENERS: false,

    /**
     * Enable/disable lightweight event listener for real-time updates
     * 
     * @default true
     */
    USE_EVENT_LISTENER: true,

    /**
     * Enable/disable pagination UI and logic
     * 
     * When false: Loads all leads at once (up to MAX_LEADS_FETCH_LIMIT)
     * When true: Uses cursor-based pagination
     * 
     * @default false
     */
    ENABLE_PAGINATION: false,

    /**
     * Maximum number of leads to fetch in a single loadLeadsAll() call
     * 
     * Safety limit to prevent runaway queries and excessive memory usage
     * 
     * @default 5000
     */
    MAX_LEADS_FETCH_LIMIT: 5000,
} as const;

export type FeatureFlags = typeof FEATURE_FLAGS;
