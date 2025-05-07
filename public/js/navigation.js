// public/js/navigation.js
import { dom }       from '/js/dom.js';
import { startRealTimeUpdates, stopRealTimeUpdates } from '/js/realtime.js';
import { initHistoricalTracking } from '/js/historical.js';

export function switchToRealTime(appState, ui) {
  dom.realTimeSection.classList.add("active");
  dom.historicalSection.classList.remove("active");
  dom.realTimeBtn.classList.add("active");
  dom.historicalBtn.classList.remove("active");

  // Ocultar histórico
  dom.historicalSection.querySelectorAll('.map-element').forEach(el => el.style.display = 'none');

  // Iniciar realTime
  if (!appState.realTime.intervalId) startRealTimeUpdates();
}

export function switchToHistorical(appState) {
  dom.historicalSection.classList.add("active");
  dom.realTimeSection.classList.remove("active");
  dom.historicalBtn.classList.add("active");
  dom.realTimeBtn.classList.remove("active");

  // Detener realTime
  stopRealTimeUpdates();

  // Iniciar histórico
  initHistoricalTracking();
}

export function switchToMembers() {
  dom.membersSection.classList.add("active");
  dom.realTimeSection.classList.remove("active");
  dom.historicalSection.classList.remove("active");
  dom.membersBtn.classList.add("active");
  dom.realTimeBtn.classList.remove("active");
  dom.historicalBtn.classList.remove("active");
}