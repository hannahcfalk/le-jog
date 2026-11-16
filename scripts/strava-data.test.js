const { test } = require('node:test');
const assert = require('node:assert/strict');
const { shapeActivities } = require('./strava-data');

test('includes runs outside training and retains walks and hikes during training', () => {
    const activities = [
        ['Run', '2026-07-10T23:59:59Z'],
        ['Run', '2026-07-11T00:00:00Z'],
        ['Run', '2026-08-20T12:00:00Z'],
        ['Run', '2026-10-11T23:59:59Z'],
        ['Run', '2026-10-12T00:00:00Z'],
        ['Walk', '2026-08-20T12:00:00Z'],
        ['Hike', '2026-08-20T12:00:00Z'],
        ['Ride', '2026-10-12T12:00:00Z']
    ].map(([type, start_date], id) => ({ id, type, start_date, distance: 1500 }));
    const result = shapeActivities(activities, '2026-01-01');
    assert.deepEqual(result.activities.map(activity => activity.id), [0, 4, 5, 6]);
    assert.equal(result.totalDistance, 6);
});

test('uses the local date at both training boundaries', () => {
    const result = shapeActivities([
        { id: 1, type: 'Run', distance: 1000,
            start_date: '2026-07-10T23:30:00Z', start_date_local: '2026-07-11T00:30:00Z' },
        { id: 2, type: 'Run', distance: 2000,
            start_date: '2026-10-11T23:30:00Z', start_date_local: '2026-10-12T00:30:00Z' }
    ], '2026-01-01');
    assert.deepEqual(result.activities.map(activity => activity.id), [2]);
    assert.equal(result.totalDistance, 2);
});
