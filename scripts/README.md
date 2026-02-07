# Strava Data Scripts

This directory contains scripts for fetching and updating Strava activity data.

## fetch-strava-data.js

Fetches walking and hiking activities from the Strava API and generates a static JSON data file.

**Features:**
- Automatically refreshes the Strava access token using the refresh token
- Filters for Walk and Hike activities only
- Generates a clean JSON data file for the website

### Usage

The script is designed to run automatically via GitHub Actions, but you can also run it manually:

```bash
# Set environment variables
export STRAVA_CLIENT_ID="your_client_id"
export STRAVA_CLIENT_SECRET="your_client_secret"
export STRAVA_REFRESH_TOKEN="your_refresh_token"
export START_DATE="2026-01-01"

# Run the script
node scripts/fetch-strava-data.js
```

### Output

The script generates `data/strava-activities.json` with the following structure:

```json
{
  "lastUpdated": "2026-02-07T12:00:00.000Z",
  "startDate": "2026-01-01",
  "activities": [
    {
      "id": 123456789,
      "name": "Morning Walk",
      "distance": 5000,
      "type": "Walk",
      "start_date": "2026-01-15T08:30:00Z",
      "moving_time": 3600,
      "elapsed_time": 3600,
      "total_elevation_gain": 50
    }
  ],
  "totalDistance": 5.0
}
```

## GitHub Actions Workflow

The workflow automatically runs:
- Every Monday at 6 AM UTC
- Can be manually triggered from the Actions tab in GitHub

The workflow fetches the latest Strava data and commits any updates to the repository.
