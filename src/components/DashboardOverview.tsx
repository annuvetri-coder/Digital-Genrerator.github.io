import React, { useEffect, useState } from 'react';
import {
  Award,
  Calendar,
  CheckCircle,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FolderGit2,
  GraduationCap,
  PlusCircle,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { CertificateBatch, CertificateRecord } from '../types';
import { api } from '../services/api';
import { generateSampleExcelFile } from '../utils/excelParser';
import { useSettings } from '../context/SettingsContext';

interface DashboardOverviewProps {
  onStartGenerator: () => void;
  onViewBatches: () => void;
  onViewRecords: () => void;
  onVerifyCertificate: (certNumber?: string) => void;
  onOpenTemplates: () => void;
  onGoToMarks?: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  onStartGenerator,
  onViewBatches,
  onViewRecords,
  onVerifyCertificate,
  onOpenTemplates,
  onGoToMarks,
}) => {
  const { settings } = useSettings();
  const [batches, setBatches] = useState<CertificateBatch[]>([]);
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [b, c] = await Promise.all([api.getBatches(), api.getCertificates()]);
        setBatches(b);
        setCertificates(c);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const totalCertificates = certificates.length;
  const validCertificates = certificates.filter((c) => c.status === 'valid').length;
  const revokedCertificates = certificates.filter((c) => c.status === 'revoked').length;
  const totalBatches = batches.length;

  const filteredCertificates = certificates.filter(
    (c) =>
      c.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.certificateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.courseName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Welcome / Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-indigo-500/20 to-transparent pointer-events-none" />
        <div className="max-w-3xl relative z-10 space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-medium text-indigo-200 border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
            <span>Digital Certificate Management Engine</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Welcome to {settings.companyName || 'ITS YOUR TURN'}
          </h1>
          <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-2xl">
            Automatically generate hundreds of high-resolution digital certificates with Excel data mapping,
            tamper-proof serial numbering, QR verification, and instant ZIP/PDF bulk exports.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <button
              onClick={onStartGenerator}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-900/40"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create Certificate Batch</span>
            </button>
            <button
              onClick={() => generateSampleExcelFile()}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm border border-white/15 transition-all"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Download Sample Excel</span>
            </button>
            <button
              onClick={() => onVerifyCertificate()}
              className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-sm border border-white/15 transition-all"
            >
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              <span>Public Verification Portal</span>
            </button>
            {onGoToMarks && (
              <button
                onClick={onGoToMarks}
                className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-purple-600/90 hover:bg-purple-600 text-white font-semibold text-sm border border-purple-400/30 transition-all shadow-md shadow-purple-950/40"
              >
                <GraduationCap className="w-4 h-4 text-purple-200" />
                <span>External Mark Portal</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Certificates</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalCertificates}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Across all programs</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Batches</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalBatches}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Generated batches</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FolderGit2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Valid & Verified</p>
            <h3 className="text-2xl font-bold text-emerald-600 mt-1">{validCertificates}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Legitimate certificates</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Revoked</p>
            <h3 className="text-2xl font-bold text-rose-600 mt-1">{revokedCertificates}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Cancelled / reissued</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Two Column Section: Recent Batches & Recent Certificates */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Batches (Left 1 col) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-base">Recent Batches</h2>
            <button
              onClick={onViewBatches}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              View All ({batches.length})
            </button>
          </div>

          <div className="space-y-3">
            {batches.slice(0, 4).map((batch) => (
              <div
                key={batch.id}
                className="p-3.5 rounded-xl border border-slate-100 hover:border-indigo-200 bg-slate-50/50 hover:bg-indigo-50/20 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-slate-900 truncate max-w-[180px]">
                    {batch.name}
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                    {batch.studentCount} Students
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                  <span className="font-mono text-[11px] text-slate-600">{batch.batchId}</span>
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    <span>{batch.issueDate}</span>
                  </span>
                </div>
              </div>
            ))}

            {batches.length === 0 && (
              <div className="text-center py-8 text-slate-400 text-sm">
                No certificate batches generated yet. Click "Create Certificate Batch" to start!
              </div>
            )}
          </div>
        </div>

        {/* Issued Certificates Table (Right 2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-900 text-base">Recently Issued Certificates</h2>
              <p className="text-xs text-slate-500">Live registry of issued student certificates</p>
            </div>

            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search student, number, course..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-48 sm:w-64"
                />
              </div>
              <button
                onClick={onViewRecords}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 whitespace-nowrap"
              >
                Full Registry →
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-y border-slate-100 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Student Name</th>
                  <th className="py-2.5 px-3">Certificate Number</th>
                  <th className="py-2.5 px-3">Course</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCertificates.slice(0, 6).map((cert) => (
                  <tr key={cert.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-900">{cert.studentName}</td>
                    <td className="py-3 px-3 font-mono font-medium text-indigo-600">
                      {cert.certificateNumber}
                    </td>
                    <td className="py-3 px-3 text-slate-600">{cert.courseName}</td>
                    <td className="py-3 px-3 text-slate-500">{cert.issueDate}</td>
                    <td className="py-3 px-3">
                      {cert.status === 'valid' ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          VALID
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          REVOKED
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right space-x-1">
                      <button
                        onClick={() => onVerifyCertificate(cert.certificateNumber)}
                        title="Verify Certificate"
                        className="inline-flex items-center space-x-1 px-2 py-1 rounded-md text-[11px] font-medium text-sky-700 bg-sky-50 hover:bg-sky-100 transition-colors"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Verify</span>
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredCertificates.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      No certificates match your search query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
