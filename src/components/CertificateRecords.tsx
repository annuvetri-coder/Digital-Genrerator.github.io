import React, { useEffect, useState } from 'react';
import {
  AlertOctagon,
  CheckCircle2,
  Download,
  ExternalLink,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { CertificateRecord } from '../types';
import { api } from '../services/api';

interface CertificateRecordsProps {
  onVerifyCertificate: (certNum: string) => void;
}

export const CertificateRecords: React.FC<CertificateRecordsProps> = ({
  onVerifyCertificate,
}) => {
  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'revoked'>('all');
  const [selectedRecord, setSelectedRecord] = useState<CertificateRecord | null>(null);

  // Revoke Modal State
  const [revokingCert, setRevokingCert] = useState<CertificateRecord | null>(null);
  const [revokeReason, setRevokeReason] = useState('Duplicate record or administrative correction');

  const loadCertificates = async () => {
    try {
      const data = await api.getCertificates();
      setCertificates(data);
    } catch (err) {
      console.error('Failed to load certificate registry:', err);
    }
  };

  useEffect(() => {
    loadCertificates();
  }, []);

  const handleConfirmRevoke = async () => {
    if (!revokingCert) return;
    await api.updateCertificateStatus(
      revokingCert.certificateNumber,
      'revoked',
      revokeReason
    );
    setRevokingCert(null);
    await loadCertificates();
  };

  const handleReinstate = async (certNumber: string) => {
    if (confirm(`Reinstate certificate ${certNumber} to VALID status?`)) {
      await api.updateCertificateStatus(certNumber, 'valid');
      await loadCertificates();
    }
  };

  const handleExportCsv = () => {
    const exportData = certificates.map((c) => ({
      'Certificate Number': c.certificateNumber,
      'Student Name': c.studentName,
      'Course': c.courseName,
      'Issue Date': c.issueDate,
      'Batch ID': c.batchId,
      'Verification ID': c.verificationId,
      'Status': c.status.toUpperCase(),
      'Revoked Reason': c.revokedReason || '',
      'Created Date': c.createdAt,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Certificates');
    XLSX.writeFile(workbook, `Certificates_Registry_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const filtered = certificates.filter((c) => {
    const matchesSearch =
      c.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.certificateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.verificationId.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ? true : c.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header & Actions Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Certificate Registry Database
          </h1>
          <p className="text-xs text-slate-500">
            Official immutable ledger of all issued, verified, and revoked digital certificates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
            {(['all', 'valid', 'revoked'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg capitalize transition-all ${
                  statusFilter === st
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search name, cert #, course..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-48 sm:w-60"
            />
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Registry Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Certificate Number</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Course / Program</th>
                <th className="py-3 px-4">Issue Date</th>
                <th className="py-3 px-4">Batch ID</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((cert) => {
                const isValid = cert.status === 'valid';
                return (
                  <tr key={cert.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                      {cert.certificateNumber}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{cert.studentName}</td>
                    <td className="py-3 px-4 text-slate-600">{cert.courseName}</td>
                    <td className="py-3 px-4 text-slate-500">{cert.issueDate}</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">{cert.batchId}</td>
                    <td className="py-3 px-4">
                      {isValid ? (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>VALID</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertOctagon className="w-3 h-3 text-rose-600" />
                          <span>REVOKED</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => onVerifyCertificate(cert.certificateNumber)}
                        className="inline-flex items-center space-x-1 text-sky-600 hover:text-sky-800 font-semibold"
                        title="View Public Verification"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Verify</span>
                      </button>

                      {isValid ? (
                        <button
                          type="button"
                          onClick={() => setRevokingCert(cert)}
                          className="text-rose-600 hover:text-rose-800 font-semibold text-[11px] ml-1"
                        >
                          Revoke
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleReinstate(cert.certificateNumber)}
                          className="text-emerald-600 hover:text-emerald-800 font-semibold text-[11px] ml-1"
                        >
                          Reinstate
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No certificate records match your search or filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revoke Confirmation Modal */}
      {revokingCert && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Revoke Certificate</h3>
                <p className="text-xs text-slate-500 font-mono">
                  {revokingCert.certificateNumber} • {revokingCert.studentName}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Once revoked, anyone checking this certificate on the public verification portal will see{' '}
              <strong className="text-rose-600 font-bold">CERTIFICATE REVOKED</strong>.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Revocation Reason *
              </label>
              <textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                rows={3}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRevokingCert(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRevoke}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
              >
                Confirm Revocation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
