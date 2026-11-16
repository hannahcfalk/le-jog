// Journey Configuration Template
// Activity data is now loaded from data/strava-activities.json
// The data is automatically updated weekly via GitHub Actions

const CONFIG = {
    // Journey configuration
    START_DATE: '2026-01-01', // January 1, 2026
    TOTAL_DISTANCE: 1407, // km from Land's End to John o' Groats
    WEEKLY_TARGET: 27, // km per week before the adjusted plan starts

    // Spread the distance remaining at the start of this week over five equal weeks.
    TARGET_PLAN: {
        START_DATE: '2026-11-16',
        FINISH_DATE: '2026-12-20'
    }
};
