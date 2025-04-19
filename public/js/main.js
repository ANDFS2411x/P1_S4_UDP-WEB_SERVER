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
        animation: google.maps.Animation.BOUNCE
    });
    
    // Centrar mapa en este punto
    appState.historical.map.setCenter(position);
    
    // Añadir etiqueta con fecha y hora
    const infoWindow = new google.maps.InfoWindow({
        content: `<div class="point-marker-label">Fecha: ${point.DATE}<br>Hora: ${point.TIME}</div>`
    });
    infoWindow.open(appState.historical.map, highlightMarker);
    
    // Eliminar marcador después de unos segundos
    setTimeout(() => {
        highlightMarker.setAnimation(null);
        setTimeout(() => {
            highlightMarker.setMap(null);
            infoWindow.close();
        }, 2000);
    }, 3000);
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

        if (!startDate || !endDate) {
            throw new Error("Debe seleccionar ambas fechas");
        }

        showLoading(true);
        
        if (domElements.historicalError) {
            domElements.historicalError.style.display = "none";
        }

        // Ocultar timeline mientras se cargan los datos
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

        // Crear URL con parámetros de fechas
        const url = `${config.basePath}/historical-data?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
        
        // Obtener datos históricos
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
        const path = result.data.map(item => ({
            lat: parseFloat(item.LATITUDE),
            lng: parseFloat(item.LONGITUDE),
            time: item.TIME,
            date: item.DATE
        })).filter(coord => !isNaN(coord.lat) && !isNaN(coord.lng));

        if (path.length === 0) {
            throw new Error("No hay coordenadas válidas en los datos recibidos");
        }

        // Inicializar o actualizar la animación de la línea de tiempo
        if (!appState.historical.timelineAnimation) {
            appState.historical.timelineAnimation = new TimelineAnimation(appState.historical.map);
        }
        appState.historical.timelineAnimation.setPoints(path);

        // Configurar y mostrar controles de línea de tiempo
        if (timelineControls) {
            const timelineSlider = document.getElementById('timelineSlider');
            const currentTimeInfo = document.getElementById('currentTimeInfo');

            if (timelineSlider && currentTimeInfo) {
                // Resetear slider
                timelineSlider.value = 0;
                appState.historical.timelineAnimation.setProgress(0);

                // Actualizar la información de tiempo cuando se mueve el slider
                timelineSlider.addEventListener('input', function(e) {
                    const progress = parseInt(e.target.value);
                    appState.historical.timelineAnimation.setProgress(progress);
                    
                    // Actualizar la información de tiempo
                    const currentPoint = path[Math.floor((progress / 100) * (path.length - 1))];
                    if (currentPoint) {
                        currentTimeInfo.textContent = `${currentPoint.date} ${currentPoint.time}`;
                    }
                });

                // Mostrar controles
                timelineControls.style.display = 'block';
            }
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