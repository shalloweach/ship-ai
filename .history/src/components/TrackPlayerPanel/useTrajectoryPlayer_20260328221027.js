// 样式配置
const STYLES = {
    trajectory: {
      color: '#3b82f6',
      weight: 3,
      opacity: 0.8
    },
    trajectoryPlaying: {
      color: '#10b981',
      weight: 4,
      opacity: 1
    },
    shipIcon: {
      iconUrl: 'data:image/svg+xml,' + encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#1e40af">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      `),
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    },
    stayMarker: {
      berth: { color: '#10b981', fillOpacity: 0.2, icon: '🏭' },
      anchor: { color: '#3b82f6', fillOpacity: 0.2, icon: '⚓' },
      abnormal: { color: '#ef4444', fillOpacity: 0.3, icon: '⚠️' },
      other: { color: '#6b7280', fillOpacity: 0.15, icon: '📦' }
    }
  }