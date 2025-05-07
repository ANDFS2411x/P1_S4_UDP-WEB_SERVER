class TimelineAnimation {
    constructor(map) {
      this.map          = map;
      this.taxiData     = {};    // puntos por taxi
      this.animationPaths  = {}; // polilíneas
      this.currentMarkers  = {}; // marcadores
      this.startTimestamp  = Infinity;
      this.endTimestamp    = -Infinity;
      this.progress     = 0;     // 0..100
      this.selectedTaxiId = "0"; // "0" = todos
      this.mode         = 'route'; // 'route' o 'point'
      
      this.taxiColors = {
        "1": "#FF0000",
        "2": "#0000FF"
      };
    }
  
    setSelectedTaxiId(taxiId) {
      this.selectedTaxiId = taxiId;
      this.updateVisualization();
    }
  
    setMode(mode) {
      this.mode = mode;
      this.updateVisualization();
    }
  
    // convierte "YYYY-MM-DD" + "HH:mm:ss" a ms
    getTimestamp(dateStr, timeStr) {
      if (!dateStr || !timeStr) return null;
      let d = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
      return new Date(`${d} ${timeStr}`).getTime();
    }
  
    clear() {
      // limpiar mapas
      Object.values(this.animationPaths).forEach(poly => poly.setMap(null));
      Object.values(this.currentMarkers).forEach(m => m.setMap(null));
      this.taxiData = {};
      this.animationPaths = {};
      this.currentMarkers = {};
      this.startTimestamp = Infinity;
      this.endTimestamp   = -Infinity;
    }
  
    setPoints(pointsData, mode = 'route') {
      // 1) borrar datos viejos
      this.clear();
      this.mode = mode;
      
      // 2) agrupar y crear objetos
      pointsData.forEach(pt => {
        const taxiId = pt.ID_TAXI.toString();
        const ts     = this.getTimestamp(pt.date, pt.time);
        if (!this.taxiData[taxiId]) {
          this.taxiData[taxiId] = [];
          // polilínea
          this.animationPaths[taxiId] = new google.maps.Polyline({
            map: this.map,
            geodesic: true,
            strokeColor: this.taxiColors[taxiId] || '#000',
            strokeWeight: 4,
            strokeOpacity: 1
          });
          // marcador
          this.currentMarkers[taxiId] = new google.maps.Marker({
            map: this.map,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: this.taxiColors[taxiId] || '#000',
              fillOpacity: 1,
              strokeColor: '#fff',
              strokeWeight: 2
            }
          });
        }
        this.taxiData[taxiId].push({ ...pt, timestamp: ts });
        if (ts) {
          this.startTimestamp = Math.min(this.startTimestamp, ts);
          this.endTimestamp   = Math.max(this.endTimestamp, ts);
        }
      });
  
      // 3) ordenar cada taxi por tiempo
      Object.values(this.taxiData).forEach(arr => 
        arr.sort((a,b) => a.timestamp - b.timestamp)
      );
  
      // 4) si arrancamos en 'route', dibuja la ruta completa ya:
      if (this.mode === 'route') {
        Object.entries(this.taxiData).forEach(([taxiId, pts]) => {
          const coords = pts.map(p=>({lat:p.lat,lng:p.lng}));
          this.animationPaths[taxiId].setPath(coords);
        });
      }
  
      // 5) y por último, render inicial
      this.setProgress(0);
    }
  
    updateVisualization() {
      if (this.startTimestamp === Infinity) return;
  
      const span = this.endTimestamp - this.startTimestamp;
      const now = this.startTimestamp + span * (this.progress/100);
  
      Object.entries(this.taxiData).forEach(([taxiId, pts]) => {
        if (pts.length === 0) return;
        const poly = this.animationPaths[taxiId];
        const marker = this.currentMarkers[taxiId];
  
        // ruta completa
        const fullCoords = pts.map(p=>({lat:p.lat,lng:p.lng}));
  
        if (this.mode === 'route') {
          // mantiene la ruta entera
          poly.setPath(fullCoords);
          // mueve sólo el marcador
          const idx = Math.floor((this.progress/100)*(fullCoords.length-1));
          marker.setPosition(fullCoords[idx]);
          marker.setMap(this.map);
  
        } else {
          // route en construcción
          const mostrados = pts.filter(p=>p.timestamp<=now);
          const trail = mostrados.map(p=>({lat:p.lat,lng:p.lng}));
          poly.setPath(trail);
          if (trail.length) {
            marker.setPosition(trail[trail.length-1]);
            marker.setMap(this.map);
          } else {
            marker.setMap(null);
          }
        }
      });
    }
  
    setProgress(p) {
      this.progress = p;
      this.updateVisualization();
    }
}  