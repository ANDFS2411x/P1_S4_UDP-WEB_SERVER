// Configuración global
const config = {
    basePath: window.location.pathname.includes("/test") ? "/test" : "",
    updateInterval: 5000
};

const appState = {
    map: null,              // Mapa compartido
    realTime: {
        marker: null,       // Marcador en tiempo real
        polyline: null,     // Polilínea en tiempo real
        seguirCentrando: false,
        recorrido: [],
        intervalId: null
    },
    historical: {
        polyline: null      // Polilínea histórica
    },
    mapsLoaded: false       // Estado de la API de Google Maps
};

const domElements = {
    realTimeBtn: document.getElementById('realTimeBtn'),
    historicalBtn: document.getElementById('historicalBtn'),
    realTimeSection: document.getElementById('realTime'),
    historicalSection: document.getElementById('historical'),
    sharedMap: document.getElementById('sharedMap'),
    loadingMessage: document.getElementById('loadingMessage'),
    seguirBtn: document.getElementById('seguirBtn'),
    loadHistory: document.getElementById('loadHistory'),
    startDate: document.getElementById('startDate'),
    endDate: document.getElementById('endDate'),
    latitud: document.getElementById('latitud'),
    longitud: document.getElementById('longitud'),
    fecha: document.getElementById('fecha'),
    tiempo: document.getElementById('tiempo'),
    realTimeError: document.getElementById('realTimeError'),
    historicalError: document.getElementById('historicalError')
};  

async function fetchData(endpoint) {
    try {
        const response = await fetch(`${config.basePath}${endpoint}`);
        if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error(`Error fetching ${endpoint}:`, error);
        throw error;
    }
}

async function initMap() {
    try {
        // Obtener API Key
        const apiKeyData = await fetchData('/api-key');
        if (!apiKeyData.apiKey) throw new Error("API Key no recibida");

        // Obtener posición inicial
        const ubicacion = await fetchData('/data');
        if (!ubicacion?.LATITUDE || !ubicacion?.LONGITUDE) {
            throw new Error("Datos de ubicación inicial incompletos");
        }

        updateInfoPanel(ubicacion);

        const posicionInicial = {
            lat: parseFloat(ubicacion.LATITUDE),
            lng: parseFloat(ubicacion.LONGITUDE)
        };

        appState.realTime.recorrido = [posicionInicial];

        // Cargar Google Maps API si no está cargada
        if (!appState.mapsLoaded) {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKeyData.apiKey}&callback=initMapInstance`;
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
            appState.mapsLoaded = true;
        } else {
            initMapInstance();
        }
    } catch (error) {
        console.error('Error inicializando mapa:', error);
        domElements.sharedMap.innerHTML = `Error: ${error.message}`;
        showError(domElements.realTimeError, error.message);
    }
}

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