export const appState = {
    realTime: {
      map: null,
      markers: {},
      polylines: {},
      seguirCentrando: false,
      recorridos: {},
      currentTaxiId: "0",
      intervalId: null,
      mapsLoaded: false
    },
    historical: {
      map: null,
      recorrido: [],
      polyline: null,
      mapsLoaded: false,
      pointMarker: null,
      pointCircle: null,
      pointSelected: false,
      timelineAnimation: null
    }
  };  