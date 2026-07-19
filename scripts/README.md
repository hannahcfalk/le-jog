# Strava Data Scripts

This directory contains helpers for Strava OAuth, data refreshes, and webhook subscription setup.

## fetch-strava-data.js

Fetches Walk and Hike activities from Strava and generates `data/strava-activities.json`.

The Cloud Run server uses the same shared logic in `scripts/strava-data.js`, but this script is still useful for local testing and manual recovery.

Authorize the Strava app with the `read,activity:read` scope before generating a refresh token:

```text
https://www.strava.com/oauth/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=http://localhost/exchange_token&approval_prompt=force&scope=read,activity:read
```

```bash
export STRAVA_CLIENT_ID="your_client_id"
export STRAVA_CLIENT_SECRET="your_client_secret"
export STRAVA_REFRESH_TOKEN="your_refresh_token"
export START_DATE="2026-01-01"

node scripts/fetch-strava-data.js
```

## create-strava-webhook.sh

Creates a Strava webhook subscription for the deployed Cloud Run service.

```bash
./scripts/create-strava-webhook.sh \
  "$STRAVA_CLIENT_ID" \
  "$STRAVA_CLIENT_SECRET" \
  "$SERVICE_URL/strava/webhook" \
  "$STRAVA_VERIFY_TOKEN"
```

Strava will validate the callback by sending a GET request with `hub.challenge`; `server.js` echoes that challenge when `hub.verify_token` matches `STRAVA_VERIFY_TOKEN`.

If `STRAVA_SIGNING_SECRET` is configured, `server.js` also verifies the `X-Strava-Signature` header on webhook POSTs before scheduling a refresh.

## Output

The generated data has this shape:

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
  "totalDistance": 5
}
```

## Troubleshooting

If logs show an inactive application error, open the Strava app settings for `STRAVA_CLIENT_ID`, reactivate or approve the application, then retry.

If logs show `activity:read_permission` missing, the refresh token was authorized with `read` only. Reauthorize with `scope=read,activity:read`, exchange the new authorization code, and update the `STRAVA_REFRESH_TOKEN` secret.
