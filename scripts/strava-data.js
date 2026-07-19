const fs = require('fs');
const path = require('path');

const DEFAULT_START_DATE = '2026-01-01';
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'strava-activities.json');
const ACTIVITY_TYPES = new Set(['Walk', 'Hike']);

function buildStravaApiError(action, statusCode, data) {
    let parsedError;

    try {
        parsedError = JSON.parse(data);
    } catch {
        return new Error(`${action} failed: ${statusCode} - ${data}`);
    }

    const inactiveApplication = parsedError.errors?.some(error =>
        error.resource === 'Application' &&
        error.field === 'Status' &&
        error.code === 'Inactive'
    );

    if (statusCode === 403 && inactiveApplication) {
        return new Error([
            `${action} failed: Strava rejected this app because its API status is inactive.`,
            'Open the Strava app settings for STRAVA_CLIENT_ID and reactivate/approve the application before retrying.',
            `Raw response: ${data}`
        ].join('\n'));
    }

    const missingActivityReadPermission = parsedError.errors?.some(error =>
        error.resource === 'AccessToken' &&
        error.field === 'activity:read_permission' &&
        error.code === 'missing'
    );

    if (statusCode === 401 && missingActivityReadPermission) {
        return new Error([
            `${action} failed: this token is missing Strava's activity:read scope.`,
            'Reauthorize the Strava app with scope read,activity:read, then update STRAVA_REFRESH_TOKEN with the new refresh token.',
            'Use activity:read_all instead of activity:read only if you want to include activities marked "Only Me".',
            `Raw response: ${data}`
        ].join('\n'));
    }

    return new Error(`${action} failed: ${statusCode} - ${data}`);
}

function getRequiredConfig(env = process.env) {
    const config = {
        clientId: env.STRAVA_CLIENT_ID,
        clientSecret: env.STRAVA_CLIENT_SECRET,
        refreshToken: env.STRAVA_REFRESH_TOKEN,
        startDate: env.START_DATE || DEFAULT_START_DATE
    };

    const missing = Object.entries({
        STRAVA_CLIENT_ID: config.clientId,
        STRAVA_CLIENT_SECRET: config.clientSecret,
        STRAVA_REFRESH_TOKEN: config.refreshToken
    })
        .filter(([, value]) => !value)
        .map(([key]) => key);

    if (missing.length > 0) {
        throw new Error(`Required environment variables missing: ${missing.join(', ')}`);
    }

    return config;
}

async function parseJsonResponse(response, action) {
    const text = await response.text();

    if (!response.ok) {
        throw buildStravaApiError(action, response.status, text);
    }

    try {
        return JSON.parse(text);
    } catch (error) {
        throw new Error(`${action} failed: could not parse JSON response: ${error.message}`);
    }
}

async function refreshAccessToken(config, logger = console) {
    const body = new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: config.refreshToken,
        grant_type: 'refresh_token'
    });

    const response = await fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body
    });

    const tokenData = await parseJsonResponse(response, 'Token refresh');
    logger.log('Successfully refreshed Strava access token');
    logger.log(`New token expires at: ${new Date(tokenData.expires_at * 1000).toISOString()}`);

    return tokenData.access_token;
}

async function fetchActivities(accessToken, startDate, logger = console) {
    const startTimestamp = Math.floor(new Date(startDate).getTime() / 1000);
    const activities = [];
    let page = 1;

    while (true) {
        const url = new URL('https://www.strava.com/api/v3/athlete/activities');
        url.searchParams.set('after', String(startTimestamp));
        url.searchParams.set('per_page', '200');
        url.searchParams.set('page', String(page));

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'User-Agent': 'LEJOG-Tracker'
            }
        });

        const pageActivities = await parseJsonResponse(response, 'Activity fetch');
        activities.push(...pageActivities);
        logger.log(`Fetched Strava activities page ${page}: ${pageActivities.length}`);

        if (pageActivities.length < 200) {
            break;
        }

        page += 1;
    }

    return activities;
}

function shapeActivities(activities, startDate) {
    const filteredActivities = activities.filter(activity => ACTIVITY_TYPES.has(activity.type));
    const totalDistance = filteredActivities.reduce((sum, activity) =>
        sum + (activity.distance / 1000), 0
    );

    return {
        lastUpdated: new Date().toISOString(),
        startDate,
        activities: filteredActivities.map(activity => ({
            id: activity.id,
            name: activity.name,
            distance: activity.distance,
            type: activity.type,
            start_date: activity.start_date,
            moving_time: activity.moving_time,
            elapsed_time: activity.elapsed_time,
            total_elevation_gain: activity.total_elevation_gain
        })),
        totalDistance
    };
}

async function fetchStravaData(env = process.env, logger = console) {
    const config = getRequiredConfig(env);
    logger.log('Refreshing Strava access token...');
    const accessToken = await refreshAccessToken(config, logger);

    logger.log('Fetching Strava activities...');
    const activities = await fetchActivities(accessToken, config.startDate, logger);
    const outputData = shapeActivities(activities, config.startDate);

    logger.log(`Found ${outputData.activities.length} walking/hiking activities`);
    logger.log(`Total distance: ${outputData.totalDistance.toFixed(2)} km`);

    return outputData;
}

function writeDataFile(data, outputPath = OUTPUT_PATH) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    return outputPath;
}

module.exports = {
    DEFAULT_START_DATE,
    OUTPUT_PATH,
    buildStravaApiError,
    fetchStravaData,
    writeDataFile
};
