/* Clase modificada TimelineAnimation */
class TimelineAnimation {
    constructor(map) {
        this.map = map;
        this.taxiData = {};
        this.mode = 'route';      // 'route' o 'point'
        this.progress = 0;        // 0-100
        this.selectedTaxiId = "0";
        this.taxiColors = { "1": "#FF0000", "2": "#0000FF" };
        this.animationPaths = {};
        this.currentMarkers = {};
        this.startTimestamp = Infinity;
        this.endTimestamp = -Infinity;
    }

    setSelectedTaxiId(taxiId) {
        this.selectedTaxiId = taxiId;
        this.updateVisibility();
    }

    setMode(mode) {
        this.mode = mode;
        this.updateVisibility();
    }

    getTimestamp(dateStr, timeStr) {
        if (!dateStr || !timeStr) return null;
        let formattedDate = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
        return new Date(`${formattedDate} ${timeStr}`).getTime();
    }

    updateVisibility() {
        if (this.selectedTaxiId !== "0") {
            Object.keys(this.animationPaths).forEach(taxiId => {
                const isVisible = taxiId === this.selectedTaxiId;
                // Polilínea
                this.animationPaths[taxiId].setMap(isVisible ? this.map : null);
                this.animationPaths[taxiId].setVisible(isVisible);
                // Marcador
                this.currentMarkers[taxiId].setMap(isVisible ? this.map : null);
                this.currentMarkers[taxiId].setVisible(isVisible);
            });
        } else {
            Object.keys(this.animationPaths).forEach(taxiId => {
                this.animationPaths[taxiId].setMap(this.map);
                this.animationPaths[taxiId].setVisible(true);
                this.currentMarkers[taxiId].setMap(this.map);
                this.currentMarkers[taxiId].setVisible(true);
            });
        }
    }

    setPoints(pointsData, mode = 'route') {
        this.clear();
        this.mode = mode;
        this.taxiData = {};
        this.startTimestamp = Infinity;
        this.endTimestamp = -Infinity;

        // Organizar datos
        pointsData.forEach(point => {
            const taxiId = point.ID_TAXI.toString();
            const ts = this.getTimestamp(point.date, point.time);
            if (!this.taxiData[taxiId]) {
                this.taxiData[taxiId] = [];
                // Crear polilínea
                this.animationPaths[taxiId] = new google.maps.Polyline({
                    geodesic: true,
                    strokeColor: this.taxiColors[taxiId] || '#'+Math.random().toString(16).slice(2,8),
                    strokeOpacity: 1.0,
                    strokeWeight: 4,
                    map: this.map
                });
                // Crear marcador
                this.currentMarkers[taxiId] = new google.maps.Marker({
                    map: this.map,
                    title: `Taxi ${taxiId}`,
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 10,
                        fillColor: this.taxiColors[taxiId] || '#'+Math.random().toString(16).slice(2,8),
                        fillOpacity: 1.0,
                        strokeColor: '#FFFFFF',
                        strokeWeight: 2
                    }
                });
            }
            this.taxiData[taxiId].push({ ...point, timestamp: ts });
            if (ts) {
                this.startTimestamp = Math.min(this.startTimestamp, ts);
                this.endTimestamp = Math.max(this.endTimestamp, ts);
            }
        });

        // Ordenar
        Object.keys(this.taxiData).forEach(taxiId =>
            this.taxiData[taxiId].sort((a, b) => a.timestamp - b.timestamp)
        );

        // Dibujar ruta completa
        Object.keys(this.taxiData).forEach(taxiId => {
            const coords = this.taxiData[taxiId].map(p => ({ lat: p.lat, lng: p.lng }));
            this.animationPaths[taxiId].setPath(coords);
        });

        // Visibilidad y punto inicial
        this.updateVisibility();
        this.setProgress(0);
    }

    updateVisualization() {
        // Si modo 'route', sólo mover marcadores
        if (this.mode === 'route') {
            Object.keys(this.taxiData).forEach(taxiId => {
                const pts = this.taxiData[taxiId];
                if (!pts.length) return;
                const idx = Math.floor(pts.length * (this.progress / 100));
                const p = pts[Math.min(idx, pts.length - 1)];
                this.currentMarkers[taxiId].setPosition({ lat: p.lat, lng: p.lng });
                this.currentMarkers[taxiId].setMap(this.map);
            });
            return;
        }

        // Modo 'point': ruta se actualiza según tiempo
        if (this.startTimestamp === Infinity || this.endTimestamp === -Infinity) return;
        const span = this.endTimestamp - this.startTimestamp;
        const currentTs = this.startTimestamp + span * (this.progress / 100);

        Object.keys(this.taxiData).forEach(taxiId => {
            const arr = this.taxiData[taxiId];
            const visible = arr.filter(p => p.timestamp <= currentTs);
            if (!visible.length) {
                this.animationPaths[taxiId].setPath([]);
                this.currentMarkers[taxiId].setMap(null);
                return;
            }
            const last = visible[visible.length - 1];
            const pathCoords = visible.map(p => ({ lat: p.lat, lng: p.lng }));
            this.animationPaths[taxiId].setPath(pathCoords);
            this.currentMarkers[taxiId].setPosition({ lat: last.lat, lng: last.lng });
            this.currentMarkers[taxiId].setMap(this.map);
        });
    }

    setProgress(progressPercent) {
        this.progress = progressPercent;
        this.updateVisualization();
        return this.getCurrentTimeInfo();
    }

    getCurrentTimeInfo() {
        if (this.startTimestamp === Infinity || this.endTimestamp === -Infinity) {
            return { timestamp: null };
        }
        const span = this.endTimestamp - this.startTimestamp;
        const currentTs = this.startTimestamp + span * (this.progress / 100);
        const taxiId = this.selectedTaxiId !== '0' ? this.selectedTaxiId : Object.keys(this.taxiData)[0];
        const arr = this.taxiData[taxiId] || [];
        if (!arr.length) return { timestamp: currentTs };
        let closest = arr[0];
        let diff = Math.abs(currentTs - closest.timestamp);
        for (let p of arr) {
            const d = Math.abs(currentTs - p.timestamp);
            if (d < diff) { diff = d; closest = p; }
        }
        return { ...closest, timestamp: currentTs };
    }

    clear() {
        Object.values(this.animationPaths).forEach(path => path.setPath([]));
        Object.values(this.currentMarkers).forEach(marker => marker.setMap(null));
        this.animationPaths = {};
        this.currentMarkers = {};
        this.taxiData = {};
        this.startTimestamp = Infinity;
        this.endTimestamp = -Infinity;
    }
}

/* Configuración del slider tras la búsqueda */
function configureSlider(pointsData, timelineAnimation) {
    const slider = document.getElementById('timelineSlider');
    const total = pointsData.length;
    slider.min = 0;
    slider.max = total - 1;
    slider.step = 1;
    slider.value = 0;
    slider.style.backgroundSize = '0% 100%';
    slider.oninput = e => {
        const idx = parseInt(e.target.value);
        const pct = Math.floor(100 * (idx / (total - 1)));
        slider.style.backgroundSize = `${pct}% 100%`;
        timelineAnimation.setProgress(pct);
    };
}

/* Ejemplo de uso en el handler de búsqueda */
function onFechaSearch(result) {
    const puntos = result.data; // array con {ID_TAXI, date, time, lat, lng}
    // Dibuja ruta completa y prepara animación
    timelineAnimation.setPoints(puntos, 'route');
    // Configura slider
    configureSlider(puntos, timelineAnimation);
}
