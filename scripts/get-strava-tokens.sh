#!/bin/bash

# Helper script to exchange Strava authorization code for tokens
# Usage: ./scripts/get-strava-tokens.sh CLIENT_ID CLIENT_SECRET AUTH_CODE

if [ $# -ne 3 ]; then
    echo "Usage: $0 CLIENT_ID CLIENT_SECRET AUTH_CODE"
    echo ""
    echo "Get your CLIENT_ID and CLIENT_SECRET from https://www.strava.com/settings/api"
    exit 1
fi

CLIENT_ID=$1
CLIENT_SECRET=$2
AUTH_CODE=$3

echo "Exchanging authorization code for tokens..."
echo ""

RESPONSE=$(curl -s -X POST https://www.strava.com/oauth/token \
  -d client_id=$CLIENT_ID \
  -d client_secret=$CLIENT_SECRET \
  -d code=$AUTH_CODE \
  -d grant_type=authorization_code)

# Check if jq is available for pretty printing
if command -v jq &> /dev/null; then
    echo "Response:"
    echo "$RESPONSE" | jq '.'
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "GitHub Secrets to add:"
    echo "════════════════════════════════════════════════════════════════"
    echo ""
    echo "STRAVA_CLIENT_ID:"
    echo "$CLIENT_ID"
    echo ""
    echo "STRAVA_CLIENT_SECRET:"
    echo "$CLIENT_SECRET"
    echo ""
    echo "STRAVA_REFRESH_TOKEN:"
    echo "$RESPONSE" | jq -r '.refresh_token'
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo ""
    echo "Access token expires at: $(echo "$RESPONSE" | jq -r '.expires_at | todate')"
else
    echo "Raw response:"
    echo "$RESPONSE"
    echo ""
    echo "Tip: Install 'jq' for prettier output (brew install jq)"
fi
