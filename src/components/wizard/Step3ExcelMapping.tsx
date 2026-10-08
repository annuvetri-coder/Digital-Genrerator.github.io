import React, { useRef, useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  Sparkles,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  ClipboardPaste,
  Layers,
  HelpCircle,
  Check,
} from 'lucide-react';
import { ExcelColumnMapping } from '../../types';
import {
  detectDefaultMappings,
  generateSampleExcelFile,
  parseExcelFile,
  parsePastedText,
  ParsedSheetData,
} from '../../utils/excelParser';

interface Step3Props {
  mapping: ExcelColumnMapping;
  setMapping: (m: ExcelColumnMapping) => void;
  parsedData: ParsedSheetData | null;
  setParsedData: (data: ParsedSheetData | null) => void;
  onLoadSampleData: () => void;
  courseNameFallback: string;
  issueDateFallback: string;
}

export const Step3ExcelMapping: React.FC<Step3Props> = ({
  mapping,
  setMapping,
  parsedData,
  setParsedData,
  onLoadSampleData,
  courseNameFallback,
  issueDateFallback,
}) => {
  const [activeInputTab, setActiveInputTab] = useState<'upload' | 'paste'>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [rawFile, setRawFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File, sheetName?: string) => {
    setErrorMsg(null);
    try {
      setRawFile(file);
      const data = await parseExcelFile(file, sheetName);
      setParsedData(data);
      const autoMappings = detectDefaultMappings(data.headers);
      setMapping(autoMappings);
    } catch (err: any) {
      console.error('Excel parse error:', err);
      setErrorMsg(
        err.message ||
          'Failed to parse file. Please ensure it is an intact .xlsx, .xls, or .csv document.'
      );
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSheetChange = (newSheetName: string) => {
    if (rawFile) {
      handleFileUpload(rawFile, newSheetName);
    }
  };

  const handlePastedDataSubmit = () => {
    setErrorMsg(null);
    try {
      const data = parsePastedText(pastedText);
      setParsedData(data);
      const autoMappings = detectDefaultMappings(data.headers);
      setMapping(autoMappings);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to parse pasted text. Please verify the header row.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  const headers = parsedData?.headers || [];
  const isNameMapped = Boolean(mapping.studentNameColumn);

  return (
    <div className="space-y-6">
      {/* Upload Zone & Quick Sample Actions */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Upload Student Spreadsheet</h2>
            <p className="text-xs text-slate-500">
              Upload an Excel (.xlsx, .xls) / CSV file, or paste your student table directly.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => generateSampleExcelFile()}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Sample Excel</span>
            </button>
            <button
              type="button"
              onClick={onLoadSampleData}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Use Sample Data</span>
            </button>
          </div>
        </div>

        {/* Tab Toggle: File Upload vs Direct Text Paste */}
        <div className="flex border-b border-slate-200 gap-4">
          <button
            type="button"
            onClick={() => setActiveInputTab('upload')}
            className={`pb-2.5 text-xs font-bold border-b-2 transition-colors flex items-center space-x-2 ${
              activeInputTab === 'upload'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Upload File (.xlsx, .xls, .csv)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveInputTab('paste')}
            className={`pb-2.5 text-xs font-bold border-b-2 transition-colors flex items-center space-x-2 ${
              activeInputTab === 'paste'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ClipboardPaste className="w-4 h-4" />
            <span>Copy & Paste Data Directly</span>
          </button>
        </div>

        {activeInputTab === 'upload' ? (
          /* Drop Zone */
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-indigo-600 bg-indigo-50/50 scale-[0.99]'
                : 'border-slate-300 hover:border-indigo-500 bg-slate-50/50 hover:bg-indigo-50/15'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />

            <div className="max-w-md mx-auto space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-2 shadow-xs">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">
                Drag & drop your Excel or CSV file here, or{' '}
                <span className="text-indigo-600 underline">browse files</span>
              </p>
              <p className="text-xs text-slate-500">
                Supports standard <strong>.XLSX, .XLS, and .CSV</strong> spreadsheets. Automatically handles title banners and finds student records.
              </p>
            </div>
          </div>
        ) : (
          /* Paste Direct Input */
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Paste rows from Excel or Google Sheets (with headers):
            </label>
            <textarea
              rows={5}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder={`Student Name\tCourse\tDate\nArun Kumar\tIoT Training\t05 October 2026\nBala Kumar\tIoT Training\t05 October 2026`}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handlePastedDataSubmit}
                disabled={!pastedText.trim()}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm disabled:opacity-50 transition-colors"
              >
                Parse Pasted Rows
              </button>
            </div>
          </div>
        )}

        {/* Error Feedback */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start space-x-2 text-rose-800 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
            <div className="space-y-1">
              <p className="font-bold">Spreadsheet Upload Issue</p>
              <p>{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Success Confirmation & Multi-sheet Selector */}
        {parsedData && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>
                  Loaded <strong>{parsedData.fileName}</strong> •{' '}
                  <strong className="text-emerald-700">{parsedData.totalRows} student records detected</strong>
                </span>
              </div>

              {/* Multi-Sheet Tab Selector */}
              {parsedData.sheetNames && parsedData.sheetNames.length > 1 && (
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-semibold text-emerald-800">Sheet Tab:</span>
                  <select
                    value={parsedData.activeSheetName || parsedData.sheetNames[0]}
                    onChange={(e) => handleSheetChange(e.target.value)}
                    className="px-2 py-1 rounded-lg border border-emerald-300 bg-white text-xs font-bold text-slate-800 focus:outline-none"
                  >
                    {parsedData.sheetNames.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Column Mapping Section */}
      {parsedData && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Map Spreadsheet Columns to Certificate Fields
              </h3>
              <p className="text-xs text-slate-500">
                Confirm which column corresponds to student names, program title, and issue date.
              </p>
            </div>

            {!isNameMapped && (
              <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                Action required: Select Student Name Column
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Student Name */}
            <div
              className={`p-3.5 rounded-xl border space-y-1.5 transition-all ${
                isNameMapped
                  ? 'border-indigo-200 bg-indigo-50/20'
                  : 'border-rose-300 bg-rose-50/20 ring-2 ring-rose-400/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-indigo-700">{'{{STUDENT_NAME}}'}</span>
                <span className="text-[10px] font-bold text-rose-600 uppercase">Required</span>
              </div>
              <label className="block text-xs font-medium text-slate-700">Student Name Column</label>
              <select
                value={mapping.studentNameColumn}
                onChange={(e) => setMapping({ ...mapping, studentNameColumn: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-medium focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">-- Select Column --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* Course Name */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/40 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-700">{'{{COURSE_NAME}}'}</span>
                <span className="text-[10px] text-slate-400">or Batch Default</span>
              </div>
              <label className="block text-xs font-medium text-slate-700">Course Column</label>
              <select
                value={mapping.courseColumn}
                onChange={(e) => setMapping({ ...mapping, courseColumn: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-medium focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">(Use Batch: "{courseNameFallback}")</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Column */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/40 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-700">{'{{DATE}}'}</span>
                <span className="text-[10px] text-slate-400">or Batch Default</span>
              </div>
              <label className="block text-xs font-medium text-slate-700">Issue Date Column</label>
              <select
                value={mapping.dateColumn}
                onChange={(e) => setMapping({ ...mapping, dateColumn: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-medium focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">(Use Batch: "{issueDateFallback}")</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>

            {/* Serial No */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/40 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-700">{'{{S.NO}}'}</span>
                <span className="text-[10px] text-slate-400">Optional</span>
              </div>
              <label className="block text-xs font-medium text-slate-700">S.No / ID Column</label>
              <select
                value={mapping.serialNoColumn || ''}
                onChange={(e) => setMapping({ ...mapping, serialNoColumn: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs bg-white font-medium focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="">(Auto-assign 1, 2, 3...)</option>
                {headers.map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Spreadsheet Raw Preview Table */}
          <div className="pt-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Detected Rows Preview (Showing first 5 entries)
            </h4>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100/70 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    {headers.map((h) => (
                      <th key={h} className="py-2.5 px-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {parsedData.rows.slice(0, 5).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      {headers.map((h) => (
                        <td key={h} className="py-2.5 px-3 text-slate-700">
                          {String(row[h] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
