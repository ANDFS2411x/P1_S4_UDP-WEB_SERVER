class TimelineAnimation {
    constructor(map) {
        this.map = map;
        this.points = [];
        this.currentIndex = 0;
        this.mode = 'route'; // 'route' o 'point'
        this.taxiId = "1"; // Default taxi ID
        this.showAllTaxis = false; // Flag para mostrar todos los taxis
        
        // Definir colores por ID de taxi (mismo esquema que en tiempo real)
        this.taxiColors = {
            "1": "#FF0000", // Rojo para Taxi 1
            "2": "#0000FF"  // Azul para Taxi 2
        };
        
        // Objeto para almacenar polylines por ID de taxi
        this.polylines = {};
        
        // Polyline principal (para un solo taxi)
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
        
        // En modo punto, ocultar las polilíneas
        if (mode === 'point') {
            if (this.showAllTaxis) {
                Object.values(this.polylines).forEach(polyline => polyline.setMap(null));
            } else {
                this.animationPath.setMap(null);
            }
        } else {
            if (this.showAllTaxis) {
                Object.values(this.polylines).forEach(polyline => polyline.setMap(this.map));
            } else {
                this.animationPath.setMap(this.map);
            }
        }
        
        // Asegurarse de que el marcador esté visible en ambos modos
        this.currentMarker.setMap(this.map);
    }

    setPoints(points, mode = 'route') {
        this.points = points;
        this.currentIndex = 0;
        
        // Verificar si se seleccionó "Todos" (taxiId = 0)
        const firstPoint = points.length > 0 ? points[0] : null;
        if (firstPoint && firstPoint.ID_TAXI) {
            this.taxiId = firstPoint.ID_TAXI.toString();
            
            // Verificar si hay múltiples taxis en los datos
            const uniqueTaxiIds = [...new Set(points.map(p => p.ID_TAXI?.toString()))];
            this.showAllTaxis = uniqueTaxiIds.length > 1 || this.taxiId === "0";
            
            if (this.showAllTaxis) {
                // Limpiar polylines anteriores
                Object.values(this.polylines).forEach(polyline => polyline.setMap(null));
                this.polylines = {};
                this.animationPath.setMap(null);
                
                // Agrupar puntos por ID de taxi
                const pointsByTaxi = {};
                points.forEach(point => {
                    const id = point.ID_TAXI?.toString() || "1";
                    if (!pointsByTaxi[id]) {
                        pointsByTaxi[id] = [];
                    }
                    pointsByTaxi[id].push(point);
                });
                
                // Crear polyline para cada taxi
                Object.entries(pointsByTaxi).forEach(([taxiId, taxiPoints]) => {
                    const taxiColor = this.taxiColors[taxiId] || "#FF0000"; // Color por defecto si no hay color definido
                    
                    this.polylines[taxiId] = new google.maps.Polyline({
                        path: taxiPoints,
                        geodesic: true,
                        strokeColor: taxiColor,
                        strokeOpacity: 1.0,
                        strokeWeight: 4,
                        map: mode === 'point' ? null : this.map
                    });
                });
                
                // Configurar marcador con el color del primer taxi (solo visual)
                const firstTaxiId = Object.keys(pointsByTaxi)[0] || "1";
                const markerColor = this.taxiColors[firstTaxiId] || "#FF0000";
                const markerIcon = this.currentMarker.getIcon();
                markerIcon.fillColor = markerColor;
                this.currentMarker.setIcon(markerIcon);
            } else {
                // Modo de un solo taxi
                // Ocultar polylines múltiples si existen
                Object.values(this.polylines).forEach(polyline => polyline.setMap(null));
                
                // Actualizar color de la polilínea según el ID del taxi
                const taxiColor = this.taxiColors[this.taxiId] || "#FF0000"; // Rojo por defecto si no hay color definido
                this.animationPath.setOptions({ strokeColor: taxiColor });
                this.animationPath.setMap(mode === 'point' ? null : this.map);
                
                // Actualizar color del marcador
                const markerIcon = this.currentMarker.getIcon();
                markerIcon.fillColor = taxiColor;
                this.currentMarker.setIcon(markerIcon);
            }
        }
        
        this.setMode(mode);
        this.updateVisualization();
    }

    updateVisualization() {
        if (this.currentIndex >= this.points.length) return;
        
        // Actualizar la polilínea solo en modo ruta
        if (this.mode === 'route') {
            if (this.showAllTaxis) {
                // En modo "Todos", las polylines ya están completas, no necesitan actualizarse
            } else {
                // En modo de un solo taxi, actualizar la polyline principal
                const pathToShow = this.points.slice(0, this.currentIndex + 1);
                this.animationPath.setPath(pathToShow);
            }
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
        this.animationPath.setMap(null);
        
        // Limpiar todas las polylines
        Object.values(this.polylines).forEach(polyline => {
            polyline.setPath([]);
            polyline.setMap(null);
        });
        this.polylines = {};
        
        this.currentMarker.setMap(null);
        this.points = [];
        this.currentIndex = 0;
        this.showAllTaxis = false;
    }
}