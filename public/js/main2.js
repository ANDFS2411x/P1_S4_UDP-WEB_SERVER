// public/js/main.js
import { dom }                   from './dom.js';
import { appState }              from './state.js';

import { startRealTimeUpdates, stopRealTimeUpdates } from './realtime.js';
import { initMap, mapsApiLoaded }                    from './realtimemap.js';

import { switchToRealTime, switchToHistorical, switchToMembers } from './navigation.js';

import { initHistoricalTracking, loadHistoricalData } from './historical.js';

import { formatDateTimeInput }   from './utils.js';
import TimelineAnimation from './timeline-animation.js';

const config = {
    basePath: window.location.pathname.includes("/test") ? "/test" : "",
    updateInterval: 5000
};

window.initMapsCallback = mapsApiLoaded;

document.addEventListener('DOMContentLoaded', () => {
  // ——— Inicialización de fechas ———
  const now = new Date();
  dom.startDate.value = formatDateTimeInput(new Date(now - 3600 * 1000)); // hace una hora
  dom.endDate.value   = formatDateTimeInput(now);

  // ——— Navegación entre secciones ———
  dom.realTimeBtn    .addEventListener('click', () => switchToRealTime(appState));
  dom.historicalBtn  .addEventListener('click', () => switchToHistorical(appState));
  dom.membersBtn     .addEventListener('click', switchToMembers);

  // ——— Tiempo real ———
  dom.seguirBtn      .addEventListener('click', () => appState.realTime.seguirCentrando = true);
  startRealTimeUpdates();

  // ——— Histórico ———
  initHistoricalTracking();
  dom.loadHistory   .addEventListener('click', loadHistoricalData);

  // ——— Google Maps ———
  initMap(); // disparará la carga de la API y luego llamará a mapsApiLoaded
});