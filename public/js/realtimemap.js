// public/js/realtimeMap.js

import { dom }      from '/js/dom.js';
import { appState } from '/js/state.js';
import { fetchData }from '/js/api.js';
import UIManager    from '/js/uiManager.js';

const ui = new UIManager(dom);

/**
 * Carga dinámicamente la API de Google Maps y llama a window.initMapsCallback (mapsApiLoaded).
 */
export async function initMap() {
  try {
    const { apiKey } = await fetchData('/api-key');
    if (!apiKey) throw new Error('API Key no encontrada');

    // Obtener posiciones iniciales
    const ubicaciones = await fetchData('/data');
    console.log(ubicaciones);
    if (!ubicaciones || !Array.isArray(ubicaciones) || ubicaciones.length === 0) {
        throw new Error("Datos de ubicación inicial incompletos");
    }

    ubicaciones.forEach(taxi => {
        if (!taxi?.LATITUDE || !taxi?.LONGITUDE || !taxi?.ID_TAXI) return;
        
        const taxiId = taxi.ID_TAXI.toString();
        const posicion = {
            lat: parseFloat(taxi.LATITUDE),
            lng: parseFloat(taxi.LONGITUDE)
        };
        
        if (isNaN(posicion.lat) || isNaN(posicion.lng)) return;
        
        // Inicializar recorrido para este taxi
        if (!appState.realTime.recorridos[taxiId]) {
            appState.realTime.recorridos[taxiId] = [posicion];
        }
    });

    await new Promise((resolve, reject) => {
      window.initMapsCallback = resolve;
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMapsCallback`;
      script.async = true;
      script.defer = true;
      script.onerror = () => reject(new Error('Error cargando Google Maps API'));
      document.head.appendChild(script);
    });

  } catch (err) {
    console.error('Error inicializando la API de Google Maps:', err);
    ui.showError(err.message);
  }
}

export function mapsApiLoaded() {
    console.log('Google Maps API cargada');
    appState.realTime.mapsLoaded = true;
    appState.historical.mapsLoaded = true;
    
    initRealMapInstance();
    initHistoricalMapInstance();
    
    // Crear marcadores y polilíneas para los taxis
    createTaxiMarkers();
}

/**
 * Inicializa el mapa en tiempo real y engancha eventos.
 */
export function initRealMapInstance() {
  const centerReal = { lat: 11.006374, lng: -74.812042 };
  console.log('Inicializando mapa en tiempo real...');
  appState.realTime.map = new google.maps.Map(dom.realMapContainer, {
    center: centerReal,
    zoom: 13,
    streetViewControl: false
  });

  dom.spinnerReal.addEventListener('change', (e) => {
    appState.realTime.currentTaxiId = e.target.value;
    updateTaxiVisibility(e.target.value);
  });

  dom.seguirBtn.addEventListener('click', () => {
    appState.realTime.seguirCentrando = true;
    if (appState.realTime.currentTaxiId !== '0')
      centerOnTaxi(appState.realTime.currentTaxiId);
  });

  appState.realTime.map.addListener('dragstart', () => {
    appState.realTime.seguirCentrando = false;
  });

  // Arranca actualizaciones
  startRealTimeUpdates();
  console.log('Mapa en tiempo real inicializado');
}

export function initHistoricalMapInstance() {
    console.log('Inicializando mapa histórico...');
    
    const centerHistorical = { lat: 11.0193213, lng: -74.8601743 }; // Coordenadas por defecto

    appState.historical.map = new google.maps.Map(domElements.historicalMapContainer, {
        center: centerHistorical,
        zoom: 14,
        streetViewControl: false
    });
    
    // Configurar evento de clic en el mapa para selección de punto
    appState.historical.map.addListener('click', function(event) {
        handleMapClick(event);
    });
    
    // Configurar el spinner de selección de taxi histórico
    domElements.idSpinnerHist.addEventListener('change', function() {
        const selectedTaxiId = this.value;
        if (selectedTaxiId === "0") {
            domElements.timelineInfo.style.display = 'none';
        } else {
            domElements.timelineInfo.style.display = 'flex';
        }
        if (appState.historical.timelineAnimation) {
            appState.historical.timelineAnimation.setSelectedTaxiId(selectedTaxiId);
            
            // Actualizar también la información mostrada si hay una animación activa
            if (appState.historical.timelineAnimation) {
                const timelineSlider = document.getElementById('timelineSlider');
                if (timelineSlider) {
                    const progress = parseInt(timelineSlider.value);
                    updateTimelineInfo(progress);
                }
            }
        }
    });
    
    console.log('Mapa histórico inicializado');
}

/**
 * Ajusta visibilidad de marcadores y panel según taxi seleccionado.
 */
export function updateTaxiVisibility(selectedTaxiId) {
  const infoPanel = document.querySelector('.info-grid');
  const seguirBtn = dom.seguirBtn;

  if (selectedTaxiId === '0') {
    infoPanel.style.display = 'none';
    seguirBtn.style.display = 'none';
    Object.keys(appState.realTime.markers).forEach(id => {
      appState.realTime.markers[id].setMap(appState.realTime.map);
      appState.realTime.polylines[id].setMap(appState.realTime.map);
    });
    ui.clearInfo();
  } else {
    infoPanel.style.display = 'grid';
    seguirBtn.style.display = 'block';
    Object.keys(appState.realTime.markers).forEach(id => {
      const visible = id === selectedTaxiId;
      appState.realTime.markers[id].setMap(visible ? appState.realTime.map : null);
      appState.realTime.polylines[id].setMap(visible ? appState.realTime.map : null);
    });
    fetchTaxiInfo(selectedTaxiId);
  }
}

/**
 * Obtiene datos del taxi y actualiza panel.
 */
export async function fetchTaxiInfo(taxiId) {
  try {
    const data = await fetchData('/data');
    const taxi = data.find(d => d.ID_TAXI.toString() === taxiId);
    if (taxi) ui.updateInfo(taxi);
  } catch (err) {
    console.error('Error obteniendo información del taxi:', err);
  }
}

/**
 * Crea marcadores y polilíneas para todos los taxis.
 */
export function createTaxiMarkers() {
  Object.entries(appState.realTime.recorridos).forEach(([taxiId, path], idx) => {
    const pos = path[path.length - 1];
    appState.realTime.markers[taxiId] = new google.maps.Marker({ position: pos, map: appState.realTime.map, title: `Taxi ${taxiId}` });
    appState.realTime.polylines[taxiId] = new google.maps.Polyline({ path, geodesic: true, strokeOpacity: 1.0, strokeWeight: 4, map: appState.realTime.map });
  });
  updateTaxiVisibility('0');
}

/**
 * Callback tras cargar la API: inicializa mapas y marcadores.
 */
/*export function mapsApiLoaded() {
  appState.realTime.mapsLoaded = appState.historical.mapsLoaded = true;
  initRealMapInstance();
  createTaxiMarkers();
}*/
