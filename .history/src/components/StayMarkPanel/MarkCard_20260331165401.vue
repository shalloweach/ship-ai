

<style scoped>
.marker-card {
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 14px;
  background: #fff;
  max-height: 600px;
  display: flex;
  flex-direction: column;
}

.marker-card legend {
  font-weight: 600;
  color: #333;
  padding: 0 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.badge {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: bold;
}

.mark-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
}

.btn-mark {
  flex: 1;
  padding: 10px 14px;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.btn-mark.primary {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

.btn-mark:not(.primary) {
  background: #f1f5f9;
  color: #334155;
}

.btn-mark:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-mark:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.empty-hint {
  text-align: center;
  color: #64748b;
  font-size: 13px;
  padding: 30px 20px;
  background: #f8fafc;
  border-radius: 8px;
  line-height: 1.5;
}

.marks-table-wrapper {
  flex: 1;
  overflow: auto;
  margin: 0 -14px;
  padding: 0 14px;
}

.marks-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.marks-table th {
  background: #f1f5f9;
  padding: 10px 8px;
  text-align: left;
  font-weight: 600;
  color: #475569;
  border-bottom: 2px solid #e2e8f0;
  position: sticky;
  top: 0;
  z-index: 1;
  cursor: pointer;
  user-select: none;
}

.marks-table th.sortable:hover {
  background: #e2e8f0;
}

.marks-table td {
  padding: 10px 8px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}

.mark-row:hover {
  background: #f8fafc;
}

.mark-row.highlighted {
  background: #f0f7ff;
  border-left: 3px solid #667eea;
}

.link-btn {
  background: none;
  border: none;
  color: #667eea;
  font-size: 12px;
  cursor: pointer;
  padding: 0;
  text-decoration: none;
}

.link-btn:hover {
  text-decoration: underline;
}

.inline-select, .inline-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 12px;
  background: white;
  transition: border-color 0.2s;
}

.inline-select:focus, .inline-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.actions {
  display: flex;
  gap: 4px;
  justify-content: flex-end;
}

.btn-icon {
  background: none;
  border: none;
  font-size: 14px;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: background 0.2s;
  opacity: 0.7;
}

.btn-icon:hover {
  opacity: 1;
  background: #f1f5f9;
}

.btn-icon.delete:hover {
  background: #fee2e2;
  color: #dc2626;
}

/* 🔧 备注编辑弹窗 */
.note-dialog-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.note-dialog {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
  overflow: hidden;
}

.note-dialog-header {
  padding: 14px 18px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: #334155;
}

.close-btn {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #64748b;
  padding: 0 4px;
}

.note-textarea {
  width: 100%;
  min-height: 100px;
  padding: 14px 18px;
  border: none;
  font-size: 14px;
  resize: vertical;
  box-sizing: border-box;
  font-family: inherit;
}

.note-textarea:focus {
  outline: none;
}

.note-dialog-footer {
  padding: 12px 18px;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
}

.char-count {
  font-size: 11px;
  color: #94a3b8;
}

.btn.primary {
  padding: 8px 20px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
}

.btn.primary:hover {
  box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);
}
</style>