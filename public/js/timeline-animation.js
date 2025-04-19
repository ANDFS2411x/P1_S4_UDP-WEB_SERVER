class TimelineAnimation {
    constructor(map) {
        this.map = map;
        this.points = [];
        this.currentIndex = 0;
        this.selectedPoint = null;
        this.searchRadius = 50; // metros por defecto

        // Polilínea para mostrar la trayectoria completa
        this.completePath = new google.maps.Polyline({
            geodesic: true,
            strokeColor: "#4285F4",
            strokeOpacity: 0.5,
            strokeWeight: 2,
            map: this.map
        });

        // Polilínea para resaltar los segmentos donde pasó por el punto seleccionado
        this.highlightPath = new google.maps.Polyline({
            geodesic: true,
            strokeColor: "#FF0000",
            strokeOpacity: 1.0,
            strokeWeight: 4,
            map: this.map
        });

        // Marcador para el punto seleccionado
        this.selectedPointMarker = new google.maps.Marker({
            map: this.map,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: "#4CAF50",
                fillOpacity: 1.0,
                strokeColor: "#FFFFFF",
                strokeWeight: 2
            }
        });

        // Círculo para mostrar el radio de búsqueda
        this.searchCircle = new google.maps.Circle({
            map: this.map,
            strokeColor: "#4CAF50",
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: "#4CAF50",
            fillOpacity: 0.1,
            radius: this.searchRadius
        });

        // Configurar evento de clic en el mapa
        this.map.addListener('click', (event) => this.handleMapClick(event));
    }

    setPoints(points) {
        this.points = points;
        // Mostrar la trayectoria completa
        this.completePath.setPath(points);
    }

    handleMapClick(event) {
        const clickedPoint = {
            lat: event.latLng.lat(),
            lng: event.latLng.lng()
        };

        this.selectedPoint = clickedPoint;
        this.selectedPointMarker.setPosition(clickedPoint);
        this.searchCircle.setCenter(clickedPoint);

        // Encontrar todos los momentos en que el vehículo pasó por este punto
        const passagePoints = this.findPassagePoints(clickedPoint);
        this.highlightPassagePoints(passagePoints);
    }

    findPassagePoints(point) {
        const passages = [];
        
        for (let i = 0; i < this.points.length; i++) {
            const distance = this.calculateDistance(
                point.lat, point.lng,
                this.points[i].lat, this.points[i].lng
            );

            if (distance <= this.searchRadius) {
                passages.push({
                    index: i,
                    point: this.points[i],
                    distance: distance
                });
            }
        }

        return passages;
    }

    highlightPassagePoints(passages) {
        if (passages.length === 0) {
            this.highlightPath.setPath([]);
            return;
        }

        // Crear segmentos resaltados alrededor de cada punto de paso
        const highlightSegments = [];
        const bufferSize = 5; // Puntos antes y después para el resaltado

        passages.forEach(passage => {
            const start = Math.max(0, passage.index - bufferSize);
            const end = Math.min(this.points.length - 1, passage.index + bufferSize);
            
            for (let i = start; i <= end; i++) {
                highlightSegments.push(this.points[i]);
            }
        });

        this.highlightPath.setPath(highlightSegments);
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

    setSearchRadius(radius) {
        this.searchRadius = radius;
        this.searchCircle.setRadius(radius);
        if (this.selectedPoint) {
            const passages = this.findPassagePoints(this.selectedPoint);
            this.highlightPassagePoints(passages);
        }
    }

    clear() {
        this.completePath.setPath([]);
        this.highlightPath.setPath([]);
        this.selectedPointMarker.setMap(null);
        this.searchCircle.setMap(null);
        this.points = [];
        this.selectedPoint = null;
    }
} 