#!/bin/bash

set -euo pipefail

if [ $# -ne 4 ]; then
    echo "Usage: $0 CLIENT_ID CLIENT_SECRET CALLBACK_URL VERIFY_TOKEN"
    echo ""
    echo "Example:"
    echo "$0 12345 abcdef https://le-jog-tracker-xyz.a.run.app/strava/webhook your-random-token"
    exit 1
fi

CLIENT_ID=$1
CLIENT_SECRET=$2
CALLBACK_URL=$3
VERIFY_TOKEN=$4

curl -sS -X POST https://www.strava.com/api/v3/push_subscriptions \
  -F client_id="$CLIENT_ID" \
  -F client_secret="$CLIENT_SECRET" \
  -F callback_url="$CALLBACK_URL" \
  -F verify_token="$VERIFY_TOKEN"

echo ""
