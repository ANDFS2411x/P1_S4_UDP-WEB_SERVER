//config general
const config = {
    basePath: window.location.pathname.includes("/test") ? "/test" : "",
    updateInterval: 5000
};

const appState = {
    realTime: {
        map: null,
        markers: {},         // Objeto para almacenar marcadores por ID de taxi
        polylines: {},       // Objeto para almacenar polilíneas por ID de taxi
        seguirCentrando: true,
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
    radiusContainer: document.querySelector('.radius-container'),
    radiusValue: document.getElementById('radiusValue'),
    clearPointBtn: document.getElementById('clearPointBtn'),
    pointSearchResults: document.getElementById('pointSearchResults'),
    resultsSummary: document.getElementById('resultsSummary'),
    resultsTable: document.getElementById('resultsTable'),
    idSpinnerHist: document.getElementById('idSpinnerHist'),
    timelineInfo: document.getElementById('timeline-info'),
};  

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
    domElements.rpmRealTime.textContent = data.RPM || "N/A";
    domElements.idTaxiReal.textContent = data.ID_TAXI || "N/A";
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

//RealTime

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
                updateInfoPanel(appState.realTime.currentTaxiId);
                if (appState.realTime.currentTaxiId === "0") {
                    updateInfoPanel(taxiData);
                }

                // Si está habilitado el seguimiento, centrar en el taxi seleccionado
                if (appState.realTime.seguirCentrando && appState.realTime.currentTaxiId === taxiId) {
                    centerOnTaxi(taxiId);
                }
            }
        });
    } catch (error) {
        console.error('Error actualizando datos en tiempo real:', error);
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

function initRealMapInstance() {
    console.log('Inicializando mapa en tiempo real...');
    
    const centerReal = { lat: 11.0193213, lng: -74.8601743 };

    appState.realTime.map = new google.maps.Map(domElements.realMapContainer, {
        center: centerReal,
        zoom: 14,
        streetViewControl: false
    });

    // Inicializar spinner de selección de taxi
    domElements.spinnerReal.addEventListener('change', function() {
        const selectedTaxiId = this.value;
        appState.realTime.currentTaxiId = selectedTaxiId;
        
        // Actualizar visibilidad de marcadores y polilíneas
        updateTaxiVisibility(selectedTaxiId);
    });

    // Detectar cuando el usuario mueve el mapa
    appState.realTime.map.addListener('dragstart', () => {
        appState.realTime.seguirCentrando = true;
    });

    // Iniciar actualización periódica
    startRealTimeUpdates();
    
    console.log('Mapa en tiempo real inicializado');
}

function updateTaxiVisibility(selectedTaxiId) {
    const infoPanelEl = document.querySelector('.info-grid');
    const seguirBtnEl = document.getElementById('seguirBtn');
  
    // Reset del panel
    infoPanelEl.innerHTML = '';
    infoPanelEl.style.display = 'grid';
    seguirBtnEl.style.display = 'none';
  
    // Mostrar marcadores / rutas y calcular bounds
    const bounds = new google.maps.LatLngBounds();
    Object.entries(appState.realTime.markers).forEach(([taxiId, marker]) => {
      const poly = appState.realTime.polylines[taxiId];
      const show = (selectedTaxiId === "0" || taxiId === selectedTaxiId);
      marker.setMap(show ? appState.realTime.map : null);
      poly.setMap(show ? appState.realTime.map : null);
      if (show) bounds.extend(marker.getPosition());
    });
  
    // Ajustar vista
    if (selectedTaxiId === "0") {
      appState.realTime.map.fitBounds(bounds);
    } else {
      const m = appState.realTime.markers[selectedTaxiId];
      if (m) {
        appState.realTime.map.panTo(m.getPosition());
        appState.realTime.map.setZoom(14);
      }
    }
  
    // Rellenar info: uno o todos
    const taxiIds = selectedTaxiId === "0"
      ? Object.keys(appState.realTime.markers)
      : [selectedTaxiId];

      taxiIds.forEach(id => {

        fetchTaxiInfo(id).then(info => {
            const entries = [
              ['Latitud',   info.lat.toFixed(6)],
              ['Longitud',  info.lng.toFixed(6)],
              ['Fecha',     info.date.includes('T') ? info.date.split('T')[0] : info.date],
              ['Hora',      info.time],
              ['RPM',       info.RPM],
              ['Taxi ID',   info.ID_TAXI]
            ];
      
            entries.forEach(([label, value]) => {
              const p = document.createElement('p');
              p.innerHTML = `<strong>${label}:</strong> <span>${value}</span>`;
              infoPanelEl.appendChild(p);
            });
          })
          .catch(err => console.error(`Error al cargar info del taxi ${id}:`, err));
      });
}

async function fetchTaxiInfo(taxiId) {
    try {
      const data = await fetchData('/data');
      if (!Array.isArray(data)) {
        throw new Error('Formato de datos incorrecto');
      }
  
      const taxiData = data.find(item => item.ID_TAXI.toString() === taxiId);
      if (!taxiData) {
        throw new Error(`Taxi ${taxiId} no encontrado`);
      }
  
      // Devuelvo un objeto con los campos normalizados
      return {
        ID_TAXI: taxiData.ID_TAXI,
        lat:      taxiData.LATITUDE,
        lng:      taxiData.LONGITUDE,
        date:     taxiData.DATE,
        time:     taxiData.TIME,
        RPM:      taxiData.RPM || '0'
      };
    } catch (error) {
      console.error('Error obteniendo información del taxi:', error);
      throw error;  // para que el .catch() de quien llame lo capture
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

//Historical
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
    
    // Configurar el spinner de selección de taxi histórico
    domElements.idSpinnerHist.addEventListener('change', function() {
        const selectedTaxiId = this.value;
        domElements.timelineInfo.style.display = 'flex';
        /*if (selectedTaxiId === "0") {
            domElements.timelineInfo.style.display = 'none';
        } else {
            domElements.timelineInfo.style.display = 'flex';
        }*/
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
  const anim = appState.historical.timelineAnimation;
  if (!anim) return;

  // Actualiza internamente la animación (coloca marcadores)
  anim.setProgress(progress);

  // Referencias a los spans
  const timeEl     = document.getElementById('currentTimeInfo');
  const rpmEl      = document.getElementById('rpmHist');
  const distanceEl = document.getElementById('distanceInfo');
  const 

  // Si estamos en “Todos”, mostramos ambos taxis
  if (anim.selectedTaxiId === "0") {
    const taxiIds = Object.keys(anim.taxiData); // p.ej. ["1","2"]
    const linesTaxi = [];

    taxiIds.forEach(taxiId => {
      // Forzamos temporalmente el taxi seleccionado para leer su info
      anim.setSelectedTaxiId(taxiId);
      const info = anim.getCurrentTimeInfo();

      // Formatear fecha y hora
      const dt = new Date(info.timestamp);
      const dateStr = dt.toLocaleDateString();
      const timeStr = dt.toLocaleTimeString();

      linesTaxi.push(`Taxi: ${taxiId}`);
    });

    // Restauramos “Todos”
    anim.setSelectedTaxiId("0");

    // Inyectamos dos líneas separadas por <br>
    timeEl.innerHTML = linesTime.join("<br>");
    rpmEl.innerHTML  = linesRpm.join("<br>");
    distanceEl.style.display = 'none';  // ocultamos distancia
    return;
  }

  // Si es un taxi en concreto, dejamos el comportamiento original:
  const info = anim.getCurrentTimeInfo();
  if (!info) return;

  // Fecha y hora
  const dt = new Date(info.timestamp);
  timeEl.textContent = `${dt.toLocaleDateString()} ${dt.toLocaleTimeString()}`;
  // RPM
  rpmEl.textContent = `RPM: ${info.RPM || '0'}`;

  // Distancia si aplica
  if (domElements.enablePointSelection.checked && appState.historical.pointSelected) {
    const sel = {
      lat: parseFloat(domElements.selectedLat.value),
      lng: parseFloat(domElements.selectedLng.value)
    };
    const d = calculateDistance(sel.lat, sel.lng, info.lat, info.lng);
    distanceEl.textContent   = `Distancia al punto: ${Math.round(d)} m`;
    distanceEl.style.display = 'block';
  } else {
    distanceEl.style.display = 'none';
  }
}

function updateTimelineInfo(progress) {
  const anim = appState.historical.timelineAnimation;
  if (!anim) return;

  // 1) Avanza la animación para posicionar marcadores
  anim.setProgress(progress);

  // 2) References a los spans
  const timeEl     = document.getElementById('currentTimeInfo');
  const taxiEl     = document.getElementById('taxiInfo');      // NUEVO
  const rpmEl      = document.getElementById('rpmHist');
  const distanceEl = document.getElementById('distanceInfo');

  // 3) Modo “Todos”
  if (anim.selectedTaxiId === "0") {
    // Listamos todos los IDs disponibles
    const taxiIds = Object.keys(anim.taxiData); // e.g. ["1","2"]

    // Inyectamos una línea por taxi
    taxiEl.innerHTML = ids.map(id => `Taxi ${id}`).join('<br>');

    taxiIds.forEach(taxiId => {
      // Forzamos temporalmente el taxi seleccionado para leer su info
      anim.setSelectedTaxiId(taxiId);
      const info = anim.getCurrentTimeInfo();

      // Formatear fecha y hora
      const dt = new Date(info.timestamp);
      const dateStr = dt.toLocaleDateString();
      const timeStr = dt.toLocaleTimeString();

      linesTime.push(`Taxi ${taxiId}: ${dateStr} ${timeStr}`);
      linesRpm.push(`Taxi ${taxiId}: ${info.RPM || '0'}`);
    });

    anim.setSelectedTaxiId("0");
    distanceEl.style.display = 'none';
    return;
  }

  // 4) Modo individual: comportamiento original + Taxi ID
  const info = anim.getCurrentTimeInfo();
  if (!info) return;

  // Fecha y hora (tu lógica actual)
  const dt = new Date(info.timestamp);
  timeEl.textContent = `${dt.toLocaleDateString()} ${dt.toLocaleTimeString()}`;

  // Taxi ID
  taxiEl.textContent = `Taxi ${info.ID_TAXI}`;

  // RPM
  rpmEl.textContent = `RPM: ${info.RPM || '0'}`;

  // Distancia si aplica
  if (domElements.enablePointSelection.checked && appState.historical.pointSelected) {
    const sel = {
      lat: parseFloat(domElements.selectedLat.value),
      lng: parseFloat(domElements.selectedLng.value)
    };
    const d = calculateDistance(sel.lat, sel.lng, info.lat, info.lng);
    distanceEl.textContent   = `Distancia al punto: ${Math.round(d)} m`;
    distanceEl.style.display = 'block';
  } else {
    distanceEl.style.display = 'none';
  }
}


/*function updateTimelineInfo(progress) {
    const currentTimeInfo = document.getElementById('currentTimeInfo');
    const distanceInfo = document.getElementById('distanceInfo');
    const rpmHist = document.getElementById('rpmHist');
    const taxiInfo = document.getElementById('taxiInfo');
    
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
        if (pointInfo.lat !=null && pointInfo.lng !=null) {
            appState.historical.map.panTo({
                lat: pointInfo.lat,
                lng: pointInfo.lng
            });
        }
    }
}*/

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
                throw new Error("Haz clic en el mapa para seleccionar un punto");
            }
        }

        showLoading(true);
        domElements.historicalError?.style.setProperty('display','none');

        const timelineControls = document.getElementById('timelineControls');
        if (timelineControls) timelineControls.style.display = 'none';

        // Detener actualizaciones en tiempo real si están activas
        stopRealTimeUpdates();
        appState.historical.timelineAnimation?.clear();

        // Obtener datos históricos
        const url = `${config.basePath}/historical-data?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);

        const { success, data } = await response.json();
        if (!success || !Array.isArray(data) || data.length === 0) {
            throw new Error("No hay datos para el rango seleccionado");
        }

        // Procesar coordenadas
        const allPoints = data
            .map(item => ({
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
        const anim = appState.historical.timelineAnimation;
        anim.setSelectedTaxiId(selectedTaxiId);
        anim.setPoints(relevantPoints, 'route');
        anim.setMode('route');

        if (timelineControls) {
            const slider          = document.getElementById('timelineSlider');
            const pts             = relevantPoints;
            const n               = pts.length;

            // rango 0 … n-1
            slider.min   = 0;
            slider.max   = Math.max(0, n - 1);
            slider.step  = 1;
            slider.value = 0;
            slider.style.backgroundSize = '0% 100%';

            slider.addEventListener('input', function() {
                const idx = Number(this.value);
                const pct = n > 0.1 ? (idx / (n - 1)) * 100 : 0;
                this.style.backgroundSize = `${pct}% 100%`;

                // actualiza la animación y la info
                updateTimelineInfo(pct);
            });

            // disparo inicial para idx=0
            slider.dispatchEvent(new Event('input'));
            timelineControls.style.display = 'block';
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
    domElements.searchRadius.style.display   = '';
    domElements.clearPointBtn.style.display  = '';

    loadHistoricalData();
}

function clearSelectedPoint() {
    // Quitar marcador y círculo
    if (appState.historical.pointMarker) {
        appState.historical.pointMarker.setMap(null);
        appState.historical.pointMarker = null;
    }
    if (appState.historical.pointCircle) {
        appState.historical.pointCircle.setMap(null);
        appState.historical.pointCircle = null;
    }

    // Limpiar campos de lat/lng
    if (domElements.selectedLat)  domElements.selectedLat.value = '';
    if (domElements.selectedLng)  domElements.selectedLng.value = '';

  // Ocultar botón y control de radio
    if (domElements.searchRadius) {
        domElements.searchRadius.style.display = 'none';
    }
    if (domElements.clearPointBtn) {
        domElements.clearPointBtn.style.display = 'none';

    }
    if (domElements.radiusContainer) {
        domElements.radiusContainer.style.display = 'none';
    }

  // Ocultar resultados de búsqueda por punto
    if (domElements.pointSearchResults) {
        domElements.pointSearchResults.style.display = 'none';
    }

  //  Reset estado
    appState.historical.pointSelected = false;
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
}

function initHistoricalTracking() {
    try {
        domElements.searchRadius.style.display   = 'none';
        domElements.clearPointBtn.style.display  = 'none';
        domElements.radiusContainer.style.display = 'none';

        // Configurar fechas por defecto (última hora)
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - (60 * 60 * 1000));
        const maxDateTime = formatDateTimeInput(now);
        
        domElements.startDate.value = formatDateTimeInput(oneHourAgo);
        domElements.endDate.value = formatDateTimeInput(now);
        domElements.startDate.max = maxDateTime;
        domElements.endDate.max = maxDateTime;
        domElements.endDate.min = domElements.startDate.value;

        // Eventos para evitar selecciones inválidas
        domElements.startDate.addEventListener("change", function () {
            if (domElements.startDate.value > domElements.endDate.value) {
                domElements.endDate.value = domElements.startDate.value; // Ajusta automáticamente
            }
            domElements.endDate.min = domElements.startDate.value; // Restringe la fecha mínima de fin
            loadHistoricalData();
        });

        domElements.endDate.addEventListener("change", function () {
            if (domElements.endDate.value < domElements.startDate.value) {
                domElements.startDate.value = domElements.endDate.value; // Ajusta automáticamente
            }
            domElements.startDate.max = domElements.endDate.value; // Restringe la fecha máxima de inicio
            loadHistoricalData();
        });

        domElements.idSpinnerHist.addEventListener('change', function() {
            domElements.timelineInfo.style.display = 'flex';
            loadHistoricalData();
        });

        domElements.loadHistory.style.display = 'none';

        domElements.enablePointSelection.addEventListener('change', () => {
            const isOn = domElements.enablePointSelection.checked;
            domElements.selectedLat.disabled  = !isOn;
            domElements.selectedLng.disabled  = !isOn;
            domElements.searchRadius.disabled = !isOn;
            domElements.clearPointBtn.disabled = !isOn;
            domElements.radiusContainer.style.display = isOn ? 'block' : 'none';
            if (!isOn) clearSelectedPoint();
            loadHistoricalData();
        });

        domElements.clearPointBtn.addEventListener('click', () => {
            clearSelectedPoint();
            loadHistoricalData();
        });
        
        initRadiusChangeHandler();

        loadHistoricalData();

    } catch (error) {
        console.error('Error inicializando Historical Tracking:', error);
        showError(domElements.historicalError, error.message);
    }
}

function initRadiusChangeHandler() {
    domElements.searchRadius.addEventListener('change', function() {
        // Si hay un punto seleccionado, actualizar el radio del círculo
        if (appState.historical.pointSelected && appState.historical.pointCircle) {
            const radius = parseInt(this.value);
            appState.historical.pointCircle.setRadius(radius);
        }
        loadHistoricalData();
    });
}

//Configuraciones para  puntos

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


//Configuraciones auxiliares
function elementExists(elementId) {
    const element = document.getElementById(elementId);
    if (!element) {
        console.warn(`Elemento #${elementId} no encontrado`);
        return false;
    }
    return true;
}

function clearInfoPanel() {
    domElements.latitud.textContent = "N/A";
    domElements.longitud.textContent = "N/A";
    domElements.fecha.textContent = "N/A";
    domElements.tiempo.textContent = "N/A";
    domElements.rpmRealTime.textContent = "0";
    domElements.idTaxiReal.textContent = "N/A";
}

function showError(element, message) {
    element.textContent = message;
    element.style.display = 'block';
    setTimeout(() => element.style.display = 'none', 5000);
}

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