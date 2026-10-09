import React, { useRef, useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  Clipboard,
  Eraser,
  Image as ImageIcon,
  Italic,
  Maximize2,
  Move,
  PenTool,
  Plus,
  QrCode,
  RotateCcw,
  Save,
  Trash2,
  Type,
  UploadCloud,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { CertificateTemplate, TemplateElement } from '../../types';
import {
  AVAILABLE_FONTS,
  AVAILABLE_PLACEHOLDERS,
  DEFAULT_ELEMENTS,
  createDefaultSignatureSvg,
} from '../../utils/defaultTemplates';
import { OFFICIAL_LOGO_TRANSPARENT_DATA_URL } from '../../assets/logo';
import { useSettings } from '../../context/SettingsContext';
import { useAuth } from '../../context/AuthContext';

interface Step2Props {
  template: CertificateTemplate;
  courseName?: string;
  onCourseNameChange?: (newCourse: string) => void;
  onUpdateTemplate: (updated: CertificateTemplate) => void;
  onSaveAsCustomTemplate: (template: CertificateTemplate) => void;
}

export const Step2TemplateEditor: React.FC<Step2Props> = ({
  template,
  courseName,
  onCourseNameChange,
  onUpdateTemplate,
  onSaveAsCustomTemplate,
}) => {
  const { settings } = useSettings();
  const { isCompanyAuthorized, authorizedCompanyEmail } = useAuth();
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    template.elements[0]?.id || null
  );
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);
  const [isDrawingPadOpen, setIsDrawingPadOpen] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const sigFileInputRef = useRef<HTMLInputElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);

  const dragStartRef = useRef<{ startX: number; startY: number; elX: number; elY: number; elW: number; elH: number }>({
    startX: 0,
    startY: 0,
    elX: 0,
    elY: 0,
    elW: 0,
    elH: 0,
  });

  const selectedElement = template.elements.find((el) => el.id === selectedElementId);

  const updateElement = (id: string, updates: Partial<TemplateElement>) => {
    const updatedElements = template.elements.map((el) => {
      if (el.id === id) {
        return { ...el, ...updates };
      }
      return el;
    });
    onUpdateTemplate({ ...template, elements: updatedElements });
  };

  const handleAddField = (
    placeholderTag: string,
    label: string,
    isQr?: boolean,
    defaultSize?: number,
    isImage?: boolean
  ) => {
    const isSig = isImage || placeholderTag === '{{SIGNATURE}}';
    const newElement: TemplateElement = {
      id: `elem-${Date.now()}`,
      type: isQr ? 'qr' : isSig ? 'image' : 'text',
      field: placeholderTag,
      label,
      x: isSig ? 74 : 30,
      y: isSig ? 77 : 40,
      width: isQr ? 8 : isSig ? 15 : 40,
      height: isQr ? 14 : isSig ? 10 : 6,
      fontFamily: 'Great Vibes',
      fontSize: defaultSize || 24,
      fontWeight: '600',
      color: '#0F172A',
      textAlign: 'center',
      sampleText: label,
      imageUrl: isSig ? settings.signatureUrl || undefined : undefined,
    };
    const updated = [...template.elements, newElement];
    onUpdateTemplate({ ...template, elements: updated });
    setSelectedElementId(newElement.id);
  };

  // Upload E-Signature file for the selected element
  const handleElementSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isCompanyAuthorized) {
      alert(`Only you (authorized company email: ${authorizedCompanyEmail}) have permission to upload or paste signatures.`);
      return;
    }
    const file = e.target.files?.[0];
    if (!file || !selectedElementId) return;

    if (!file.type.includes('image')) {
      alert('Please upload a valid image file (PNG, JPG, or SVG) for the signature.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      updateElement(selectedElementId, {
        type: 'image',
        imageUrl: dataUrl,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handlePasteSignature = async () => {
    if (!isCompanyAuthorized) {
      alert(`Only you (authorized company email: ${authorizedCompanyEmail}) have authority to paste the official signature.`);
      return;
    }
    if (!selectedElementId) return;
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const items = await navigator.clipboard.read();
        for (const item of items) {
          for (const type of item.types) {
            if (type.startsWith('image/')) {
              const blob = await item.getType(type);
              const reader = new FileReader();
              reader.onload = (e) => {
                const dataUrl = e.target?.result as string;
                updateElement(selectedElementId, {
                  type: 'image',
                  imageUrl: dataUrl,
                });
              };
              reader.readAsDataURL(blob);
              return;
            }
          }
        }
      }
      alert('Press Ctrl+V to paste your copied signature image.');
    } catch {
      alert('Press Ctrl+V to paste your copied signature image.');
    }
  };

  // Interactive Signature Pad Drawing Handlers for Template Editor
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1E293B';
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearDrawingPad = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveDrawnSignatureToElement = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas || !selectedElementId) return;
    const dataUrl = canvas.toDataURL('image/png');
    updateElement(selectedElementId, {
      type: 'image',
      imageUrl: dataUrl,
    });
    setIsDrawingPadOpen(false);
  };

  const handleDeleteElement = (id: string) => {
    const updated = template.elements.filter((el) => el.id !== id);
    onUpdateTemplate({ ...template, elements: updated });
    if (selectedElementId === id) {
      setSelectedElementId(updated[0]?.id || null);
    }
  };

  const handleCenterHorizontally = (id: string) => {
    const el = template.elements.find((e) => e.id === id);
    if (!el) return;
    const elWidth = el.width || 40;
    const newX = Math.max(0, (100 - elWidth) / 2);
    updateElement(id, { x: Math.round(newX * 10) / 10 });
  };

  const handleResetElements = () => {
    if (confirm('Reset all field positions to standard layout?')) {
      onUpdateTemplate({
        ...template,
        elements: JSON.parse(JSON.stringify(DEFAULT_ELEMENTS)),
      });
      setSelectedElementId(DEFAULT_ELEMENTS[0]?.id || null);
    }
  };

  // Dragging / Moving Logic
  const handleMouseDownOnElement = (e: React.MouseEvent, el: TemplateElement) => {
    e.stopPropagation();
    setSelectedElementId(el.id);
    setIsDragging(true);

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      elX: el.x,
      elY: el.y,
      elW: el.width || 30,
      elH: el.height || 6,
    };
  };

  // Resize handle
  const handleMouseDownOnResize = (e: React.MouseEvent, el: TemplateElement) => {
    e.stopPropagation();
    setSelectedElementId(el.id);
    setIsResizing(true);

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      elX: el.x,
      elY: el.y,
      elW: el.width || 30,
      elH: el.height || 6,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging && !isResizing) return;
    if (!selectedElementId || !containerRef.current) return;

    const bounds = containerRef.current.getBoundingClientRect();
    const deltaXPercent = ((e.clientX - dragStartRef.current.startX) / bounds.width) * 100;
    const deltaYPercent = ((e.clientY - dragStartRef.current.startY) / bounds.height) * 100;

    if (isDragging) {
      const nextX = Math.min(Math.max(0, dragStartRef.current.elX + deltaXPercent), 90);
      const nextY = Math.min(Math.max(0, dragStartRef.current.elY + deltaYPercent), 95);
      updateElement(selectedElementId, {
        x: Math.round(nextX * 10) / 10,
        y: Math.round(nextY * 10) / 10,
      });
    } else if (isResizing) {
      const nextW = Math.max(5, dragStartRef.current.elW + deltaXPercent);
      const nextH = Math.max(3, dragStartRef.current.elH + deltaYPercent);
      updateElement(selectedElementId, {
        width: Math.round(nextW * 10) / 10,
        height: Math.round(nextH * 10) / 10,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  return (
    <div className="space-y-4" onMouseUp={handleMouseUp} onMouseMove={handleMouseMove}>
      {/* Top Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Insert Field:
          </span>
          <div className="flex flex-wrap gap-1.5 items-center">
            {/* Quick Add E-Signature Button */}
            <button
              type="button"
              onClick={() => handleAddField('{{SIGNATURE}}', 'Authorized E-Signature', false, 24, true)}
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors shadow-2xs"
              title="Add Authorized E-Signature to Certificate"
            >
              <PenTool className="w-3.5 h-3.5 text-purple-600" />
              <span>+ E-Signature</span>
            </button>

            {AVAILABLE_PLACEHOLDERS.map((ph) => {
              const isSig = (ph as any).isImage || ph.tag === '{{SIGNATURE}}';
              return (
                <button
                  key={ph.tag}
                  type="button"
                  onClick={() => handleAddField(ph.tag, ph.label, ph.isQr, ph.defaultSize, isSig)}
                  className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                    isSig
                      ? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                      : ph.isQr
                      ? 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100'
                      : 'bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border-slate-200'
                  }`}
                >
                  {ph.isQr ? (
                    <QrCode className="w-3.5 h-3.5 text-sky-600" />
                  ) : isSig ? (
                    <PenTool className="w-3 h-3 text-purple-600" />
                  ) : (
                    <Type className="w-3 h-3 text-slate-500" />
                  )}
                  <span>{ph.tag}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleResetElements}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Layout</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onSaveAsCustomTemplate(template);
              setSaveSuccessNotice(true);
              setTimeout(() => setSaveSuccessNotice(false), 3000);
            }}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saveSuccessNotice ? 'Saved to Templates!' : 'Save Template'}</span>
          </button>
        </div>
      </div>

      {/* Main Workspace (Canvas + Properties Inspector) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Visual Interactive Certificate Stage (3 cols) */}
        <div className="lg:col-span-3 bg-slate-800/90 rounded-2xl p-4 md:p-6 shadow-inner flex flex-col items-center justify-center min-h-[520px] select-none overflow-hidden">
          <div className="text-xs text-slate-400 mb-2 flex items-center space-x-2">
            <Move className="w-3.5 h-3.5" />
            <span>Click and drag text boxes to position • Drag bottom-right corner to resize</span>
          </div>

          <div
            ref={containerRef}
            onClick={() => setSelectedElementId(null)}
            className="relative w-full max-w-4xl aspect-[16/9] bg-white rounded-xl shadow-2xl overflow-hidden cursor-crosshair border border-slate-700"
            style={{
              backgroundImage: `url(${template.backgroundData})`,
              backgroundSize: '100% 100%',
              backgroundRepeat: 'no-repeat',
            }}
          >
            {/* Subtle Mandatory Central Certificate Watermark (Behind text) */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
              <img
                src={settings.logoUrl || OFFICIAL_LOGO_TRANSPARENT_DATA_URL}
                alt="Certificate Security Watermark"
                className="w-[42%] h-[42%] object-contain opacity-[0.08] select-none"
              />
            </div>

            {/* Template Placed Elements */}
            {template.elements.map((el) => {
              const isSelected = el.id === selectedElementId;
              const isQr = el.type === 'qr' || el.field === '{{QR_CODE}}';

              return (
                <div
                  key={el.id}
                  onMouseDown={(e) => handleMouseDownOnElement(e, el)}
                  className={`absolute group cursor-move select-none transition-shadow ${
                    isSelected
                      ? 'ring-2 ring-indigo-500 bg-indigo-500/10 shadow-lg z-20'
                      : 'hover:ring-1 hover:ring-indigo-300 hover:bg-indigo-50/5 z-10'
                  }`}
                  style={{
                    left: `${el.x}%`,
                    top: `${el.y}%`,
                    width: el.width ? `${el.width}%` : 'auto',
                    minHeight: el.height ? `${el.height}%` : '24px',
                  }}
                >
                  {/* Element Display */}
                  {isQr ? (
                    <div className="w-full h-full flex flex-col items-center justify-center border border-dashed border-slate-400 bg-white/90 p-1 rounded">
                      <QrCode className="w-full h-full max-h-16 text-slate-900" />
                      <span className="text-[9px] font-mono text-slate-600 mt-0.5">QR VERIFY</span>
                    </div>
                  ) : el.type === 'image' || el.field === '{{SIGNATURE}}' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center border border-dashed border-purple-300 bg-white/90 p-1 rounded overflow-hidden relative group/sig">
                      <img
                        src={el.imageUrl || settings.signatureUrl || createDefaultSignatureSvg()}
                        alt="E-Signature"
                        className="max-h-full max-w-full object-contain pointer-events-none"
                      />
                      <span className="text-[8px] font-mono font-bold text-purple-700 bg-purple-50/95 px-1 py-0.2 rounded border border-purple-200 uppercase absolute bottom-0.5 right-0.5 pointer-events-none shadow-2xs">
                        E-SIGNATURE
                      </span>
                    </div>
                  ) : (() => {
                    const isStudentName =
                      selectedElementId === el.id ||
                      el.id === 'elem-student-name' ||
                      el.field === '{{STUDENT_NAME}}';
                    const isCourse =
                      el.id === 'elem-course-name' ||
                      el.field === '{{COURSE_NAME}}' ||
                      el.field === '{{COURSE}}' ||
                      (el.label && /course/i.test(el.label));

                    const displayText = isCourse
                      ? courseName || el.sampleText || 'Course / Program Title'
                      : el.sampleText || el.field;

                    const autoFit = el.autoFitFontSize ?? isStudentName;
                    const autoAlign = el.autoAlignByLength ?? isStudentName;

                    let computedSize = el.fontSize * 0.45;
                    if (autoFit && displayText.length > 18) {
                      const scale = Math.max(0.55, 18 / displayText.length);
                      computedSize = Math.max(12, computedSize * scale);
                    }

                    const computedAlign = autoAlign ? 'center' : el.textAlign;

                    return (
                      <div
                        className="w-full truncate px-1 py-0.5"
                        style={{
                          fontFamily: el.fontFamily,
                          fontSize: `clamp(10px, ${computedSize}px, 38px)`,
                          fontWeight: el.fontWeight,
                          fontStyle: el.fontStyle || 'normal',
                          color: el.color,
                          textAlign: computedAlign,
                        }}
                      >
                        {displayText}
                      </div>
                    );
                  })()}

                  {/* Selected Badge */}
                  {isSelected && (
                    <div className="absolute -top-5 left-0 px-1.5 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-mono tracking-tight shadow">
                      {el.field}
                    </div>
                  )}

                  {/* Resize Handle at Bottom Right */}
                  {isSelected && (
                    <div
                      onMouseDown={(e) => handleMouseDownOnResize(e, el)}
                      className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-indigo-600 rounded-sm cursor-nwse-resize shadow flex items-center justify-center text-white"
                      title="Drag to resize"
                    >
                      <Maximize2 className="w-2 h-2 rotate-90" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Properties Inspector Panel (1 col) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm">Element Properties</h3>
            <p className="text-xs text-slate-500">
              {selectedElement ? `Editing ${selectedElement.label}` : 'Select a field on the canvas'}
            </p>
          </div>

          {selectedElement ? (
            <div className="space-y-4 text-xs">
              {/* Field Label / Tag */}
              <div>
                <label className="block text-slate-600 font-bold uppercase tracking-wider mb-1">
                  Placeholder Field
                </label>
                <input
                  type="text"
                  value={selectedElement.field}
                  onChange={(e) => updateElement(selectedElement.id, { field: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono text-xs bg-slate-50"
                />
              </div>

              {/* Course Title sync if course element is selected */}
              {(selectedElement.id === 'elem-course-name' ||
                selectedElement.field === '{{COURSE_NAME}}' ||
                selectedElement.field === '{{COURSE}}' ||
                (selectedElement.label && /course/i.test(selectedElement.label))) && (
                <div className="p-2.5 rounded-lg bg-indigo-50/70 border border-indigo-200 space-y-1.5">
                  <label className="block text-[11px] font-bold text-indigo-900 uppercase tracking-wider">
                    Course / Program Title (Batch Sync)
                  </label>
                  <input
                    type="text"
                    value={courseName || selectedElement.sampleText || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      updateElement(selectedElement.id, { sampleText: val });
                      if (onCourseNameChange) {
                        onCourseNameChange(val);
                      }
                    }}
                    placeholder="e.g. Full Stack Web Development"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-indigo-300 text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-[10px] text-indigo-700">
                    Editing this synchronizes the course title across the template, student roster, and certificate exports.
                  </p>
                </div>
              )}

              {/* Sample Preview Text */}
              <div>
                <label className="block text-slate-600 font-bold uppercase tracking-wider mb-1">
                  Sample Preview Value
                </label>
                <input
                  type="text"
                  value={selectedElement.sampleText || ''}
                  onChange={(e) => updateElement(selectedElement.id, { sampleText: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs"
                />
              </div>

              {/* Student Name Smart Features: Auto Font Size & Auto Alignment by Length */}
              {(selectedElement.id === 'elem-student-name' ||
                selectedElement.field === '{{STUDENT_NAME}}' ||
                selectedElement.type === 'text') && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                      Smart Dynamic Typography
                    </span>
                    <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
                      Auto-Length Engine
                    </span>
                  </div>

                  {/* Auto Font Size toggle */}
                  <label className="flex items-start space-x-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={selectedElement.autoFitFontSize ?? (selectedElement.id === 'elem-student-name' || selectedElement.field === '{{STUDENT_NAME}}')}
                      onChange={(e) =>
                        updateElement(selectedElement.id, { autoFitFontSize: e.target.checked })
                      }
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="font-semibold text-slate-800">Automatic Font Size</span>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        Scales font size dynamically so long names never clip or touch certificate borders.
                      </p>
                    </div>
                  </label>

                  {/* Auto Alignment toggle */}
                  <label className="flex items-start space-x-2 cursor-pointer text-xs">
                    <input
                      type="checkbox"
                      checked={selectedElement.autoAlignByLength ?? (selectedElement.id === 'elem-student-name' || selectedElement.field === '{{STUDENT_NAME}}')}
                      onChange={(e) =>
                        updateElement(selectedElement.id, { autoAlignByLength: e.target.checked })
                      }
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="font-semibold text-slate-800">Auto-Align by Name Length</span>
                      <p className="text-[10px] text-slate-500 leading-tight">
                        Dynamically centers and balances the name horizontally according to its character length.
                      </p>
                    </div>
                  </label>

                  {/* Quick Test Length Buttons */}
                  {(selectedElement.id === 'elem-student-name' || selectedElement.field === '{{STUDENT_NAME}}') && (
                    <div className="pt-1 border-t border-slate-200/80 space-y-1">
                      <span className="text-[10px] font-bold text-slate-600 uppercase">Test Name Lengths:</span>
                      <div className="grid grid-cols-3 gap-1">
                        <button
                          type="button"
                          onClick={() => updateElement(selectedElement.id, { sampleText: 'Ali Roy' })}
                          className="px-1.5 py-1 text-[10px] font-medium rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 truncate"
                          title="Short Name (7 chars)"
                        >
                          Short (7c)
                        </button>
                        <button
                          type="button"
                          onClick={() => updateElement(selectedElement.id, { sampleText: 'Priyanka Sharma' })}
                          className="px-1.5 py-1 text-[10px] font-medium rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 truncate"
                          title="Medium Name (15 chars)"
                        >
                          Medium (15c)
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateElement(selectedElement.id, {
                              sampleText: 'Dr. Mohammed Abdul Rahman Al-Mansoor',
                            })
                          }
                          className="px-1.5 py-1 text-[10px] font-medium rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 truncate"
                          title="Long Name (36 chars)"
                        >
                          Long (36c)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Center Horizontally Shortcut */}
              <button
                type="button"
                onClick={() => handleCenterHorizontally(selectedElement.id)}
                className="w-full py-1.5 px-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold flex items-center justify-center space-x-1.5 transition-colors"
              >
                <AlignCenter className="w-3.5 h-3.5" />
                <span>Center Horizontally</span>
              </button>

              {/* Position & Size (X, Y, Width) */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">X Pos (%)</label>
                  <input
                    type="number"
                    value={selectedElement.x}
                    step="0.5"
                    onChange={(e) => updateElement(selectedElement.id, { x: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1 rounded border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Y Pos (%)</label>
                  <input
                    type="number"
                    value={selectedElement.y}
                    step="0.5"
                    onChange={(e) => updateElement(selectedElement.id, { y: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1 rounded border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">Width (%)</label>
                  <input
                    type="number"
                    value={selectedElement.width || 30}
                    step="1"
                    onChange={(e) => updateElement(selectedElement.id, { width: parseFloat(e.target.value) || 30 })}
                    className="w-full px-2 py-1 rounded border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-semibold mb-1">
                    {selectedElement.type === 'image' || selectedElement.field === '{{SIGNATURE}}'
                      ? 'Height (%)'
                      : 'Font Size (px)'}
                  </label>
                  <input
                    type="number"
                    value={
                      selectedElement.type === 'image' || selectedElement.field === '{{SIGNATURE}}'
                        ? selectedElement.height || 10
                        : selectedElement.fontSize
                    }
                    min="2"
                    max="140"
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 10;
                      if (selectedElement.type === 'image' || selectedElement.field === '{{SIGNATURE}}') {
                        updateElement(selectedElement.id, { height: val });
                      } else {
                        updateElement(selectedElement.id, { fontSize: val });
                      }
                    }}
                    className="w-full px-2 py-1 rounded border border-slate-300 font-mono"
                  />
                </div>
              </div>

              {/* Special E-Signature Controls for Signature / Image Elements */}
              {selectedElement.type === 'image' || selectedElement.field === '{{SIGNATURE}}' ? (
                <div className="p-3.5 rounded-xl bg-purple-50/70 border border-purple-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-900 text-[11px] uppercase tracking-wider flex items-center space-x-1">
                      <PenTool className="w-3.5 h-3.5 text-purple-600" />
                      <span>E-Signature Source</span>
                    </span>
                    {isCompanyAuthorized ? (
                      <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        <span>Authorized Issuer</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        <Lock className="w-3 h-3 text-amber-600" />
                        <span>Issuer Locked</span>
                      </span>
                    )}
                  </div>

                  {/* Thumbnail Preview on Transparency Checkerboard */}
                  <div
                    className="w-full h-16 rounded-lg border border-purple-200 bg-white p-2 flex items-center justify-center shadow-2xs"
                    style={{
                      backgroundImage:
                        'linear-gradient(45deg, #f1f5f9 25%, transparent 25%), linear-gradient(-45deg, #f1f5f9 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f1f5f9 75%), linear-gradient(-45deg, transparent 75%, #f1f5f9 75%)',
                      backgroundSize: '12px 12px',
                      backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px',
                    }}
                  >
                    <img
                      src={
                        selectedElement.imageUrl ||
                        settings.signatureUrl ||
                        createDefaultSignatureSvg()
                      }
                      alt="Signature Preview"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>

                  {/* Hidden File Input */}
                  <input
                    ref={sigFileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                    onChange={handleElementSignatureUpload}
                    className="hidden"
                  />

                  {/* Action Buttons */}
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={handlePasteSignature}
                      className="w-full py-1.5 px-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold flex items-center justify-center space-x-1.5 transition-colors text-[11px] shadow-2xs"
                      title="Paste signature from clipboard (Ctrl+V)"
                    >
                      <Clipboard className="w-3.5 h-3.5" />
                      <span>Paste Signature (Ctrl+V)</span>
                    </button>

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => sigFileInputRef.current?.click()}
                        className="py-1.5 px-2 rounded-lg bg-white hover:bg-purple-100 text-purple-800 border border-purple-200 font-bold flex items-center justify-center space-x-1 transition-colors text-[11px]"
                      >
                        <UploadCloud className="w-3.5 h-3.5 text-purple-600" />
                        <span>Upload File</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsDrawingPadOpen(true)}
                        className="py-1.5 px-2 rounded-lg bg-white hover:bg-purple-100 text-purple-800 border border-purple-200 font-bold flex items-center justify-center space-x-1 transition-colors text-[11px]"
                      >
                        <PenTool className="w-3.5 h-3.5 text-purple-600" />
                        <span>Draw Signature</span>
                      </button>
                    </div>
                  </div>

                  {/* Use Org Signature button if available */}
                  {settings.signatureUrl && selectedElement.imageUrl !== settings.signatureUrl && (
                    <button
                      type="button"
                      onClick={() => updateElement(selectedElement.id, { imageUrl: settings.signatureUrl })}
                      className="w-full py-1 px-2 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-900 font-semibold text-[10px] transition-colors"
                    >
                      Use Organization Default Signature
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Font Family */}
                  <div>
                    <label className="block text-slate-600 font-bold uppercase tracking-wider mb-1">
                      Typography Font
                    </label>
                    <select
                      value={selectedElement.fontFamily}
                      onChange={(e) => updateElement(selectedElement.id, { fontFamily: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white"
                    >
                      {AVAILABLE_FONTS.map((font) => (
                        <option key={font.name} value={font.name}>
                          {font.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Styling: Alignment & Weight */}
                  <div>
                    <label className="block text-slate-600 font-bold uppercase tracking-wider mb-1">
                      Alignment & Style
                    </label>
                    <div className="flex items-center space-x-1 border border-slate-200 rounded-lg p-1 bg-slate-50">
                      <button
                        type="button"
                        onClick={() => updateElement(selectedElement.id, { textAlign: 'left' })}
                        className={`flex-1 py-1 rounded flex justify-center ${selectedElement.textAlign === 'left' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                      >
                        <AlignLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateElement(selectedElement.id, { textAlign: 'center' })}
                        className={`flex-1 py-1 rounded flex justify-center ${selectedElement.textAlign === 'center' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                      >
                        <AlignCenter className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateElement(selectedElement.id, { textAlign: 'right' })}
                        className={`flex-1 py-1 rounded flex justify-center ${selectedElement.textAlign === 'right' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                      >
                        <AlignRight className="w-3.5 h-3.5" />
                      </button>
                      <div className="w-px h-4 bg-slate-200" />
                      <button
                        type="button"
                        onClick={() =>
                          updateElement(selectedElement.id, {
                            fontWeight: selectedElement.fontWeight === 'bold' ? 'normal' : 'bold',
                          })
                        }
                        className={`flex-1 py-1 rounded flex justify-center ${selectedElement.fontWeight === 'bold' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                      >
                        <Bold className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateElement(selectedElement.id, {
                            fontStyle: selectedElement.fontStyle === 'italic' ? 'normal' : 'italic',
                          })
                        }
                        className={`flex-1 py-1 rounded flex justify-center ${selectedElement.fontStyle === 'italic' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}
                      >
                        <Italic className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Text Color */}
                  <div>
                    <label className="block text-slate-600 font-bold uppercase tracking-wider mb-1">
                      Color
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="color"
                        value={selectedElement.color}
                        onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })}
                        className="w-8 h-8 rounded border border-slate-300 p-0.5 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={selectedElement.color}
                        onChange={(e) => updateElement(selectedElement.id, { color: e.target.value })}
                        className="flex-1 px-2 py-1 rounded border border-slate-300 font-mono text-xs"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Delete Element */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleDeleteElement(selectedElement.id)}
                  className="w-full py-2 px-3 rounded-lg text-rose-600 hover:bg-rose-50 font-semibold flex items-center justify-center space-x-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Element</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">
              Click any element on the template or insert a new field above to customize position, font, and colors.
            </div>
          )}
        </div>
      </div>

      {/* Signature Draw Modal */}
      {isDrawingPadOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <PenTool className="w-4 h-4 text-purple-600" />
                <h3 className="font-extrabold text-sm text-slate-900">Draw Your Authorized E-Signature</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawingPadOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Draw your signature in the box below with mouse, trackpad, or finger:
            </p>

            {/* Draw Canvas */}
            <div className="rounded-2xl border-2 border-slate-300 bg-white overflow-hidden shadow-inner relative">
              <canvas
                ref={drawCanvasRef}
                width={400}
                height={180}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-44 cursor-crosshair touch-none"
              />
              <div className="absolute bottom-2 left-4 right-4 border-b border-dashed border-slate-200 pointer-events-none" />
              <span className="absolute bottom-1 right-3 text-[9px] font-mono text-slate-300 pointer-events-none uppercase">
                Sign Above Line
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={clearDrawingPad}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <Eraser className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsDrawingPadOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveDrawnSignatureToElement}
                  className="inline-flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Apply to Certificate</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
