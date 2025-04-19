class TimelineAnimation {
    constructor(map) {
        this.map = map;
        this.points = [];
        this.currentIndex = 0;
        this.searchRadius = 50; // radio de búsqueda en metros

        // Polilínea para mostrar el recorrido
        this.animationPath = new google.maps.Polyline({
            geodesic: true,
            strokeColor: "#FF0000",
            strokeOpacity: 1.0,
            strokeWeight: 4,
            map: this.map
        });

        // Marcador para la posición actual
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

        // Círculo para mostrar el área de búsqueda
        this.searchCircle = new google.maps.Circle({
            map: null, // Inicialmente oculto
            strokeColor: "#4CAF50",
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: "#4CAF50",
            fillOpacity: 0.15,
            radius: this.searchRadius
        });

        // Configurar evento de clic en el mapa
        this.map.addListener('click', (event) => {
            this.handleMapClick(event.latLng);
        });

        // Ventana de información para mostrar detalles
        this.infoWindow = new google.maps.InfoWindow();
    }

    setPoints(points) {
        this.points = points;
        this.currentIndex = 0;
        this.updateVisualization();
    }

    updateVisualization() {
        if (this.currentIndex >= this.points.length) return;
        
        const pathToShow = this.points.slice(0, this.currentIndex + 1);
        this.animationPath.setPath(pathToShow);
        
        const currentPoint = this.points[this.currentIndex];
        this.currentMarker.setPosition(currentPoint);
    }

    setProgress(progressPercent) {
        if (this.points.length === 0) return;
        
        this.currentIndex = Math.floor((progressPercent / 100) * (this.points.length - 1));
        this.updateVisualization();
    }

    // Calcular distancia entre dos puntos en metros
    calculateDistance(point1, point2) {
        const R = 6371000; // Radio de la Tierra en metros
        const lat1 = point1.lat * Math.PI / 180;
        const lat2 = point2.lat * Math.PI / 180;
        const dLat = (point2.lat - point1.lat) * Math.PI / 180;
        const dLon = (point2.lng - point1.lng) * Math.PI / 180;

        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1) * Math.cos(lat2) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c;
    }

    // Manejar clic en el mapa
    handleMapClick(latLng) {
        const clickedPoint = {
            lat: latLng.lat(),
            lng: latLng.lng()
        };

        // Mostrar círculo de búsqueda
        this.searchCircle.setCenter(clickedPoint);
        this.searchCircle.setMap(this.map);

        // Encontrar todos los momentos en que el vehículo pasó por esta área
        const passagePoints = this.findPassagePoints(clickedPoint);

        if (passagePoints.length > 0) {
            // Mostrar información del primer punto encontrado
            this.showPassageInfo(passagePoints[0]);
            
            // Actualizar el slider a la posición del primer punto encontrado
            const progressPercent = (passagePoints[0].index / (this.points.length - 1)) * 100;
            const event = new CustomEvent('timelineUpdate', { 
                detail: { 
                    progress: progressPercent,
                    totalPoints: passagePoints.length,
                    points: passagePoints
                }
            });
            window.dispatchEvent(event);
        } else {
            this.infoWindow.setContent('No se encontraron registros del vehículo en esta área');
            this.infoWindow.setPosition(latLng);
            this.infoWindow.open(this.map);
        }
    }

    // Encontrar puntos donde el vehículo pasó por un área específica
    findPassagePoints(searchPoint) {
        return this.points
            .map((point, index) => ({...point, index}))
            .filter(point => 
                this.calculateDistance(searchPoint, point) <= this.searchRadius
            );
    }

    // Mostrar información de un punto de paso
    showPassageInfo(point) {
        const content = `
            <div class="info-window">
                <h4>Registro encontrado</h4>
                <p>Fecha: ${point.date}</p>
                <p>Hora: ${point.time}</p>
                <p><small>Click para ver más detalles</small></p>
            </div>
        `;

        this.infoWindow.setContent(content);
        this.infoWindow.setPosition({lat: point.lat, lng: point.lng});
        this.infoWindow.open(this.map);
    }

    clear() {
        this.animationPath.setPath([]);
        this.currentMarker.setMap(null);
        this.searchCircle.setMap(null);
        this.infoWindow.close();
        this.points = [];
        this.currentIndex = 0;
    }
} 