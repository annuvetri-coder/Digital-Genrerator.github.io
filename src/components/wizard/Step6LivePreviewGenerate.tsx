import React, { useEffect, useRef, useState } from 'react';
import {
  Award,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  FileArchive,
  FileCheck2,
  GraduationCap,
  Loader2,
  Lock,
  LogIn,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  StopCircle,
  Type,
} from 'lucide-react';
import {
  CertificateBatch,
  CertificateRecord,
  CertificateTemplate,
  StudentRecord,
} from '../../types';
import { renderCertificateToCanvas } from '../../utils/canvasRenderer';
import {
  downloadSingleCertificate,
  generateBulkCertificatesZip,
} from '../../utils/pdfGenerator';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { AuthorizedSignatureManager } from '../AuthorizedSignatureManager';
import { LoginModal } from '../LoginModal';

interface Step6Props {
  batchName: string;
  batchId: string;
  courseName: string;
  onUpdateCourseName?: (newCourse: string) => void;
  issueDate: string;
  template: CertificateTemplate;
  students: StudentRecord[];
  onUpdateStudentName?: (index: number, newName: string) => void;
  onFinishAndGoToBatches: () => void;
  onVerifyCertificate: (certNum: string) => void;
}

export const Step6LivePreviewGenerate: React.FC<Step6Props> = ({
  batchName,
  batchId,
  courseName,
  onUpdateCourseName,
  issueDate,
  template,
  students,
  onUpdateStudentName,
  onFinishAndGoToBatches,
  onVerifyCertificate,
}) => {
  const { isCompanyAuthorized, authorizedCompanyEmail } = useAuth();
  const { settings } = useSettings();
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'png' | 'jpg'>('pdf');
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressCount, setProgressCount] = useState(0);
  const [progressStudent, setProgressStudent] = useState('');
  const [generationComplete, setGenerationComplete] = useState(false);
  const [generatedZipBlob, setGeneratedZipBlob] = useState<Blob | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isCancelledRef = useRef(false);

  const currentStudent = students[currentStudentIndex] || students[0];

  // Render canvas preview whenever current student changes
  const triggerCanvasRender = () => {
    if (!canvasRef.current || !currentStudent) return;
    renderCertificateToCanvas(canvasRef.current, template, currentStudent, settings, { scale: 0.7 });
  };

  useEffect(() => {
    triggerCanvasRender();
  }, [template, currentStudent, settings]);

  const handlePrevStudent = () => {
    setCurrentStudentIndex((prev) => (prev > 0 ? prev - 1 : students.length - 1));
  };

  const handleNextStudent = () => {
    setCurrentStudentIndex((prev) => (prev < students.length - 1 ? prev + 1 : 0));
  };

  const handleDownloadSingle = async () => {
    if (!currentStudent) return;
    if (!isCompanyAuthorized) {
      setIsLoginModalOpen(true);
      return;
    }
    await downloadSingleCertificate(template, currentStudent, settings, exportFormat);
  };

  const handleStartBulkGeneration = async () => {
    if (students.length === 0) return;
    if (!isCompanyAuthorized) {
      setIsLoginModalOpen(true);
      return;
    }
    if (students.length === 0) return;

    setIsGenerating(true);
    setProgressCount(0);
    setProgressStudent('');
    setGenerationComplete(false);
    setGeneratedZipBlob(null);
    isCancelledRef.current = false;

    try {
      const { zipBlob, totalGenerated } = await generateBulkCertificatesZip({
        template,
        students,
        settings,
        format: exportFormat,
        onProgress: (completed, _total, curStudent) => {
          setProgressCount(completed);
          setProgressStudent(curStudent);
        },
        shouldCancel: () => isCancelledRef.current,
      });

      setGeneratedZipBlob(zipBlob);
      setGenerationComplete(true);

      // Save Batch to DB
      const newBatch: CertificateBatch = {
        id: `batch-${Date.now()}`,
        batchId,
        name: batchName,
        courseName,
        studentCount: totalGenerated,
        templateId: template.id,
        templateName: template.name,
        issueDate,
        createdAt: new Date().toISOString(),
        students,
      };
      await api.saveBatch(newBatch);

      // Save individual Certificate Records to DB
      const certRecords: CertificateRecord[] = students.map((s) => ({
        id: `cert-${s.certificateNumber}`,
        certificateNumber: s.certificateNumber,
        studentName: s.studentName,
        courseName: s.courseName || courseName,
        issueDate: s.issueDate || issueDate,
        batchId,
        batchName,
        templateId: template.id,
        verificationId: s.verificationId,
        status: 'valid',
        createdAt: new Date().toISOString(),
      }));
      await api.saveCertificatesBulk(certRecords);

      // Trigger automatic ZIP download
      const zipUrl = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = zipUrl;
      a.download = `${batchId || 'Certificates'}_${exportFormat.toUpperCase()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err: any) {
      if (err.message !== 'Generation cancelled by user') {
        alert('Generation failed: ' + err.message);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCancelGeneration = () => {
    isCancelledRef.current = true;
    setIsGenerating(false);
  };

  const handleDownloadZipAgain = () => {
    if (!generatedZipBlob) return;
    const url = URL.createObjectURL(generatedZipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${batchId || 'Certificates'}_${exportFormat.toUpperCase()}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const percentComplete =
    students.length > 0 ? Math.round((progressCount / students.length) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner & Generation Bar */}
      {isGenerating && (
        <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-2xl space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
              <div>
                <h3 className="font-bold text-sm">Generating certificates in bulk...</h3>
                <p className="text-xs text-slate-400">
                  Rendering high-resolution vector PDF certificates with QR codes
                </p>
              </div>
            </div>

            <button
              onClick={handleCancelGeneration}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/40 text-rose-400 border border-slate-700 hover:border-rose-800 text-xs font-semibold transition-colors"
            >
              <StopCircle className="w-4 h-4" />
              <span>Cancel</span>
            </button>
          </div>

          {/* Progress Indicator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-indigo-300">
                {progressCount} / {students.length} completed ({percentComplete}%)
              </span>
              <span className="text-slate-400 truncate max-w-xs">
                Current: {progressStudent || 'Starting...'}
              </span>
            </div>

            <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 border border-slate-700">
              <div
                className="bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 h-full rounded-full transition-all duration-150"
                style={{ width: `${percentComplete}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Completion Banner */}
      {generationComplete && (
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 text-white p-6 rounded-2xl border border-emerald-500/30 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-emerald-300">
                  Bulk Generation Complete!
                </h3>
                <p className="text-xs text-slate-300">
                  All {students.length} certificates have been generated, bundled into a ZIP archive,
                  and registered in the company verification database.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleDownloadZipAgain}
                className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download ZIP Again</span>
              </button>
              <button
                type="button"
                onClick={onFinishAndGoToBatches}
                className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/20 transition-all"
              >
                <span>View Batches Registry →</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Split View: Left Certificate Canvas Preview, Right Action Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Certificate Canvas Preview (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Live Certificate Preview</h3>
              <p className="text-xs text-slate-500">
                Student {currentStudentIndex + 1} of {students.length}:{' '}
                <strong className="text-slate-900">{currentStudent?.studentName}</strong> (
                {currentStudent?.certificateNumber})
              </p>
            </div>

            {/* Student Switcher Controls */}
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={handlePrevStudent}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
                title="Previous Student"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <select
                value={currentStudentIndex}
                onChange={(e) => setCurrentStudentIndex(parseInt(e.target.value) || 0)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-medium max-w-[180px] truncate"
              >
                {students.map((s, idx) => (
                  <option key={s.id} value={idx}>
                    {idx + 1}. {s.studentName} ({s.certificateNumber})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleNextStudent}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors"
                title="Next Student"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Edit Course Title Bar */}
          <div className="bg-indigo-50/70 border border-indigo-200/80 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center space-x-2">
              <GraduationCap className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <div>
                <span className="text-xs font-bold text-slate-800">Course / Program Title:</span>
                <p className="text-[11px] text-slate-500">
                  Updates course title live on the preview and across all certificates in this batch
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={courseName}
                onChange={(e) => onUpdateCourseName?.(e.target.value)}
                className="px-3 py-1.5 rounded-lg border border-indigo-300 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[220px]"
                placeholder="e.g. Full Stack Web Development"
              />
            </div>
          </div>

          {/* Student Name Length & Dynamic Auto-Fit Controls */}
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Type className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                <div>
                  <span className="text-xs font-bold text-slate-800">Student Name & Auto-Length Fit:</span>
                  <span className="ml-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Auto Font Size & Dynamic Alignment Active
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-1.5 text-[11px]">
                <span className="text-slate-400">Try Length:</span>
                <button
                  type="button"
                  onClick={() => onUpdateStudentName?.(currentStudentIndex, 'Ali Roy')}
                  className="px-2 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium"
                  title="Test short name"
                >
                  Short (7c)
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateStudentName?.(currentStudentIndex, 'Arun Kumar')}
                  className="px-2 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium"
                  title="Test medium name"
                >
                  Medium (10c)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateStudentName?.(
                      currentStudentIndex,
                      'Dr. Mohammed Abdul Rahman Al-Mansoor'
                    )
                  }
                  className="px-2 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-medium"
                  title="Test extra-long name"
                >
                  Long (36c)
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={currentStudent?.studentName || ''}
                onChange={(e) => onUpdateStudentName?.(currentStudentIndex, e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Type student name to test auto-scaling..."
              />
              <span className="text-[11px] text-slate-500 font-mono whitespace-nowrap">
                {currentStudent?.studentName?.length || 0} chars
              </span>
            </div>
          </div>

          {/* High-res rendered Canvas */}
          <div className="w-full aspect-[16/9] bg-slate-900/5 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center p-2 shadow-inner">
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-full object-contain rounded shadow-lg bg-white"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span className="flex items-center space-x-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Includes dynamic QR code linking to official verification portal</span>
            </span>
            <button
              onClick={() => onVerifyCertificate(currentStudent?.certificateNumber)}
              className="font-semibold text-sky-600 hover:text-sky-800"
            >
              Test Verification Page →
            </button>
          </div>
        </div>

        {/* Right: Generation Configuration & Actions (1 col) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-6 flex flex-col justify-between">
          <div className="space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">Bulk Generation Settings</h3>
              <p className="text-xs text-slate-500">Configure export format and trigger production run.</p>
            </div>

            {/* Batch Summary */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Batch Name:</span>
                <span className="font-bold text-slate-900 truncate max-w-[160px]">{batchName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Batch ID:</span>
                <span className="font-mono font-semibold text-slate-800">{batchId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Students:</span>
                <span className="font-bold text-indigo-700">{students.length} Certificates</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Template:</span>
                <span className="font-semibold text-slate-800 truncate max-w-[160px]">
                  {template.name}
                </span>
              </div>
            </div>

            {/* Export Format Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Output Format
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['pdf', 'png', 'jpg'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setExportFormat(fmt)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold uppercase transition-all ${
                      exportFormat === fmt
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* Authorized Issuer E-Signature Card using centralized AuthorizedSignatureManager */}
            <div className="space-y-1.5">
              <AuthorizedSignatureManager compact={true} />
            </div>

            {/* Single Student Download */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Single Preview Download
              </label>
              <button
                type="button"
                onClick={handleDownloadSingle}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center space-x-2 transition-colors"
              >
                <Download className="w-4 h-4 text-slate-500" />
                <span className="truncate">Download {currentStudent?.studentName} ({exportFormat.toUpperCase()})</span>
              </button>
            </div>
          </div>

          {/* Big Bulk Generate Action Button */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <button
              type="button"
              disabled={isGenerating || students.length === 0}
              onClick={handleStartBulkGeneration}
              className={`w-full py-3.5 px-4 rounded-xl text-sm font-extrabold flex items-center justify-center space-x-2 shadow-lg transition-all ${
                isGenerating
                  ? 'bg-slate-400 cursor-not-allowed text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/25 hover:shadow-indigo-500/40 active:scale-[0.99]'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Generating ({progressCount}/{students.length})...</span>
                </>
              ) : (
                <>
                  <FileArchive className="w-5 h-5" />
                  <span>GENERATE {students.length} CERTIFICATES</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-center text-slate-400">
              Generates individual files, packages a single ZIP archive, and registers in database.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
