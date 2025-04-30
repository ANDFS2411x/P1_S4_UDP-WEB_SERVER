// Configuración global
const config = {
    basePath: window.location.pathname.includes("/test") ? "/test" : "",
    updateInterval: 5000
};

const appState = {
    realTime: {
        map: null,
        markers: {},         // Objeto para almacenar marcadores por ID de taxi
        polylines: {},       // Objeto para almacenar polilíneas por ID de taxi
        seguirCentrando: false,
        recorridos: {},      // Objeto para almacenar recorridos por ID de taxi
        currentTaxiId: "0",  // ID del taxi seleccionado actualmente ("0" para todos)
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
        pointSelected: false, // Estado de selección de punto      
        timelineAnimation: null
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
    rpmRealTime: document.getElementById('rpm'),
    idTaxiReal: document.getElementById('idTaxi'),
    realTimeError: document.getElementById('realTimeError'),
    historicalError: document.getElementById('historicalError'),
    spinnerReal: document.getElementById('idSpinnerReal'),
    enablePointSelection: document.getElementById('enablePointSelection'),
    selectedLat: document.getElementById('selectedLat'),
    selectedLng: document.getElementById('selectedLng'),
    searchRadius: document.getElementById('searchRadius'),
    clearPointBtn: document.getElementById('clearPointBtn'),
    pointSearchResults: document.getElementById('pointSearchResults'),
    resultsSummary: document.getElementById('resultsSummary'),
    resultsTable: document.getElementById('resultsTable'),
    idSpinnerHist: document.getElementById('idSpinnerHist'),
    timelineInfo: document.getElementById('timeline-info'),
};  

/*function updateInfoPanel(data) {
    domElements.latitud.textContent = data.LATITUDE || "N/A";
    domElements.longitud.textContent = data.LONGITUDE || "N/A";
    domElements.fecha.textContent = data.DATE || "N/A";
    domElements.tiempo.textContent = data.TIME || "N/A";
    domElements.rpmRealTime.textContent = data.RPM || "0";
    domElements.idTaxiReal.textContent = data.ID_TAXI || "N/A";
}*/

function updateInfoPanel(data) {
    domElements.latitud.textContent = data.LATITUDE || "N/A";
    domElements.longitud.textContent = data.LONGITUDE || "N/A";

    // Quita la parte "T00:00:00.000Z" si existe
    let rawDate = data.DATE || "N/A";
    if (rawDate.includes("T")) {
        rawDate = rawDate.split("T")[0];
    }
    domElements.fecha.textContent = rawDate;

    domElements.tiempo.textContent = data.TIME || "N/A";
    domElements.rpmRealTime.textContent = data.RPM || "0";
    domElements.idTaxiReal.textContent = data.ID_TAXI || "N/A";
}


function showError(element, message) {
    element.textContent = message;
    element.style.display = 'block';
    setTimeout(() => element.style.display = 'none', 5000);
}

function showLoading(show) {
    try {
        const isHistorical = domElements.historicalSection?.classList.contains("active");
        const loadingId = isHistorical ? 'historicalLoadingMessage' : 'realTimeLoadingMessage';
        const loadingMessage = document.getElementById(loadingId);
        
        if (loadingMessage) {
            loadingMessage.style.display = show ? 'block' : 'none';
        }
    } catch (error) {
        console.warn('Error al mostrar/ocultar el mensaje de carga:', error);
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

function centerOnTaxi(taxiId) {
    if (appState.realTime.markers[taxiId] && appState.realTime.map) {
        appState.realTime.map.setCenter(appState.realTime.markers[taxiId].getPosition());
    }
}

async function updateRealTimeData() {
    try {
        const data = await fetchData('/data');
        if (!data || !Array.isArray(data)) {
            throw new Error("Formato de datos incorrecto");
        }

        // Si no hay datos, mostrar error
        if (data.length === 0) {
            throw new Error("No hay datos disponibles");
        }

        // Procesar cada taxi recibido
        data.forEach(taxiData => {
            if (!taxiData?.LATITUDE || !taxiData?.LONGITUDE || !taxiData?.ID_TAXI) {
                console.warn("Datos incompletos para un taxi");
                return;
            }

            const taxiId = taxiData.ID_TAXI.toString();
            const nuevaPosicion = {
                lat: parseFloat(taxiData.LATITUDE),
                lng: parseFloat(taxiData.LONGITUDE)
            };

            // Verificar coordenadas válidas
            if (isNaN(nuevaPosicion.lat) || isNaN(nuevaPosicion.lng)) {
                console.warn("Coordenadas inválidas para taxi ID:", taxiId);
                return;
            }

            // Asegurar que este taxi tiene una entrada en el registro de recorridos
            if (!appState.realTime.recorridos[taxiId]) {
                appState.realTime.recorridos[taxiId] = [];
            }

            // Actualizar posición del marcador
            if (appState.realTime.markers[taxiId]) {
                appState.realTime.markers[taxiId].setPosition(nuevaPosicion);
            }

            // Añadir punto al recorrido
            if (appState.realTime.recorridos[taxiId].length > 500) {
                appState.realTime.recorridos[taxiId].shift(); // Eliminar punto más antiguo
            }
            appState.realTime.recorridos[taxiId].push(nuevaPosicion);

            // Actualizar polilínea
            if (appState.realTime.polylines[taxiId]) {
                appState.realTime.polylines[taxiId].setPath(appState.realTime.recorridos[taxiId]);
            }

            // Si este es el taxi seleccionado, actualizar panel de información
            if (appState.realTime.currentTaxiId === taxiId || appState.realTime.currentTaxiId === "0") {
                // Si un taxi específico está seleccionado, mostrar sus datos
                if (appState.realTime.currentTaxiId !== "0") {
                    updateInfoPanel(taxiData);
                }

                // Si está habilitado el seguimiento, centrar en el taxi seleccionado
                if (appState.realTime.seguirCentrando && appState.realTime.currentTaxiId === taxiId) {
                    centerOnTaxi(taxiId);
                }
            }
        });

        // Si están todos los taxis seleccionados, no mostrar información específica
        if (appState.realTime.currentTaxiId === "0") {
            clearInfoPanel();
        }

    } catch (error) {
        console.error('Error actualizando datos en tiempo real:', error);
    }
}

function clearInfoPanel() {
    domElements.latitud.textContent = "N/A";
    domElements.longitud.textContent = "N/A";
    domElements.fecha.textContent = "N/A";
    domElements.tiempo.textContent = "N/A";
    domElements.rpmRealTime.textContent = "0";
    domElements.idTaxiReal.textContent = "N/A";
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
    
    const centerHistorical = { lat: 11.0193213, lng: -74.8601743 }; // Coordenadas por defecto

    appState.historical.map = new google.maps.Map(domElements.historicalMapContainer, {
        center: centerHistorical,
        zoom: 14,
        streetViewControl: false
    });
    
    // Configurar evento de clic en el mapa para selección de punto
    appState.historical.map.addListener('click', function(event) {
        handleMapClick(event);
    });

    selectedTaxiId = domElements.idSpinnerHist.value;
    if (selectedTaxiId === "0") {
        domElements.timelineInfo.style.display = 'none';
    } else {
        domElements.timelineInfo.style.display = 'flex';
    }
    
    // Configurar el spinner de selección de taxi histórico
    domElements.idSpinnerHist.addEventListener('change', function() {
        const selectedTaxiId = this.value;
        if (appState.historical.timelineAnimation) {
            appState.historical.timelineAnimation.setSelectedTaxiId(selectedTaxiId);
            
            // Actualizar también la información mostrada si hay una animación activa
            if (appState.historical.timelineAnimation) {
                const timelineSlider = document.getElementById('timelineSlider');
                if (timelineSlider) {
                    const progress = parseInt(timelineSlider.value);
                    updateTimelineInfo(progress);
                }
            }
        }
    });
    
    console.log('Mapa histórico inicializado');
}

function updateTimelineInfo(progress) {
    const currentTimeInfo = document.getElementById('currentTimeInfo');
    const distanceInfo = document.getElementById('distanceInfo');
    const rpmHist = document.getElementById('rpmHist');
    
    if (!appState.historical.timelineAnimation) return;
    
    const pointInfo = appState.historical.timelineAnimation.setProgress(progress);
    
    if (pointInfo) {
        // Formatear fecha y hora
        const date = new Date(pointInfo.timestamp);
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString();
        
        // Actualizar información de tiempo
        currentTimeInfo.textContent = `${dateStr} ${timeStr}`;
        
        // Actualizar RPM si está disponible
        rpmHist.textContent = `RPM: ${pointInfo.RPM || '0'}`;
        
        // Si hay un punto seleccionado, mostrar la distancia
        if (domElements.enablePointSelection.checked && appState.historical.pointSelected) {
            const selectedPoint = {
                lat: parseFloat(domElements.selectedLat.value),
                lng: parseFloat(domElements.selectedLng.value)
            };
            
            const distance = calculateDistance(
                selectedPoint.lat,
                selectedPoint.lng,
                pointInfo.lat,
                pointInfo.lng
            );
            
            distanceInfo.textContent = `Distancia al punto: ${Math.round(distance)} m`;
            distanceInfo.style.display = 'block';
        } else {
            distanceInfo.style.display = 'none';
        }
        
        // Centrar el mapa en la posición actual si hay coordenadas
        if (pointInfo.lat && pointInfo.lng) {
            appState.historical.map.panTo({
                lat: pointInfo.lat,
                lng: pointInfo.lng
            });
        }
    }
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
    
    const centerReal = { lat: 11.006374, lng: -74.812042 };

    appState.realTime.map = new google.maps.Map(domElements.realMapContainer, {
        center: centerReal,
        zoom: 13,
        streetViewControl: false
    });

    // Inicializar spinner de selección de taxi
    domElements.spinnerReal.addEventListener('change', function() {
        const selectedTaxiId = this.value;
        appState.realTime.currentTaxiId = selectedTaxiId;
        
        // Actualizar visibilidad de marcadores y polilíneas
        updateTaxiVisibility(selectedTaxiId);
    });

    // Configurar botón seguir
    domElements.seguirBtn.addEventListener('click', () => {
        appState.realTime.seguirCentrando = true;
        if (appState.realTime.currentTaxiId !== "0") {
            centerOnTaxi(appState.realTime.currentTaxiId);
        }
    });

    // Detectar cuando el usuario mueve el mapa
    appState.realTime.map.addListener('dragstart', () => {
        appState.realTime.seguirCentrando = false;
    });

    // Iniciar actualización periódica
    startRealTimeUpdates();
    
    console.log('Mapa en tiempo real inicializado');
}

function updateTaxiVisibility(selectedTaxiId) {
    // Habilitar/deshabilitar panel de información
    const infoPanelEl = document.querySelector('.info-grid');
    const seguirBtnEl = document.getElementById('seguirBtn');
    
    if (selectedTaxiId === "0") {
        // Si "Todos" está seleccionado, mostrar todos los taxis
        Object.keys(appState.realTime.markers).forEach(taxiId => {
            appState.realTime.markers[taxiId].setMap(appState.realTime.map);
            appState.realTime.polylines[taxiId].setMap(appState.realTime.map);
        });
        
        // Desactivar panel de información
        if (infoPanelEl) infoPanelEl.classList.add('disabled');
        if (seguirBtnEl) seguirBtnEl.disabled = true;
        clearInfoPanel();
    } else {
        // Si un taxi específico está seleccionado
        Object.keys(appState.realTime.markers).forEach(taxiId => {
            const visible = taxiId === selectedTaxiId;
            appState.realTime.markers[taxiId].setMap(visible ? appState.realTime.map : null);
            appState.realTime.polylines[taxiId].setMap(visible ? appState.realTime.map : null);
        });
        
        // Activar panel de información
        if (infoPanelEl) infoPanelEl.classList.remove('disabled');
        if (seguirBtnEl) seguirBtnEl.disabled = false;
        
        // Intentar actualizar la información del taxi seleccionado
        fetchTaxiInfo(selectedTaxiId);
    }
}

async function fetchTaxiInfo(taxiId) {
    try {
        const data = await fetchData('/data');
        if (!data || !Array.isArray(data)) return;
        
        const taxiData = data.find(item => item.ID_TAXI.toString() === taxiId);
        if (taxiData) {
            updateInfoPanel(taxiData);
        }
    } catch (error) {
        console.error('Error obteniendo información del taxi:', error);
    }
}

async function initMap() {
    try {
        // Obtener API Key
        const apiKeyData = await fetchData('/api-key');
        if (!apiKeyData.apiKey) throw new Error("API Key no recibida");

        // Obtener posiciones iniciales
        const ubicaciones = await fetchData('/data');
        console.log(ubicaciones);
        if (!ubicaciones || !Array.isArray(ubicaciones) || ubicaciones.length === 0) {
            throw new Error("Datos de ubicación inicial incompletos");
        }

        // Inicializar recorridos para cada taxi
        ubicaciones.forEach(taxi => {
            if (!taxi?.LATITUDE || !taxi?.LONGITUDE || !taxi?.ID_TAXI) return;
            
            const taxiId = taxi.ID_TAXI.toString();
            const posicion = {
                lat: parseFloat(taxi.LATITUDE),
                lng: parseFloat(taxi.LONGITUDE)
            };
            
            if (isNaN(posicion.lat) || isNaN(posicion.lng)) return;
            
            // Inicializar recorrido para este taxi
            if (!appState.realTime.recorridos[taxiId]) {
                appState.realTime.recorridos[taxiId] = [posicion];
            }
        });

        // Cargar Google Maps API
        if (!window.google || !window.google.maps) {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKeyData.apiKey}&callback=initMapsCallback`;
                script.async = true;
                script.defer = true;
                script.onerror = reject;
                window.initMapsCallback = () => {
                    resolve();
                    delete window.initMapsCallback;
                };
                document.head.appendChild(script);
            });
            mapsApiLoaded();
        } else {
            mapsApiLoaded();
        }
    } catch (error) {
        console.error('Error inicializando mapa:', error);
        if (domElements.realMapContainer) {
            domElements.realMapContainer.innerHTML = `Error: ${error.message}`;
        }
        showError(domElements.realTimeError, error.message);
    }
}

function createTaxiMarkers() {
    // Crear marcadores y polilíneas para cada taxi
    Object.keys(appState.realTime.recorridos).forEach((taxiId, index) => {
        const recorrido = appState.realTime.recorridos[taxiId];
        const position = recorrido[recorrido.length - 1]; // Última posición conocida
        
        // Crear marcador
        appState.realTime.markers[taxiId] = new google.maps.Marker({
            position: position,
            map: appState.realTime.map,
            title: `Taxi ${taxiId} 🚕`,
            icon: {
                url: "https://cdn-icons-png.flaticon.com/128/2401/2401174.png",
                scaledSize: new google.maps.Size(50, 50)
            }
        });
        
        // Crear polilínea con un color diferente para cada taxi
        const colors = ["#FF0000", "#0000FF", "#00FF00", "#FFFF00", "#FF00FF"];
        appState.realTime.polylines[taxiId] = new google.maps.Polyline({
            path: recorrido,
            geodesic: true,
            strokeColor: colors[index % colors.length],
            strokeOpacity: 1.0,
            strokeWeight: 4,
            map: appState.realTime.map
        });
    });
    
    // Configurar visibilidad inicial (mostrar todos)
    updateTaxiVisibility("0");
}

// Función de callback para cuando la API de Google Maps se ha cargado
function mapsApiLoaded() {
    console.log('Google Maps API cargada');
    appState.realTime.mapsLoaded = true;
    appState.historical.mapsLoaded = true;
    
    initRealMapInstance();
    initHistoricalMapInstance();
    
    // Crear marcadores y polilíneas para los taxis
    createTaxiMarkers();
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
    // Si no hay puntos cercanos, mostrar mensaje
    if (nearbyPoints.length === 0) {
        domElements.resultsSummary.textContent = "No se encontraron registros cercanos al punto seleccionado.";
        domElements.resultsTable.innerHTML = '<div class="no-results">Sin resultados</div>';
        return;
    }
    
    // Actualizar resumen
    domElements.resultsSummary.textContent = `Se encontraron ${nearbyPoints.length} registros cercanos al punto seleccionado.`;
    
    // Construir tabla
    let tableHTML = `
        <table>
            <thead>
                <tr>
                    <th>Fecha</th>
                    <th>Hora</th>
                    <th>Latitud</th>
                    <th>Longitud</th>
                    <th>Acción</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    // Agregar filas
    nearbyPoints.forEach((point, index) => {
        tableHTML += `
            <tr>
                <td class="white">${point.DATE || 'N/A'}</td>
                <td class="white">${point.TIME || 'N/A'}</td>
                <td class="white">${point.LATITUDE || 'N/A'}</td>
                <td class="white">${point.LONGITUDE || 'N/A'}</td>
                <td>
                    <button class="secondary-button highlight-btn" data-index="${index}">Resaltar</button>
                </td>
            </tr>
        `;
    });
    
    tableHTML += `
            </tbody>
        </table>
    `;
    
    // Insertar tabla en el DOM
    domElements.resultsTable.innerHTML = tableHTML;
    
    // Agregar manejadores de eventos para los botones de resaltar
    const highlightButtons = domElements.resultsTable.querySelectorAll('.highlight-btn');
    highlightButtons.forEach(button => {
        button.addEventListener('click', function() {
            const pointIndex = parseInt(this.getAttribute('data-index'));
            highlightPointOnMap(nearbyPoints[pointIndex]);
            //llevar al usuario al inicio de la pagina
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}

// Función para resaltar un punto en el mapa
function highlightPointOnMap(point) {
    const position = {
        lat: parseFloat(point.LATITUDE),
        lng: parseFloat(point.LONGITUDE)
    };
    
    // Crear marcador temporal
    const highlightMarker = new google.maps.Marker({
        position: position,
        map: appState.historical.map,
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#FF4500",
            fillOpacity: 1,
            strokeColor: "#FF0000",
            strokeWeight: 2
        },
        zIndex: 1000,
    });

    // Centrar mapa en este punto
    appState.historical.map.setCenter(position);
    
    // Añadir etiqueta con fecha y hora
    const infoWindow = new google.maps.InfoWindow({
        content: `<div class="point-marker-label">Fecha: ${point.DATE}<br>Hora: ${point.TIME}</div>`
    });
    infoWindow.open(appState.historical.map, highlightMarker);
    
    // Eliminar marcador después de unos segundos
    /*SetTimeout(() => {
        highlightMarker.setAnimation(null);
        setTimeout(() => {
            highlightMarker.setMap(null);
            infoWindow.close();
        }, 2000);
    }, 3000);*/
}

// Función auxiliar para verificar si un elemento existe
function elementExists(elementId) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.warn(`Elemento #${elementId} no encontrado`);
        return false;
    }
    return true;
}

async function loadHistoricalData() {
    try {
        const startDate = domElements.startDate.value;
        const endDate = domElements.endDate.value;
        const selectedTaxiId = domElements.idSpinnerHist.value;

        if (!startDate || !endDate) {
            throw new Error("Debe seleccionar ambas fechas");
        }

        // Verificar si hay un punto seleccionado cuando se está en modo de selección
        if (domElements.enablePointSelection.checked) {
            const selectedLat = parseFloat(domElements.selectedLat.value);
            const selectedLng = parseFloat(domElements.selectedLng.value);
            
            if (isNaN(selectedLat) || isNaN(selectedLng)) {
                throw new Error("Debe seleccionar un punto en el mapa primero");
            }
        }

        showLoading(true);
        
        if (domElements.historicalError) {
            domElements.historicalError.style.display = "none";
        }

        const timelineControls = document.getElementById('timelineControls');
        if (timelineControls) {
            timelineControls.style.display = 'none';
        }

        // Detener actualizaciones en tiempo real si están activas
        stopRealTimeUpdates();

        // Limpiar visualizaciones anteriores
        if (appState.historical.timelineAnimation) {
            appState.historical.timelineAnimation.clear();
        }

        // Obtener datos históricos
        const url = `${config.basePath}/historical-data?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);

        const result = await response.json();
        
        if (!result?.success || !Array.isArray(result.data)) {
            throw new Error("Formato de datos incorrecto");
        }
        
        if (result.data.length === 0) {
            throw new Error("No hay datos para el rango seleccionado");
        }

        // Procesar coordenadas
        const allPoints = result.data.map(item => ({
            lat: parseFloat(item.LATITUDE),
            lng: parseFloat(item.LONGITUDE),
            time: item.TIME,
            date: item.DATE,
            RPM: item.RPM || '0',
            ID_TAXI: item.ID_TAXI || 'N/A'
        })).filter(coord => !isNaN(coord.lat) && !isNaN(coord.lng));

        if (allPoints.length === 0) {
            throw new Error("No hay coordenadas válidas en los datos recibidos");
        }

        // Si está en modo de selección de punto, filtrar solo los puntos cercanos
        let relevantPoints = allPoints;
        if (domElements.enablePointSelection.checked) {
            const selectedPoint = {
                lat: parseFloat(domElements.selectedLat.value),
                lng: parseFloat(domElements.selectedLng.value)
            };
            const radius = parseInt(domElements.searchRadius.value);

            relevantPoints = allPoints.filter(point => {
                const distance = calculateDistance(
                    selectedPoint.lat,
                    selectedPoint.lng,
                    point.lat,
                    point.lng
                );
                return distance <= radius;
            });

            if (relevantPoints.length === 0) {
                throw new Error("No se encontraron momentos en que el vehículo pasara por el punto seleccionado");
            }
        }

        // Inicializar o actualizar la animación
        if (!appState.historical.timelineAnimation) {
            appState.historical.timelineAnimation = new TimelineAnimation(appState.historical.map);
        }

        // Establecer el ID del taxi seleccionado
        appState.historical.timelineAnimation.setSelectedTaxiId(selectedTaxiId);

        // En modo de selección de punto, mostrar solo los puntos relevantes
        if (domElements.enablePointSelection.checked) {
            appState.historical.timelineAnimation.setPoints(relevantPoints, 'point');
        } else {
            appState.historical.timelineAnimation.setPoints(relevantPoints, 'route');
        }

        // Configurar y mostrar controles de línea de tiempo
        if (timelineControls) {
            const timelineSlider = document.getElementById('timelineSlider');
            const currentTimeInfo = document.getElementById('currentTimeInfo');
            
            if (timelineSlider && currentTimeInfo) {
                // Resetear slider
                timelineSlider.value = 0;
                timelineSlider.style.backgroundSize = `${timelineSlider.value}% 100%`;

                // Actualizar la información inicial
                updateTimelineInfo(0);

                // Actualizar la información cuando se mueve el slider
                timelineSlider.addEventListener('input', function(e) {
                    const progress = parseInt(e.target.value);
                    this.style.backgroundSize = `${progress}% 100%`;
                    
                    // Actualizar visualización con el nuevo progreso
                    updateTimelineInfo(progress);
                });

                // Mostrar controles
                timelineControls.style.display = 'block';
            }
        }

        // Ajustar vista del mapa para que todos los puntos sean visibles
        const bounds = new google.maps.LatLngBounds();
        relevantPoints.forEach(point => bounds.extend(point));
        appState.historical.map.fitBounds(bounds);

    } catch (error) {
        console.error('Error cargando datos históricos:', error);
        if (domElements.historicalError) {
            showError(domElements.historicalError, error.message);
        }
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
}

// Iniciar la aplicación cuando el DOM esté listo
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(initApp, 1);
} else {
    document.addEventListener('DOMContentLoaded', initApp);
}