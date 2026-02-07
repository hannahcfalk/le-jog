# Strava API Setup Guide

Follow these steps to get your Strava API credentials for the LEJOG tracker.

## Step 1: Create a Strava API Application

1. Go to https://www.strava.com/settings/api
2. Log in to your Strava account if needed
3. Fill in the application creation form:
   - **Application Name**: `LEJOG Tracker` (or any name you prefer)
   - **Category**: `Other`
   - **Club**: Leave empty
   - **Website**: `http://localhost` (or your GitHub Pages URL once deployed)
   - **Authorization Callback Domain**: `localhost` (or your domain)
   - **Application Description**: `Personal tracker for my Land's End to John o' Groats walk`
4. Click "Create"

## Step 2: Note Your Credentials

After creating the app, you'll see:
- **Client ID**: A number (e.g., 123456)
- **Client Secret**: A string of characters

Keep these safe - you'll need them in the next step.

## Step 3: Get Your Access Token

1. Open your browser and paste this URL (replace `YOUR_CLIENT_ID` with your actual Client ID):

```
https://www.strava.com/oauth/authorize?client_id=YOUR_CLIENT_ID&response_type=code&redirect_uri=http://localhost&approval_prompt=force&scope=activity:read_all
```

2. You'll be redirected to a Strava authorization page. Click "Authorize"

3. You'll be redirected to a URL that looks like:
```
http://localhost/?state=&code=XXXXXXXXXXXXX&scope=read,activity:read_all
```

4. Copy the `code` value from the URL (the XXXXXXXXXXXXX part)

5. Now, exchange this code for an access token. Open a terminal and run this curl command (replace the placeholders):

```bash
curl -X POST https://www.strava.com/oauth/token \
  -d client_id=YOUR_CLIENT_ID \
  -d client_secret=YOUR_CLIENT_SECRET \
  -d code=YOUR_CODE_FROM_STEP_4 \
  -d grant_type=authorization_code
```

6. You'll get a JSON response like:
```json
{
  "access_token": "YOUR_ACCESS_TOKEN",
  "refresh_token": "YOUR_REFRESH_TOKEN",
  "expires_at": 1234567890,
  ...
}
```

7. Copy the `access_token` value - this is what you'll use in your website!

## Step 4: Add Token to Website

Once you have your access token, you'll add it to the `config.js` file in your website (instructions will be provided when the site is built).

## Note on Token Expiration

Access tokens expire after about 6 hours. For simplicity in this personal project, you can manually refresh your token when needed by repeating Step 3, or you can implement automatic token refresh later.
