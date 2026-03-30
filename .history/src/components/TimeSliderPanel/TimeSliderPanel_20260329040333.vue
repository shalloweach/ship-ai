




















































<style scoped>
/* 样式保持不变，仅添加 totalCount 徽章样式 */
.total-badge {
  display: inline-block;
  margin-left: 0.5rem;
  padding: 0.15rem 0.4rem;
  background: var(--color-primary-light);
  color: #fff;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

/* 其余样式同原文件... */
.time-slider-panel {
  background: var(--color-bg-panel);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.panel-content {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.mode-switch {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: var(--color-bg-subtle);
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.sync-indicator {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-weight: 500;
  color: var(--color-primary);
}

.range-hint {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.param-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.param-card {
  position: relative;
  padding: 0.75rem;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.param-label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.time-display {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.time-sub {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.step-group {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.8rem;
}

.step-label {
  color: var(--color-text-secondary);
}

.step-select {
  flex: 1;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 4px;
  background: var(--color-bg-input);
  font-size: 0.8rem;
  cursor: pointer;
}

.step-buttons {
  display: flex;
  gap: 0.3rem;
}

.step-btn {
  flex: 1;
  padding: 0.3rem 0.5rem;
  background: var(--color-bg-button);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: var(--transition-fast);
}

.step-btn:hover:not(:disabled) {
  background: var(--color-primary-light);
  border-color: var(--color-primary);
  color: #fff;
}

.step-btn.pos {
  background: var(--color-success-light);
  border-color: var(--color-success);
  color: var(--color-success-dark);
}

.step-btn.pos:hover:not(:disabled) {
  background: var(--color-success);
  color: #fff;
}

.index-param .index-display {
  font-family: var(--font-mono);
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--color-primary);
  padding: 0.25rem 0.5rem;
  background: var(--color-bg-subtle);
  border-radius: 4px;
  text-align: center;
}

.index-param .index-display.clickable {
  cursor: pointer;
  border: 1px dashed var(--color-border);
}

.index-param .index-display.clickable:hover {
  border-style: solid;
  background: var(--color-bg-hover);
}

.index-input {
  width: 100%;
  padding: 0.25rem 0.5rem;
  border: 2px solid var(--color-primary);
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 1.1rem;
  font-weight: 600;
  text-align: center;
  background: var(--color-bg-input);
}

.index-sub {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  text-align: center;
}

.range-summary {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  background: var(--color-bg-subtle);
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.range-summary b {
  color: var(--color-text-primary);
  font-weight: 600;
}

.panel-actions {
  display: flex;
  gap: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-border);
}

.btn {
  flex: 1;
  padding: 0.6rem 1rem;
  background: var(--color-bg-button);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-primary);
  font-weight: 500;
  cursor: pointer;
  transition: var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
}

.btn:hover:not(:disabled) {
  background: var(--color-bg-hover);
  border-color: var(--color-primary);
}

.btn.primary {
  background: var(--color-primary);
  border-color: var(--color-primary-dark);
  color: #fff;
}

.btn.primary:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 响应式 */
@media (max-width: 768px) {
  .param-grid {
    grid-template-columns: 1fr;
  }
  
  .panel-actions {
    flex-direction: column;
  }
}
</style>

<style scoped>
/* ============ 🎨 设计变量 ============ */
:root {
  --color-primary: #1e40af;
  --color-primary-dark: #1e3a8a;
  --color-primary-light: #3b82f6;
  --color-primary-gradient: linear-gradient(135deg, #1e40af, #3b82f6);
  --color-success: #10b981;
  --color-bg: #f8fafc;
  --color-bg-card: #ffffff;
  --color-border: #e2e8f0;
  --color-border-hover: #cbd5e1;
  --color-text: #1e293b;
  --color-text-secondary: #64748b;
  --color-text-muted: #94a3b8;
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --transition-fast: 150ms ease;
}

/* ============ 🏗️ 面板容器 ============ */
.time-slider-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg-card);
  overflow: hidden;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  background: var(--color-bg);
}

/* 滚动条优化 */
.panel-content::-webkit-scrollbar { width: 6px; }
.panel-content::-webkit-scrollbar-track { background: transparent; }
.panel-content::-webkit-scrollbar-thumb {
  background: var(--color-border-hover);
  border-radius: 3px;
}
.panel-content::-webkit-scrollbar-thumb:hover {
  background: var(--color-primary-light);
}

/* ============ 🔗 模式切换 ============ */
.mode-switch {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.875rem 1.25rem;
  background: var(--color-bg-card);
  border-bottom: 1px solid var(--color-border);
  font-size: 0.85rem;
  position: sticky;
  top: 0;
  z-index: 10;
}

.sync-indicator {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--color-text);
  font-weight: 500;
}

.sync-indicator::before {
  content: '';
  display: inline-block;
  width: 8px;
  height: 8px;
  background: var(--color-success);
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.range-hint {
  color: var(--color-text-muted);
  font-family: 'SF Mono', 'Consolas', monospace;
  font-size: 0.8rem;
}

/* ============ 🎴 四参数网格 ============ */
.param-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.875rem;
  padding: 1rem 1.25rem;
}

.param-card {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 0.875rem;
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-fast);
}

.param-card:hover {
  border-color: var(--color-primary-light);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.param-label {
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

/* 时间显示 */
.time-display {
  font-family: 'SF Mono', 'Consolas', monospace;
  font-size: 1rem;
  color: var(--color-primary);
  font-weight: 600;
  margin-bottom: 0.15rem;
}

.time-sub {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-bottom: 0.6rem;
}

/* ✅ 索引显示 + 输入框 */
.index-display {
  font-family: 'SF Mono', 'Consolas', monospace;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-success);
  margin-bottom: 0.15rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: background 0.2s;
}

.index-display.clickable {
  cursor: pointer;
}

.index-display.clickable:hover {
  background: #f1f5f9;
}

.index-input {
  width: 100%;
  padding: 0.4rem 0.6rem;
  border: 2px solid var(--color-primary-light);
  border-radius: 6px;
  font-family: 'SF Mono', 'Consolas', monospace;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-success);
  background: #fff;
  margin-bottom: 0.15rem;
  outline: none;
}

.index-input:focus {
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}

.index-sub {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-bottom: 0.6rem;
}

/* 步长选择 */
.step-group {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-bottom: 0.6rem;
}

.step-label {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.step-select {
  flex: 1;
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  background: var(--color-bg-card);
  color: var(--color-text);
  cursor: pointer;
  min-width: 65px;
}

.step-select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

/* 步进按钮 */
.step-buttons {
  display: flex;
  gap: 0.4rem;
}

.step-btn {
  flex: 1;
  padding: 0.45rem 0.5rem;
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  border-radius: var(--radius-sm);
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text);
  transition: all 0.2s;
  text-align: center;
}

.step-btn:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: var(--color-border-hover);
  transform: translateY(-1px);
}

.step-btn.pos {
  border-color: var(--color-success);
  color: var(--color-success);
  background: rgba(16, 185, 129, 0.05);
}

.step-btn.pos:hover {
  background: rgba(16, 185, 129, 0.15);
  border-color: #059669;
}

/* ============ 📊 范围摘要 ============ */
.range-summary {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 1.25rem;
  background: linear-gradient(to right, #f8fafc, #f1f5f9);
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  font-size: 0.85rem;
  color: var(--color-text);
  font-weight: 500;
}

.range-summary b {
  color: var(--color-primary);
  font-weight: 700;
}

/* ============ 🔘 操作按钮 ============ */
.panel-actions {
  display: flex;
  gap: 0.6rem;
  padding: 1rem 1.25rem;
  background: var(--color-bg-card);
  border-top: 1px solid var(--color-border);
}

.btn {
  flex: 1;
  padding: 0.7rem;
  border: 1px solid var(--color-border);
  background: var(--color-bg-card);
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}

.btn:hover:not(:disabled) {
  background: #f1f5f9;
  border-color: var(--color-primary-light);
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.btn.primary {
  background: var(--color-primary-gradient);
  color: #fff;
  border-color: transparent;
}

.btn.primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #1e3a8a, #2563eb);
  box-shadow: var(--shadow-lg), 0 0 20px rgba(59, 130, 246, 0.3);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* ============ 🔍 调试信息 ============ */
.params-debug {
  margin: 0 1.25rem;
  padding: 0.5rem 0;
  font-size: 0.75rem;
}

.params-preview {
  background: #f1f5f9;
  padding: 0.5rem;
  border-radius: 4px;
  overflow-x: auto;
  margin: 0.5rem 0;
}

.params-preview code {
  font-family: 'SF Mono', 'Consolas', monospace;
  color: var(--color-primary);
}

/* ============ 📱 响应式 ============ */
@media (max-width: 480px) {
  .param-grid {
    grid-template-columns: 1fr;
  }
  
  .panel-actions {
    flex-direction: column;
  }
  
  .btn {
    width: 100%;
  }
  
  .mode-switch {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}

/* ============ ✨ 微交互 ============ */
.param-card {
  isolation: isolate;
}

.param-card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1px;
  background: linear-gradient(135deg, transparent, var(--color-primary-light), transparent);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  opacity: 0;
  transition: opacity var(--transition-fast);
  pointer-events: none;
}

.param-card:hover::after {
  opacity: 1;
}

.btn:focus-visible,
.step-btn:focus-visible,
.step-select:focus-visible,
.index-input:focus {
  outline: 2px solid var(--color-primary-light);
  outline-offset: 2px;
}
</style>