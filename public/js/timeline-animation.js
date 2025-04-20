class TimelineAnimation {
    constructor(map) {
        this.map = map;
        this.points = [];
        this.currentIndex = 0;
        this.mode = 'route'; // 'route' o 'point'
        this.isPlaying = false;
        this.animationSpeed = 50; // ms entre cada frame
        this.animationInterval = null;
        
        this.animationPath = new google.maps.Polyline({
            geodesic: true,
            strokeColor: "#FF0000",
            strokeOpacity: 1.0,
            strokeWeight: 4,
            map: this.map
        });
        
        this.currentMarker = new google.maps.Marker({
            map: this.map,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: "#FF0000",
                fillOpacity: 1.0,
                strokeColor: "#FFFFFF",
                strokeWeight: 2
            },
            animation: google.maps.Animation.BOUNCE
        });

        // Inicializar controles
        this.initializeControls();
    }

    initializeControls() {
        this.slider = document.getElementById('timelineSlider');
        this.progressBar = document.getElementById('timelineProgress');
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.resetBtn = document.getElementById('resetBtn');

        // Event listeners
        this.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
        this.resetBtn.addEventListener('click', () => this.reset());
        this.slider.addEventListener('input', (e) => {
            this.pause();
            this.setProgress(parseInt(e.target.value));
        });

        // Actualizar barra de progreso
        this.updateProgressBar();
    }

    togglePlayPause() {
        if (this.isPlaying) {
            this.pause();
        } else {
            this.play();
        }
    }

    play() {
        if (!this.points.length) return;
        
        this.isPlaying = true;
        this.playPauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        
        // Si estamos al final, empezar desde el principio
        if (this.currentIndex >= this.points.length - 1) {
            this.currentIndex = 0;
        }

        this.animationInterval = setInterval(() => {
            if (this.currentIndex < this.points.length - 1) {
                this.currentIndex++;
                const progress = (this.currentIndex / (this.points.length - 1)) * 100;
                this.slider.value = progress;
                this.updateVisualization();
                this.updateProgressBar();
            } else {
                this.pause();
            }
        }, this.animationSpeed);
    }

    pause() {
        this.isPlaying = false;
        this.playPauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        if (this.animationInterval) {
            clearInterval(this.animationInterval);
            this.animationInterval = null;
        }
    }

    reset() {
        this.pause();
        this.currentIndex = 0;
        this.slider.value = 0;
        this.updateVisualization();
        this.updateProgressBar();
    }

    updateProgressBar() {
        if (this.progressBar) {
            const progress = (this.currentIndex / (this.points.length - 1)) * 100;
            this.progressBar.style.width = `${progress}%`;
        }
    }

    setMode(mode) {
        this.mode = mode;
        // En modo punto, ocultar la polilínea
        if (mode === 'point') {
            this.animationPath.setMap(null);
        } else {
            this.animationPath.setMap(this.map);
        }
        // Asegurarse de que el marcador esté visible en ambos modos
        this.currentMarker.setMap(this.map);
    }

    setPoints(points, mode = 'route') {
        this.points = points;
        this.currentIndex = 0;
        this.setMode(mode);
        this.updateVisualization();
        this.updateProgressBar();
        
        // Reset controls
        this.pause();
        this.slider.value = 0;
    }

    updateVisualization() {
        if (this.currentIndex >= this.points.length) return;
        
        // Actualizar la polilínea solo en modo ruta
        if (this.mode === 'route') {
            const pathToShow = this.points.slice(0, this.currentIndex + 1);
            this.animationPath.setPath(pathToShow);
        }
        
        // Actualizar posición del marcador
        const currentPoint = this.points[this.currentIndex];
        this.currentMarker.setPosition(currentPoint);
        
        // Asegurarse de que el marcador esté visible
        this.currentMarker.setMap(this.map);
    }

    setProgress(progressPercent) {
        if (this.points.length === 0) return;
        
        this.currentIndex = Math.floor((progressPercent / 100) * (this.points.length - 1));
        this.updateVisualization();
        this.updateProgressBar();
    }

    clear() {
        this.pause();
        this.animationPath.setPath([]);
        this.currentMarker.setMap(null);
        this.points = [];
        this.currentIndex = 0;
        this.updateProgressBar();
        
        if (this.slider) {
            this.slider.value = 0;
        }
    }
} 