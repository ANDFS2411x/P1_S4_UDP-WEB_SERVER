// public/js/realtime.js

import { fetchData }    from './api.js';
import { config }       from './config.js';
import { appState }     from './state.js';
import UIManager        from './uimanager.js';
import { dom }          from './dom.js';

const ui = new UIManager(dom);

/**
 * Actualiza la información y la visualización de los taxis en tiempo real.
 */
export async function updateRealTimeData() {
  ui.toggleLoading(true);
  try {
    const data = await fetchData('/data');
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('No hay datos disponibles');
    }

    for (const taxiData of data) {
      const { ID_TAXI, LATITUDE, LONGITUDE } = taxiData;
      if (!ID_TAXI || !LATITUDE || !LONGITUDE) continue;

      const taxiId = ID_TAXI.toString();
      const pos = { lat: parseFloat(LATITUDE), lng: parseFloat(LONGITUDE) };
      if (isNaN(pos.lat) || isNaN(pos.lng)) continue;

      // Inicializar recorrido si es necesario
      if (!appState.realTime.recorridos[taxiId]) {
        appState.realTime.recorridos[taxiId] = [];
      }

      // Actualizar marcador
      const marker = appState.realTime.markers[taxiId];
      if (marker) {
        marker.setPosition(pos);
      }

      // Actualizar recorrido y polilínea
      const recorrido = appState.realTime.recorridos[taxiId];
      if (recorrido.length > 500) recorrido.shift();
      recorrido.push(pos);
      const polyline = appState.realTime.polylines[taxiId];
      if (polyline) {
        polyline.setPath(recorrido);
      }

      // Actualizar panel de info
      if (appState.realTime.currentTaxiId === taxiId) {
        ui.updateInfo(taxiData);
      }
    }

    // Si están todos los taxis seleccionados, limpiar el panel
    if (appState.realTime.currentTaxiId === '0') {
      ui.clearInfo();
    }
  } catch (err) {
    console.error('Error actualizando datos en tiempo real:', err);
    ui.showError(err.message, dom.realTimeError);
  } finally {
    ui.toggleLoading(false);
  }
}

/**
 * Inicia las actualizaciones periódicas en tiempo real.
 */
export function startRealTimeUpdates() {
  stopRealTimeUpdates();
  updateRealTimeData();
  appState.realTime.intervalId = setInterval(updateRealTimeData, config.updateInterval);
  console.log('Actualizaciones en tiempo real iniciadas');
}

/**
 * Detiene las actualizaciones periódicas en tiempo real.
 */
export function stopRealTimeUpdates() {
  if (appState.realTime.intervalId) {
    clearInterval(appState.realTime.intervalId);
    appState.realTime.intervalId = null;
    console.log('Actualizaciones en tiempo real detenidas');
  }
}