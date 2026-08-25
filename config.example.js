// Journey Configuration Template
// Activity data is now loaded from data/strava-activities.json
// The data is automatically updated weekly via GitHub Actions

const CONFIG = {
    // Journey configuration
    START_DATE: '2026-01-01', // January 1, 2026
    TOTAL_DISTANCE: 1407, // km from Land's End to John o' Groats
    WEEKLY_TARGET: 27, // km per week before the adjusted plan starts

    // Optional adjusted target plan.
    TARGET_PLAN: {
        START_DATE: '2026-08-24',
        REMAINING_AT_START: 669.51,
        REDUCED_TARGET_END_DATE: '2026-10-11',
        REDUCED_WEEKLY_TARGET: 15,
        FINISH_DATE: '2026-12-31'
    }
};
