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

        // Manejar cambios en el modo de visualización
        const visualizationModes = document.getElementsByName('visualizationMode');
        visualizationModes.forEach(mode => {
            mode.addEventListener('change', function() {
                const timelineMode = document.getElementById('timelineMode');
                const pointMode = document.getElementById('pointMode');
                const pointSearchResults = document.getElementById('pointSearchResults');

                if (this.value === 'timeline') {
                    timelineMode.style.display = 'block';
                    pointMode.style.display = 'none';
                    pointSearchResults.style.display = 'none';
                    domElements.loadHistory.textContent = "Cargar Trayectoria";
                    domElements.loadHistory.style.backgroundColor = "#5667d8";
                } else {
                    timelineMode.style.display = 'none';
                    pointMode.style.display = 'block';
                    domElements.loadHistory.textContent = "Buscar Registros";
                    domElements.loadHistory.style.backgroundColor = "#b103fc";
                }
            });
        });

        // Configurar evento del botón de cargar historia
        domElements.loadHistory.addEventListener('click', function() {
            const selectedMode = document.querySelector('input[name="visualizationMode"]:checked').value;
            if (selectedMode === 'timeline') {
                loadHistoricalData();
            } else {
                searchPointHistory();
            }
        });

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

async function searchPointHistory() {
    try {
        if (!appState.historical.pointSelected) {
            throw new Error("Debe seleccionar un punto en el mapa primero");
        }

        showLoading(true);
        if (domElements.historicalError) {
            domElements.historicalError.style.display = "none";
        }

        const selectedPoint = {
            lat: parseFloat(domElements.selectedLat.value),
            lng: parseFloat(domElements.selectedLng.value)
        };
        
        const radius = parseInt(domElements.searchRadius.value);
        
        // Obtener datos históricos completos
        const response = await fetch(`${config.basePath}/historical-data`);
        if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);

        const result = await response.json();
        
        if (!result?.success || !Array.isArray(result.data)) {
            throw new Error("Formato de datos incorrecto");
        }
        
        // Encontrar puntos cercanos
        const nearbyPoints = findPointsNearby(selectedPoint, result.data, radius);
        
        // Mostrar resultados en la tabla
        const pointSearchResults = document.getElementById('pointSearchResults');
        if (pointSearchResults) {
            pointSearchResults.style.display = 'block';
        }
        buildResultsTable(nearbyPoints);

    } catch (error) {
        console.error('Error buscando registros por punto:', error);
        if (domElements.historicalError) {
            showError(domElements.historicalError, error.message);
        }
    } finally {
        showLoading(false);
    }
}