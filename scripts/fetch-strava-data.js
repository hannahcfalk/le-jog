#!/usr/bin/env node

/**
 * Fetch Strava activities and generate static data file
 * This script is run by GitHub Actions to update the Strava data
 * It automatically refreshes the access token if needed
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration from environment variables
const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET;
const STRAVA_REFRESH_TOKEN = process.env.STRAVA_REFRESH_TOKEN;
const START_DATE = process.env.START_DATE || '2026-01-01';

// Validate required environment variables
if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET || !STRAVA_REFRESH_TOKEN) {
    console.error('Error: Required environment variables missing');
    console.error('Required: STRAVA_CLIENT_ID, STRAVA_CLIENT_SECRET, STRAVA_REFRESH_TOKEN');
    process.exit(1);
}

// Calculate timestamp for filtering activities
const startDate = new Date(START_DATE);
const startTimestamp = Math.floor(startDate.getTime() / 1000);

// Refresh the Strava access token
function refreshAccessToken() {
    return new Promise((resolve, reject) => {
        const postData = new URLSearchParams({
            client_id: STRAVA_CLIENT_ID,
            client_secret: STRAVA_CLIENT_SECRET,
            refresh_token: STRAVA_REFRESH_TOKEN,
            grant_type: 'refresh_token'
        }).toString();

        const options = {
            hostname: 'www.strava.com',
            path: '/oauth/token',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const tokenData = JSON.parse(data);
                        console.log('Successfully refreshed access token');
                        console.log(`New token expires at: ${new Date(tokenData.expires_at * 1000).toISOString()}`);
                        resolve(tokenData.access_token);
                    } catch (error) {
                        reject(new Error(`Failed to parse token response: ${error.message}`));
                    }
                } else {
                    reject(new Error(`Token refresh failed: ${res.statusCode} - ${data}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(new Error(`Token refresh request failed: ${error.message}`));
        });

        req.write(postData);
        req.end();
    });
}

// Fetch activities from Strava API
function fetchActivities(accessToken) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'www.strava.com',
            path: `/api/v3/athlete/activities?after=${startTimestamp}&per_page=200`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'User-Agent': 'LEJOG-Tracker'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                if (res.statusCode === 200) {
                    try {
                        const activities = JSON.parse(data);
                        resolve(activities);
                    } catch (error) {
                        reject(new Error(`Failed to parse JSON: ${error.message}`));
                    }
                } else {
                    reject(new Error(`Strava API error: ${res.statusCode} - ${data}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(new Error(`Request failed: ${error.message}`));
        });

        req.end();
    });
}

// Main execution
async function main() {
    try {
        console.log('Refreshing Strava access token...');
        const accessToken = await refreshAccessToken();

        console.log('Fetching Strava activities...');
        const activities = await fetchActivities(accessToken);

        // Filter for walking/hiking activities only
        const filteredActivities = activities.filter(activity =>
            activity.type === 'Walk' || activity.type === 'Hike'
        );

        console.log(`Found ${filteredActivities.length} walking/hiking activities`);

        // Create output data structure
        const outputData = {
            lastUpdated: new Date().toISOString(),
            startDate: START_DATE,
            activities: filteredActivities.map(activity => ({
                id: activity.id,
                name: activity.name,
                distance: activity.distance, // in meters
                type: activity.type,
                start_date: activity.start_date,
                moving_time: activity.moving_time,
                elapsed_time: activity.elapsed_time,
                total_elevation_gain: activity.total_elevation_gain
            }))
        };

        // Calculate total distance
        const totalDistance = filteredActivities.reduce((sum, activity) =>
            sum + (activity.distance / 1000), 0
        );

        outputData.totalDistance = totalDistance; // in km

        // Write to file
        const outputPath = path.join(__dirname, '..', 'data', 'strava-activities.json');
        fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));

        console.log(`Successfully wrote data to ${outputPath}`);
        console.log(`Total distance: ${totalDistance.toFixed(2)} km`);

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

main();
