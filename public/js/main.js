// Configuración global
const config = {
    basePath: window.location.pathname.includes("/test") ? "/test" : "",
    updateInterval: 5000
};

const appState = {
    realTime: {
        map: null,
        marker: null,
        polyline: null,
        seguirCentrando: false,
        recorrido: [],
        intervalId: null
    },
    historical: {
        map: null,
        recorrido: [],
        polyline: null
    }
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
    realTimeError: document.getElementById('realTimeError'),
    historicalError: document.getElementById('historicalError')
};  

function updateInfoPanel(data) {
    document.getElementById('latitud').textContent = data.LATITUDE || "N/A";
    document.getElementById('longitud').textContent = data.LONGITUDE || "N/A";
    document.getElementById('fecha').textContent = data.DATE || "N/A";
    document.getElementById('tiempo').textContent = data.TIME || "N/A";
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

function initMapInstance(container, center) {
    return new google.maps.Map(container, {
        center: center,
        zoom: 15,
        streetViewControl: false
    });
}

async function initMaps() {
    try {
        const apiKeyData = await fetchData('/api-key');
        if (!apiKeyData.apiKey) throw new Error("API Key no recibida");
        
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKeyData.apiKey}&callback=setupMaps`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
    } catch (error) {
        console.error('Error inicializando mapas:', error);
    }
}

async function setupMaps() {
    try {
        const ubicacion = await fetchData('/data');
        if (!ubicacion?.LATITUDE || !ubicacion?.LONGITUDE) throw new Error("Datos de ubicación inicial incompletos");
        
        const posicionInicial = { lat: parseFloat(ubicacion.LATITUDE), lng: parseFloat(ubicacion.LONGITUDE) };
        appState.realTime.recorrido = [posicionInicial];

        appState.realTime.map = initMapInstance(domElements.realMapContainer, posicionInicial);
        appState.historical.map = initMapInstance(domElements.historicalMapContainer, posicionInicial);

        appState.realTime.marker = new google.maps.Marker({
            position: posicionInicial,
            map: appState.realTime.map,
            title: "Taxi 🚕",
            icon: {
                url: "https://cdn-icons-png.flaticon.com/128/2401/2401174.png",
                scaledSize: new google.maps.Size(50, 50)
            }
        });

        appState.realTime.polyline = new google.maps.Polyline({
            path: appState.realTime.recorrido,
            geodesic: true,
            strokeColor: "#FF0000",
            strokeOpacity: 1.0,
            strokeWeight: 4,
            map: appState.realTime.map
        });

        startRealTimeUpdates();
    } catch (error) {
        console.error('Error en setupMaps:', error);
    }
}

function startRealTimeUpdates() {
    updateRealTimeData();
    appState.realTime.intervalId = setInterval(updateRealTimeData, config.updateInterval);
}

async function updateRealTimeData() {
    try {
        const data = await fetchData('/data');
        if (!data?.LATITUDE || !data?.LONGITUDE) throw new Error("Datos de ubicación incompletos");
        
        updateInfoPanel(data);
        const nuevaPosicion = { lat: parseFloat(data.LATITUDE), lng: parseFloat(data.LONGITUDE) };
        
        appState.realTime.marker.setPosition(nuevaPosicion);
        appState.realTime.recorrido.push(nuevaPosicion);
        appState.realTime.polyline.setPath(appState.realTime.recorrido);

        if (appState.realTime.seguirCentrando) {
            appState.realTime.map.setCenter(nuevaPosicion);
        }
    } catch (error) {
        console.error('Error actualizando datos en tiempo real:', error);
    }
}

domElements.realTimeBtn.addEventListener('click', switchToRealTime);
domElements.historicalBtn.addEventListener('click', switchToHistorical);
domElements.loadHistory.addEventListener('click', loadHistoricalData);

domElements.seguirBtn.addEventListener('click', () => {
    appState.realTime.seguirCentrando = true;
});

domElements.realTime.map?.addListener('dragstart', () => {
    appState.realTime.seguirCentrando = false;
});

function switchToRealTime() {
    domElements.realTimeSection.classList.add("active");
    domElements.historicalSection.classList.remove("active");
}

function switchToHistorical() {
    domElements.historicalSection.classList.add("active");
    domElements.realTimeSection.classList.remove("active");
}

async function loadHistoricalData() {
    try {
        const startDate = domElements.startDate.value;
        const endDate = domElements.endDate.value;
        if (!startDate || !endDate) throw new Error("Debe seleccionar ambas fechas");

        const response = await fetch(`${config.basePath}/historical-data?startDate=${startDate}&endDate=${endDate}`);
        if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);

        const result = await response.json();
        appState.historical.recorrido = result.map(coord => ({ lat: parseFloat(coord.LATITUDE), lng: parseFloat(coord.LONGITUDE) }));

        appState.historical.polyline = new google.maps.Polyline({
            path: appState.historical.recorrido,
            geodesic: true,
            strokeColor: "#024abf",
            strokeOpacity: 1.0,
            strokeWeight: 4,
            map: appState.historical.map
        });
    } catch (error) {
        console.error('Error cargando datos históricos:', error);
    }
}

initMaps();
