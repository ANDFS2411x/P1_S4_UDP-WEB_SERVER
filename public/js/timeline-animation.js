class TimelineAnimation {
    constructor(map) {
        this.map = map;
        this.points = [];
        this.currentIndex = 0;
        this.mode = 'route'; // 'route' o 'point'
        
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
        this.currentCircle.setMap(this.map);
    }

    setPoints(points, mode = 'route') {
        this.points = points;
        this.currentIndex = 0;
        this.setMode(mode);
        this.updateVisualization();
    }

    updateVisualization() {
        if (this.currentIndex >= this.points.length) return;
        
        // Actualizar la polilínea solo en modo ruta
        if (this.mode === 'route') {
            const pathToShow = this.points.slice(0, this.currentIndex + 1);
            this.animationPath.setPath(pathToShow);
        }
        
        // Actualizar posición del marcador y el círculo en ambos modos
        const currentPoint = this.points[this.currentIndex];
        this.currentMarker.setPosition(currentPoint);
        this.currentCircle.setCenter(currentPoint);
        
        // Asegurarse de que el marcador esté visible
        this.currentMarker.setMap(this.map);
        this.currentCircle.setMap(this.map);
    }

    setProgress(progressPercent) {
        if (this.points.length === 0) return;
        
        this.currentIndex = Math.floor((progressPercent / 100) * (this.points.length - 1));
        this.updateVisualization();
    }

    clear() {
        this.animationPath.setPath([]);
        this.currentMarker.setMap(null);
        this.currentCircle.setMap(null);
        this.points = [];
        this.currentIndex = 0;
    }
} 