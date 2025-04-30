class TimelineAnimation {
    constructor(map) {
        this.map = map;
        this.points = [];
        this.currentIndex = 0;
        this.mode = 'route'; // 'route' o 'point'
        this.taxiId = "1"; // Default taxi ID
        
        // Definir colores por ID de taxi (mismo esquema que en tiempo real)
        this.taxiColors = {
            "1": "#FF0000", // Rojo para Taxi 1
            "2": "#0000FF"  // Azul para Taxi 2
        };
        
        this.animationPath = new google.maps.Polyline({
            geodesic: true,
            strokeColor: this.taxiColors["1"], // Color por defecto
            strokeOpacity: 1.0,
            strokeWeight: 4,
            map: this.map
        });
        
        this.currentMarker = new google.maps.Marker({
            map: this.map,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: this.taxiColors["1"], // Color por defecto
                fillOpacity: 1.0,
                strokeColor: "#FFFFFF",
                strokeWeight: 2
            },
            animation: google.maps.Animation.BOUNCE
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
    }

    setPoints(points, mode = 'route') {
        this.points = points;
        this.currentIndex = 0;
        
        // Determinar el ID del taxi a partir del primer punto
        if (points.length > 0 && points[0].ID_TAXI) {
            this.taxiId = points[0].ID_TAXI.toString();
            
            // Actualizar color de la polilínea según el ID del taxi
            const taxiColor = this.taxiColors[this.taxiId] || "#FF0000"; // Rojo por defecto si no hay color definido
            this.animationPath.setOptions({ strokeColor: taxiColor });
            
            // Actualizar color del marcador
            const markerIcon = this.currentMarker.getIcon();
            markerIcon.fillColor = taxiColor;
            this.currentMarker.setIcon(markerIcon);
        }
        
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
    }

    clear() {
        this.animationPath.setPath([]);
        this.currentMarker.setMap(null);
        this.points = [];
        this.currentIndex = 0;
    }
}