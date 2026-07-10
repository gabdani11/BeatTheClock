import React, { useState, useEffect, useRef, useCallback } from 'react';

interface TraceRow {
  id: string;
  values: Record<string, string>;
}

interface WhiteboardProps {
  darkMode: boolean;
  onClose: () => void;
}

export default function Whiteboard({ darkMode, onClose }: WhiteboardProps) {
  const [activeTab, setActiveTab] = useState<'draw' | 'trace'>('draw');

  // Drawing States
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [brushSize, setBrushSize] = useState(4);
  
  // Custom colors matching the application theme
  const colors = [
    { name: 'default', value: 'default' },
    { name: 'green', value: '#10b981' },
    { name: 'orange', value: '#f59e0b' },
    { name: 'red', value: '#ef4444' },
    { name: 'custom', value: '#6366f1' }
  ];
  const [color, setColor] = useState('default');
  const [undoHistory, setUndoHistory] = useState<ImageData[]>([]);

  const getDrawingColor = useCallback(() => {
    if (color === 'default') {
      return darkMode ? '#f4f4f5' : '#09090b';
    }
    return color;
  }, [color, darkMode]);

  // Trace Table States
  const [headers, setHeaders] = useState<string[]>(['i', 'nums[i]', 'left', 'right', 'target', 'result']);
  const [rows, setRows] = useState<TraceRow[]>([
    { id: '1', values: { i: '0', 'nums[i]': '2', left: '0', right: '4', target: '9', result: 'Search' } },
    { id: '2', values: { i: '1', 'nums[i]': '7', left: '1', right: '4', target: '9', result: 'Found (Sum=9)' } }
  ]);
  const [newColName, setNewColName] = useState('');

  // Dynamically set canvas size to match its wrapper
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    // Save existing content before resize
    const ctx = canvas.getContext('2d');
    let tempImage: ImageData | null = null;
    if (ctx && canvas.width > 0 && canvas.height > 0) {
      try {
        tempImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
      } catch (e) {
        console.warn('Could not save canvas content during resize', e);
      }
    }

    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight || 450;

    // Restore content and set standard drawing defaults
    if (ctx) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (tempImage) {
        ctx.putImageData(tempImage, 0, 0);
      }
    }
  }, []);

  // Set up canvas sizing
  useEffect(() => {
    if (activeTab === 'draw') {
      // Small timeout to allow container element to render completely
      const timer = setTimeout(() => {
        resizeCanvas();
      }, 50);

      window.addEventListener('resize', resizeCanvas);
      return () => {
        window.removeEventListener('resize', resizeCanvas);
        clearTimeout(timer);
      };
    }
  }, [activeTab, resizeCanvas]);

  // Capture canvas state for undo
  const saveState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const state = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setUndoHistory(prev => [...prev.slice(-19), state]); // Cap history at 20 steps
  }, []);

  // Draw handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    saveState();

    isDrawingRef.current = true;

    // Get coordinates
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
      // Prevent scrolling when drawing on touch screens
      e.preventDefault();
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    lastXRef.current = x;
    lastYRef.current = y;

    // Draw single point/dot on click
    ctx.beginPath();
    ctx.arc(x, y, (tool === 'eraser' ? brushSize * 2 : brushSize) / 2, 0, Math.PI * 2);
    ctx.fillStyle = tool === 'eraser' 
      ? (darkMode ? '#222225' : '#ffffff') 
      : getDrawingColor();
    ctx.fill();
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      if (e.touches.length === 0) return;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(lastXRef.current, lastYRef.current);
    ctx.lineTo(x, y);

    // Apply color and sizes
    if (tool === 'eraser') {
      ctx.strokeStyle = darkMode ? '#222225' : '#ffffff';
      ctx.lineWidth = brushSize * 2.5; // Bigger radius for erasing
    } else {
      ctx.strokeStyle = getDrawingColor();
      ctx.lineWidth = brushSize;
    }

    ctx.stroke();

    lastXRef.current = x;
    lastYRef.current = y;
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    saveState();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const undo = () => {
    if (undoHistory.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const previousState = undoHistory[undoHistory.length - 1];
    setUndoHistory(prev => prev.slice(0, -1));
    ctx.putImageData(previousState, 0, 0);
  };

  // Trace Table handlers
  const handleCellChange = (rowId: string, colHeader: string, value: string) => {
    setRows(prev =>
      prev.map(row => (row.id === rowId ? { ...row, values: { ...row.values, [colHeader]: value } } : row))
    );
  };

  const addRow = () => {
    const newId = Math.random().toString(36).substring(2, 9);
    const newValues: Record<string, string> = {};
    headers.forEach(h => {
      newValues[h] = '';
    });
    setRows(prev => [...prev, { id: newId, values: newValues }]);
  };

  const deleteRow = (rowId: string) => {
    setRows(prev => prev.filter(r => r.id !== rowId));
  };

  const addColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;
    const formattedHeader = newColName.trim();
    if (headers.includes(formattedHeader)) {
      setNewColName('');
      return;
    }
    setHeaders(prev => [...prev, formattedHeader]);
    setRows(prev =>
      prev.map(row => ({
        ...row,
        values: { ...row.values, [formattedHeader]: '' }
      }))
    );
    setNewColName('');
  };

  const removeColumn = (header: string) => {
    setHeaders(prev => prev.filter(h => h !== header));
    setRows(prev =>
      prev.map(row => {
        const copy = { ...row.values };
        delete copy[header];
        return { ...row, values: copy };
      })
    );
  };

  return (
    <div className="whiteboard-panel">
      {/* Panel Top Header Bar */}
      <div className="wb-header">
        <div className="wb-tabs">
          <button 
            className={`wb-tab-btn ${activeTab === 'draw' ? 'active' : ''}`}
            onClick={() => setActiveTab('draw')}
          >
            🎨 Sketchpad Canvas
          </button>
          <button 
            className={`wb-tab-btn ${activeTab === 'trace' ? 'active' : ''}`}
            onClick={() => setActiveTab('trace')}
          >
            📊 Dry-Run Trace Table
          </button>
        </div>
        
        <button className="wb-close-btn" onClick={onClose} title="Close Planning Panel">
          ✖
        </button>
      </div>

      {/* Main Panel Content Area */}
      <div className="wb-content">
        {/* TABS 1: DRAWING BOARD */}
        {activeTab === 'draw' && (
          <div className="wb-drawing-container">
            {/* Draw Toolbar */}
            <div className="wb-toolbar">
              <div className="wb-tool-group">
                <button 
                  className={`wb-tool-btn ${tool === 'pen' ? 'active' : ''}`}
                  onClick={() => setTool('pen')}
                  title="Pen Tool"
                >
                  ✏️ Pen
                </button>
                <button 
                  className={`wb-tool-btn ${tool === 'eraser' ? 'active' : ''}`}
                  onClick={() => setTool('eraser')}
                  title="Eraser Tool"
                >
                  🧹 Eraser
                </button>
              </div>

              {/* Color Circles */}
              {tool === 'pen' && (
                <div className="wb-colors-list">
                  {colors.map(c => (
                    <button 
                      key={c.name}
                      className={`wb-color-circle ${color === c.value ? 'selected' : ''}`}
                      style={{ 
                        backgroundColor: c.name === 'default' 
                          ? (darkMode ? '#ffffff' : '#09090b') 
                          : c.value 
                      }}
                      onClick={() => setColor(c.value)}
                      title={`Select ${c.name} color`}
                    />
                  ))}
                </div>
              )}

              {/* Slider for thickness */}
              <div className="wb-slider-group">
                <span className="wb-slider-label">Size</span>
                <input 
                  type="range"
                  min="2"
                  max="20"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="wb-size-slider"
                />
                <span className="wb-size-val">{brushSize}px</span>
              </div>

              <div className="wb-action-group">
                <button 
                  className="wb-action-btn"
                  onClick={undo}
                  disabled={undoHistory.length === 0}
                  title="Undo last stroke"
                >
                  ↩️ Undo
                </button>
                <button 
                  className="wb-action-btn btn-clear"
                  onClick={clearCanvas}
                  title="Clear drawing board"
                >
                  🗑️ Clear
                </button>
              </div>
            </div>

            {/* Canvas Wrapper */}
            <div className="wb-canvas-wrapper grid-notebook-pattern">
              <canvas 
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
            </div>
          </div>
        )}

        {/* TABS 2: TRACE TABLE */}
        {activeTab === 'trace' && (
          <div className="wb-trace-container">
            {/* Add Column Input Form */}
            <form onSubmit={addColumn} className="wb-col-form">
              <input 
                type="text"
                placeholder="New variable (e.g. sum, count)"
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                className="wb-col-input"
              />
              <button type="submit" className="wb-col-submit-btn">
                ➕ Add Column
              </button>
            </form>

            {/* Column badges with Delete option */}
            <div className="wb-columns-badges">
              <span className="wb-badge-label">Active Variables:</span>
              <div className="wb-badges-list">
                {headers.map(h => (
                  <span key={h} className="wb-var-badge">
                    {h}
                    <button 
                      type="button" 
                      onClick={() => removeColumn(h)} 
                      className="wb-badge-del"
                      title={`Remove variable ${h}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Table Container */}
            <div className="wb-table-wrapper">
              <table className="wb-trace-table">
                <thead>
                  <tr>
                    {headers.map(h => (
                      <th key={h}>{h}</th>
                    ))}
                    <th style={{ width: '50px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={headers.length + 1} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px' }}>
                        No rows added. Click "+ Add Dry-Run Step" below to trace.
                      </td>
                    </tr>
                  ) : (
                    rows.map(row => (
                      <tr key={row.id}>
                        {headers.map(h => (
                          <td key={h}>
                            <input 
                              type="text"
                              value={row.values[h] || ''}
                              onChange={(e) => handleCellChange(row.id, h, e.target.value)}
                              className="wb-cell-input"
                              placeholder="-"
                            />
                          </td>
                        ))}
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            className="wb-row-del-btn"
                            onClick={() => deleteRow(row.id)}
                            title="Delete trace step"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Buttons */}
            <div className="wb-trace-footer">
              <button className="wb-add-row-btn" onClick={addRow}>
                ➕ Add Dry-Run Step (New Row)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
