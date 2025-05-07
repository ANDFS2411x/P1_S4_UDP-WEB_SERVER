// public/js/results.js
import { dom } from './dom.js';

export function elementExists(id) {
  const el = document.getElementById(id);
  if (!el) console.warn(`Elemento #${id} no encontrado`);
  return !!el;
}

export function buildResultsTable(nearbyPoints, highlightFn) {
  if (nearbyPoints.length === 0) {
    dom.resultsSummary.textContent = "Sin resultados.";
    dom.resultsTable.innerHTML = '<div class="no-results">Sin resultados</div>';
    return;
  }
  dom.resultsSummary.textContent = `Se encontraron ${nearbyPoints.length} registros.`;
  const rows = nearbyPoints.map((pt, i) => `
    <tr>
      <td>${pt.DATE||'N/A'}</td>
      <td>${pt.TIME||'N/A'}</td>
      <td>${pt.LATITUDE||'N/A'}</td>
      <td>${pt.LONGITUDE||'N/A'}</td>
      <td><button data-index="${i}" class="highlight-btn">Resaltar</button></td>
    </tr>`).join('');
  dom.resultsTable.innerHTML = `<table>…<tbody>${rows}</tbody></table>`;
  dom.resultsTable.querySelectorAll('.highlight-btn')
    .forEach(btn => btn.onclick = () => {
      const idx = +btn.dataset.index;
      highlightFn(nearbyPoints[idx]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

export function highlightPointOnMap(point, map) {
  const pos = { lat: +point.LATITUDE, lng: +point.LONGITUDE };
  const marker = new google.maps.Marker({
    position: pos,
    map,
    icon: { /* … naranja … */ },
    zIndex:1000
  });
  map.setCenter(pos);
  new google.maps.InfoWindow({
    content: `Fecha: ${point.DATE}<br>Hora: ${point.TIME}`
  }).open(map, marker);
  // luego puedes setTimeout(marker.setMap(null), …)
}
