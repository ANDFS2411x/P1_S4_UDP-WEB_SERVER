// public/js/utils.js

/**
 * Formatea un Date a 'YYYY-MM-DDThh:mm' para inputs datetime-local.
 */
export function formatDateTimeInput(date) {
    const y  = date.getFullYear();
    const m  = String(date.getMonth() + 1).padStart(2, '0');
    const d  = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d}T${hh}:${mm}`;
  }
  
  /**
   * Extrae la parte de fecha de un ISO (antes de la 'T'), o devuelve 'N/A'.
   */
export function normalizeDate(raw) {
    if (!raw) return 'N/A';
    return raw.includes('T') ? raw.split('T')[0] : raw;
}
  
  /**
   * Calcula la distancia en metros entre dos coordenadas.
   */
export function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Radio terrestre en metros
    const toRad = x => x * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
  
  /**
   * Filtra un array de puntos dejando solo los que estén a <= radius metros de point.
   */
export function findPointsNearby(point, data, radius) {
    const lat = parseFloat(point.lat);
    const lng = parseFloat(point.lng);
    return data.filter(item => {
      const itemLat = parseFloat(item.lat  ?? item.LATITUDE);
      const itemLng = parseFloat(item.lng  ?? item.LONGITUDE);
      if (isNaN(itemLat) || isNaN(itemLng)) return false;
      return calculateDistance(lat, lng, itemLat, itemLng) <= radius;
    });
}
  