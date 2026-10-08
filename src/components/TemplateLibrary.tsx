import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Edit2,
  FileUp,
  Layers,
  Loader2,
  Plus,
  Trash2,
  UploadCloud,
  AlertCircle,
} from 'lucide-react';
import { CertificateTemplate } from '../types';
import { api } from '../services/api';
import { PRESET_TEMPLATES } from '../utils/defaultTemplates';
import { processTemplateFile } from '../utils/templateFileConverter';
import { Step2TemplateEditor } from './wizard/Step2TemplateEditor';

export const TemplateLibrary: React.FC = () => {
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<CertificateTemplate | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadTemplates = async () => {
    try {
      const data = await api.getTemplates();
      setTemplates(data);
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleProcessFile = async (file: File) => {
    setIsProcessing(true);
    setUploadError(null);
    try {
      const converted = await processTemplateFile(file);
      const newTemplate: CertificateTemplate = {
        id: `template-custom-${Date.now()}`,
        name: converted.name,
        backgroundData: converted.dataUrl,
        width: converted.width || 1920,
        height: converted.height || 1080,
        elements: JSON.parse(JSON.stringify(PRESET_TEMPLATES[0].elements)),
        isDefault: false,
        createdAt: new Date().toISOString(),
      };
      await api.saveTemplate(newTemplate);
      await loadTemplates();
      setEditingTemplate(newTemplate);
    } catch (err: any) {
      console.error('Template upload error:', err);
      setUploadError(err.message || 'Failed to upload certificate template.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUploadTemplate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this template?')) {
      await api.deleteTemplate(id);
      await loadTemplates();
      if (editingTemplate?.id === id) setEditingTemplate(null);
    }
  };

  const handleSaveEditor = async (updated: CertificateTemplate) => {
    await api.saveTemplate(updated);
    await loadTemplates();
    setEditingTemplate(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Certificate Template Library
          </h1>
          <p className="text-xs text-slate-500">
            Design, customize, and save certificate template layouts with exact field coordinates.
          </p>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,.png,.jpg,.jpeg,.webp,.svg,.pdf,application/pdf"
            className="hidden"
            onChange={handleUploadTemplate}
          />
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-all disabled:opacity-50"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <UploadCloud className="w-4 h-4" />
            )}
            <span>{isProcessing ? 'Processing Template...' : 'Upload Blank Certificate (PDF / Image)'}</span>
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Drag & Drop Card */}
      {!editingTemplate && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-indigo-600 bg-indigo-50/50 scale-[0.99]'
              : 'border-slate-300 hover:border-indigo-500 bg-white hover:bg-indigo-50/20'
          }`}
        >
          <div className="max-w-md mx-auto space-y-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              {isProcessing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <UploadCloud className="w-5 h-5" />
              )}
            </div>
            <p className="text-xs font-bold text-slate-800">
              Drag and drop your blank certificate design (PNG, JPG, PDF, SVG, WebP) here
            </p>
            <p className="text-[11px] text-slate-400">
              PDFs are automatically converted to high-resolution template backgrounds.
            </p>
          </div>
        </div>
      )}

      {editingTemplate ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <h2 className="font-bold text-slate-900 text-sm">
                Editing Template: {editingTemplate.name}
              </h2>
              <p className="text-xs text-slate-500">Drag fields and adjust typography properties below</p>
            </div>
            <button
              onClick={() => setEditingTemplate(null)}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Back to Library
            </button>
          </div>

          <Step2TemplateEditor
            template={editingTemplate}
            onUpdateTemplate={setEditingTemplate}
            onSaveAsCustomTemplate={handleSaveEditor}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {templates.map((template) => (
            <div
              key={template.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="aspect-[16/9] w-full rounded-xl overflow-hidden bg-slate-100 border border-slate-200/80 shadow-inner flex items-center justify-center relative">
                  <img
                    src={template.backgroundData}
                    alt={template.name}
                    className="w-full h-full object-cover"
                  />
                  {template.isDefault && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-600 text-white shadow">
                      Official Preset
                    </span>
                  )}
                </div>

                <div className="mt-3">
                  <h3 className="font-bold text-sm text-slate-900">{template.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {template.elements.length} dynamic field tags configured
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setEditingTemplate(template)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Open Editor</span>
                </button>

                {!template.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleDelete(template.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete Template"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
