export function formatDateTimeInput(date) {
    const [y, m, d] = [
      date.getFullYear(),
      (date.getMonth()+1).toString().padStart(2,'0'),
      date.getDate().toString().padStart(2,'0')
    ];
    const [h, min] = [
      date.getHours().toString().padStart(2,'0'),
      date.getMinutes().toString().padStart(2,'0')
    ];
    return `${y}-${m}-${d}T${h}:${min}`;
}
  
export function normalizeDate(raw) {
    return raw?.includes('T') ? raw.split('T')[0] : raw || 'N/A';
}
  
export function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const toRad = x => x * Math.PI / 180;
    const dLat = toRad(lat2-lat1), dLon = toRad(lon2-lon1);
    const a = Math.sin(dLat/2)**2 +
              Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*
              Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}  

// public/js/utils.js
export function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const toRad = x => x * Math.PI / 180;
    const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2)**2
            + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))
            * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }
  
export function findPointsNearby(point, data, radius) {
    const lat = parseFloat(point.lat), lng = parseFloat(point.lng);
    return data.filter(item => {
      const itemLat = parseFloat(item.LATITUDE);
      const itemLng = parseFloat(item.LONGITUDE);
      if (isNaN(itemLat)||isNaN(itemLng)) return false;
      return calculateDistance(lat, lng, itemLat, itemLng) <= radius;
    });
}  