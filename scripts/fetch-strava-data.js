#!/usr/bin/env node

/**
 * Fetch Strava activities and generate the JSON data file.
 *
 * This remains useful for local refreshes and the legacy manual GitHub Action.
 * The Cloud Run server reuses the same Strava fetching logic for webhook-driven
 * updates.
 */

const { fetchStravaData, writeDataFile } = require('./strava-data');

async function main() {
    try {
        const outputData = await fetchStravaData(process.env, console);
        const outputPath = writeDataFile(outputData);
        console.log(`Successfully wrote data to ${outputPath}`);
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

main();
