import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  BarChart3,
  Calendar,
  CheckCircle2,
  Download,
  Eye,
  FileArchive,
  FolderGit2,
  Loader2,
  Percent,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  StopCircle,
  TrendingUp,
  Trash2,
  Users,
  X,
  FileText,
  Image as ImageIcon,
  Lock,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import { CertificateBatch, CertificateRecord, StudentRecord } from '../types';
import { api } from '../services/api';
import {
  downloadSingleCertificate,
  generateBulkCertificatesZip,
  sanitizeFilename,
} from '../utils/pdfGenerator';
import { PRESET_TEMPLATES } from '../utils/defaultTemplates';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';

interface BatchesManagerProps {
  onCreateNewBatch: () => void;
  onVerifyCertificate: (certNum: string) => void;
}

export const BatchesManager: React.FC<BatchesManagerProps> = ({
  onCreateNewBatch,
  onVerifyCertificate,
}) => {
  const { settings } = useSettings();
  const { isCompanyAuthorized, authorizedCompanyEmail } = useAuth();
  const [batches, setBatches] = useState<CertificateBatch[]>([]);
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<CertificateBatch | null>(null);

  // --- ZIP PACKAGING MODAL & PROGRESS STATES ---
  const [activeZipBatch, setActiveZipBatch] = useState<CertificateBatch | null>(null);
  const [zipFormat, setZipFormat] = useState<'pdf' | 'png' | 'jpg'>('pdf');
  const [isPackagingZip, setIsPackagingZip] = useState(false);
  const [zipProgress, setZipProgress] = useState<{
    completed: number;
    total: number;
    currentStudent: string;
  }>({ completed: 0, total: 0, currentStudent: '' });
  const [zipSuccessMessage, setZipSuccessMessage] = useState<string | null>(null);
  const isZipCancelledRef = useRef(false);

  const loadData = async () => {
    try {
      const [batchList, certList] = await Promise.all([
        api.getBatches(),
        api.getCertificates(),
      ]);
      setBatches(batchList);
      setCertificates(certList);
    } catch (err) {
      console.error('Failed to load batches and certificates:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteBatch = async (batchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this batch and its records?')) {
      await api.deleteBatch(batchId);
      await loadData();
      if (selectedBatch?.batchId === batchId) setSelectedBatch(null);
    }
  };

  const handleDeleteStudentCert = async (certNumber: string, studentName: string) => {
    if (!confirm(`Permanently delete certificate for ${studentName} (${certNumber})?`)) return;
    await api.deleteCertificate(certNumber);
    if (selectedBatch) {
      const updatedStudents = (selectedBatch.students || []).filter((s) => s.certificateNumber !== certNumber);
      const updatedBatch: CertificateBatch = {
        ...selectedBatch,
        students: updatedStudents,
        studentCount: updatedStudents.length,
      };
      await api.saveBatch(updatedBatch);
      setSelectedBatch(updatedBatch);
    }
    await loadData();
  };

  // --- OPEN DOWNLOAD ALL AS ZIP DIALOG ---
  const handleOpenZipDialog = (batch: CertificateBatch, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setActiveZipBatch(batch);
    setZipSuccessMessage(null);
    setIsPackagingZip(false);
    setZipProgress({
      completed: 0,
      total: batch.students?.length || batch.studentCount,
      currentStudent: '',
    });
  };

  // --- EXECUTE DOWNLOAD ALL AS ZIP ---
  const handleExecuteDownloadAllZip = async () => {
    if (!isCompanyAuthorized) {
      alert(`Bulk certificate generation and ZIP download is restricted to the authorized company account (${authorizedCompanyEmail}). Please sign in with your company email.`);
      return;
    }
    if (!activeZipBatch) return;

    setIsPackagingZip(true);
    setZipSuccessMessage(null);
    isZipCancelledRef.current = false;
    const totalStudents = activeZipBatch.students?.length || activeZipBatch.studentCount;

    setZipProgress({
      completed: 0,
      total: totalStudents,
      currentStudent: 'Initializing...',
    });

    try {
      const templates = await api.getTemplates();
      const tmpl =
        templates.find((t) => t.id === activeZipBatch.templateId) ||
        PRESET_TEMPLATES[0];

      const { zipBlob, totalGenerated } = await generateBulkCertificatesZip({
        template: tmpl,
        students: activeZipBatch.students,
        settings,
        format: zipFormat,
        onProgress: (completed, total, currentStudent) => {
          setZipProgress({ completed, total, currentStudent });
        },
        shouldCancel: () => isZipCancelledRef.current,
      });

      // Trigger browser download
      const safeBatchId = sanitizeFilename(activeZipBatch.batchId || 'Batch');
      const filename = `${safeBatchId}_All_Certificates_${zipFormat.toUpperCase()}.zip`;
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);

      setZipSuccessMessage(
        `Successfully packaged and downloaded ${totalGenerated} certificates in ${filename}`
      );
    } catch (err: any) {
      if (err.message !== 'Generation cancelled by user') {
        alert('Failed to package certificates as ZIP: ' + err.message);
      }
    } finally {
      setIsPackagingZip(false);
    }
  };

  const handleCancelZipPackaging = () => {
    isZipCancelledRef.current = true;
    setIsPackagingZip(false);
  };

  // --- SINGLE CERTIFICATE DOWNLOAD IN MODAL ---
  const handleDownloadSingleCert = async (student: StudentRecord) => {
    if (!isCompanyAuthorized) {
      alert(`Certificate downloading is restricted to the authorized company account (${authorizedCompanyEmail}). Please sign in with your company email.`);
      return;
    }
    if (!selectedBatch) return;
    try {
      const templates = await api.getTemplates();
      const tmpl =
        templates.find((t) => t.id === selectedBatch.templateId) ||
        PRESET_TEMPLATES[0];

      await downloadSingleCertificate(tmpl, student, settings, 'pdf');
    } catch (err: any) {
      alert('Failed to download certificate: ' + err.message);
    }
  };

  // --- STATS CALCULATIONS ---
  const totalCertificates = useMemo(() => {
    if (certificates.length > 0) return certificates.length;
    return batches.reduce((acc, b) => acc + (b.studentCount || b.students?.length || 0), 0);
  }, [certificates, batches]);

  const validCertificatesCount = useMemo(() => {
    return certificates.filter((c) => c.status === 'valid').length;
  }, [certificates]);

  const successRate = useMemo(() => {
    if (totalCertificates === 0) return '100.0';
    const rate = (validCertificatesCount / totalCertificates) * 100;
    return rate.toFixed(1);
  }, [totalCertificates, validCertificatesCount]);

  const totalBatchesCount = batches.length;

  const avgBatchSize = useMemo(() => {
    if (totalBatchesCount === 0) return 0;
    return Math.round(totalCertificates / totalBatchesCount);
  }, [totalCertificates, totalBatchesCount]);

  // --- MONTHLY DATA FOR RECHARTS BAR CHART ---
  const monthlyChartData = useMemo(() => {
    const monthsMap = new Map<string, { month: string; certificates: number; batches: number; order: number }>();
    const baseDate = new Date('2026-10-01T00:00:00Z');

    for (let i = 5; i >= 0; i--) {
      const d = new Date(baseDate);
      d.setMonth(d.getMonth() - i);
      const key = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      monthsMap.set(key, {
        month: key,
        certificates: 0,
        batches: 0,
        order: 5 - i,
      });
    }

    batches.forEach((b) => {
      let dateObj: Date | null = null;
      if (b.createdAt) {
        const parsed = new Date(b.createdAt);
        if (!isNaN(parsed.getTime())) dateObj = parsed;
      }
      if (!dateObj && b.issueDate) {
        const parsed = new Date(b.issueDate);
        if (!isNaN(parsed.getTime())) dateObj = parsed;
      }
      if (!dateObj) dateObj = baseDate;

      const key = dateObj.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      const count = b.studentCount || b.students?.length || 0;

      if (monthsMap.has(key)) {
        const item = monthsMap.get(key)!;
        item.certificates += count;
        item.batches += 1;
      } else {
        monthsMap.set(key, {
          month: key,
          certificates: count,
          batches: 1,
          order: 99,
        });
      }
    });

    return Array.from(monthsMap.values());
  }, [batches]);

  const filteredBatches = batches.filter(
    (b) =>
      b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.batchId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.courseName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const percentZipProgress =
    zipProgress.total > 0
      ? Math.round((zipProgress.completed / zipProgress.total) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Certificate Batches
          </h1>
          <p className="text-xs text-slate-500">
            Manage, package, and download complete certificate batches into compressed ZIP archives.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search batches..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-48 sm:w-64"
            />
          </div>
          <button
            onClick={onCreateNewBatch}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>New Batch</span>
          </button>
        </div>
      </div>

      {/* Visual Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Generated */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Generated
            </p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{totalCertificates}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Certificates created</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Success Rate
            </p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">{successRate}%</h3>
            <p className="text-xs text-slate-500 mt-0.5">Valid & non-revoked</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Total Batches */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Total Batches
            </p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{totalBatchesCount}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Production runs</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FolderGit2 className="w-6 h-6" />
          </div>
        </div>

        {/* Avg Batch Volume */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Avg. Batch Size
            </p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{avgBatchSize}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Students / batch</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Monthly Generation Volume Chart with Recharts */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Monthly Generation Volume</h2>
              <p className="text-xs text-slate-500">
                Number of digital certificates generated by month
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
              <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
              <span>Certificates Generated</span>
            </span>
          </div>
        </div>

        {/* Recharts Bar Chart Container */}
        <div className="h-64 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlyChartData}
              margin={{ top: 10, right: 15, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis
                dataKey="month"
                tick={{ fill: '#64748B', fontSize: 11, fontWeight: 500 }}
                axisLine={{ stroke: '#E2E8F0' }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: '#64748B', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1 border border-slate-800">
                        <p className="font-bold text-indigo-300">{data.month}</p>
                        <p className="flex justify-between gap-4 text-slate-200">
                          <span>Certificates:</span>
                          <strong className="text-white font-mono">{data.certificates}</strong>
                        </p>
                        <p className="flex justify-between gap-4 text-slate-400 text-[11px]">
                          <span>Batches:</span>
                          <span className="font-mono">{data.batches}</span>
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="certificates" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {monthlyChartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.certificates > 0 ? '#4F46E5' : '#E2E8F0'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Batches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredBatches.map((batch) => (
          <div
            key={batch.id}
            onClick={() => setSelectedBatch(batch)}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-indigo-700">
                  {batch.batchId}
                </span>
                <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>{batch.issueDate}</span>
                </span>
              </div>

              <h3 className="font-bold text-base text-slate-900 group-hover:text-indigo-600 line-clamp-1">
                {batch.name}
              </h3>
              <p className="text-xs text-slate-500 mt-1 line-clamp-1">Course: {batch.courseName}</p>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="flex items-center space-x-1.5 text-slate-600 font-semibold">
                  <Users className="w-4 h-4 text-indigo-500" />
                  <span>{batch.studentCount} Students</span>
                </span>
                <span className="text-slate-400 text-[11px] truncate max-w-[120px]">
                  {batch.templateName}
                </span>
              </div>
            </div>

            {/* Batch Action Buttons with prominent "Download All as ZIP" */}
            <div className="pt-2 flex items-center space-x-2">
              <button
                type="button"
                onClick={(e) => handleOpenZipDialog(batch, e)}
                className="flex-1 inline-flex items-center justify-center space-x-1.5 py-2.5 px-3.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 text-xs font-bold transition-all border border-indigo-200/80 shadow-2xs"
                title="Download All certificates in this batch as a single ZIP file"
              >
                <FileArchive className="w-4 h-4 text-indigo-600" />
                <span>Download All as ZIP</span>
              </button>

              <button
                type="button"
                onClick={(e) => handleDeleteBatch(batch.batchId, e)}
                className="p-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Delete Batch"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}

        {filteredBatches.length === 0 && (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200 p-8 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <FolderGit2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">No certificate batches found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Create a new certificate batch from an Excel spreadsheet to start generating student certificates.
            </p>
            <button
              onClick={onCreateNewBatch}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create First Batch</span>
            </button>
          </div>
        )}
      </div>

      {/* Batch Details Modal */}
      {selectedBatch && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-7 space-y-5 shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-extrabold text-slate-900 text-lg">{selectedBatch.name}</h3>
                  <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {selectedBatch.batchId}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Course: <strong className="text-slate-700">{selectedBatch.courseName}</strong> •{' '}
                  {selectedBatch.students.length} Total Students • Issue Date: {selectedBatch.issueDate}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBatch(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Students Table in Batch with Individual Actions */}
            <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-200 shadow-2xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px] sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Certificate Number</th>
                    <th className="py-2.5 px-3">Course</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedBatch.students.map((st, idx) => (
                    <tr key={st.id || idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-slate-400">{st.serialNo || idx + 1}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">{st.studentName}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">
                        {st.certificateNumber}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{st.courseName}</td>
                      <td className="py-2.5 px-3 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleDownloadSingleCert(st)}
                          className="inline-flex items-center space-x-1 text-slate-500 hover:text-indigo-600 font-semibold"
                          title="Download single PDF certificate"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBatch(null);
                            onVerifyCertificate(st.certificateNumber);
                          }}
                          className="text-[11px] font-semibold text-sky-600 hover:text-sky-800 underline"
                        >
                          Verify
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStudentCert(st.certificateNumber, st.studentName)}
                          className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 underline ml-1"
                          title="Delete Certificate"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Bottom Footer with Prominent 'Download All as ZIP' */}
            <div className="flex flex-col sm:flex-row items-center justify-between pt-3 border-t border-slate-100 gap-3">
              <span className="text-xs text-slate-500">
                Created: {new Date(selectedBatch.createdAt).toLocaleDateString()}
              </span>

              <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedBatch(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenZipDialog(selectedBatch)}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-md shadow-indigo-500/25 transition-all"
                >
                  <FileArchive className="w-4 h-4" />
                  <span>Download All as ZIP</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DEDICATED 'DOWNLOAD ALL AS ZIP' PACKAGING MODAL */}
      {activeZipBatch && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 space-y-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              type="button"
              disabled={isPackagingZip}
              onClick={() => setActiveZipBatch(null)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-40"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-xs">
                <FileArchive className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Download All as ZIP
                  </h3>
                  {isCompanyAuthorized ? (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Authorized Issuer</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                      <Lock className="w-3 h-3 text-amber-600" />
                      <span>Company Sign-In Required</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Package all certificates in batch{' '}
                  <strong className="text-slate-700 font-mono">{activeZipBatch.batchId}</strong> into a single archive
                </p>
              </div>
            </div>

            {!isCompanyAuthorized && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                <div className="flex items-center space-x-1.5 font-bold">
                  <Lock className="w-3.5 h-3.5 text-amber-700" />
                  <span>Restricted Access to Company Mail</span>
                </div>
                <p className="text-[11px] text-amber-800">
                  Certificate generation & bulk export is strictly authorized for company account:{' '}
                  <strong className="font-mono">{authorizedCompanyEmail}</strong>.
                </p>
              </div>
            )}

            {/* Batch Info Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Batch Name:</span>
                <span className="font-bold text-slate-800 truncate max-w-[240px]">
                  {activeZipBatch.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Certificates:</span>
                <span className="font-bold text-indigo-700">
                  {activeZipBatch.students?.length || activeZipBatch.studentCount} certificates
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Naming Format:</span>
                <span className="font-mono text-slate-600 text-[11px]">
                  [CertNumber]_[StudentName].{zipFormat}
                </span>
              </div>
            </div>

            {/* Format Selection (Enabled before packaging) */}
            {!isPackagingZip && !zipSuccessMessage && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Select Packaging Format
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setZipFormat('pdf')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center space-y-1 transition-all ${
                      zipFormat === 'pdf'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/10'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>PDF (Vector)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setZipFormat('png')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center space-y-1 transition-all ${
                      zipFormat === 'png'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/10'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>PNG (Lossless)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setZipFormat('jpg')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center space-y-1 transition-all ${
                      zipFormat === 'jpg'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/10'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>JPG (Compact)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Live Packaging Progress */}
            {isPackagingZip && (
              <div className="space-y-3 p-4 rounded-2xl bg-slate-900 text-white border border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center space-x-2 font-bold text-indigo-300">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                    <span>Packaging Certificates into ZIP...</span>
                  </span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {zipProgress.completed} / {zipProgress.total} ({percentZipProgress}%)
                  </span>
                </div>

                {/* Animated progress bar */}
                <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700 p-0.5">
                  <div
                    className="bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 h-full rounded-full transition-all duration-150"
                    style={{ width: `${percentZipProgress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="truncate max-w-[280px]">
                    Current: <strong className="text-slate-200">{zipProgress.currentStudent || 'Rendering...'}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={handleCancelZipPackaging}
                    className="inline-flex items-center space-x-1 text-rose-400 hover:text-rose-300 font-semibold"
                  >
                    <StopCircle className="w-3.5 h-3.5" />
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
            )}

            {/* Success Notification */}
            {zipSuccessMessage && (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1 text-xs">
                <div className="flex items-center space-x-2 font-bold text-sm text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>ZIP Download Complete!</span>
                </div>
                <p className="text-emerald-700">{zipSuccessMessage}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isPackagingZip}
                onClick={() => setActiveZipBatch(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-40"
              >
                {zipSuccessMessage ? 'Done' : 'Cancel'}
              </button>

              <button
                type="button"
                disabled={isPackagingZip}
                onClick={handleExecuteDownloadAllZip}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/25 transition-all disabled:opacity-50"
              >
                {isPackagingZip ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Packaging ({zipProgress.completed}/{zipProgress.total})...</span>
                  </>
                ) : zipSuccessMessage ? (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>Download Again</span>
                  </>
                ) : (
                  <>
                    <FileArchive className="w-4 h-4" />
                    <span>Package & Download All as ZIP</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
