import React, { useState, useRef, useEffect, MouseEvent } from 'react';
import './App.css';
import * as pdfjsLib from 'pdfjs-dist';

// Pin to the exact installed version to avoid CDN mismatch
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

type BBox = [number, number, number, number];

type Field = {
  id: number;
  field: string;
  value: string;
  page: number;
  bbox: BBox;
};

type ChangeLogEntry = {
  field: string;
  oldValue: string;
  newValue: string;
  timestamp: string;
};

const mockFields: Field[] = [
  { id: 1, field: 'invoicenumber', value: 'INV-2041', page: 1, bbox: [120, 80, 260, 100] },
  { id: 2, field: 'date', value: '2026-09-14', page: 1, bbox: [400, 80, 520, 100] },
  { id: 3, field: 'totalamount', value: '48,250.00', page: 1, bbox: [400, 620, 520, 645] },
];

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string>('');
  const [isPdf, setIsPdf] = useState(false);
  const [fields, setFields] = useState<Field[]>(mockFields);
  const [selectedFieldId, setSelectedFieldId] = useState<number | null>(null);
  const [changeLog, setChangeLog] = useState<ChangeLogEntry[]>([]);
  const [drawingMode, setDrawingMode] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [drawRect, setDrawRect] = useState<BBox | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setFileUrl(url);
    const pdf = file.type === 'application/pdf';
    setIsPdf(pdf);

    if (pdf) {
      const loadingTask = pdfjsLib.getDocument(url);
      loadingTask.promise
        .then((pdfDoc) => pdfDoc.getPage(1))
        .then((page) => {
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = canvasRef.current;
          if (!canvas) return;
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          setCanvasSize({ w: viewport.width, h: viewport.height });
          page.render({ canvasContext: canvas.getContext('2d')!, viewport });
        })
        .catch(console.error);
    }

    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setSelectedFieldId(null);
    }
  };

  const handleValueEdit = (fieldId: number, newValue: string) => {
    setFields((prev) =>
      prev.map((f) => {
        if (f.id === fieldId && f.value !== newValue) {
          setChangeLog((log) => [
            ...log,
            {
              field: f.field,
              oldValue: f.value,
              newValue,
              timestamp: new Date().toISOString(),
            },
          ]);
          return { ...f, value: newValue };
        }
        return f;
      })
    );
  };

  const getContainerRect = () => containerRef.current?.getBoundingClientRect();

  const handleMouseDown = (e: MouseEvent) => {
    if (!drawingMode) return;
    const rect = getContainerRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setDrawStart({ x, y });
    setDrawRect([x, y, x, y]);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!drawingMode || !drawStart) return;
    const rect = getContainerRect();
    if (!rect) return;
    const x2 = e.clientX - rect.left;
    const y2 = e.clientY - rect.top;
    setDrawRect([
      Math.min(drawStart.x, x2),
      Math.min(drawStart.y, y2),
      Math.max(drawStart.x, x2),
      Math.max(drawStart.y, y2),
    ]);
  };

  const handleMouseUp = (e: MouseEvent) => {
    if (!drawingMode || !drawStart) return;
    const rect = getContainerRect();
    if (!rect) return;
    const x2 = e.clientX - rect.left;
    const y2 = e.clientY - rect.top;
    const bbox: BBox = [
      Math.min(drawStart.x, x2),
      Math.min(drawStart.y, y2),
      Math.max(drawStart.x, x2),
      Math.max(drawStart.y, y2),
    ];

    const fieldName = prompt('Field name:');
    const fieldValue = prompt('Field value:');
    if (fieldName && fieldValue) {
      const newId = fields.length ? Math.max(...fields.map((f) => f.id)) + 1 : 1;
      setFields((prev) => [
        ...prev,
        { id: newId, field: fieldName, value: fieldValue, page: 1, bbox },
      ]);
    }
    setDrawingMode(false);
    setDrawStart(null);
    setDrawRect(null);
  };

  const selectedField = fields.find((f) => f.id === selectedFieldId);

  return (
    <div className="app">
      <header className="app-header">
        <h1>📄 Invoice Viewer</h1>
        <label className="upload-btn">
          {file ? `📎 ${file.name}` : '⬆ Upload Invoice'}
          <input type="file" accept="application/pdf,image/*" onChange={handleFileChange} hidden />
        </label>
      </header>

      <div className="main">
        {/* Document panel */}
        <div className="doc-panel">
          <div
            ref={containerRef}
            className={`doc-area ${drawingMode ? 'drawing' : ''}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
          >
            {!file && (
              <div className="doc-placeholder">
                <span>Upload a PDF or image to begin</span>
              </div>
            )}
            {file && isPdf && <canvas ref={canvasRef} className="doc-canvas" />}
            {file && !isPdf && (
              <img src={fileUrl} alt="invoice" className="doc-img" />
            )}

            {/* Selected field highlight */}
            {selectedField && (
              <div
                className="highlight"
                style={{
                  left: selectedField.bbox[0],
                  top: selectedField.bbox[1],
                  width: selectedField.bbox[2] - selectedField.bbox[0],
                  height: selectedField.bbox[3] - selectedField.bbox[1],
                }}
              />
            )}

            {/* All field badges */}
            {file && fields.map((f) => (
              <div
                key={f.id}
                className={`field-badge ${f.id === selectedFieldId ? 'active' : ''}`}
                style={{ left: f.bbox[0], top: f.bbox[1] }}
                onClick={() => setSelectedFieldId(f.id === selectedFieldId ? null : f.id)}
                title={`${f.field}: ${f.value}`}
              >
                {f.field}
              </div>
            ))}

            {/* Live draw rect */}
            {drawRect && (
              <div
                className="draw-rect"
                style={{
                  left: drawRect[0],
                  top: drawRect[1],
                  width: drawRect[2] - drawRect[0],
                  height: drawRect[3] - drawRect[1],
                }}
              />
            )}
          </div>
        </div>

        {/* Side panel */}
        <div className="side-panel">
          <section className="fields-section">
            <h2>Extracted Fields</h2>
            <ul className="field-list">
              {fields.map((f) => (
                <li
                  key={f.id}
                  className={`field-item ${f.id === selectedFieldId ? 'selected' : ''}`}
                  onClick={() => setSelectedFieldId(f.id === selectedFieldId ? null : f.id)}
                >
                  <div className="field-label">{f.field}</div>
                  <EditableValue
                    value={f.value}
                    onSave={(v) => handleValueEdit(f.id, v)}
                  />
                  <div className="field-meta">Page {f.page} · [{f.bbox.join(', ')}]</div>
                </li>
              ))}
            </ul>
            <button
              className={`draw-btn ${drawingMode ? 'active' : ''}`}
              onClick={() => setDrawingMode(!drawingMode)}
            >
              {drawingMode ? '✏️ Click & drag on document…' : '➕ Add Field Manually'}
            </button>
          </section>

          <section className="log-section">
            <h2>Change Log</h2>
            {changeLog.length === 0 ? (
              <p className="log-empty">No changes yet.</p>
            ) : (
              <ul className="log-list">
                {[...changeLog].reverse().map((entry, i) => (
                  <li key={i} className="log-entry">
                    <span className="log-time">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    <span className="log-field">{entry.field}</span>
                    <span className="log-old">"{entry.oldValue}"</span>
                    <span className="log-arrow">→</span>
                    <span className="log-new">"{entry.newValue}"</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function EditableValue({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [temp, setTemp] = useState(value);

  useEffect(() => { setTemp(value); }, [value]);

  const commit = () => {
    onSave(temp);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        className="field-input"
        value={temp}
        onChange={(e) => setTemp(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        autoFocus
      />
    );
  }

  return (
    <div className="field-value" onClick={(e) => { e.stopPropagation(); setEditing(true); }}>
      {value}
      <span className="edit-hint">✏️</span>
    </div>
  );
}
