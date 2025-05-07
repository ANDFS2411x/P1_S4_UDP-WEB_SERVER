// public/js/historical.js

import { dom } from '/js/dom.js';
import { appState } from '/js/state.js';
import { fetchData } from '/js/api.js';
import { formatDateTimeInput } from '/js/utils.js';
import { calculateDistance, findPointsNearby } from '/js/utils.js';
import { buildResultsTable, highlightPointOnMap } from '/js/results.js';
import UIManager from '/js/uiManager.js';
import TimelineAnimation from '/js/timelineAnimation.js';

const ui = new UIManager(dom);

// Inicializa controles y datos para seguimiento histórico
export function initHistoricalTracking() {
  const now = new Date();
  const ago = new Date(now.getTime() - 3600 * 1000);

  const isoNow = formatDateTimeInput(now);
  const isoAgo = formatDateTimeInput(ago);

  dom.startDate.max = dom.endDate.max = isoNow;
  dom.startDate.value = isoAgo;
  dom.endDate.value   = isoNow;

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
    const endDate   = dom.endDate.value;
    const taxiId     = dom.idSpinnerHist.value;
    if (!startDate || !endDate) {
      throw new Error('Debe seleccionar ambas fechas');
    }

    // Usar fetchData que incluye basePath
    const result = await fetchData(
      `/historical-data?startDate=${encodeURIComponent(startDate)}` +
      `&endDate=${encodeURIComponent(endDate)}` +
      `&taxiId=${encodeURIComponent(taxiId)}`
    );
    if (!result.success) {
      throw new Error(result.error || 'Error en datos históricos');
    }
    if (result.data.length === 0) {
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

    // Filtrar por selección de punto si aplica
    if (dom.enablePointSelection.checked) {
      const sel    = { lat: parseFloat(dom.selectedLat.value), lng: parseFloat(dom.selectedLng.value) };
      const radius = parseInt(dom.searchRadius.value, 10);
      points = findPointsNearby(sel, points, radius);
      if (points.length === 0) {
        throw new Error('No se encontraron registros cerca del punto seleccionado');
      }
    }

    // Inicializar o actualizar animación de timeline
    if (!appState.historical.timelineAnimation) {
      appState.historical.timelineAnimation = new TimelineAnimation(appState.historical.map);
    }
    appState.historical.timelineAnimation.setSelectedTaxiId(taxiId);
    appState.historical.timelineAnimation.setPoints(
      points,
      dom.enablePointSelection.checked ? 'point' : 'route'
    );

    // Configurar controles de la línea de tiempo
    const controls = document.getElementById('timelineControls');
    const slider   = document.getElementById('timelineSlider');
    if (controls && slider) {
      controls.style.display = 'block';
      slider.value = 0;
      slider.style.backgroundSize = '0% 100%';
      slider.oninput = e => updateTimelineInfo(parseInt(e.target.value, 10));
    }

    // Mostrar tabla de resultados si está en modo punto
    if (dom.enablePointSelection.checked) {
      dom.pointSearchResults.style.display = 'block';
      buildResultsTable(points, pt => highlightPointOnMap(pt, appState.historical.map));
    }

    // Ajustar bounds del mapa
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

// Actualiza información de la línea de tiempo
export function updateTimelineInfo(progress) {
  const ta = appState.historical.timelineAnimation;
  if (!ta) return;
  const info = ta.setProgress(progress);
  const date = new Date(info.timestamp);
  document.getElementById('currentTimeInfo').textContent = `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  document.getElementById('rpmHist').textContent = `RPM: ${info.RPM || '0'}`;
  if (dom.enablePointSelection.checked) {
    const sel = { lat: parseFloat(dom.selectedLat.value), lng: parseFloat(dom.selectedLng.value) };
    const dist = calculateDistance(sel.lat, sel.lng, info.lat, info.lng);
    const di   = document.getElementById('distanceInfo');
    di.textContent = `Distancia: ${Math.round(dist)} m`;
    di.style.display = 'block';
  }
}
