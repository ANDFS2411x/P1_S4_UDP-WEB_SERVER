class TimelineAnimation {
    constructor(map) {
        this.map = map;
        this.points = [];
        this.currentIndex = 0;
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
                scale: 8,
                fillColor: "#FF0000",
                fillOpacity: 1,
                strokeColor: "#FF0000",
                strokeWeight: 2
            }
        });
    }

    setPoints(points) {
        this.points = points;
        this.currentIndex = 0;
        this.updateVisualization();
    }

    updateVisualization() {
        if (this.currentIndex >= this.points.length) return;
        
        // Actualizar la polilínea hasta el punto actual
        const pathToShow = this.points.slice(0, this.currentIndex + 1);
        this.animationPath.setPath(pathToShow);
        
        // Actualizar posición del marcador
        const currentPoint = this.points[this.currentIndex];
        this.currentMarker.setPosition(currentPoint);
    }

    // Método para actualizar basado en el valor del slider (0-100)
    setProgress(progressPercent) {
        if (this.points.length === 0) return;
        
        // Convertir el porcentaje a índice
        this.currentIndex = Math.floor((progressPercent / 100) * (this.points.length - 1));
        this.updateVisualization();
    }

    clear() {
        this.animationPath.setPath([]);
        this.currentMarker.setMap(null);
        this.points = [];
        this.currentIndex = 0;
    }
} 