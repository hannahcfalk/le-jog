// Journey Configuration
// Activity data is loaded from /data/strava-activities.json.
// In production Cloud Run serves this from webhook-updated Cloud Storage.

const CONFIG = {
    // Journey configuration
    START_DATE: '2026-01-01', // January 1, 2026
    TOTAL_DISTANCE: 1407, // km from Land's End to John o' Groats
    WEEKLY_TARGET: 27, // km per week before the adjusted plan starts

    // Adjusted target plan based on 669.51 km remaining on August 25, 2026.
    TARGET_PLAN: {
        START_DATE: '2026-08-24', // week ending August 30, 2026
        REMAINING_AT_START: 669.51,
        REDUCED_TARGET_END_DATE: '2026-10-11', // week ending October 11, 2026
        REDUCED_WEEKLY_TARGET: 15,
        FINISH_DATE: '2026-12-31'
    }
};
