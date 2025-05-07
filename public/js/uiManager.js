// public/js/uiManager.js
import { normalizeDate } from '/js/utils.js';

export default class UIManager {
  constructor(dom) {
    this.dom = dom;
  }

  updateInfo(data) {
    const { LATITUDE, LONGITUDE, DATE, TIME, RPM, ID_TAXI } = data;
    this.dom.latitud.textContent     = LATITUDE  || 'N/A';
    this.dom.longitud.textContent    = LONGITUDE || 'N/A';
    this.dom.fecha.textContent       = normalizeDate(DATE);
    this.dom.tiempo.textContent      = TIME      || 'N/A';
    this.dom.rpmRealTime.textContent = RPM       || '0';
    this.dom.idTaxiReal.textContent  = ID_TAXI   || 'N/A';
  }

  clearInfo() {
    ['latitud','longitud','fecha','tiempo','rpmRealTime','idTaxiReal']
      .forEach(k => this.dom[k].textContent = k === 'rpmRealTime' ? '0' : 'N/A');
  }

  showError(msg, el = this.dom.realTimeError) {
    el.textContent = msg;
    el.style.display = 'block';
    setTimeout(() => {
      el.style.display = 'none';
    }, 5000);
  }  // ← Aquí cerramos showError

  toggleLoading(show, historical = false) {
    const id = historical
      ? 'historicalLoadingMessage'
      : 'realTimeLoadingMessage';
    const el = document.getElementById(id);
    if (el) el.style.display = show ? 'block' : 'none';
  }
}
