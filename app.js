// LEJOG Tracker Application

class LEJOGTracker {
    constructor() {
        this.activities = [];
        this.totalDistance = 0;

        // SVG coordinates for the LEJOG route waypoints (following the land through Britain)
        this.routeWaypoints = [
            { x: 515, y: 938 },  // Land's End (Cornwall)
            { x: 545, y: 925 },
            { x: 570, y: 910 },
            { x: 595, y: 900 },
            { x: 620, y: 880 },
            { x: 645, y: 865 },
            { x: 665, y: 845 },
            { x: 680, y: 800 },
            { x: 660, y: 700 },
            { x: 660, y: 625 },
            { x: 665, y: 605 },
            { x: 590, y: 465 },
            { x: 570, y: 340 },
            { x: 575, y: 325 },
            { x: 580, y: 315 },
            { x: 630, y: 275 },
            { x: 635, y: 255 }   // John o' Groats
        ];

        this.landsEnd = this.routeWaypoints[0];
        this.johnOGroats = this.routeWaypoints[this.routeWaypoints.length - 1];

        this.init();
    }

    async init() {
        this.drawMap();
        await this.fetchStravaData();
        this.calculateStats();
        this.updateUI();
    }

    // Calculate position along the route path based on distance percentage
    getPositionAlongPath(percent) {
        if (percent <= 0) return this.routeWaypoints[0];
        if (percent >= 1) return this.routeWaypoints[this.routeWaypoints.length - 1];

        // Find which segment of the path we're on
        const segmentCount = this.routeWaypoints.length - 1;
        const segmentProgress = percent * segmentCount;
        const segmentIndex = Math.floor(segmentProgress);
        const segmentPercent = segmentProgress - segmentIndex;

        // Interpolate between two waypoints
        const start = this.routeWaypoints[segmentIndex];
        const end = this.routeWaypoints[Math.min(segmentIndex + 1, this.routeWaypoints.length - 1)];

        return {
            x: start.x + (end.x - start.x) * segmentPercent,
            y: start.y + (end.y - start.y) * segmentPercent
        };
    }

    // Draw the LEJOG route on the SVG map
    drawMap() {
        const progressPercent = this.totalDistance / CONFIG.TOTAL_DISTANCE;
        const progressPos = this.getPositionAlongPath(progressPercent);

        // Create points string for polyline
        const allPoints = this.routeWaypoints.map(p => `${p.x},${p.y}`).join(' ');

        // Create completed route points (up to current position)
        const completedWaypointIndex = Math.floor(progressPercent * (this.routeWaypoints.length - 1));
        const completedPoints = this.routeWaypoints
            .slice(0, completedWaypointIndex + 1)
            .map(p => `${p.x},${p.y}`)
            .join(' ') + ` ${progressPos.x},${progressPos.y}`;

        // Update planned route as polyline
        const plannedRoute = document.getElementById('plannedRoute');
        plannedRoute.setAttribute('points', allPoints);

        // Update completed route as polyline
        const completedRoute = document.getElementById('completedRoute');
        completedRoute.setAttribute('points', completedPoints);

        // Update start point
        const startPoint = document.getElementById('startPoint');
        startPoint.setAttribute('transform', `translate(${this.landsEnd.x}, ${this.landsEnd.y})`);

        const startLabel = document.getElementById('startLabel');
        startLabel.setAttribute('x', this.landsEnd.x - 45);
        startLabel.setAttribute('y', this.landsEnd.y);

        // Update end point
        const endPoint = document.getElementById('endPoint');
        endPoint.setAttribute('transform', `translate(${this.johnOGroats.x}, ${this.johnOGroats.y})`);

        const endLabel = document.getElementById('endLabel');
        endLabel.setAttribute('x', this.johnOGroats.x + 50);
        endLabel.setAttribute('y', this.johnOGroats.y);

        // Update current position
        const currentPosition = document.getElementById('currentPosition');
        currentPosition.setAttribute('cx', progressPos.x);
        currentPosition.setAttribute('cy', progressPos.y);

        // Update progress label
        const progressLabel = document.getElementById('progressLabel');
        progressLabel.textContent = '';
    }

    async fetchStravaData() {
        const loadingEl = document.getElementById('loading');
        const errorEl = document.getElementById('error');

        try {
            loadingEl.style.display = 'block';
            errorEl.style.display = 'none';

            // Fetch activities from static data file
            const response = await fetch('data/strava-activities.json');

            if (!response.ok) {
                throw new Error(`Failed to load activity data: ${response.status}`);
            }

            const data = await response.json();

            // Use the pre-filtered activities from the static file
            this.activities = data.activities;

            // Calculate total distance (distance is in meters)
            this.totalDistance = this.activities.reduce((sum, activity) =>
                sum + (activity.distance / 1000), 0
            );

            loadingEl.style.display = 'none';

        } catch (error) {
            console.error('Error loading Strava data:', error);
            errorEl.textContent = `Error: ${error.message}`;
            errorEl.style.display = 'block';
            loadingEl.style.display = 'none';
        }
    }

    calculateStats() {
        const startDate = new Date(CONFIG.START_DATE);
        const now = new Date();

        // Calculate days and weeks elapsed
        const msPerDay = 1000 * 60 * 60 * 24;
        const daysElapsed = Math.floor((now - startDate) / msPerDay);
        const weeksElapsed = Math.floor(daysElapsed / 7);
        const currentWeek = weeksElapsed + 1; // Week 1, 2, 3, etc.

        // Calculate target distance by end of current week
        const targetDistance = currentWeek * CONFIG.WEEKLY_TARGET;

        // Calculate this week's distance
        const weekStart = new Date(now);
        const dayOfWeek = now.getDay();
        const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Start of current week (Monday)
        weekStart.setDate(now.getDate() - daysToSubtract);
        weekStart.setHours(0, 0, 0, 0);

        const thisWeekActivities = this.activities.filter(activity => {
            const activityDate = new Date(activity.start_date);
            return activityDate >= weekStart;
        });

        const thisWeekDistance = thisWeekActivities.reduce((sum, activity) =>
            sum + (activity.distance / 1000), 0
        );

        this.stats = {
            daysElapsed,
            weeksElapsed,
            currentWeek,
            targetDistance,
            actualDistance: this.totalDistance,
            difference: this.totalDistance - targetDistance,
            thisWeekDistance,
            progressPercent: (this.totalDistance / CONFIG.TOTAL_DISTANCE) * 100
        };
    }

    updateUI() {
        // Update progress bar
        const progressFill = document.getElementById('progressFill');
        const progressPercent = document.getElementById('progressPercent');
        progressFill.style.width = `${Math.min(this.stats.progressPercent, 100)}%`;
        progressPercent.textContent = `${this.stats.progressPercent.toFixed(1)}%`;

        // Update distance walked
        document.getElementById('distanceWalked').textContent = `${this.stats.actualDistance.toFixed(2)} km`;

        // Update this week
        document.getElementById('thisWeekDistance').textContent = `${this.stats.thisWeekDistance.toFixed(2)} km`;

        // Update target vs actual
        document.getElementById('currentWeek').textContent = this.stats.currentWeek;
        document.getElementById('targetKm').textContent = this.stats.targetDistance.toFixed(0);
        document.getElementById('actualKm').textContent = this.stats.actualDistance.toFixed(2);

        // Update difference
        const differenceEl = document.getElementById('difference');
        const diff = Math.abs(this.stats.difference);
        if (this.stats.difference >= 0) {
            differenceEl.textContent = `You are ${diff.toFixed(2)} km ahead of target!`;
            differenceEl.className = 'difference ahead';
        } else {
            differenceEl.textContent = `You are ${diff.toFixed(2)} km behind target`;
            differenceEl.className = 'difference behind';
        }

        // Update journey details
        document.getElementById('daysElapsed').textContent = this.stats.daysElapsed;
        document.getElementById('weeksElapsed').textContent = this.stats.weeksElapsed;

        // Update last updated time
        document.getElementById('lastUpdated').textContent = new Date().toLocaleString();

        // Redraw map with updated progress
        this.drawMap();
    }
}

// Initialize the tracker when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new LEJOGTracker();
});
