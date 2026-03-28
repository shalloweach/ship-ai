// src/views/TrackFlow/utils/config.js

export const API_CONFIG = {
    baseUrl: 'http://localhost:8877/api/ship',
    timeout: 30000,
    endpoints: {
      byTime: '/byTime',
      byIndex: '/byIndex'
      marks:
    }
  }
  
  export const MAP_CONFIG = {
    defaultCenter: [22.52, 113.83],
    defaultZoom: 10,
    maxZoom: 19,
    fitBoundsPadding: [50, 50],
    maxMarkers: 200,
    polylineStyle: {
      color: '#007bff',
      weight: 3,
      opacity: 0.8,
      lineJoin: 'round',
      lineCap: 'round'
    },
    markerStyle: {
      radius: 5,
      color: '#007bff',
      fillColor: '#007bff',
      fillOpacity: 0.7,
      weight: 1
    }
  }
  
  export const QUERY_CONFIG = {
    defaultIndexRange: { start: 0, end: 1000 },
    defaultGlobalIndex: { min: 0, max: 10000 }
  }
  
  export const STORAGE_KEYS = {
    currentMmsi: 'currentMmsi'
  }