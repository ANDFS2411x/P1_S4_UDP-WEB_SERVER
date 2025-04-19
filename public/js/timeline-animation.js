class TimelineAnimation {
    constructor(map) {
        this.map = map;
        this.points = [];
        this.filteredPoints = [];
        this.currentIndex = 0;
        this.isPointMode = false;
        this.selectedPoint = null;
        this.searchRadius = 50;

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

        this.currentCircle = new google.maps.Circle({
            map: this.map,
            strokeColor: "#FF0000",
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: "#FF0000",
            fillOpacity: 0.15,
            radius: 50
        });

        // Círculo para mostrar el área de búsqueda
        this.searchCircle = new google.maps.Circle({
            map: this.map,
            strokeColor: "#4CAF50",
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: "#4CAF50",
            fillOpacity: 0.15,
            visible: false
        });
    }

    setPoints(points) {
        this.points = points;
        this.currentIndex = 0;
        this.updateVisualization();
    }

    setPointMode(enabled, selectedPoint = null, radius = 50) {
        this.isPointMode = enabled;
        this.selectedPoint = selectedPoint;
        this.searchRadius = radius;

        if (enabled && selectedPoint) {
            // Filtrar puntos dentro del radio
            this.filteredPoints = this.points.filter(point => {
                return this.calculateDistance(
                    selectedPoint.lat, selectedPoint.lng,
                    point.lat, point.lng
                ) <= radius;
            });

            // Ordenar por tiempo
            this.filteredPoints.sort((a, b) => {
                const dateA = new Date(`${a.date} ${a.time}`);
                const dateB = new Date(`${b.date} ${b.time}`);
                return dateA - dateB;
            });

            // Mostrar círculo de búsqueda
            this.searchCircle.setCenter(selectedPoint);
            this.searchCircle.setRadius(radius);
            this.searchCircle.setVisible(true);
        } else {
            this.filteredPoints = [];
            this.searchCircle.setVisible(false);
        }

        this.currentIndex = 0;
        this.updateVisualization();
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371000; // Radio de la Tierra en metros
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    updateVisualization() {
        const activePoints = this.isPointMode ? this.filteredPoints : this.points;
        
        if (this.currentIndex >= activePoints.length) return;
        
        // Actualizar la polilínea hasta el punto actual
        const pathToShow = activePoints.slice(0, this.currentIndex + 1);
        this.animationPath.setPath(pathToShow);
        
        // Actualizar posición del marcador y el círculo
        const currentPoint = activePoints[this.currentIndex];
        this.currentMarker.setPosition(currentPoint);
        this.currentCircle.setCenter(currentPoint);
    }

    setProgress(progressPercent) {
        const activePoints = this.isPointMode ? this.filteredPoints : this.points;
        
        if (activePoints.length === 0) return;
        
        this.currentIndex = Math.floor((progressPercent / 100) * (activePoints.length - 1));
        this.updateVisualization();
    }

    getCurrentPoint() {
        const activePoints = this.isPointMode ? this.filteredPoints : this.points;
        return activePoints[this.currentIndex];
    }

    hasPoints() {
        return this.isPointMode ? this.filteredPoints.length > 0 : this.points.length > 0;
    }

    clear() {
        this.animationPath.setPath([]);
        this.currentMarker.setMap(null);
        this.currentCircle.setMap(null);
        this.searchCircle.setVisible(false);
        this.points = [];
        this.filteredPoints = [];
        this.currentIndex = 0;
        this.isPointMode = false;
        this.selectedPoint = null;
    }
} 