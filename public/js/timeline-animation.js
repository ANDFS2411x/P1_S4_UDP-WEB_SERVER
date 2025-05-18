class TimelineAnimation {
    constructor(map) {
        this.map = map;
        this.taxiData = {}; // Objeto para almacenar datos por taxiId
        this.mode = 'route'; // 'route' o 'point'
        this.progress = 0; // Progreso actual (0-100)
        this.selectedTaxiId = "0"; // "0" para todos
        
        // Colores para taxis
        this.taxiColors = {
            "1": "#FF0000", // Rojo para taxi 1
            "2": "#0000FF"  // Azul para taxi 2
        };
        
        // Almacenar las polilíneas y marcadores por taxiId
        this.animationPaths = {};
        this.currentMarkers = {};
        
        // Información temporal
        this.startTimestamp = null;
        this.endTimestamp = null;
    }

    setSelectedTaxiId(taxiId) {
        this.selectedTaxiId = taxiId;
        this.updateVisibility();
    }

    setMode(mode) {
        this.mode = mode;
        this.updateVisibility();
    }
    
    // Método para convertir fecha y hora en timestamp
    getTimestamp(dateStr, timeStr) {
        if (!dateStr || !timeStr) return null;
        
        // Procesar la fecha que puede venir en formato ISO o regular
        let formattedDate = dateStr;
        if (dateStr.includes("T")) {
            formattedDate = dateStr.split("T")[0];
        }
        
        return new Date(`${formattedDate} ${timeStr}`).getTime();
    }
    
    
    // Método para actualizar la visibilidad según el taxi seleccionado
    updateVisibility() {
        // Si solo se muestra un taxi específico
        if (this.selectedTaxiId !== "0") {
            Object.keys(this.animationPaths).forEach(taxiId => {
                const isVisible = taxiId === this.selectedTaxiId;
                console.log(`Taxi ${taxiId} visible: ${isVisible}`);

                console.log(this.animationPaths[taxiId]);
                // Actualizar la visibilidad de la polilínea y el marcador
                if (this.animationPaths[taxiId]) {
                    this.animationPaths[taxiId].setMap(isVisible ? this.map : null);
                    this.animationPaths[taxiId].setVisible(isVisible ? this.visible: false);

                }
                console.log(this.currentMarkers[taxiId]);
                // Actualizar la visibilidad del marcador
                if (this.currentMarkers[taxiId]) {
                    this.currentMarkers[taxiId].setMap(isVisible ? this.map : null);
                    this.currentMarkers[taxiId].setVisible(isVisible ? this.visible: false);
                }
            });
        } else {
            // Mostrar todos los taxis
            Object.keys(this.animationPaths).forEach(taxiId => {
                if (this.animationPaths[taxiId]) {
                    this.animationPaths[taxiId].setMap(this.map);
                    this.animationPaths[taxiId].setVisible(true);
                }
                if (this.currentMarkers[taxiId]) {
                    this.currentMarkers[taxiId].setMap(this.map);
                    this.currentMarkers[taxiId].setVisible(true);
                }
            });
        }
    }

    setPoints(pointsData, mode = 'point') {
        // Limpiar datos anteriores
        this.clear();
        
        this.mode = mode;
        
        // Organizar los puntos por taxiId
        this.taxiData = {};
        this.startTimestamp = Infinity;
        this.endTimestamp = -Infinity;
        
        pointsData.forEach(point => {
            const taxiId = point.ID_TAXI.toString();
            const timestamp = this.getTimestamp(point.date, point.time);
            
            if (!this.taxiData[taxiId]) {
                this.taxiData[taxiId] = [];
                
                // Crear la polilínea para este taxi
                this.animationPaths[taxiId] = new google.maps.Polyline({
                    geodesic: true,
                    strokeColor: this.taxiColors[taxiId] || "#" + ((1 << 24) * Math.random() | 0).toString(16).padStart(6, "0"),
                    strokeOpacity: 1.0,
                    strokeWeight: 4,
                    map: this.map
                });
                
                // Crear el marcador para este taxi
                this.currentMarkers[taxiId] = new google.maps.Marker({
                    map: this.map,
                    title: `Taxi ${taxiId}`,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 10,
                        fillColor: this.taxiColors[taxiId] || "#" + ((1 << 24) * Math.random() | 0).toString(16).padStart(6, "0"),
                        fillOpacity: 1.0,
                        strokeColor: "#FFFFFF",
                        strokeWeight: 2
                    }
                });
            }
            
            // Añadir punto con su timestamp
            this.taxiData[taxiId].push({
                ...point, 
                timestamp: timestamp
            });
            
            // Actualizar timestamps mínimo y máximo
            if (timestamp) {
                this.startTimestamp = Math.min(this.startTimestamp, timestamp);
                this.endTimestamp = Math.max(this.endTimestamp, timestamp);
            }
        });
        
        // Ordenar cada array de taxiData por timestamp
        Object.keys(this.taxiData).forEach(taxiId => {
            this.taxiData[taxiId].sort((a, b) => a.timestamp - b.timestamp);
        });
        
        // Actualizar visibilidad inicial
        this.updateVisibility();
        
        // Establecer progreso inicial
        this.setProgress(0);
    }

    updateVisualization() {
        // Si no hay datos, salimos
        if (!this.taxiData || Object.keys(this.taxiData).length === 0) return;

        Object.keys(this.taxiData).forEach(taxiId => {
            const pts = this.taxiData[taxiId];
            if (!pts || pts.length === 0) return;

            // Coordenadas completas del taxi
            const fullPathCoords = pts.map(point => ({ lat: point.lat, lng: point.lng }));

            if (this.mode === 'route') {
                // 1) Siempre dejamos la polilínea completa
                this.animationPaths[taxiId].setPath(fullPathCoords);

                // 2) Calculamos el índice según el porcentaje de progress
                const idx = Math.floor((this.progress / 100) * (fullPathCoords.length - 1));
                const pos = fullPathCoords[idx];

                // 3) Movemos el marcador a esa posición
                this.currentMarkers[taxiId].setPosition(pos);
                this.currentMarkers[taxiId].setMap(this.map);

            } else {
                // Modo “point” / “trail”: lógica original que va creciendo la ruta
                // (puedes dejar aquí tu código existente si lo usas)
                const currentTimestamp = this.startTimestamp + (this.endTimestamp - this.startTimestamp) * (this.progress / 100);
                const visiblePoints = pts.filter(point => point.timestamp <= currentTimestamp);
                if (visiblePoints.length === 0) {
                    this.animationPaths[taxiId].setPath([]);
                    this.currentMarkers[taxiId].setMap(null);
                    return;
                }
                this.animationPaths[taxiId].setPath(visiblePoints.map(point => ({ lat: point.lat, lng: point.lng })));
                const last = visiblePoints[visiblePoints.length - 1];
                this.currentMarkers[taxiId].setPosition({ lat: last.lat, lng: last.lng });
                this.currentMarkers[taxiId].setMap(this.map);
            }
        });
    }


    
    /*updateVisualization() {
        if (this.startTimestamp === Infinity || this.endTimestamp === -Infinity) return;
        
        // Calcular el timestamp actual basado en el progreso
        const totalTimeSpan = this.endTimestamp - this.startTimestamp;
        const currentTimestamp = this.startTimestamp + (totalTimeSpan * (this.progress / 100));
        
        // Para cada taxi, actualizar su visualización basada en el tiempo actual
        Object.keys(this.taxiData).forEach(taxiId => {
            const taxiPoints = this.taxiData[taxiId];
            if (!taxiPoints || taxiPoints.length === 0) return;
            
            // Encontrar todos los puntos hasta el timestamp actual
            const visiblePoints = taxiPoints.filter(p => p.timestamp <= currentTimestamp);
            
            if (visiblePoints.length === 0) {
                // No hay puntos visibles aún para este taxi
                this.animationPaths[taxiId].setPath([]);
                this.currentMarkers[taxiId].setMap(null);
                return;
            }
            
            // Obtener el punto más reciente para el marcador
            const lastPoint = visiblePoints[visiblePoints.length - 1];
            
            // Actualizar la polilínea con todos los puntos visibles
            const pathCoords = visiblePoints.map(p => ({ lat: p.lat, lng: p.lng }));
            this.animationPaths[taxiId].setPath(pathCoords);
            
            // Actualizar posición del marcador
            this.currentMarkers[taxiId].setPosition({ lat: lastPoint.lat, lng: lastPoint.lng });
            this.currentMarkers[taxiId].setMap(this.map);
        });
    }*/

    setProgress(progressPercent) {
        this.progress = progressPercent;
        this.updateVisualization();
        
        // Devolver información del punto actual en el tiempo
        return this.getCurrentTimeInfo();
    }
    
    getCurrentTimeInfo() {
        if (this.startTimestamp === Infinity || this.endTimestamp === -Infinity) {
            return { timestamp: null };
        }
        
        // Calcular el timestamp actual
        const totalTimeSpan = this.endTimestamp - this.startTimestamp;
        const currentTimestamp = this.startTimestamp + (totalTimeSpan * (this.progress / 100));
        
        // Para el taxi seleccionado (o el primero si es "todos")
        const taxiId = this.selectedTaxiId !== "0" ? this.selectedTaxiId : Object.keys(this.taxiData)[0];
        const taxiPoints = this.taxiData[taxiId];
        
        if (!taxiPoints || taxiPoints.length === 0) {
            return { timestamp: currentTimestamp };
        }
        
        // Encontrar el punto más cercano al timestamp actual
        let closestPoint = taxiPoints[0];
        let minTimeDiff = Math.abs(currentTimestamp - closestPoint.timestamp);
        
        for (let i = 1; i < taxiPoints.length; i++) {
            const timeDiff = Math.abs(currentTimestamp - taxiPoints[i].timestamp);
            if (timeDiff < minTimeDiff) {
                minTimeDiff = timeDiff;
                closestPoint = taxiPoints[i];
            }
        }
        
        return {
            ...closestPoint,
            timestamp: currentTimestamp
        };
    }

    clear() {
        // Limpiar todas las polilíneas y marcadores
        Object.values(this.animationPaths).forEach(path => path.setPath([]));
        Object.values(this.currentMarkers).forEach(marker => marker.setMap(null));
        
        this.animationPaths = {};
        this.currentMarkers = {};
        this.taxiData = {};
        this.startTimestamp = Infinity;
        this.endTimestamp = -Infinity;
    }
}