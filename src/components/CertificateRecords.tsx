import React, { useEffect, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Check,
  CheckCircle2,
  Database,
  Download,
  ExternalLink,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
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

  // Checkbox multi-select state
  const [selectedCertNumbers, setSelectedCertNumbers] = useState<Set<string>>(new Set());

  // Revoke / Untrust Modal State
  const [revokingCert, setRevokingCert] = useState<CertificateRecord | null>(null);
  const [revokeReason, setRevokeReason] = useState('Administrative untrust / revocation');

  // Delete Certificate Confirmation Modal State
  const [certToDelete, setCertToDelete] = useState<CertificateRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk Delete Confirmation Modal State
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  // Clear Data Modal State
  const [showClearDataModal, setShowClearDataModal] = useState(false);
  const [clearDataType, setClearDataType] = useState<'certificates' | 'batches' | 'all'>('certificates');
  const [clearConfirmText, setClearConfirmText] = useState('');
  const [isClearingData, setIsClearingData] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

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

  // Trust-free Toggle: 1-click or reason modal
  const handleToggleTrust = async (cert: CertificateRecord) => {
    if (cert.status === 'valid') {
      // Untrust / Revoke
      setRevokingCert(cert);
    } else {
      // Restore Trust / Valid
      await api.updateCertificateStatus(cert.certificateNumber, 'valid');
      showNotice(`Trust restored: Certificate ${cert.certificateNumber} is now Trusted & Valid.`);
      await loadCertificates();
    }
  };

  const handleConfirmRevoke = async () => {
    if (!revokingCert) return;
    await api.updateCertificateStatus(
      revokingCert.certificateNumber,
      'revoked',
      revokeReason
    );
    showNotice(`Certificate ${revokingCert.certificateNumber} marked as Untrusted / Revoked.`);
    setRevokingCert(null);
    await loadCertificates();
  };

  // Delete Individual Certificate
  const handleConfirmDeleteSingle = async () => {
    if (!certToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteCertificate(certToDelete.certificateNumber);
      showNotice(`Certificate ${certToDelete.certificateNumber} deleted permanently.`);
      setCertToDelete(null);
      setSelectedCertNumbers((prev) => {
        const next = new Set(prev);
        next.delete(certToDelete.certificateNumber);
        return next;
      });
      await loadCertificates();
    } catch (err: any) {
      alert('Failed to delete certificate: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Delete Bulk Selected Certificates
  const handleConfirmBulkDelete = async () => {
    if (selectedCertNumbers.size === 0) return;
    setIsDeleting(true);
    try {
      const numbers = Array.from(selectedCertNumbers);
      await api.deleteCertificatesBulk(numbers);
      showNotice(`${numbers.length} certificates deleted permanently.`);
      setSelectedCertNumbers(new Set());
      setShowBulkDeleteModal(false);
      await loadCertificates();
    } catch (err: any) {
      alert('Failed to bulk delete certificates: ' + err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Clear Data Handler
  const handleConfirmClearData = async () => {
    setIsClearingData(true);
    try {
      if (clearDataType === 'certificates') {
        await api.clearAllCertificates();
        showNotice('All certificate records cleared successfully.');
      } else if (clearDataType === 'batches') {
        await api.clearAllBatches();
        await api.clearAllCertificates();
        showNotice('All batches and certificates cleared successfully.');
      } else if (clearDataType === 'all') {
        await api.clearAllData({ keepSettings: true, keepTemplates: true });
        showNotice('All batches, certificates, and evaluations cleared successfully.');
      }
      setSelectedCertNumbers(new Set());
      setShowClearDataModal(false);
      setClearConfirmText('');
      await loadCertificates();
    } catch (err: any) {
      alert('Failed to clear data: ' + err.message);
    } finally {
      setIsClearingData(false);
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

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCertNumbers(new Set(filtered.map((c) => c.certificateNumber)));
    } else {
      setSelectedCertNumbers(new Set());
    }
  };

  const handleToggleSelectOne = (certNum: string) => {
    setSelectedCertNumbers((prev) => {
      const next = new Set(prev);
      if (next.has(certNum)) {
        next.delete(certNum);
      } else {
        next.add(certNum);
      }
      return next;
    });
  };

  const isAllSelected = filtered.length > 0 && filtered.every((c) => selectedCertNumbers.has(c.certificateNumber));

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {actionNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header & Actions Bar */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Certificate Registry Database
          </h1>
          <p className="text-xs text-slate-500">
            Official ledger of digital certificates. Delete certificates, manage trust status freely, or clear data.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Status Filter Tabs (Trust Management) */}
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'all'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({certificates.length})
            </button>
            <button
              onClick={() => setStatusFilter('valid')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'valid'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Trusted ({certificates.filter((c) => c.status === 'valid').length})
            </button>
            <button
              onClick={() => setStatusFilter('revoked')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                statusFilter === 'revoked'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Untrusted ({certificates.filter((c) => c.status === 'revoked').length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search cert #, student, course..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-44 sm:w-56"
            />
          </div>

          {/* Bulk Delete Button if selected */}
          {selectedCertNumbers.size > 0 && (
            <button
              type="button"
              onClick={() => setShowBulkDeleteModal(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Delete Selected ({selectedCertNumbers.size})</span>
            </button>
          )}

          {/* Export CSV Button */}
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>

          {/* Clear Data Button */}
          <button
            type="button"
            onClick={() => {
              setShowClearDataModal(true);
              setClearConfirmText('');
            }}
            className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors"
            title="Clear Data Options"
          >
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span>Clear Data...</span>
          </button>
        </div>
      </div>

      {/* Registry Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                    title="Select all"
                  />
                </th>
                <th className="py-3 px-4">Certificate Number</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Course / Program</th>
                <th className="py-3 px-4">Issue Date</th>
                <th className="py-3 px-4">Batch ID</th>
                <th className="py-3 px-4">Trust Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((cert) => {
                const isValid = cert.status === 'valid';
                const isSelected = selectedCertNumbers.has(cert.certificateNumber);

                return (
                  <tr
                    key={cert.id}
                    className={`transition-colors ${
                      isSelected ? 'bg-indigo-50/40' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="py-3 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelectOne(cert.certificateNumber)}
                        className="rounded text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
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
                          <span>TRUSTED</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertOctagon className="w-3 h-3 text-rose-600" />
                          <span>UNTRUSTED</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {/* Verify link */}
                      <button
                        type="button"
                        onClick={() => onVerifyCertificate(cert.certificateNumber)}
                        className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg text-sky-700 bg-sky-50 hover:bg-sky-100 font-semibold text-[11px] transition-colors"
                        title="View Public Verification"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
                        <span>Verify</span>
                      </button>

                      {/* Trust-free Toggle button */}
                      <button
                        type="button"
                        onClick={() => handleToggleTrust(cert)}
                        className={`inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                          isValid
                            ? 'text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200'
                            : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                        }`}
                        title={isValid ? 'Mark as untrusted / revoked' : 'Mark as trusted and valid'}
                      >
                        {isValid ? 'Untrust' : 'Trust'}
                      </button>

                      {/* Delete Certificate button */}
                      <button
                        type="button"
                        onClick={() => setCertToDelete(cert)}
                        className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 font-semibold text-[11px] transition-colors"
                        title="Delete this certificate permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Delete</span>
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No certificate records match your search or filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Untrust / Revoke Confirmation Modal */}
      {revokingCert && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-amber-600">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Untrust / Revoke Certificate</h3>
                <p className="text-xs text-slate-500 font-mono">
                  {revokingCert.certificateNumber} • {revokingCert.studentName}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Marking this certificate as untrusted will immediately display{' '}
              <strong className="text-rose-600 font-bold">CERTIFICATE UNTRUSTED / REVOKED</strong> on the official verification page. You can restore trust at any time.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Revocation / Untrust Reason
              </label>
              <textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                rows={3}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
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
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-sm"
              >
                Confirm Untrust
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Certificate Confirmation Modal */}
      {certToDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Delete Certificate</h3>
                <p className="text-xs text-slate-500 font-mono">
                  {certToDelete.certificateNumber} • {certToDelete.studentName}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently delete this certificate record?
              Once deleted, its verification link will no longer be found in the database.
            </p>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <div><strong className="text-slate-700">Course:</strong> {certToDelete.courseName}</div>
              <div><strong className="text-slate-700">Issue Date:</strong> {certToDelete.issueDate}</div>
              <div><strong className="text-slate-700">Batch ID:</strong> {certToDelete.batchId}</div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setCertToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDeleteSingle}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
              >
                {isDeleting ? 'Deleting...' : 'Delete Certificate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Modal */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Delete Selected Certificates</h3>
                <p className="text-xs text-slate-500">
                  {selectedCertNumbers.size} certificate(s) selected
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to permanently remove these <strong className="text-slate-900 font-bold">{selectedCertNumbers.size}</strong> certificates from the database? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShowBulkDeleteModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmBulkDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm"
              >
                {isDeleting ? 'Deleting...' : `Delete ${selectedCertNumbers.size} Certificates`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Data Modal */}
      {showClearDataModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center space-x-3 text-slate-900">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Data Management & Cleanup</h3>
                <p className="text-xs text-slate-500">
                  Purge database records or reset data on demand
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Data to Clear:
              </label>

              <div className="space-y-2">
                <label className="flex items-start space-x-3 p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 cursor-pointer">
                  <input
                    type="radio"
                    name="clearOption"
                    checked={clearDataType === 'certificates'}
                    onChange={() => setClearDataType('certificates')}
                    className="mt-0.5 text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Clear All Certificates Only ({certificates.length} records)
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Deletes all issued certificate records from verification database while preserving batches and templates.
                    </span>
                  </div>
                </label>

                <label className="flex items-start space-x-3 p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 cursor-pointer">
                  <input
                    type="radio"
                    name="clearOption"
                    checked={clearDataType === 'batches'}
                    onChange={() => setClearDataType('batches')}
                    className="mt-0.5 text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Clear All Batches & Associated Certificates
                    </span>
                    <span className="text-[11px] text-slate-500 block">
                      Purges all generated batches and all certificate records.
                    </span>
                  </div>
                </label>

                <label className="flex items-start space-x-3 p-3 rounded-xl border border-rose-200 bg-rose-50/30 cursor-pointer">
                  <input
                    type="radio"
                    name="clearOption"
                    checked={clearDataType === 'all'}
                    onChange={() => setClearDataType('all')}
                    className="mt-0.5 text-rose-600 focus:ring-rose-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-rose-900 block">
                      Wipe All System Data (Fresh Start)
                    </span>
                    <span className="text-[11px] text-rose-700 block">
                      Clears all certificates, batches, and examination marks sessions (preserves company branding settings).
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Type <span className="font-mono font-bold text-rose-600">CLEAR</span> to confirm:
              </label>
              <input
                type="text"
                value={clearConfirmText}
                onChange={(e) => setClearConfirmText(e.target.value.toUpperCase())}
                placeholder="CLEAR"
                className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={isClearingData}
                onClick={() => setShowClearDataModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isClearingData || clearConfirmText !== 'CLEAR'}
                onClick={handleConfirmClearData}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-all ${
                  clearConfirmText === 'CLEAR'
                    ? 'bg-rose-600 hover:bg-rose-700 cursor-pointer'
                    : 'bg-slate-300 cursor-not-allowed opacity-60'
                }`}
              >
                {isClearingData ? 'Clearing Data...' : 'Confirm Clear Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
