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
    realMapContainer: document.getElementById('realTimeMapContainer'),
    historicalMapContainer: document.getElementById('historicalMapContainer'),
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

function updateInfoPanel(data) {
    domElements.latitud.textContent = data.LATITUDE || "N/A";
    domElements.longitud.textContent = data.LONGITUDE || "N/A";
    domElements.fecha.textContent = data.DATE || "N/A";
    domElements.tiempo.textContent = data.TIME || "N/A";
}

function centerOnTaxi() {
    if (appState.realTime.marker && appState.map) {
        appState.map.setCenter(appState.realTime.marker.getPosition());
    }
}

async function updateRealTimeData() {
    try {
        const data = await fetchData('/data');
        if (!data?.LATITUDE || !data?.LONGITUDE) {
            throw new Error("Datos de ubicación incompletos");
        }

        updateInfoPanel(data);

        const nuevaPosicion = {
            lat: parseFloat(data.LATITUDE),
            lng: parseFloat(data.LONGITUDE)
        };

        appState.realTime.marker.setPosition(nuevaPosicion);
        appState.realTime.recorrido.push(nuevaPosicion);
        appState.realTime.polyline.setPath(appState.realTime.recorrido);

        if (appState.realTime.seguirCentrando) {
            centerOnTaxi();
        }
    } catch (error) {
        console.error('Error actualizando datos en tiempo real:', error);
    }
}

function startRealTimeUpdates() {
    updateRealTimeData();
    appState.realTime.intervalId = setInterval(updateRealTimeData, config.updateInterval);
}

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

function initMapInstance() {
    console.log('Inicializando mapa compartido...');
    
    const center = appState.realTime.recorrido.length > 0 ? 
        appState.realTime.recorrido[0] : 
        { lat: 4.710989, lng: -74.072092 };

    appState.map = new google.maps.Map(domElements.realMapContainer, {
        center: center,
        zoom: 15,
        streetViewControl: false
    });

    // Configurar marcador en tiempo real
    appState.realTime.marker = new google.maps.marker.AdvancedMarkerElement ({
        position: center,
        map: appState.map,
        title: "Taxi 🚕",
        icon: {
            url: "https://cdn-icons-png.flaticon.com/128/2401/2401174.png",
            scaledSize: new google.maps.Size(50, 50)
        }
    });

    // Configurar polilínea en tiempo real
    appState.realTime.polyline = new google.maps.Polyline({
        path: appState.realTime.recorrido,
        geodesic: true,
        strokeColor: "#FF0000",
        strokeOpacity: 1.0,
        strokeWeight: 4,
        map: appState.map
    });

    // Configurar botón seguir
    domElements.seguirBtn.addEventListener('click', () => {
        appState.realTime.seguirCentrando = true;
        centerOnTaxi();
    });

    // Detectar cuando el usuario mueve el mapa
    appState.map.addListener('dragstart', () => {
        appState.realTime.seguirCentrando = false;
    });

    // Iniciar actualización periódica
    startRealTimeUpdates();
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
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKeyData.apiKey}&callback=initMapInstance&libraries=marker`;
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
            appState.mapsLoaded = true;
        } else {
            initMapInstance();
        }
    } catch (error) {
        console.error('Error inicializando mapa:', error);
        domElements.realMapContainer.innerHTML = `Error: ${error.message}`;
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

    initMap();
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initApp, 1);
} else {
    document.addEventListener('DOMContentLoaded', initApp);
}