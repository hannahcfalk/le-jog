# LEJOG 2026 Tracker

A website to track my journey walking 1,407 km from Land's End to John o' Groats, starting January 1, 2026.

## Features

- Visual map showing the UK with the LEJOG route
- Real-time progress tracking from Strava walking activities
- Weekly target comparison (27 km/week)
- Progress statistics and journey details

## Setup Instructions

### 1. Get Your Strava API Credentials

Follow the detailed instructions in [STRAVA_SETUP.md](STRAVA_SETUP.md) to:
1. Create a Strava API application
2. Get your access token
3. Configure it in the website

### 2. Configure the Website

1. Open `config.js`
2. Replace `YOUR_ACCESS_TOKEN_HERE` with your actual Strava access token from step 1:

```javascript
STRAVA_ACCESS_TOKEN: 'your_actual_token_here',
```

### 3. Test Locally

Open `index.html` in your web browser to test the site locally. If everything is configured correctly, you should see:
- A map of the UK with the LEJOG route
- Your current walking progress from Strava
- Statistics comparing your actual progress to the target

### 4. Deploy to GitHub Pages

#### Option A: Using Git (Recommended)

1. Create a new repository on GitHub (e.g., `lejog-tracker`)

2. Initialize git in this directory and push to GitHub:
```bash
git init
git add .
git commit -m "Initial commit - LEJOG tracker"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/lejog-tracker.git
git push -u origin main
```

3. Enable GitHub Pages:
   - Go to your repository on GitHub
   - Click "Settings" > "Pages"
   - Under "Source", select "Deploy from a branch"
   - Select branch: `main` and folder: `/ (root)`
   - Click "Save"

4. Your site will be live at: `https://YOUR_USERNAME.github.io/lejog-tracker/`

#### Option B: Manual Upload

1. Create a new repository on GitHub
2. Click "uploading an existing file"
3. Drag and drop all files: `index.html`, `styles.css`, `app.js`, `config.js`
4. Commit the files
5. Enable GitHub Pages as described above

### 5. Update Your Strava App Settings

Once your site is deployed:
1. Go back to https://www.strava.com/settings/api
2. Update your application's "Website" to your GitHub Pages URL
3. Update "Authorization Callback Domain" to `YOUR_USERNAME.github.io`

## Security Note

Your Strava access token is stored in `config.js` and will be visible to anyone who views the page source. This is acceptable for a personal project, but be aware:

- Only your own Strava data is accessible with this token
- Anyone could potentially use your token to view your activities
- For a public-facing application, you'd want to use a backend server to hide the token

If you prefer more security, you can:
1. Make your GitHub repository private (site will still be public)
2. Implement a backend proxy to hide your token
3. Regenerate your token periodically

## Files

- `index.html` - Main website structure
- `styles.css` - Styling and layout
- `app.js` - Application logic, Strava integration, map drawing
- `config.js` - Configuration (Strava token, journey settings)
- `STRAVA_SETUP.md` - Detailed Strava API setup guide

## Customization

You can customize the journey parameters in `config.js`:
- `START_DATE` - When your journey began
- `TOTAL_DISTANCE` - Total distance in km
- `WEEKLY_TARGET` - How many km you aim to walk per week

## Troubleshooting

**"Please configure your Strava access token"**
- Make sure you've replaced `YOUR_ACCESS_TOKEN_HERE` in `config.js` with your actual token

**"Invalid access token"**
- Your token may have expired (they last ~6 hours)
- Follow Step 3 in STRAVA_SETUP.md to get a new token

**No activities showing**
- Make sure your Strava activities are marked as "Walk" or "Hike"
- Check that activities are dated after January 1, 2026
- Verify your activities are not set to private

**Map not displaying**
- Check browser console for JavaScript errors
- Make sure all files are in the same directory

## License

Personal project - feel free to use as inspiration for your own journey tracker!
