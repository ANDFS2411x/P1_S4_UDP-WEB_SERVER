class TimelinePlayer {
    constructor(map) {
        this.map = map;
        this.points = [];
        this.currentIndex = 0;
        this.isPlaying = false;
        this.playbackSpeed = 1;
        this.marker = null;
        this.polyline = null;
        this.animationFrame = null;
        this.lastTimestamp = null;
        this.pointDetails = null;
        
        this.initializeControls();
        this.initializeVisualization();
    }

    initializeControls() {
        // Create timeline controls container
        const controls = document.createElement('div');
        controls.className = 'timeline-controls';
        controls.innerHTML = `
            <input type="range" class="timeline-slider" min="0" max="100" value="0">
            <div class="timeline-info">
                <span class="timeline-date">--/--/---- --:--:--</span>
            </div>
            <div class="timeline-buttons">
                <button class="timeline-button play-pause">
                    <i class="fas fa-play"></i> Play
                </button>
                <button class="timeline-button reset">
                    <i class="fas fa-undo"></i> Reset
                </button>
                <div class="timeline-speed">
                    <label>Speed:</label>
                    <select class="speed-selector">
                        <option value="0.5">0.5x</option>
                        <option value="1" selected>1x</option>
                        <option value="2">2x</option>
                        <option value="4">4x</option>
                    </select>
                </div>
            </div>
        `;

        // Create point details panel
        const details = document.createElement('div');
        details.className = 'point-details';
        details.innerHTML = `
            <h3>Location Details</h3>
            <p><strong>Date:</strong> <span class="detail-date">--/--/----</span></p>
            <p><strong>Time:</strong> <span class="detail-time">--:--:--</span></p>
            <p><strong>Latitude:</strong> <span class="detail-lat">--.---------</span></p>
            <p><strong>Longitude:</strong> <span class="detail-lng">--.---------</span></p>
        `;

        // Add controls to map
        this.map.controls[google.maps.ControlPosition.BOTTOM_CENTER].push(controls);
        this.map.controls[google.maps.ControlPosition.RIGHT_TOP].push(details);

        // Store DOM elements
        this.elements = {
            slider: controls.querySelector('.timeline-slider'),
            playPauseBtn: controls.querySelector('.play-pause'),
            resetBtn: controls.querySelector('.reset'),
            speedSelector: controls.querySelector('.speed-selector'),
            timelineDate: controls.querySelector('.timeline-date'),
            pointDetails: details,
            detailDate: details.querySelector('.detail-date'),
            detailTime: details.querySelector('.detail-time'),
            detailLat: details.querySelector('.detail-lat'),
            detailLng: details.querySelector('.detail-lng')
        };

        // Add event listeners
        this.elements.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.elements.resetBtn.addEventListener('click', () => this.reset());
        this.elements.slider.addEventListener('input', (e) => this.handleSliderChange(e));
        this.elements.speedSelector.addEventListener('change', (e) => {
            this.playbackSpeed = parseFloat(e.target.value);
        });
    }

    initializeVisualization() {
        // Initialize marker
        this.marker = new google.maps.Marker({
            map: this.map,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: "#024abf",
                fillOpacity: 1,
                strokeColor: "#ffffff",
                strokeWeight: 2
            }
        });

        // Initialize polyline
        this.polyline = new google.maps.Polyline({
            map: this.map,
            path: [],
            geodesic: true,
            strokeColor: "#024abf",
            strokeOpacity: 0.8,
            strokeWeight: 3
        });

        // Add click listener to marker
        this.marker.addListener('click', () => {
            this.showPointDetails(this.points[this.currentIndex]);
        });
    }

    setPoints(points) {
        this.points = points;
        this.elements.slider.max = points.length - 1;
        this.reset();
        
        // Fit bounds to show all points
        const bounds = new google.maps.LatLngBounds();
        points.forEach(point => {
            bounds.extend(new google.maps.LatLng(point.lat, point.lng));
        });
        this.map.fitBounds(bounds);
    }

    togglePlayPause() {
        this.isPlaying = !this.isPlaying;
        this.elements.playPauseBtn.innerHTML = this.isPlaying ? 
            '<i class="fas fa-pause"></i> Pause' : 
            '<i class="fas fa-play"></i> Play';
        
        if (this.isPlaying) {
            this.play();
        } else {
            this.pause();
        }
    }

    play() {
        if (this.currentIndex >= this.points.length - 1) {
            this.currentIndex = 0;
        }
        this.animate();
    }

    pause() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        this.lastTimestamp = null;
    }

    reset() {
        this.pause();
        this.isPlaying = false;
        this.currentIndex = 0;
        this.elements.playPauseBtn.innerHTML = '<i class="fas fa-play"></i> Play';
        this.elements.slider.value = 0;
        this.updateVisualization();
    }

    animate(timestamp) {
        if (!this.lastTimestamp) this.lastTimestamp = timestamp;
        const elapsed = timestamp - this.lastTimestamp;

        if (elapsed > (1000 / this.playbackSpeed)) {
            this.currentIndex++;
            if (this.currentIndex >= this.points.length) {
                this.pause();
                this.isPlaying = false;
                this.elements.playPauseBtn.innerHTML = '<i class="fas fa-play"></i> Play';
                return;
            }

            this.elements.slider.value = this.currentIndex;
            this.updateVisualization();
            this.lastTimestamp = timestamp;
        }

        if (this.isPlaying) {
            this.animationFrame = requestAnimationFrame((t) => this.animate(t));
        }
    }

    handleSliderChange(event) {
        this.currentIndex = parseInt(event.target.value);
        this.updateVisualization();
    }

    updateVisualization() {
        if (this.points.length === 0) return;

        const point = this.points[this.currentIndex];
        const position = new google.maps.LatLng(point.lat, point.lng);
        
        // Update marker position
        this.marker.setPosition(position);
        
        // Update polyline
        const path = this.points.slice(0, this.currentIndex + 1).map(p => 
            new google.maps.LatLng(p.lat, p.lng)
        );
        this.polyline.setPath(path);

        // Update timeline info
        const date = new Date(point.timestamp);
        this.elements.timelineDate.textContent = date.toLocaleString();

        // Update point details if visible
        if (this.elements.pointDetails.classList.contains('visible')) {
            this.showPointDetails(point);
        }
    }

    showPointDetails(point) {
        const date = new Date(point.timestamp);
        this.elements.detailDate.textContent = date.toLocaleDateString();
        this.elements.detailTime.textContent = date.toLocaleTimeString();
        this.elements.detailLat.textContent = point.lat.toFixed(6);
        this.elements.detailLng.textContent = point.lng.toFixed(6);
        this.elements.pointDetails.classList.add('visible');
    }

    hidePointDetails() {
        this.elements.pointDetails.classList.remove('visible');
    }
} 