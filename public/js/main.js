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
        mapsLoaded: false,
        pointMarker: null,  // Marcador para punto seleccionado
        pointCircle: null,  // Círculo para radio de búsqueda
        pointSelected: false // Estado de selección de punto      
    },
};

const domElements = {
    realTimeBtn: document.getElementById('realTimeBtn'),
    historicalBtn: document.getElementById('historicalBtn'),
    membersBtn: document.getElementById('membersBtn'),
    realTimeSection: document.getElementById('realTime'),
    historicalSection: document.getElementById('historical'),
    membersSection: document.getElementById('members'),
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
    historicalError: document.getElementById('historicalError'),
    // Nuevos elementos para selección de punto
    enablePointSelection: document.getElementById('enablePointSelection'),
    selectedLat: document.getElementById('selectedLat'),
    selectedLng: document.getElementById('selectedLng'),
    searchRadius: document.getElementById('searchRadius'),
    clearPointBtn: document.getElementById('clearPointBtn'),
    pointSearchResults: document.getElementById('pointSearchResults'),
    resultsSummary: document.getElementById('resultsSummary'),
    resultsTable: document.getElementById('resultsTable')
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
        { lat: 11.0193213, lng: -74.8601743 }; // Coordenadas por defecto para Bogotá

    appState.historical.map = new google.maps.Map(domElements.historicalMapContainer, {
        center: centerHistorical,
        zoom: 14,
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
    
    // Configurar evento de clic en el mapa para selección de punto
    appState.historical.map.addListener('click', function(event) {
        handleMapClick(event);
    });
    
    console.log('Mapa histórico inicializado');
}

function handleMapClick(event) {
    // Verificar si la selección de punto está habilitada
    if (!domElements.enablePointSelection.checked) {
        return;
    }
    
    const clickPosition = {
        lat: event.latLng.lat(),
        lng: event.latLng.lng()
    };
    
    // Mostrar las coordenadas en los campos
    domElements.selectedLat.value = clickPosition.lat.toFixed(6);
    domElements.selectedLng.value = clickPosition.lng.toFixed(6);
    
    // Crear o actualizar el marcador
    if (!appState.historical.pointMarker) {
        appState.historical.pointMarker = new google.maps.Marker({
            position: clickPosition,
            map: appState.historical.map,
            title: "Punto seleccionado",
            animation: google.maps.Animation.DROP,
            icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: "#4CAF50",
                fillOpacity: 1,
                strokeColor: "#45a049",
                strokeWeight: 2
            }
        });
    } else {
        appState.historical.pointMarker.setPosition(clickPosition);
        appState.historical.pointMarker.setMap(appState.historical.map);
    }
    
    // Crear o actualizar el círculo para representar el radio de búsqueda
    const radius = parseInt(domElements.searchRadius.value);
    
    if (!appState.historical.pointCircle) {
        appState.historical.pointCircle = new google.maps.Circle({
            strokeColor: "#4CAF50",
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: "#4CAF50",
            fillOpacity: 0.2,
            map: appState.historical.map,
            center: clickPosition,
            radius: radius
        });
    } else {
        appState.historical.pointCircle.setCenter(clickPosition);
        appState.historical.pointCircle.setRadius(radius);
        appState.historical.pointCircle.setMap(appState.historical.map);
    }
    
    // Añadir breve animación de pulso
    appState.historical.pointMarker.setAnimation(google.maps.Animation.BOUNCE);
    setTimeout(() => {
        appState.historical.pointMarker.setAnimation(null);
    }, 1500);
    
    // Actualizar estado y botones
    appState.historical.pointSelected = true;
    domElements.clearPointBtn.disabled = false;
}

function clearSelectedPoint() {
    if (appState.historical.pointMarker) {
        appState.historical.pointMarker.setMap(null);
    }
    
    if (appState.historical.pointCircle) {
        appState.historical.pointCircle.setMap(null);
    }
    
    domElements.selectedLat.value = '';
    domElements.selectedLng.value = '';
    domElements.clearPointBtn.disabled = true;
    appState.historical.pointSelected = false;
    
    // Ocultar resultados de búsqueda por punto
    domElements.pointSearchResults.style.display = 'none';
}

function initRadiusChangeHandler() {
    domElements.searchRadius.addEventListener('change', function() {
        // Si hay un punto seleccionado, actualizar el radio del círculo
        if (appState.historical.pointSelected && appState.historical.pointCircle) {
            const radius = parseInt(this.value);
            appState.historical.pointCircle.setRadius(radius);
        }
    });
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

function switchToMembers() {
    domElements.historicalSection.classList.remove("active");
    domElements.realTimeSection.classList.remove("active");
    domElements.membersSection.classList.add("active");
    domElements.historicalBtn.classList.remove("active");
    domElements.realTimeBtn.classList.remove("active");
    domElements.membersBtn.classList.add("active");
}

// Función para calcular la distancia entre dos puntos en metros
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Radio de la Tierra en metros
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Función para encontrar puntos cercanos al punto seleccionado
function findPointsNearby(point, data, radius) {
    // Convertir coordenadas del punto seleccionado
    const lat = parseFloat(point.lat);
    const lng = parseFloat(point.lng);
    
    // Filtrar datos para encontrar puntos dentro del radio especificado
    return data.filter(item => {
        const itemLat = parseFloat(item.LATITUDE);
        const itemLng = parseFloat(item.LONGITUDE);
        
        // Verificar si las coordenadas son válidas
        if (isNaN(itemLat) || isNaN(itemLng)) {
            return false;
        }
        
        // Calcular distancia
        const distance = calculateDistance(lat, lng, itemLat, itemLng);
        
        // Determinar si está dentro del radio
        return distance <= radius;
    });
}

// Función para construir la tabla de resultados
function buildResultsTable(nearbyPoints) {
    const tbody = document.getElementById('resultsTableBody');
    tbody.innerHTML = '';
    
    if (!nearbyPoints || nearbyPoints.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="no-results">No se encontraron registros cercanos al punto seleccionado</td></tr>';
        return;
    }

    // Actualizar estadísticas
    updateStats(nearbyPoints);

    nearbyPoints.forEach((point, index) => {
        const row = document.createElement('tr');
        
        // Formatear fecha y hora
        const date = new Date(point.timestamp);
        const formattedDate = date.toLocaleDateString();
        const formattedTime = date.toLocaleTimeString();
        
        // Formatear ubicación
        const location = `${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}`;
        
        row.innerHTML = `
            <td>${formattedDate}</td>
            <td>${formattedTime}</td>
            <td>${location}</td>
            <td>
                <button class="action-button" onclick="highlightPointOnMap(${index})">
                    Resaltar
                </button>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

function updateStats(points) {
    // Actualizar total de registros
    document.getElementById('totalRecords').textContent = points.length;
    
    // Calcular tiempo total
    if (points.length >= 2) {
        const firstPoint = new Date(points[0].timestamp);
        const lastPoint = new Date(points[points.length - 1].timestamp);
        const timeDiff = (lastPoint - firstPoint) / (1000 * 60); // en minutos
        document.getElementById('totalTime').textContent = `${Math.round(timeDiff)} min`;
    } else {
        document.getElementById('totalTime').textContent = '0 min';
    }
    
    // Calcular distancia total
    let totalDistance = 0;
    for (let i = 1; i < points.length; i++) {
        totalDistance += calculateDistance(
            points[i-1].lat,
            points[i-1].lng,
            points[i].lat,
            points[i].lng
        );
    }
    document.getElementById('totalDistance').textContent = `${totalDistance.toFixed(2)} km`;
}

// Función para exportar datos
function exportToCSV(points) {
    const headers = ['Fecha', 'Hora', 'Latitud', 'Longitud'];
    const csvContent = [
        headers.join(','),
        ...points.map(point => {
            const date = new Date(point.timestamp);
            return [
                date.toLocaleDateString(),
                date.toLocaleTimeString(),
                point.lat,
                point.lng
            ].join(',');
        })
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'historico_taxi.csv';
    link.click();
}

// Función para cambiar la vista del mapa
function toggleMapView() {
    if (appState.historical.map) {
        const currentMapType = appState.historical.map.getMapTypeId();
        const newMapType = currentMapType === 'roadmap' ? 'satellite' : 'roadmap';
        appState.historical.map.setMapTypeId(newMapType);
    }
}

// Inicializar eventos para los nuevos botones
function initHistoricalControls() {
    const exportButton = document.getElementById('exportData');
    const toggleViewButton = document.getElementById('toggleMapView');
    
    if (exportButton) {
        exportButton.addEventListener('click', () => {
            if (appState.historical.recorrido.length > 0) {
                exportToCSV(appState.historical.recorrido);
            }
        });
    }
    
    if (toggleViewButton) {
        toggleViewButton.addEventListener('click', toggleMapView);
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

        // Verificar si hay un punto seleccionado para filtrar
        if (appState.historical.pointSelected && domElements.enablePointSelection.checked) {
            const selectedPoint = {
                lat: parseFloat(domElements.selectedLat.value),
                lng: parseFloat(domElements.selectedLng.value)
            };
            
            const radius = parseInt(domElements.searchRadius.value);
            
            // Encontrar puntos cercanos
            const nearbyPoints = findPointsNearby(selectedPoint, result.data, radius);
            
            // Mostrar resultados en la tabla
            domElements.pointSearchResults.style.display = 'block';
            buildResultsTable(nearbyPoints);
            
            // Resaltar visualmente en el mapa los puntos encontrados
            if (nearbyPoints.length > 0) {
                setTimeout(() => {
                    const firstPoint = {
                        lat: parseFloat(nearbyPoints[0].LATITUDE),
                        lng: parseFloat(nearbyPoints[0].LONGITUDE)
                    };
                    appState.historical.map.setCenter(firstPoint);
                    appState.historical.map.setZoom(16);
                }, 500);
            }
        } else {
            // Si no hay punto seleccionado, ocultar sección de resultados
            domElements.pointSearchResults.style.display = 'none';
        }

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

        // Obtener la fecha actual en formato compatible con input datetime-local
        const maxDateTime = formatDateTimeInput(now);
        
        domElements.startDate.value = formatDateTimeInput(oneHourAgo);
        domElements.endDate.value = formatDateTimeInput(now);
        domElements.startDate.max = maxDateTime;
        domElements.endDate.max = maxDateTime;

       
        // Restringir fecha de fin mínima a la fecha de inicio
        domElements.endDate.min = domElements.startDate.value;

        // Eventos para evitar selecciones inválidas
        domElements.startDate.addEventListener("change", function () {
            if (domElements.startDate.value > domElements.endDate.value) {
                domElements.endDate.value = domElements.startDate.value; // Ajusta automáticamente
            }
            domElements.endDate.min = domElements.startDate.value; // Restringe la fecha mínima de fin
        });

        domElements.endDate.addEventListener("change", function () {
            if (domElements.endDate.value < domElements.startDate.value) {
                domElements.startDate.value = domElements.endDate.value; // Ajusta automáticamente
            }
            domElements.startDate.max = domElements.endDate.value; // Restringe la fecha máxima de inicio
        });

        // Configurar evento del botón de cargar historia
        domElements.loadHistory.addEventListener('click', loadHistoricalData);

        // Configurar eventos para selección de punto
        domElements.enablePointSelection.addEventListener('change', function() {
            console.log(!domElements.clearPointBtn.disabled);
            console.log(domElements.enablePointSelection.checked);
            if (!domElements.clearPointBtn.disabled && domElements.enablePointSelection.checked){
                domElements.loadHistory.textContent = "Consultar registros";
                domElements.loadHistory.style.backgroundColor = "#b103fc";
                console.log("entra");
            } else {
                domElements.loadHistory.textContent = "Cargar trayectoria";
                domElements.loadHistory.style.backgroundColor = "#5667d8";
                console.log("else");
            }

            const isEnabled = this.checked;
            
            // Habilitar/deshabilitar campos relacionados
            domElements.selectedLat.disabled = !isEnabled;
            domElements.selectedLng.disabled = !isEnabled;
            domElements.searchRadius.disabled = !isEnabled;
            
            if (!isEnabled) {
                // Si se deshabilita, limpiar el punto
                clearSelectedPoint();
            }
        });

        const observer = new MutationObserver(() => {
            if (!domElements.clearPointBtn.disabled && domElements.enablePointSelection.checked) {
                domElements.loadHistory.textContent = "Consultar registros";
                domElements.loadHistory.style.backgroundColor = "#b103fc";
                console.log("entra");
            } else {
                domElements.loadHistory.textContent = "Cargar trayectoria";
                domElements.loadHistory.style.backgroundColor = "#5667d8";
                console.log("else");
            }
        });
        
        observer.observe(domElements.clearPointBtn, { attributes: true, attributeFilter: ['disabled'] });
        

        /*
        domElements.clearPointBtn.addEventListener('change', function() {
            console.log(!domElements.clearPointBtn.disabled);
            console.log(domElements.enablePointSelection.checked);
            if (!domElements.clearPointBtn.disabled && !domElements.enablePointSelection.checked){
                domElements.loadHistory.textContent = "Consultar registros";
                domElements.loadHistory.style.backgroundColor = "#b103fc";
                console.log("entra");
            } else {
                domElements.loadHistory.textContent = "Cargar trayectoria";
                domElements.loadHistory.style.backgroundColor = "#5667d8";
                console.log("else");
            }
        });
        */
        
        // Configurar evento para botón de limpiar punto
        domElements.clearPointBtn.addEventListener('click', clearSelectedPoint);
        
        // Inicializar handler para cambio de radio
        initRadiusChangeHandler();
    } catch (error) {
        console.error('Error inicializando Historical Tracking:', error);
        showError(domElements.historicalError, error.message);
    }
}

function initApp() {
    // Configurar eventos para cambiar entre las secciones
    domElements.realTimeBtn.addEventListener("click", switchToRealTime);
    domElements.historicalBtn.addEventListener("click", switchToHistorical);
    //domElements.membersBtn.addEventListener("click", switchToMembers);

    // Inicializar mapas
    initMap();

    // Inicializar seguimiento histórico
    initHistoricalTracking();
    
    // Hacer que la función mapsApiLoaded sea global para que Google Maps pueda llamarla
    window.mapsApiLoaded = mapsApiLoaded;

    initHistoricalControls();
}

// Iniciar la aplicación cuando el DOM esté listo
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initApp, 1);
} else {
    document.addEventListener('DOMContentLoaded', initApp);
}