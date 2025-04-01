// Configuración global
const config = {
    basePath: window.location.pathname.includes("/test") ? "/test" : "",
    updateInterval: 5000
};

const appState = {
    realTime: {
        map: null,
        marker: null,       // Marcador en tiempo real
        polyline: null,     // Polilínea en tiempo real
        seguirCentrando: false,
        recorrido: [],
        intervalId: null,
        mapsLoaded: false
    },
    historical: {
        map: null,
        recorrido: [],
        polyline: null, // Polilínea histórica
        mapsLoaded: false      
    },
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

function showError(element, message) {
    element.textContent = message;
    element.style.display = 'block';
    setTimeout(() => element.style.display = 'none', 5000);
}

function showLoading(show) {
    // En el HTML hay dos elementos de carga diferentes, uno para cada sección
    if (domElements.historicalSection.classList.contains("active")) {
        // Estamos en la sección histórica
        const historicalLoadingMessage = document.getElementById('historicalLoadingMessage');
        if (historicalLoadingMessage) {
            historicalLoadingMessage.style.display = show ? 'block' : 'none';
        } else {
            console.warn('Elemento #historicalLoadingMessage no encontrado');
        }
    } else {
        // Estamos en la sección de tiempo real
        const realTimeLoadingMessage = document.getElementById('realTimeLoadingMessage');
        if (realTimeLoadingMessage) {
            realTimeLoadingMessage.style.display = show ? 'block' : 'none';
        } else {
            console.warn('Elemento #realTimeLoadingMessage no encontrado');
        }
    }
}

function formatDateTimeInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function centerOnTaxi() {
    if (appState.realTime.marker && appState.realTime.map) {
        appState.realTime.map.setCenter(appState.realTime.marker.getPosition());
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

        // Verificar que las coordenadas sean válidas
        if (isNaN(nuevaPosicion.lat) || isNaN(nuevaPosicion.lng)) {
            throw new Error("Coordenadas inválidas recibidas");
        }

        appState.realTime.marker.setPosition(nuevaPosicion);
        
        // Limitar el número de puntos en la polilínea para optimizar rendimiento
        if (appState.realTime.recorrido.length > 500) {
            appState.realTime.recorrido.shift(); // Eliminar el punto más antiguo
        }
        
        appState.realTime.recorrido.push(nuevaPosicion);
        appState.realTime.polyline.setPath(appState.realTime.recorrido);

        if (appState.realTime.seguirCentrando) {
            centerOnTaxi();
        }
    } catch (error) {
        console.error('Error actualizando datos en tiempo real:', error);
        // No mostrar el error al usuario en cada actualización para no inundar la interfaz
    }
}

function startRealTimeUpdates() {
    // Asegurarse de que no haya un intervalo activo
    stopRealTimeUpdates();
    
    // Iniciar actualizaciones inmediatamente y luego periódicamente
    updateRealTimeData();
    appState.realTime.intervalId = setInterval(updateRealTimeData, config.updateInterval);
    console.log('Actualizaciones en tiempo real iniciadas');
}

function stopRealTimeUpdates() {
    if (appState.realTime.intervalId) {
        clearInterval(appState.realTime.intervalId);
        appState.realTime.intervalId = null;
        console.log('Actualizaciones en tiempo real detenidas');
    }
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

function initHistoricalMapInstance() {
    console.log('Inicializando mapa histórico...');
    
    const centerHistorical = appState.historical.recorrido.length > 0 ? 
        appState.historical.recorrido[0] : 
        { lat: 4.710989, lng: -74.072092 }; // Coordenadas por defecto para Bogotá

    appState.historical.map = new google.maps.Map(domElements.historicalMapContainer, {
        center: centerHistorical,
        zoom: 15,
        streetViewControl: false
    });

    appState.historical.polyline = new google.maps.Polyline({
        path: appState.historical.recorrido,
        geodesic: true,
        strokeColor: "#024abf",
        strokeOpacity: 1.0,
        strokeWeight: 4,
        map: appState.historical.map
    });
    
    console.log('Mapa histórico inicializado');
}

function initRealMapInstance() {
    console.log('Inicializando mapa en tiempo real...');
    
    const centerReal = appState.realTime.recorrido.length > 0 ? 
        appState.realTime.recorrido[0] : 
        { lat: 4.710989, lng: -74.072092 }; // Coordenadas por defecto para Bogotá

    appState.realTime.map = new google.maps.Map(domElements.realMapContainer, {
        center: centerReal,
        zoom: 15,
        streetViewControl: false
    });

    // Configurar marcador en tiempo real
    appState.realTime.marker = new google.maps.Marker({
        position: centerReal,
        map: appState.realTime.map,
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
        map: appState.realTime.map
    });

    // Configurar botón seguir
    domElements.seguirBtn.addEventListener('click', () => {
        appState.realTime.seguirCentrando = true;
        centerOnTaxi();
    });

    // Detectar cuando el usuario mueve el mapa
    appState.realTime.map.addListener('dragstart', () => {
        appState.realTime.seguirCentrando = false;
    });

    // Iniciar actualización periódica
    startRealTimeUpdates();
    
    console.log('Mapa en tiempo real inicializado');
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

        // Verificar que las coordenadas sean válidas
        if (isNaN(posicionInicial.lat) || isNaN(posicionInicial.lng)) {
            throw new Error("Coordenadas iniciales inválidas");
        }

        appState.realTime.recorrido = [posicionInicial];

        // Cargar Google Maps API solo una vez para ambos mapas
        if (!window.google || !window.google.maps) {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKeyData.apiKey}&callback=mapsApiLoaded`;
            script.async = true;
            script.defer = true;
            document.head.appendChild(script);
        } else {
            // Si ya está cargada, inicializar los mapas directamente
            mapsApiLoaded();
        }
    } catch (error) {
        console.error('Error inicializando mapa:', error);
        domElements.realMapContainer.innerHTML = `Error: ${error.message}`;
        showError(domElements.realTimeError, error.message);
    }
}

// Función de callback para cuando la API de Google Maps se ha cargado
function mapsApiLoaded() {
    console.log('Google Maps API cargada');
    appState.realTime.mapsLoaded = true;
    appState.historical.mapsLoaded = true;
    
    initRealMapInstance();
    initHistoricalMapInstance();
}

function switchToRealTime() {
    domElements.realTimeSection.classList.add("active");
    domElements.historicalSection.classList.remove("active");
    domElements.realTimeBtn.classList.add("active");
    domElements.historicalBtn.classList.remove("active");

    // Restaurar elementos de tiempo real
    if (appState.realTime.marker) {
        appState.realTime.marker.setMap(appState.realTime.map);
    }
    if (appState.realTime.polyline) {
        appState.realTime.polyline.setMap(appState.realTime.map);
    }

    // Ocultar polilínea histórica
    if (appState.historical.polyline) {
        appState.historical.polyline.setMap(null);
    }

    // Iniciar actualizaciones si no están activas
    if (!appState.realTime.intervalId) {
        startRealTimeUpdates();
    }
}

function switchToHistorical() {
    domElements.historicalSection.classList.add("active");
    domElements.realTimeSection.classList.remove("active");
    domElements.historicalBtn.classList.add("active");
    domElements.realTimeBtn.classList.remove("active");

    // Detener actualizaciones de tiempo real para ahorrar recursos
    stopRealTimeUpdates();

    // Ocultar elementos de tiempo real
    if (appState.realTime.marker) {
        appState.realTime.marker.setMap(null);
    }
    if (appState.realTime.polyline) {
        appState.realTime.polyline.setMap(null);
    }
}

async function loadHistoricalData() {
    try {
        const startDate = domElements.startDate.value;
        const endDate = domElements.endDate.value;

        if (!startDate || !endDate) {
            throw new Error("Debe seleccionar ambas fechas");
        }

        showLoading(true);
        domElements.historicalError.style.display = "none";

        // Detener actualizaciones en tiempo real si están activas
        stopRealTimeUpdates();

        // Limpiar polilínea histórica anterior
        if (appState.historical.polyline) {
            appState.historical.polyline.setPath([]);
        }

        // Ocultar elementos de tiempo real
        if (appState.realTime.marker) {
            appState.realTime.marker.setMap(null);
        }
        if (appState.realTime.polyline) {
            appState.realTime.polyline.setMap(null);
        }

        // Crear URL con parámetros de fechas
        const url = `${config.basePath}/historical-data?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
        console.log("URL de solicitud:", url);

        // Obtener datos históricos
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);

        const result = await response.json();
        console.log("Datos recibidos:", result);
        
        if (!result?.success || !Array.isArray(result.data)) {
            throw new Error("Formato de datos incorrecto");
        }
        
        if (result.data.length === 0) {
            throw new Error("No hay datos para el rango seleccionado");
        }

        // Procesar coordenadas
        const path = result.data.map(item => ({
            lat: parseFloat(item.LATITUDE),
            lng: parseFloat(item.LONGITUDE)
        })).filter(coord => !isNaN(coord.lat) && !isNaN(coord.lng));

        if (path.length === 0) {
            throw new Error("No hay coordenadas válidas en los datos recibidos");
        }

        console.log(`Procesadas ${path.length} coordenadas válidas`);

        // Verificar si el mapa histórico está inicializado
        if (!appState.historical.map) {
            initHistoricalMapInstance();
        }

        // Crear nueva polilínea histórica o actualizar la existente
        if (!appState.historical.polyline) {
            appState.historical.polyline = new google.maps.Polyline({
                path: path,
                geodesic: true,
                strokeColor: "#4285F4",
                strokeOpacity: 1.0,
                strokeWeight: 4,
                map: appState.historical.map
            });
        } else {
            appState.historical.polyline.setPath(path);
            appState.historical.polyline.setMap(appState.historical.map);
        }

        // Ajustar vista del mapa
        const bounds = new google.maps.LatLngBounds();
        path.forEach(point => bounds.extend(point));
        appState.historical.map.fitBounds(bounds);

        // Forzar redibujado
        google.maps.event.trigger(appState.historical.map, 'resize');

    } catch (error) {
        console.error('Error cargando datos históricos:', error);
        showError(domElements.historicalError, error.message);
    } finally {
        showLoading(false);
    }
}

function initHistoricalTracking() {
    try {
        // Configurar fechas por defecto (última hora)
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000));
        
        domElements.startDate.value = formatDateTimeInput(oneHourAgo);
        domElements.endDate.value = formatDateTimeInput(now);
        
        // Configurar evento del botón
        domElements.loadHistory.addEventListener('click', loadHistoricalData);
    } catch (error) {
        console.error('Error inicializando Historical Tracking:', error);
        showError(domElements.historicalError, error.message);
    }
}

function initApp() {
    // Configurar eventos para cambiar entre las secciones
    domElements.realTimeBtn.addEventListener("click", switchToRealTime);
    domElements.historicalBtn.addEventListener("click", switchToHistorical);

    // Inicializar mapas
    initMap();

    // Inicializar seguimiento histórico
    initHistoricalTracking();
    
    // Hacer que la función mapsApiLoaded sea global para que Google Maps pueda llamarla
    window.mapsApiLoaded = mapsApiLoaded;
}

// Iniciar la aplicación cuando el DOM esté listo
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initApp, 1);
} else {
    document.addEventListener('DOMContentLoaded', initApp);
}