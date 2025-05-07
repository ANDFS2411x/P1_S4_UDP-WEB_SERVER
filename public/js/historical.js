// public/js/historical.js

import { dom } from '/js/dom.js';
import { appState } from '/js/state.js';
import { config } from '/js/config.js';
import { fetchData } from '/js/api.js';
import { calculateDistance, findPointsNearby } from '/js/utils.js';
import { buildResultsTable, highlightPointOnMap } from '/js/results.js';
import UIManager from '/js/uimanager.js';
import TimelineAnimation from '/js/timeline-animation.js';

const ui = new UIManager(dom);

// Inicializa controles y datos para seguimiento histórico\
export function initHistoricalTracking() {
  const now = new Date();
  const ago = new Date(now.getTime() - 3600 * 1000);
  const isoNow = formatDateTimeInput(now);
  const isoAgo = formatDateTimeInput(ago);

  dom.startDate.max = dom.endDate.max = isoNow;
  dom.startDate.value = isoAgo;
  dom.endDate.value = isoNow;

  dom.loadHistory.addEventListener('click', loadHistoricalData);
  dom.clearPointBtn.addEventListener('click', clearSelectedPoint);
  dom.enablePointSelection.addEventListener('change', togglePointSelection);
}

// Alterna campos de selección de punto
function togglePointSelection() {
  const enabled = dom.enablePointSelection.checked;
  dom.selectedLat.disabled = dom.selectedLng.disabled = dom.searchRadius.disabled = !enabled;
  if (!enabled) clearSelectedPoint();
}

// Limpia marcador y círculo seleccionados
function clearSelectedPoint() {
  if (appState.historical.pointMarker) {
    appState.historical.pointMarker.setMap(null);
    appState.historical.pointMarker = null;
  }
  if (appState.historical.pointCircle) {
    appState.historical.pointCircle.setMap(null);
    appState.historical.pointCircle = null;
  }
  dom.selectedLat.value = '';
  dom.selectedLng.value = '';
  dom.clearPointBtn.disabled = true;
  dom.pointSearchResults.style.display = 'none';
}

// Carga y procesa datos históricos
export async function loadHistoricalData() {
  ui.toggleLoading(true, true);
  try {
    const startDate = dom.startDate.value;
    const endDate = dom.endDate.value;
    const taxiId = dom.idSpinnerHist.value;
    if (!startDate || !endDate) {
      throw new Error('Debe seleccionar ambas fechas');
    }

    const url = `${config.basePath}/historical-data?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&taxiId=${encodeURIComponent(taxiId)}`;
    const result = await fetchData(url);
    if (!result.success) {
      throw new Error(result.error || 'Error en datos históricos');
    }
    if (!Array.isArray(result.data) || result.data.length === 0) {
      throw new Error('No hay datos para el rango seleccionado');
    }

    let points = result.data.map(item => ({
      lat: parseFloat(item.LATITUDE),
      lng: parseFloat(item.LONGITUDE),
      time: item.TIME,
      date: item.DATE,
      RPM: item.RPM || '0',
      ID_TAXI: item.ID_TAXI
    }));

    if (dom.enablePointSelection.checked) {
      const sel = { lat: parseFloat(dom.selectedLat.value), lng: parseFloat(dom.selectedLng.value) };
      const radius = parseInt(dom.searchRadius.value, 10);
      points = findPointsNearby(sel, points, radius);
      if (points.length === 0) {
        throw new Error('No se encontraron registros cerca del punto seleccionado');
      }
    }

    if (!appState.historical.timelineAnimation) {
      appState.historical.timelineAnimation = new TimelineAnimation(appState.historical.map);
    }
    appState.historical.timelineAnimation.setSelectedTaxiId(taxiId);
    appState.historical.timelineAnimation.setPoints(
      points,
      dom.enablePointSelection.checked ? 'point' : 'route'
    );

    const controls = document.getElementById('timelineControls');
    const slider = document.getElementById('timelineSlider');
    if (controls && slider) {
      controls.style.display = 'block';
      slider.value = 0;
      slider.style.backgroundSize = '0% 100%';
      slider.addEventListener('input', e => {
        const pct = parseInt(e.target.value, 10);
        slider.style.backgroundSize = `${pct}% 100%`;
        updateTimelineInfo(pct);
      });
    }

    if (dom.enablePointSelection.checked) {
      dom.pointSearchResults.style.display = 'block';
      buildResultsTable(points, pt => highlightPointOnMap(pt, appState.historical.map));
    }

    const bounds = new google.maps.LatLngBounds();
    points.forEach(p => bounds.extend({ lat: p.lat, lng: p.lng }));
    appState.historical.map.fitBounds(bounds);

  } catch (err) {
    console.error('Error cargando datos históricos:', err);
    ui.showError(err.message, dom.historicalError);
  } finally {
    ui.toggleLoading(false, true);
  }
}

// Actualiza información de timeline
export function updateTimelineInfo(progress) {
  if (!appState.historical.timelineAnimation) return;
  const info = appState.historical.timelineAnimation.setProgress(progress);
  const date = new Date(info.timestamp);
  document.getElementById('currentTimeInfo').textContent = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  document.getElementById('rpmHist').textContent = `RPM: ${info.RPM || '0'}`;
  if (dom.enablePointSelection.checked) {
    const sel = { lat: parseFloat(dom.selectedLat.value), lng: parseFloat(dom.selectedLng.value) };
    const dist = calculateDistance(sel.lat, sel.lng, info.lat, info.lng);
    const di = document.getElementById('distanceInfo');
    di.textContent = `Distancia: ${Math.round(dist)} m`;
    di.style.display = 'block';
  }
}
