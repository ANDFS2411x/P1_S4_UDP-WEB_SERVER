// public/js/realtimeMap.js
import { dom }      from './dom.js';
import { appState } from './state.js';
import { fetchData }from './api.js';
import UIManager    from './uimanager.js';

const ui = new UIManager(dom);

export function initRealMapInstance() {
  const centerReal = { lat: 11.006374, lng: -74.812042 };
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
    if (appState.realTime.currentTaxiId !== "0")
      centerOnTaxi(appState.realTime.currentTaxiId);
  });

  appState.realTime.map.addListener('dragstart', () => {
    appState.realTime.seguirCentrando = false;
  });

  startRealTimeUpdates();
}

export function updateTaxiVisibility(selectedTaxiId) {
  const infoPanel = document.querySelector('.info-grid');
  const seguirBtn = dom.seguirBtn;
  if (selectedTaxiId === "0") {
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
      const vis = id === selectedTaxiId;
      appState.realTime.markers[id].setMap(vis? appState.realTime.map : null);
      appState.realTime.polylines[id].setMap(vis? appState.realTime.map : null);
    });
    fetchTaxiInfo(selectedTaxiId);
  }
}

export async function fetchTaxiInfo(taxiId) {
  try {
    const data = await fetchData('/data');
    const taxi = data.find(d => d.ID_TAXI.toString() === taxiId);
    if (taxi) ui.updateInfo(taxi);
  } catch(err) {
    console.error('Error obteniendo información del taxi:', err);
  }
}

export function createTaxiMarkers() {
  Object.entries(appState.realTime.recorridos).forEach(([taxiId, path], idx) => {
    const pos = path[path.length-1];
    appState.realTime.markers[taxiId] = new google.maps.Marker({ position:pos, map:appState.realTime.map, /*…*/ });
    appState.realTime.polylines[taxiId] = new google.maps.Polyline({ path, /*…*/ map: appState.realTime.map });
  });
  updateTaxiVisibility("0");
}

export function mapsApiLoaded() {
  appState.realTime.mapsLoaded = appState.historical.mapsLoaded = true;
  initRealMapInstance();
  // importar e invocar initHistoricalMapInstance() desde historical.js
  createTaxiMarkers();
}
