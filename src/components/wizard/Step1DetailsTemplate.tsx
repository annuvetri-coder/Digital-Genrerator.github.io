import React, { useRef, useState } from 'react';
import { CertificateTemplate } from '../../types';
import { PRESET_TEMPLATES } from '../../utils/defaultTemplates';
import { processTemplateFile } from '../../utils/templateFileConverter';
import { Check, FileCheck, FileUp, Loader2, Sparkles, Trash2, UploadCloud, AlertCircle } from 'lucide-react';

interface Step1Props {
  batchName: string;
  setBatchName: (val: string) => void;
  batchId: string;
  setBatchId: (val: string) => void;
  courseName: string;
  setCourseName: (val: string) => void;
  issueDate: string;
  setIssueDate: (val: string) => void;
  selectedTemplate: CertificateTemplate;
  setSelectedTemplate: (t: CertificateTemplate) => void;
  savedTemplates: CertificateTemplate[];
  onAddCustomTemplate?: (t: CertificateTemplate) => void;
  onDeleteTemplate?: (id: string) => void;
}

export const Step1DetailsTemplate: React.FC<Step1Props> = ({
  batchName,
  setBatchName,
  batchId,
  setBatchId,
  courseName,
  setCourseName,
  issueDate,
  setIssueDate,
  selectedTemplate,
  setSelectedTemplate,
  savedTemplates,
  onAddCustomTemplate,
  onDeleteTemplate,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleProcessFile = async (file: File) => {
    setIsProcessing(true);
    setUploadStatus(null);
    try {
      const converted = await processTemplateFile(file);
      
      const newTemplate: CertificateTemplate = {
        id: `custom-tmpl-${Date.now()}`,
        name: converted.name,
        backgroundData: converted.dataUrl,
        width: converted.width || 1920,
        height: converted.height || 1080,
        elements: JSON.parse(JSON.stringify(selectedTemplate.elements || PRESET_TEMPLATES[0].elements)),
        isDefault: false,
        createdAt: new Date().toISOString(),
      };

      if (onAddCustomTemplate) {
        onAddCustomTemplate(newTemplate);
      }
      setSelectedTemplate(newTemplate);

      setUploadStatus({
        type: 'success',
        message: converted.isPdf
          ? `PDF certificate "${file.name}" converted into a crisp 1920x1080 template background successfully!`
          : `Certificate template "${file.name}" uploaded successfully (${converted.width} × ${converted.height} px)!`,
      });
    } catch (err: any) {
      console.error('Template upload error:', err);
      setUploadStatus({
        type: 'error',
        message: err.message || 'Failed to process certificate file. Please upload a valid PNG, JPG, or PDF.',
      });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleTemplateFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleProcessFile(file);
  };

  const allAvailableTemplates = [...savedTemplates];
  if (!allAvailableTemplates.some((t) => t.id === selectedTemplate.id)) {
    allAvailableTemplates.unshift(selectedTemplate);
  }

  return (
    <div className="space-y-8">
      {/* Batch Information */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900">1. Certificate Batch Details</h2>
          <p className="text-xs text-slate-500">
            Define the batch identifier, course title, and default issue date for this certificate group.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Batch Name *
            </label>
            <input
              type="text"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder="e.g. IoT Training – October 2026"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Batch ID *
            </label>
            <input
              type="text"
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              placeholder="e.g. IYT-IOT-2026-10"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Course / Program Title *
            </label>
            <input
              type="text"
              value={courseName}
              onChange={(e) => setCourseName(e.target.value)}
              placeholder="e.g. IoT Training"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Default Issue Date *
            </label>
            <input
              type="text"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              placeholder="e.g. 05 October 2026"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Blank Certificate Template Selection & Upload */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900">2. Certificate Template Background</h2>
          <p className="text-xs text-slate-500">
            Upload your blank certificate design (PNG, JPG, PDF, SVG, WebP) or choose a ready-to-use preset.
          </p>
        </div>

        {/* Dedicated Drag-and-Drop Upload Card */}
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
              : 'border-slate-300 hover:border-indigo-500 bg-slate-50/60 hover:bg-indigo-50/20'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,.png,.jpg,.jpeg,.webp,.svg,.pdf,application/pdf"
            className="hidden"
            onChange={handleTemplateFileUpload}
          />

          <div className="max-w-md mx-auto space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-2 shadow-xs">
              {isProcessing ? (
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              ) : (
                <UploadCloud className="w-6 h-6" />
              )}
            </div>

            <p className="text-sm font-bold text-slate-900">
              {isProcessing ? (
                <span>Processing & Converting Certificate Template...</span>
              ) : (
                <>
                  Drag & drop your new blank certificate here, or{' '}
                  <span className="text-indigo-600 underline">browse files</span>
                </>
              )}
            </p>
            <p className="text-xs text-slate-500">
              Supports <strong>PNG, JPG, JPEG, PDF, SVG, WebP</strong>. PDFs are automatically converted into ultra-sharp 1920×1080 background templates.
            </p>
          </div>
        </div>

        {/* Upload Notifications */}
        {uploadStatus && (
          <div
            className={`p-3.5 rounded-xl border flex items-center space-x-2.5 text-xs font-medium ${
              uploadStatus.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {uploadStatus.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 stroke-[3]" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{uploadStatus.message}</span>
          </div>
        )}

        {/* Available Templates Grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Available Templates ({allAvailableTemplates.length})
            </span>
            <span className="text-xs text-slate-400">
              Click any template below to select it
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allAvailableTemplates.map((template) => {
              const isSelected = selectedTemplate.id === template.id;
              return (
                <div
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`group cursor-pointer rounded-2xl border-2 p-3 transition-all relative overflow-hidden bg-white flex flex-col justify-between ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/30 ring-4 ring-indigo-500/10 shadow-md'
                      : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  )}

                  {/* Template Thumbnail */}
                  <div className="aspect-[16/9] w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-200/80 shadow-inner flex items-center justify-center relative">
                    <img
                      src={template.backgroundData}
                      alt={template.name}
                      className="w-full h-full object-contain"
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="pr-2 truncate">
                      <h3 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                        {template.name}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {template.elements.length} field positions configured
                      </p>
                    </div>

                    <div className="flex items-center space-x-1 flex-shrink-0">
                      {template.isDefault ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          Preset
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                          Custom
                        </span>
                      )}
                      {!template.isDefault && onDeleteTemplate && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Remove template "${template.name}"?`)) {
                              onDeleteTemplate(template.id);
                            }
                          }}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 transition-colors"
                          title="Delete template"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
