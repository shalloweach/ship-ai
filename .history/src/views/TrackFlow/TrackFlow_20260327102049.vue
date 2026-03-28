<!-- src/views/TrackFlow/TrackFlowContainer.vue -->
<!-- 仅替换 <style scoped> 部分内容 -->

<style scoped>
/* ============ 🎨 设计变量 ============ */
:root {
  /* 主题色 - 海事蓝 */
  --color-primary: #1e40af;
  --color-primary-dark: #1e3a8a;
  --color-primary-light: #3b82f6;
  --color-primary-gradient: linear-gradient(135deg, #1e40af, #3b82f6);
  
  /* 辅助色 */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #6366f1;
  
  /* 中性色 */
  --color-bg: #f8fafc;
  --color-bg-card: #ffffff;
  --color-bg-overlay: rgba(255, 255, 255, 0.95);
  --color-border: #e2e8f0;
  --color-border-hover: #cbd5e1;
  --color-text: #1e293b;
  --color-text-secondary: #64748b;
  --color-text-muted: #94a3b8;
  
  /* 阴影 */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  --shadow-glow: 0 0 20px rgba(59, 130, 246, 0.3);
  
  /* 圆角 */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;
  
  /* 过渡 */
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow: 400ms ease;
}

/* ============ 🏗️ 基础布局 ============ */
.track-flow-container {
  display: flex;
  width: 100%;
  height: 100vh;
  box-sizing: border-box;
  background: var(--color-bg);
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
               'Helvetica Neue', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  color: var(--color-text);
}

/* ============ 📋 左侧面板 ============ */
.side-panel {
  width: 400px;
  min-width: 360px;
  max-width: 480px;
  background: var(--color-bg-card);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  z-index: 100;
  box-shadow: var(--shadow-lg);
  transition: width var(--transition-normal);
}

/* 扩展按钮区域 */
.panel-extensions {
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--color-border);
  background: linear-gradient(to bottom, #f8fafc, #f1f5f9);
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.ext-btn {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-text);
  transition: all var(--transition-fast);
  text-align: left;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  position: relative;
  overflow: hidden;
}

.ext-btn::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: 3px;
  background: transparent;
  transition: background var(--transition-fast);
}

.ext-btn:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: var(--color-primary-light);
  transform: translateX(4px);
  box-shadow: var(--shadow-md);
}

.ext-btn:hover:not(:disabled)::before {
  background: var(--color-primary);
}

.ext-btn:active:not(:disabled) {
  transform: translateX(2px);
  transition-duration: 50ms;
}

.ext-btn.primary {
  background: var(--color-primary-gradient);
  color: #fff;
  border-color: transparent;
  font-weight: 600;
  box-shadow: var(--shadow-md);
}

.ext-btn.primary::before {
  background: rgba(255, 255, 255, 0.3);
}

.ext-btn.primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #1e3a8a, #2563eb);
  transform: translateX(4px);
  box-shadow: var(--shadow-lg), var(--shadow-glow);
}

.ext-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  background: #f8fafc;
}

.ext-btn:disabled::before {
  display: none;
}

/* ============ 🗺️ 右侧地图区域 ============ */
.map-wrapper {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #e2e8f0, #cbd5e1);
}

.map-container {
  width: 100%;
  height: 100%;
  min-height: 400px;
  background: #e5e7eb;
}

/* ============ ⏳ 加载遮罩 ============ */
.loading-mask {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--color-bg-overlay);
  padding: 1.25rem 2rem;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  display: flex;
  align-items: center;
  gap: 1rem;
  z-index: 1000;
  font-size: 0.95rem;
  color: var(--color-text);
  border: 1px solid var(--color-border);
  animation: fadeIn var(--transition-normal);
  backdrop-filter: blur(8px);
}

@keyframes fadeIn {
  from { opacity: 0; transform: translate(-50%, -45%); }
  to { opacity: 1; transform: translate(-50%, -50%); }
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  flex-shrink: 0;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ============ ⚠️ 错误提示 ============ */
.error-toast {
  position: absolute;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #fef2f2, #fee2e2);
  color: #991b1b;
  padding: 0.75rem 1.5rem;
  border-radius: var(--radius-md);
  border-left: 4px solid var(--color-error);
  box-shadow: var(--shadow-lg);
  z-index: 1001;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  animation: slideDown var(--transition-normal);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

@keyframes slideDown {
  from { 
    opacity: 0; 
    transform: translateX(-50%) translateY(-20px); 
  }
  to { 
    opacity: 1; 
    transform: translateX(-50%) translateY(0); 
  }
}

.error-toast:hover {
  opacity: 0.95;
  transform: translateX(-50%) translateY(-2px);
  box-shadow: var(--shadow-xl);
}

.close-hint {
  font-size: 0.8rem;
  color: var(--color-text-muted);
  margin-left: 0.25rem;
  font-weight: normal;
}

/* ============ 📊 数据信息 ============ */
.data-info {
  position: absolute;
  bottom: 1.25rem;
  right: 1.25rem;
  background: var(--color-bg-overlay);
  padding: 0.7rem 1.25rem;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  font-size: 0.85rem;
  color: var(--color-text);
  z-index: 1000;
  border: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  backdrop-filter: blur(8px);
  animation: slideUp var(--transition-normal);
}

@keyframes slideUp {
  from { 
    opacity: 0; 
    transform: translateY(20px); 
  }
  to { 
    opacity: 1; 
    transform: translateY(0); 
  }
}

.data-info span {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.data-info b {
  color: var(--color-primary);
  font-weight: 600;
}

/* ============ 🚢 MMSI 标签 ============ */
.mmsi-tag {
  position: absolute;
  top: 1.25rem;
  right: 1.25rem;
  background: var(--color-bg-overlay);
  padding: 0.6rem 1.1rem;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-md);
  font-size: 0.85rem;
  color: var(--color-text);
  z-index: 1000;
  border: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  gap: 0.4rem;
  backdrop-filter: blur(8px);
  animation: fadeIn var(--transition-normal);
}

.mmsi-tag strong {
  color: var(--color-primary);
  font-family: 'SF Mono', 'Consolas', monospace;
  font-weight: 600;
  letter-spacing: 0.5px;
}

/* ============ 🗺️ Leaflet 弹窗优化 ============ */
:deep(.leaflet-popup-content) {
  margin: 12px 16px;
  line-height: 1.6;
  font-size: 13px;
}

:deep(.leaflet-popup-tip) {
  background: var(--color-bg-card);
  box-shadow: var(--shadow-md);
}

:deep(.leaflet-popup-content-wrapper) {
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  border: 1px solid var(--color-border);
  overflow: hidden;
}

:deep(.leaflet-popup-close-button) {
  color: var(--color-text-secondary);
  font-size: 20px;
  padding: 4px 8px;
  transition: color var(--transition-fast);
}

:deep(.leaflet-popup-close-button:hover) {
  color: var(--color-error);
}

/* ============ 📱 响应式优化 ============ */
@media (max-width: 1200px) {
  .side-panel {
    width: 360px;
    min-width: 320px;
  }
}

@media (max-width: 768px) {
  .track-flow-container {
    flex-direction: column;
  }
  
  .side-panel {
    width: 100%;
    min-width: 100%;
    max-width: 100%;
    height: 48vh;
    min-height: 320px;
    border-right: none;
    border-bottom: 1px solid var(--color-border);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }
  
  .map-wrapper {
    height: 52vh;
    min-height: 280px;
  }
  
  .panel-extensions {
    flex-direction: row;
    flex-wrap: wrap;
    padding: 0.75rem;
  }
  
  .ext-btn {
    flex: 1 1 calc(50% - 0.5rem);
    min-width: 140px;
    padding: 0.6rem 0.8rem;
    font-size: 0.85rem;
    justify-content: center;
    text-align: center;
  }
  
  .ext-btn:hover:not(:disabled) {
    transform: translateY(-2px);
  }
  
  .data-info,
  .mmsi-tag {
    font-size: 0.8rem;
    padding: 0.5rem 1rem;
  }
}

@media (max-width: 480px) {
  .ext-btn {
    flex: 1 1 100%;
  }
  
  .loading-mask {
    padding: 1rem 1.5rem;
    font-size: 0.9rem;
  }
  
  .error-toast {
    width: calc(100% - 2rem);
    font-size: 0.85rem;
    padding: 0.65rem 1.25rem;
  }
}

/* ============ 🎨 暗色模式支持（可选） ============ */
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #0f172a;
    --color-bg-card: #1e293b;
    --color-bg-overlay: rgba(30, 41, 59, 0.95);
    --color-border: #334155;
    --color-border-hover: #475569;
    --color-text: #f1f5f9;
    --color-text-secondary: #94a3b8;
    --color-text-muted: #64748b;
  }
  
  .side-panel {
    background: var(--color-bg-card);
    border-right-color: var(--color-border);
  }
  
  .panel-extensions {
    background: linear-gradient(to bottom, #1e293b, #0f172a);
    border-top-color: var(--color-border);
  }
  
  .ext-btn {
    background: var(--color-bg-card);
    border-color: var(--color-border);
    color: var(--color-text);
  }
  
  .ext-btn:hover:not(:disabled) {
    background: #334155;
  }
  
  .loading-mask,
  .data-info,
  .mmsi-tag {
    background: var(--color-bg-overlay);
    border-color: var(--color-border);
    color: var(--color-text);
  }
  
  .error-toast {
    background: linear-gradient(135deg, #451a1a, #7f1d1d);
    color: #fecaca;
  }
}

/* ============ ✨ 微交互增强 ============ */
/* 按钮点击涟漪效果（可选） */
.ext-btn {
  position: relative;
  overflow: hidden;
}

.ext-btn::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: width 0.3s ease, height 0.3s ease;
  pointer-events: none;
}

.ext-btn:active::after {
  width: 300px;
  height: 300px;
  transition: 0s;
}

/* 平滑滚动 */
.side-panel,
.map-wrapper {
  scroll-behavior: smooth;
}

/* 焦点可见性 */
.ext-btn:focus-visible {
  outline: 2px solid var(--color-primary-light);
  outline-offset: 2px;
}
</style>