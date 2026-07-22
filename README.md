# LEJOG 2026 Tracker

A website to track my journey walking 1,407 km from Land's End to John o' Groats, starting January 1, 2026.

The app is now designed for Google Cloud Run instead of static GitHub Pages. Cloud Run serves the website from the checked-in data file by default, with optional Strava webhook refreshes backed by Cloud Storage.

## Features

- Visual UK map showing the LEJOG route
- Progress tracking from Strava Walk and Hike activities
- Weekly target comparison (27 km/week)
- Optional Strava webhook endpoint for create/update/delete activity events
- Optional Cloud Storage-backed `data/strava-activities.json`
- Optional manual admin refresh endpoint for bootstrapping and recovery

## How It Works

1. The browser loads the site from Cloud Run.
2. `app.js` fetches `/data/strava-activities.json`.
3. Cloud Run serves that JSON from the checked-in file, or from Cloud Storage when `GCS_BUCKET` is configured.
4. If live refresh is configured, Strava sends activity events to `/strava/webhook`.
5. Cloud Run refreshes Strava data during the webhook request and overwrites the JSON object in Cloud Storage.

By default, webhook refreshes run inline so they keep working on Cloud Run services that only allocate CPU while a request is active. If you want the older debounced background behavior, set `WEBHOOK_REFRESH_MODE=background` and deploy Cloud Run with `--no-cpu-throttling` so the delayed refresh can keep running after the webhook response is sent.

## Strava Setup

1. Go to https://www.strava.com/settings/api and create an app.
2. Note your Client ID and Client Secret.
3. Authorize the app with the `read,activity:read` scope and get your refresh token.

Use this authorization URL, replacing `YOUR_CLIENT_ID` with your Strava Client ID:

```text
https://www.strava.com/oauth/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=http://localhost/exchange_token&approval_prompt=force&scope=read,activity:read
```

Helper script:

```bash
./scripts/get-strava-tokens.sh CLIENT_ID CLIENT_SECRET AUTH_CODE
```

## Minimal GCP Setup

Set your project and region:

```bash
export PROJECT_ID="your-gcp-project"
export REGION="your-cloud-run-region"
export SERVICE="le-jog-tracker"
```

Enable the required APIs:

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com --project "$PROJECT_ID"
```

Deploy to Cloud Run:

```bash
gcloud run deploy "$SERVICE" \
  --source . \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --allow-unauthenticated \
  --set-env-vars "START_DATE=2026-01-01"
```

Without `GCS_BUCKET`, Cloud Run serves the checked-in `data/strava-activities.json` file. That is enough for a basic deploy.

## Optional Live Strava Refresh

To refresh Strava data from Cloud Run and store it in Cloud Storage, create a bucket and Secret Manager secrets.

```bash
export GCS_BUCKET="your-lejog-tracker-bucket"

gcloud services enable secretmanager.googleapis.com storage.googleapis.com --project "$PROJECT_ID"

gcloud storage buckets create "gs://$GCS_BUCKET" --project "$PROJECT_ID" --location "$REGION"
```

Allow the Cloud Run runtime service account to read/write the data object and read secrets:

```bash
export PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
export RUNTIME_SERVICE_ACCOUNT="$PROJECT_NUMBER-compute@developer.gserviceaccount.com"

gcloud storage buckets add-iam-policy-binding "gs://$GCS_BUCKET" \
  --member "serviceAccount:$RUNTIME_SERVICE_ACCOUNT" \
  --role "roles/storage.objectAdmin"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member "serviceAccount:$RUNTIME_SERVICE_ACCOUNT" \
  --role "roles/secretmanager.secretAccessor"
```

Create Secret Manager secrets. Use a long random value for `STRAVA_VERIFY_TOKEN`; it must match the token used when creating the Strava webhook subscription.

```bash
printf "%s" "$STRAVA_CLIENT_ID" | gcloud secrets create STRAVA_CLIENT_ID --data-file=- --project "$PROJECT_ID"
printf "%s" "$STRAVA_CLIENT_SECRET" | gcloud secrets create STRAVA_CLIENT_SECRET --data-file=- --project "$PROJECT_ID"
printf "%s" "$STRAVA_REFRESH_TOKEN" | gcloud secrets create STRAVA_REFRESH_TOKEN --data-file=- --project "$PROJECT_ID"
printf "%s" "$STRAVA_VERIFY_TOKEN" | gcloud secrets create STRAVA_VERIFY_TOKEN --data-file=- --project "$PROJECT_ID"
printf "%s" "$ADMIN_REFRESH_TOKEN" | gcloud secrets create ADMIN_REFRESH_TOKEN --data-file=- --project "$PROJECT_ID"
```

Redeploy with the live refresh settings:

```bash
gcloud run deploy "$SERVICE" \
  --source . \
  --project "$PROJECT_ID" \
  --region "$REGION" \
  --allow-unauthenticated \
  --set-env-vars "START_DATE=2026-01-01,GCS_BUCKET=$GCS_BUCKET" \
  --set-secrets "STRAVA_CLIENT_ID=STRAVA_CLIENT_ID:latest,STRAVA_CLIENT_SECRET=STRAVA_CLIENT_SECRET:latest,STRAVA_REFRESH_TOKEN=STRAVA_REFRESH_TOKEN:latest,STRAVA_VERIFY_TOKEN=STRAVA_VERIFY_TOKEN:latest,ADMIN_REFRESH_TOKEN=ADMIN_REFRESH_TOKEN:latest"
```

If your Strava app provides a webhook signing secret, add it as `STRAVA_SIGNING_SECRET` and include it in the Cloud Run `--set-secrets` list. When configured, `server.js` rejects webhook POSTs whose `X-Strava-Signature` header is missing or invalid.

Seed the first data file:

```bash
export SERVICE_URL="$(gcloud run services describe "$SERVICE" --project "$PROJECT_ID" --region "$REGION" --format='value(status.url)')"

curl -X POST "$SERVICE_URL/admin/refresh" \
  -H "Authorization: Bearer $ADMIN_REFRESH_TOKEN"
```

Create the Strava webhook subscription:

```bash
./scripts/create-strava-webhook.sh \
  "$STRAVA_CLIENT_ID" \
  "$STRAVA_CLIENT_SECRET" \
  "$SERVICE_URL/strava/webhook" \
  "$STRAVA_VERIFY_TOKEN"
```

In the Strava app settings, set the Authorization Callback Domain to the Cloud Run domain without the protocol, for example `le-jog-tracker-abc123-ew.a.run.app`.

## GCP Linked Repo Deploys

If you linked this GitHub repository directly in Google Cloud, GCP handles deploys when you push to the configured branch. In that setup, you do not need a GitHub Actions deploy workflow or GitHub Actions GCP auth secrets.

The default deploy can use the checked-in data file only. Add the optional Cloud Storage and Secret Manager settings above when you want live Strava refreshes from Cloud Run.

## Local Development

Run the Cloud Run-style server locally:

```bash
npm start
```

Visit http://localhost:8080.

Without `GCS_BUCKET`, the server reads and writes `data/strava-activities.json` locally.

Refresh local Strava data:

```bash
export STRAVA_CLIENT_ID="your_client_id"
export STRAVA_CLIENT_SECRET="your_client_secret"
export STRAVA_REFRESH_TOKEN="your_refresh_token"
export START_DATE="2026-01-01"

npm run fetch:strava
```

Test the webhook validation handler:

```bash
curl "http://localhost:8080/strava/webhook?hub.mode=subscribe&hub.challenge=test-challenge&hub.verify_token=$STRAVA_VERIFY_TOKEN"
```

## Files

### Website

- `index.html` - Main website structure
- `styles.css` - Styling and layout
- `app.js` - Application logic and map drawing
- `config.js` - Journey configuration
- `data/strava-activities.json` - Local fallback activity data

### Cloud Run

- `server.js` - Static server, JSON endpoint, Strava webhook, admin refresh
- `Dockerfile` - Container definition
- `.gcloudignore` - Source deploy ignore list

### Scripts

- `scripts/strava-data.js` - Shared Strava refresh/data shaping module
- `scripts/fetch-strava-data.js` - Manual local JSON refresh
- `scripts/get-strava-tokens.sh` - Helper to get initial tokens
- `scripts/create-strava-webhook.sh` - Helper to create the Strava webhook subscription

## Troubleshooting

**No activities showing on the site**

- For the minimal deploy, check `data/strava-activities.json`.
- For live refresh, run the admin refresh endpoint and check Cloud Run logs.
- For live refresh, check that `GCS_BUCKET` is set on the Cloud Run service.
- For live refresh, check that the Cloud Run runtime service account can read and write the bucket.
- Verify you have Walk or Hike activities after January 1, 2026.

**Webhook succeeds but the page stays old**

- Check Cloud Run logs for `Starting Strava data refresh` after the webhook POST.
- Keep the default `WEBHOOK_REFRESH_MODE=inline` unless you have deployed with always-allocated CPU.
- If you use `WEBHOOK_REFRESH_MODE=background`, deploy with `--no-cpu-throttling`.
- If you set `GCS_CACHE_TTL_MS`, wait for that cache window or remove it to read Cloud Storage on every data request.

**Webhook subscription fails**

- Test the validation URL with `curl`.
- Confirm `STRAVA_VERIFY_TOKEN` in Secret Manager matches the token passed to Strava.
- Confirm the callback URL is exactly `$SERVICE_URL/strava/webhook`.

**Token errors**

- Re-run the OAuth flow with `scope=read,activity:read`.
- Update the `STRAVA_REFRESH_TOKEN` secret with the new refresh token.

**`activity:read_permission` missing**

- The token was authorized with `read` only.
- Reauthorize with `scope=read,activity:read`.
- Use `activity:read_all` only if you want to include activities marked "Only Me".

## References

- Strava Webhook Events API: https://developers.strava.com/docs/webhooks/
- Strava API Getting Started: https://developers.strava.com/docs/getting-started/

## License

Personal project - feel free to use as inspiration for your own journey tracker.
