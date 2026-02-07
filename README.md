# LEJOG 2026 Tracker

A website to track my journey walking 1,407 km from Land's End to John o' Groats, starting January 1, 2026.

## Features

- 🗺️ Visual map showing the UK with the LEJOG route
- 📊 Progress tracking from Strava walking activities
- 🎯 Weekly target comparison (27 km/week)
- 📈 Progress statistics and journey details
- 🔄 Automatic weekly data updates via GitHub Actions
- 🔒 Secure token management (never expires!)

## Quick Setup (5 minutes)

### 1. Get Your Strava API Credentials

1. Go to https://www.strava.com/settings/api and create an app
2. Note your **Client ID** and **Client Secret**
3. Authorize the app and get your **Refresh Token**

💡 **Helper script**: Use `./scripts/get-strava-tokens.sh` to easily extract your tokens

### 2. Deploy to GitHub Pages

1. Create a new repository on GitHub (e.g., `lejog-tracker`)

2. Push this code to GitHub:
```bash
git add .
git commit -m "Initial commit - LEJOG tracker"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/lejog-tracker.git
git push -u origin main
```

3. Enable GitHub Pages:
   - Go to **Settings** → **Pages**
   - Select branch: `main`, folder: `/ (root)`
   - Click **Save**

### 3. Add GitHub Secrets

Your Strava credentials need to be added as secrets for automatic updates:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add three secrets:
   - `STRAVA_CLIENT_ID` - Your Strava Client ID
   - `STRAVA_CLIENT_SECRET` - Your Strava Client Secret
   - `STRAVA_REFRESH_TOKEN` - Your Strava Refresh Token

### 4. Trigger First Data Update

Go to **Actions** tab → **Update Strava Data** → **Run workflow**

Your site will be live at: `https://YOUR_USERNAME.github.io/lejog-tracker/`

## How It Works

### Automatic Data Updates 🔄

- GitHub Actions workflow runs **every Monday at 6 AM UTC**
- Automatically **refreshes your Strava access token** (never expires!)
- Fetches your Walk/Hike activities since January 1, 2026
- Generates `data/strava-activities.json` with your progress
- Commits the updated data file to your repository

### Security 🔒

✅ **Secure**: Your Strava credentials are stored in GitHub Secrets, never in code
✅ **Private**: Tokens are never exposed publicly
✅ **Simple**: The website only reads static JSON data
✅ **Reliable**: Automatic token refresh means it never breaks

## Files

### Website
- `index.html` - Main website structure
- `styles.css` - Styling and layout
- `app.js` - Application logic and map drawing
- `config.js` - Journey configuration (dates, distances, targets)
- `data/strava-activities.json` - Static activity data (auto-generated)

### Automation
- `.github/workflows/update-strava-data.yml` - GitHub Actions workflow
- `scripts/fetch-strava-data.js` - Fetches and generates activity data
- `scripts/get-strava-tokens.sh` - Helper to get initial tokens

### Documentation
- `scripts/README.md` - Script documentation

## Customization

You can customize the journey parameters in `config.js`:
- `START_DATE` - When your journey began
- `TOTAL_DISTANCE` - Total distance in km
- `WEEKLY_TARGET` - How many km you aim to walk per week

## Troubleshooting

**No activities showing on the site**
- Manually trigger the workflow: **Actions** → **Update Strava Data** → **Run workflow**
- Check that you have Walk or Hike activities after January 1, 2026
- Verify activities are not set to private in Strava

**Workflow fails with token errors**
- Your refresh token may have been revoked
- Re-run the OAuth flow to get a new refresh token
- Update the `STRAVA_REFRESH_TOKEN` secret in GitHub

**Data not updating automatically**
- Check the **Actions** tab for workflow run status
- Verify all three secrets are correctly added in GitHub
- View workflow logs for detailed error messages

**Map not displaying**
- Check browser console for JavaScript errors
- Ensure `data/strava-activities.json` exists

## Local Testing

Test the data fetch script locally:

```bash
export STRAVA_CLIENT_ID="your_client_id"
export STRAVA_CLIENT_SECRET="your_client_secret"
export STRAVA_REFRESH_TOKEN="your_refresh_token"
export START_DATE="2026-01-01"

node scripts/fetch-strava-data.js
```

## License

Personal project - feel free to use as inspiration for your own journey tracker!
