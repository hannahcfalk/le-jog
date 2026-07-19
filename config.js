// Journey Configuration
// Activity data is loaded from /data/strava-activities.json.
// In production Cloud Run serves this from webhook-updated Cloud Storage.

const CONFIG = {
    // Journey configuration
    START_DATE: '2026-01-01', // January 1, 2026
    TOTAL_DISTANCE: 1407, // km from Land's End to John o' Groats
    WEEKLY_TARGET: 27 // km per week
};
