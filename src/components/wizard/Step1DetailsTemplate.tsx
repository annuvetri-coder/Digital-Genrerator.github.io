import React, { useRef } from 'react';
import { CertificateTemplate } from '../../types';
import { PRESET_TEMPLATES } from '../../utils/defaultTemplates';
import { Check, FileUp, Sparkles, UploadCloud } from 'lucide-react';

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
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTemplateFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = file.type;
    const isImage = fileType.includes('png') || fileType.includes('jpeg') || fileType.includes('jpg');
    const isPdf = fileType.includes('pdf');

    if (!isImage && !isPdf) {
      alert('Please upload a valid PNG, JPG, or PDF certificate template.');
      return;
    }

    const reader = new FileReader();

    if (isImage) {
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const img = new Image();
        img.onload = () => {
          const newTemplate: CertificateTemplate = {
            id: `custom-tmpl-${Date.now()}`,
            name: file.name.replace(/\.[^/.]+$/, ''),
            backgroundData: dataUrl,
            width: img.naturalWidth || 1920,
            height: img.naturalHeight || 1080,
            elements: JSON.parse(JSON.stringify(selectedTemplate.elements)),
            isDefault: false,
            createdAt: new Date().toISOString(),
          };
          setSelectedTemplate(newTemplate);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    } else if (isPdf) {
      // PDF Template: Read as data url for preview or convert
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        // In modern browser we can render or use image representation
        const newTemplate: CertificateTemplate = {
          id: `custom-pdf-${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, '') + ' (PDF Template)',
          backgroundData: dataUrl,
          width: 1920,
          height: 1080,
          elements: JSON.parse(JSON.stringify(selectedTemplate.elements)),
          isDefault: false,
          createdAt: new Date().toISOString(),
        };
        setSelectedTemplate(newTemplate);
      };
      reader.readAsDataURL(file);
    }
  };

  const allAvailableTemplates = [...savedTemplates];

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
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">2. Certificate Template Background</h2>
            <p className="text-xs text-slate-500">
              Upload your company's blank certificate (PNG, JPG, or PDF) or choose a pre-configured template.
            </p>
          </div>

          {/* Upload Button */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,application/pdf"
              className="hidden"
              onChange={handleTemplateFileUpload}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Custom Template (PNG/JPG/PDF)</span>
            </button>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allAvailableTemplates.map((template) => {
            const isSelected = selectedTemplate.id === template.id;
            return (
              <div
                key={template.id}
                onClick={() => setSelectedTemplate(template)}
                className={`group cursor-pointer rounded-2xl border-2 p-3 transition-all relative overflow-hidden bg-slate-50 flex flex-col justify-between ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/20 ring-4 ring-indigo-500/10 shadow-md'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}

                {/* Template Thumbnail */}
                <div className="aspect-[16/9] w-full rounded-xl overflow-hidden bg-white border border-slate-200/80 shadow-inner flex items-center justify-center relative">
                  {template.backgroundData.startsWith('data:image/') || template.backgroundData.startsWith('http') ? (
                    <img
                      src={template.backgroundData}
                      alt={template.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <FileUp className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                      <span className="text-xs text-slate-500">PDF Template Attached</span>
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {template.name}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {template.elements.length} field positions configured
                    </p>
                  </div>
                  {template.isDefault && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                      Preset
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
