// Configuración global
const config = {
    basePath: window.location.pathname.includes("/test") ? "/test" : "",
    updateInterval: 5000
};

function switchToRealTime() {
    domElements.realTimeSection.classList.add("active");
    domElements.historicalSection.classList.remove("active");
    domElements.realTimeBtn.classList.add("active");
    domElements.historicalBtn.classList.remove("active");

    // Restaurar elementos de tiempo real
    /*
    if (appState.realTime.marker) {
        appState.realTime.marker.setMap(appState.map);
    }
    if (appState.realTime.polyline) {
        appState.realTime.polyline.setMap(appState.map);
    }

    // Limpiar polilínea histórica
    if (appState.historical.polyline) {
        appState.historical.polyline.setMap(null);
    }

    // Iniciar actualizaciones
    if (!appState.realTime.intervalId) {
        startRealTimeUpdates();
    }
    */
}

function switchToHistorical() {
    domElements.historicalSection.classList.add("active");
    domElements.realTimeSection.classList.remove("active");
    domElements.historicalBtn.classList.add("active");
    domElements.realTimeBtn.classList.remove("active");

    // Detener actualizaciones de tiempo real
    //stopRealTimeUpdates();
    console.log('nous sommes ici')

    // Ocultar elementos de tiempo real
    /*if (appState.realTime.marker) {
        appState.realTime.marker.setMap(null);
    }
    if (appState.realTime.polyline) {
        appState.realTime.polyline.setMap(null);
    }*/
}

function initApp() {
    domElements.realTimeBtn.addEventListener("click", switchToRealTime);
    domElements.historicalBtn.addEventListener("click", switchToHistorical);
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initApp, 1);
} else {
    document.addEventListener('DOMContentLoaded', initApp);
}