import React, { useState, useEffect, useRef, useCallback } from 'react';

// Global debug context
export const DebugContext = React.createContext();

// Debug provider component
export function DebugProvider({ children }) {
  const [logs, setLogs] = useState([]);
  const [isVisible, setIsVisible] = useState(false);

  const addLog = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-99), { timestamp, message, type }]); // Keep last 100 logs
  }, []);

  // Keyboard shortcut to toggle panel (Ctrl+Shift+D)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setIsVisible(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <DebugContext.Provider value={{ addLog }}>
      {children}
      {isVisible && <DebugPanel logs={logs} onClose={() => setIsVisible(false)} />}
    </DebugContext.Provider>
  );
}

// Debug panel component
function DebugPanel({ logs, onClose }) {
  const panelRef = useRef(null);
  const [position, setPosition] = useState({ x: window.innerWidth - 400, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const copyLogs = () => {
    const logText = (logs || []).map(log => `[${log.timestamp}] ${log.message}`).join('\n');
    navigator.clipboard.writeText(logText).then(() => {
      alert('Logs copied to clipboard!');
    }).catch(err => {
      // Fallback: select all text
      const range = document.createRange();
      const selection = window.getSelection();
      const logContainer = panelRef.current.querySelector('div[style*="overflowY"]');
      if (logContainer) {
        range.selectNodeContents(logContainer);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    });
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        top: position.y,
        left: position.x,
        width: '500px',
        height: '400px',
        background: '#1e1e1e',
        color: '#fff',
        border: '1px solid #333',
        borderRadius: '8px',
        zIndex: 9999,
        fontFamily: 'monospace',
        fontSize: '12px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
        userSelect: 'text',
      }}
    >
      <div
        style={{
          padding: '8px',
          background: '#333',
          borderRadius: '8px 8px 0 0',
          cursor: 'move',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
        onMouseDown={handleMouseDown}
      >
        <span>Debug Panel (Ctrl+Shift+D to toggle)</span>
        <div>
          <button
            onClick={copyLogs}
            style={{
              background: '#555',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '12px',
              marginRight: '8px',
              padding: '4px 8px',
              borderRadius: '4px',
            }}
          >
            Copy Logs
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '16px',
            }}
          >
            ×
          </button>
        </div>
      </div>
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '8px',
          background: '#000',
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
        }}
      >
        {(logs || []).map((log, index) => (
          <div key={index} style={{ marginBottom: '4px', color: getColor(log.type) }}>
            <span style={{ color: '#888' }}>[{log.timestamp}]</span> {log.message}
          </div>
        ))}
      </div>
    </div>
  );
}

function getColor(type) {
  switch (type) {
    case 'error': return '#ff6b6b';
    case 'warn': return '#ffd93d';
    case 'success': return '#6bcf7f';
    default: return '#fff';
  }
}

// Hook to use debug logging
export function useDebug() {
  const { addLog } = React.useContext(DebugContext);
  return addLog;
}

// Export DebugPanel as default for direct usage
export default DebugPanel;