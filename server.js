const fs = require('fs');
const http = require('http');
const path = require('path');
const crypto = require('crypto');

const { fetchStravaData, writeDataFile, OUTPUT_PATH } = require('./scripts/strava-data');

const ROOT_DIR = __dirname;
const PORT = Number(process.env.PORT || 8080);
const GCS_BUCKET = process.env.GCS_BUCKET;
const GCS_OBJECT_NAME = process.env.GCS_OBJECT_NAME || 'data/strava-activities.json';
const WEBHOOK_REFRESH_DELAY_MS = Number(process.env.WEBHOOK_REFRESH_DELAY_MS || 10000);
const MAX_BODY_BYTES = 1024 * 1024;

let cachedData = null;
let refreshTimer = null;
let refreshInFlight = null;

function sendJson(res, statusCode, body, headers = {}) {
    res.writeHead(statusCode, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        ...headers
    });
    res.end(JSON.stringify(body));
}

function sendText(res, statusCode, body, headers = {}) {
    res.writeHead(statusCode, {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        ...headers
    });
    res.end(body);
}

function contentTypeFor(filePath) {
    switch (path.extname(filePath)) {
        case '.css':
            return 'text/css; charset=utf-8';
        case '.html':
            return 'text/html; charset=utf-8';
        case '.js':
            return 'text/javascript; charset=utf-8';
        case '.json':
            return 'application/json; charset=utf-8';
        case '.svg':
            return 'image/svg+xml';
        default:
            return 'application/octet-stream';
    }
}

function isAllowedStaticPath(filePath) {
    const allowedExtensions = new Set(['.css', '.html', '.js', '.svg']);
    return allowedExtensions.has(path.extname(filePath));
}

function resolveStaticPath(requestPath) {
    const pathname = requestPath === '/' ? '/index.html' : requestPath;
    const normalizedPath = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
    const filePath = path.join(ROOT_DIR, normalizedPath);

    if (!filePath.startsWith(ROOT_DIR) || !isAllowedStaticPath(filePath)) {
        return null;
    }

    return filePath;
}

async function getGoogleAccessToken() {
    if (process.env.GOOGLE_OAUTH_ACCESS_TOKEN) {
        return process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
    }

    const response = await fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token', {
        headers: {
            'Metadata-Flavor': 'Google'
        }
    });

    if (!response.ok) {
        throw new Error(`Could not fetch Google metadata token: ${response.status}`);
    }

    const tokenData = await response.json();
    return tokenData.access_token;
}

function gcsObjectUrl(bucket, objectName, upload = false) {
    if (upload) {
        const url = new URL(`https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o`);
        url.searchParams.set('uploadType', 'media');
        url.searchParams.set('name', objectName);
        return url;
    }

    const encodedName = encodeURIComponent(objectName);
    return new URL(`https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodedName}?alt=media`);
}

async function readDataFromGcs() {
    const accessToken = await getGoogleAccessToken();
    const response = await fetch(gcsObjectUrl(GCS_BUCKET, GCS_OBJECT_NAME), {
        headers: {
            Authorization: `Bearer ${accessToken}`
        }
    });

    if (!response.ok) {
        throw new Error(`Could not read gs://${GCS_BUCKET}/${GCS_OBJECT_NAME}: ${response.status}`);
    }

    return response.json();
}

async function writeDataToGcs(data) {
    const accessToken = await getGoogleAccessToken();
    const response = await fetch(gcsObjectUrl(GCS_BUCKET, GCS_OBJECT_NAME, true), {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store'
        },
        body: JSON.stringify(data, null, 2)
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Could not write gs://${GCS_BUCKET}/${GCS_OBJECT_NAME}: ${response.status} ${body}`);
    }
}

async function readData() {
    if (cachedData) {
        return cachedData;
    }

    if (GCS_BUCKET) {
        cachedData = await readDataFromGcs();
        return cachedData;
    }

    cachedData = JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf8'));
    return cachedData;
}

async function persistData(data) {
    if (GCS_BUCKET) {
        await writeDataToGcs(data);
    } else {
        writeDataFile(data);
    }

    cachedData = data;
}

async function refreshData(reason) {
    if (refreshInFlight) {
        return refreshInFlight;
    }

    refreshInFlight = (async () => {
        console.log(`Starting Strava data refresh: ${reason}`);
        const data = await fetchStravaData(process.env, console);
        await persistData(data);
        console.log(`Finished Strava data refresh: ${data.activities.length} activities, ${data.totalDistance.toFixed(2)} km`);
        return data;
    })();

    try {
        return await refreshInFlight;
    } finally {
        refreshInFlight = null;
    }
}

function scheduleRefresh(reason) {
    if (refreshTimer) {
        clearTimeout(refreshTimer);
    }

    refreshTimer = setTimeout(() => {
        refreshTimer = null;
        refreshData(reason).catch(error => {
            console.error(`Webhook-triggered refresh failed: ${error.stack || error.message}`);
        });
    }, WEBHOOK_REFRESH_DELAY_MS);
}

function readJsonBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';

        req.on('data', chunk => {
            body += chunk;
            if (Buffer.byteLength(body) > MAX_BODY_BYTES) {
                reject(new Error('Request body is too large'));
                req.destroy();
            }
        });

        req.on('end', () => {
            if (!body) {
                resolve({ json: {}, rawBody: body });
                return;
            }

            try {
                resolve({ json: JSON.parse(body), rawBody: body });
            } catch (error) {
                reject(new Error(`Invalid JSON body: ${error.message}`));
            }
        });

        req.on('error', reject);
    });
}

function verifyStravaSignature(rawBody, header, signingSecret) {
    if (!signingSecret) {
        return true;
    }

    if (!header) {
        return false;
    }

    const parts = Object.fromEntries(
        header.split(',').map(part => part.split('=', 2).map(value => value.trim()))
    );
    const timestamp = parts.t;
    const signature = parts.v1;

    if (!timestamp || !signature) {
        return false;
    }

    if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) {
        return false;
    }

    const expected = crypto
        .createHmac('sha256', signingSecret)
        .update(`${timestamp}.${rawBody}`)
        .digest('hex');

    const expectedBuffer = Buffer.from(expected, 'hex');
    const signatureBuffer = Buffer.from(signature, 'hex');

    return expectedBuffer.length === signatureBuffer.length &&
        crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

async function handleWebhookValidation(req, res, url) {
    const verifyToken = process.env.STRAVA_VERIFY_TOKEN;

    if (!verifyToken) {
        sendText(res, 500, 'STRAVA_VERIFY_TOKEN is not configured');
        return;
    }

    const mode = url.searchParams.get('hub.mode');
    const challenge = url.searchParams.get('hub.challenge');
    const token = url.searchParams.get('hub.verify_token');

    if (mode === 'subscribe' && challenge && token === verifyToken) {
        sendJson(res, 200, { 'hub.challenge': challenge });
        return;
    }

    sendText(res, 403, 'Webhook validation failed');
}

async function handleWebhookEvent(req, res) {
    let event;
    let rawBody;

    try {
        const parsedBody = await readJsonBody(req);
        event = parsedBody.json;
        rawBody = parsedBody.rawBody;
    } catch (error) {
        sendText(res, 400, error.message);
        return;
    }

    if (!verifyStravaSignature(rawBody, req.headers['x-strava-signature'], process.env.STRAVA_SIGNING_SECRET)) {
        sendText(res, 403, 'Invalid Strava signature');
        return;
    }

    console.log('Received Strava webhook event:', JSON.stringify({
        object_type: event.object_type,
        object_id: event.object_id,
        aspect_type: event.aspect_type,
        owner_id: event.owner_id,
        event_time: event.event_time
    }));

    sendText(res, 200, 'OK');

    if (event.object_type === 'activity') {
        scheduleRefresh(`webhook ${event.aspect_type || 'activity'} ${event.object_id || ''}`.trim());
    } else if (event.object_type === 'athlete' && event.updates?.authorized === 'false') {
        console.warn('Strava athlete deauthorized the app; refresh token may no longer work.');
    }
}

async function handleAdminRefresh(req, res) {
    const adminToken = process.env.ADMIN_REFRESH_TOKEN;

    if (!adminToken || req.headers.authorization !== `Bearer ${adminToken}`) {
        sendText(res, 403, 'Forbidden');
        return;
    }

    try {
        const data = await refreshData('admin refresh endpoint');
        sendJson(res, 200, {
            ok: true,
            lastUpdated: data.lastUpdated,
            activities: data.activities.length,
            totalDistance: data.totalDistance
        });
    } catch (error) {
        console.error(error.stack || error.message);
        sendJson(res, 500, { ok: false, error: error.message });
    }
}

async function handleData(req, res) {
    try {
        const data = await readData();
        sendJson(res, 200, data);
    } catch (error) {
        console.error(error.stack || error.message);
        sendJson(res, 500, { error: error.message });
    }
}

function serveStatic(req, res, url) {
    const filePath = resolveStaticPath(url.pathname);

    if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        sendText(res, 404, 'Not found');
        return;
    }

    res.writeHead(200, {
        'Content-Type': contentTypeFor(filePath),
        'Cache-Control': 'public, max-age=300'
    });
    fs.createReadStream(filePath).pipe(res);
}

async function handleRequest(req, res) {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'GET' && url.pathname === '/healthz') {
        sendJson(res, 200, { ok: true });
        return;
    }

    if (url.pathname === '/strava/webhook') {
        if (req.method === 'GET') {
            await handleWebhookValidation(req, res, url);
            return;
        }

        if (req.method === 'POST') {
            await handleWebhookEvent(req, res);
            return;
        }
    }

    if (url.pathname === '/admin/refresh' && req.method === 'POST') {
        await handleAdminRefresh(req, res);
        return;
    }

    if (url.pathname === '/data/strava-activities.json' && req.method === 'GET') {
        await handleData(req, res);
        return;
    }

    if (req.method === 'GET' || req.method === 'HEAD') {
        serveStatic(req, res, url);
        return;
    }

    sendText(res, 405, 'Method not allowed');
}

const server = http.createServer((req, res) => {
    handleRequest(req, res).catch(error => {
        console.error(error.stack || error.message);
        if (!res.headersSent) {
            sendJson(res, 500, { error: 'Internal server error' });
        } else {
            res.end();
        }
    });
});

server.listen(PORT, () => {
    console.log(`LEJOG tracker listening on ${PORT}`);
});
