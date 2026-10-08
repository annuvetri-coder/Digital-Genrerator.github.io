import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Clipboard,
  Eraser,
  Lock,
  PenTool,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { createDefaultSignatureSvg } from '../utils/defaultTemplates';

interface AuthorizedSignatureManagerProps {
  compact?: boolean;
  onOpenLoginModal?: () => void;
  onSignatureUpdated?: () => void;
}

export const AuthorizedSignatureManager: React.FC<AuthorizedSignatureManagerProps> = ({
  compact = false,
  onOpenLoginModal,
  onSignatureUpdated,
}) => {
  const { isCompanyAuthorized, authorizedCompanyEmail } = useAuth();
  const { settings, updateSettings } = useSettings();

  const [isDrawModalOpen, setIsDrawModalOpen] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [penColor, setPenColor] = useState('#0F172A');
  const [penWidth, setPenWidth] = useState(2.5);
  const [notice, setNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  // Helper to apply and save signature
  const applySignature = async (dataUrl: string, method: string) => {
    if (!isCompanyAuthorized) {
      showToast(`Access Restricted: Only ${authorizedCompanyEmail} can paste or update signatures.`);
      return;
    }
    await updateSettings({ ...settings, signatureUrl: dataUrl });
    showToast(`Signature successfully ${method} and saved!`);
    if (onSignatureUpdated) onSignatureUpdated();
  };

  // Keyboard paste listener (Ctrl+V / Cmd+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // If not company authorized, ignore
      if (!isCompanyAuthorized) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const result = event.target?.result as string;
              if (result) {
                applySignature(result, 'pasted from clipboard (Ctrl+V)');
              }
            };
            reader.readAsDataURL(file);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isCompanyAuthorized, settings, authorizedCompanyEmail]);

  // Click handler for Paste from Clipboard button
  const handlePasteButtonClick = async () => {
    if (!isCompanyAuthorized) {
      if (onOpenLoginModal) onOpenLoginModal();
      return;
    }

    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
          for (const type of item.types) {
            if (type.startsWith('image/')) {
              const blob = await item.getType(type);
              const reader = new FileReader();
              reader.onload = (e) => {
                const dataUrl = e.target?.result as string;
                if (dataUrl) {
                  applySignature(dataUrl, 'pasted from clipboard');
                }
              };
              reader.readAsDataURL(blob);
              return;
            }
          }
        }
      }
      showToast('No image in clipboard. Copy an image of your signature first, then press Ctrl+V here.');
    } catch {
      showToast('Clipboard access prompt: Simply press Ctrl+V on your keyboard to paste the signature.');
    }
  };

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isCompanyAuthorized) {
      if (onOpenLoginModal) onOpenLoginModal();
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('image')) {
      alert('Please select an image file (PNG, JPG, SVG, or WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        applySignature(dataUrl, 'uploaded from file');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Reset to default
  const handleResetToDefault = async () => {
    if (!isCompanyAuthorized) {
      if (onOpenLoginModal) onOpenLoginModal();
      return;
    }
    await updateSettings({ ...settings, signatureUrl: '' });
    showToast('Reset to default official vector signature.');
    if (onSignatureUpdated) onSignatureUpdated();
  };

  // Interactive draw pad handlers
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

    ctx.lineWidth = penWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = penColor;
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearDrawPad = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveDrawnSignature = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    applySignature(dataUrl, 'drawn and applied');
    setIsDrawModalOpen(false);
  };

  return (
    <div ref={containerRef} className="space-y-3">
      {/* Toast Notice */}
      {notice && (
        <div className="p-2.5 rounded-xl bg-purple-900 text-white text-xs font-semibold flex items-center justify-between shadow-lg animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{notice}</span>
          </div>
          <button onClick={() => setNotice(null)} className="text-purple-300 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Authority & Status Card */}
      <div className="bg-white rounded-2xl border border-purple-200/80 p-4 shadow-sm space-y-3">
        {/* Header with Issuer Security Badge */}
        <div className="flex items-center justify-between border-b border-purple-100 pb-2.5">
          <div className="flex items-center space-x-2">
            <div className={`p-1.5 rounded-xl ${isCompanyAuthorized ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
              {isCompanyAuthorized ? <ShieldCheck className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </div>
            <div>
              <h4 className="font-extrabold text-slate-900 text-xs">Authorized Issuer Signature</h4>
              <p className="text-[10px] text-slate-500 font-mono truncate max-w-[200px] sm:max-w-[260px]">
                {authorizedCompanyEmail} (Gmail Domain)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            {isCompanyAuthorized ? (
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <Check className="w-3 h-3 text-emerald-600" />
                <span>Issuer Verified</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={onOpenLoginModal}
                className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 transition-colors"
                title="Click to sign in with authorized company email"
              >
                Sign In to Unlock
              </button>
            )}
          </div>
        </div>

        {/* Security Rule Notice: Only I can paste */}
        <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-100 text-[11px] text-purple-950 space-y-1">
          <div className="flex items-center space-x-1.5 font-bold text-purple-900">
            <Lock className="w-3.5 h-3.5 text-purple-700 flex-shrink-0" />
            <span>Strict Access: Only You Can Paste or Change This Signature</span>
          </div>
          <p className="text-purple-800 text-[10.5px] leading-relaxed">
            Only the authorized company email account (<strong>{authorizedCompanyEmail}</strong>) is permitted to paste or embed signatures on certificates.
            <strong> Clean signature format:</strong> No subtitles or designations are shown below the signature on the certificate.
          </p>
        </div>

        {/* Preview checkerboard */}
        <div
          className="w-full h-24 rounded-xl border border-purple-200 bg-white p-2 flex flex-col items-center justify-center relative overflow-hidden shadow-inner group"
          style={{
            backgroundImage:
              'linear-gradient(45deg, #f1f5f9 25%, transparent 25%), linear-gradient(-45deg, #f1f5f9 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #f1f5f9 75%), linear-gradient(-45deg, transparent 75%, #f1f5f9 75%)',
            backgroundSize: '12px 12px',
            backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px',
          }}
          title="Direct Paste Zone: Press Ctrl+V anytime to paste your signature"
        >
          <img
            src={settings.signatureUrl || createDefaultSignatureSvg()}
            alt="Official E-Signature"
            className="max-h-[70px] max-w-full object-contain filter drop-shadow-xs"
          />
          <div className="absolute bottom-1 right-2 text-[9px] font-semibold text-slate-400 bg-white/80 px-1.5 py-0.5 rounded backdrop-blur-2xs">
            Press Ctrl+V to paste signature
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Action Buttons: Rectified Methods of Adding Signatures */}
        <div className="space-y-2">
          {/* 1. Primary Paste Button (Ctrl+V) */}
          <button
            type="button"
            disabled={!isCompanyAuthorized}
            onClick={handlePasteButtonClick}
            className={`w-full py-2.5 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center space-x-2 transition-all shadow-sm ${
              isCompanyAuthorized
                ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white shadow-amber-500/20 active:scale-[0.99]'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
            }`}
            title="Paste signature copied to your clipboard (Ctrl+V / Cmd+V)"
          >
            <Clipboard className="w-4 h-4" />
            <span>Paste Signature from Clipboard (Ctrl+V)</span>
          </button>

          {/* 2. Secondary: Upload File & Draw Pad */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!isCompanyAuthorized}
              onClick={() => fileInputRef.current?.click()}
              className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 border transition-all ${
                isCompanyAuthorized
                  ? 'bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-200 hover:border-purple-300'
                  : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
              }`}
              title="Upload signature image file (PNG, JPG, SVG)"
            >
              <UploadCloud className="w-3.5 h-3.5 text-purple-600" />
              <span>Upload Image</span>
            </button>

            <button
              type="button"
              disabled={!isCompanyAuthorized}
              onClick={() => setIsDrawModalOpen(true)}
              className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 border transition-all ${
                isCompanyAuthorized
                  ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border-indigo-200 hover:border-indigo-300'
                  : 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
              }`}
              title="Draw signature using mouse, stylus, or touchscreen"
            >
              <PenTool className="w-3.5 h-3.5 text-indigo-600" />
              <span>Draw Digital Pen</span>
            </button>
          </div>

          {/* Footer Reset & Active Status */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <span className="text-[10px] font-semibold text-slate-500">
              {settings.signatureUrl ? 'Custom Signature Active' : 'Official Vector Preset'} • No subtitles
            </span>
            {settings.signatureUrl && isCompanyAuthorized && (
              <button
                type="button"
                onClick={handleResetToDefault}
                className="text-[10.5px] font-semibold text-rose-600 hover:text-rose-800 flex items-center space-x-1 transition-colors"
                title="Reset to default official SVG signature"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Default</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Signature Drawing Pad Modal */}
      {isDrawModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <span className="p-2 rounded-xl bg-purple-100 text-purple-700">
                  <PenTool className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Draw E-Signature</h3>
                  <p className="text-xs text-slate-500">Sign with mouse, trackpad, or touchscreen stylus</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawing controls */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <span className="text-slate-500 font-semibold">Ink Color:</span>
                {[
                  { label: 'Navy', hex: '#0F172A' },
                  { label: 'Royal Blue', hex: '#1D4ED8' },
                  { label: 'Black', hex: '#000000' },
                ].map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setPenColor(c.hex)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      penColor === c.hex ? 'scale-110 border-purple-600 ring-2 ring-purple-200' : 'border-slate-300'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.label}
                  />
                ))}
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-slate-500 font-semibold">Stroke:</span>
                {[
                  { label: 'Fine', w: 1.5 },
                  { label: 'Medium', w: 2.5 },
                  { label: 'Bold', w: 4 },
                ].map((s) => (
                  <button
                    key={s.w}
                    type="button"
                    onClick={() => setPenWidth(s.w)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      penWidth === s.w ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Canvas Pad */}
            <div className="border-2 border-dashed border-purple-300 rounded-2xl bg-white p-2 relative overflow-hidden shadow-inner">
              <canvas
                ref={drawCanvasRef}
                width={480}
                height={180}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-[180px] bg-white cursor-crosshair rounded-xl touch-none"
              />
              <div className="absolute bottom-2 left-3 text-[10px] text-slate-400 pointer-events-none select-none">
                Sign inside the box • Transparent PNG exported
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={clearDrawPad}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 flex items-center space-x-1.5 transition-colors"
              >
                <Eraser className="w-4 h-4" />
                <span>Clear</span>
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsDrawModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveDrawnSignature}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-500/20"
                >
                  Apply Drawn Signature
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
