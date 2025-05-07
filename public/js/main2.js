// public/js/main.js
import { dom }                   from '/js/dom.js';
import { appState }              from '/js/state.js';

import { startRealTimeUpdates, stopRealTimeUpdates } from '/js/realtime.js';
import { initMap, mapsApiLoaded }                    from '/js/realtimemap.js';

import { switchToRealTime, switchToHistorical, switchToMembers } from '/js/navigation.js';

import { initHistoricalTracking, loadHistoricalData } from '/js/historical.js';

import { formatDateTimeInput }   from '/js/utils.js';
import TimelineAnimation from '/js/timeline-animation.js';

const config = {
    basePath: window.location.pathname.includes("/test") ? "/test" : "",
    updateInterval: 5000
};

window.initMapsCallback = mapsApiLoaded;

document.addEventListener('DOMContentLoaded', () => {
    // ——— 1. Inicialización de fechas por defecto ———
    const now = new Date();
    dom.startDate.value = formatDateTimeInput(new Date(now.getTime() - 3600 * 1000)); // hace una hora
    dom.endDate.value   = formatDateTimeInput(now);
  
    // ——— 2. Navegación entre secciones ———
    dom.realTimeBtn   .addEventListener('click', () => {
      switchToRealTime(appState);
      startRealTimeUpdates();
    });
    dom.historicalBtn .addEventListener('click', () => {
      stopRealTimeUpdates();
      switchToHistorical(appState);
    });
    dom.membersBtn    .addEventListener('click', switchToMembers);
  
    // ——— 3. Tiempo real ———
    dom.seguirBtn     .addEventListener('click', () => {
      appState.realTime.seguirCentrando = true;
    });
    // Inicia las actualizaciones periódicas
    startRealTimeUpdates();
  
    // ——— 4. Histórico ———
    initHistoricalTracking();
    dom.loadHistory   .addEventListener('click', loadHistoricalData);
  
    // ——— 5. Carga de Google Maps ———
    // Esto insertará dinámicamente el <script> de Maps y al cargar llamará a window.initMapsCallback
    initMap();
  });