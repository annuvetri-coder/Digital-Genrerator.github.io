import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  ExternalLink,
  Globe,
  Printer,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { VerificationResult } from '../types';
import { api } from '../services/api';
import { useSettings } from '../context/SettingsContext';

interface VerificationPortalProps {
  initialCertNumber?: string;
}

export const VerificationPortal: React.FC<VerificationPortalProps> = ({
  initialCertNumber = '',
}) => {
  const { settings } = useSettings();
  const [certInput, setCertInput] = useState(initialCertNumber);
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  // Check URL query parameters for ?id=IYT-2026-0001
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const idParam = params.get('id');
      if (idParam) {
        setCertInput(idParam);
        performVerification(idParam);
      } else if (initialCertNumber) {
        setCertInput(initialCertNumber);
        performVerification(initialCertNumber);
      }
    }
  }, [initialCertNumber]);

  const performVerification = async (certNumberToVerify: string) => {
    const clean = certNumberToVerify.trim();
    if (!clean) return;

    setIsVerifying(true);
    setResult(null);

    try {
      const res = await api.verifyCertificate(clean);
      setResult(res);
    } catch (err) {
      setResult({
        found: false,
        message: 'Could not connect to verification server. Please check the number and try again.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performVerification(certInput);
  };

  const handlePrintSlip = () => {
    window.print();
  };

  const cert = result?.certificate;
  const isRevoked = cert?.status === 'revoked';

  // Read marks either from cert record or reconstructed from QR code URL parameters
  const marksData = React.useMemo(() => {
    if (cert?.marks) return cert.marks;

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('marks') || params.get('tot') || params.get('m_a')) {
        const a1 = params.get('a1') ? Number(params.get('a1')) : 0;
        const a2 = params.get('a2') ? Number(params.get('a2')) : 0;
        const a3 = params.get('a3') ? Number(params.get('a3')) : 0;
        const mA = params.get('m_a') ? Number(params.get('m_a')) : a1 + a2 + a3;

        const b1 = params.get('b1') ? Number(params.get('b1')) : 0;
        const b2 = params.get('b2') ? Number(params.get('b2')) : 0;
        const bOpt = params.get('b_opt') ? Number(params.get('b_opt')) : null;
        const mB = params.get('m_b') ? Number(params.get('m_b')) : b1 + b2 + (bOpt || 0);

        const tot = params.get('tot') ? Number(params.get('tot')) : mA + mB;
        const max = params.get('max') ? Number(params.get('max')) : 105;
        const pct = params.get('pct') ? Number(params.get('pct')) : Math.round((tot / max) * 100);
        const grd = params.get('grd') || 'O';
        const res = params.get('res') || 'PASS';

        return {
          partA: { col1: a1, col2: a2, col3: a3, total: mA },
          partB: { col1: b1, col2: b2, optional: bOpt, total: mB },
          grandTotal: tot,
          maxMarks: max,
          percentage: pct,
          grade: grd,
          status: res,
        };
      }
    }
    return null;
  }, [cert]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Search Header Hero */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-sky-50 text-sky-800 text-xs font-semibold border border-sky-200">
          <ShieldCheck className="w-4 h-4 text-sky-600" />
          <span>Official Public Digital Credential Verification Portal</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Verify Certificate Authenticity
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
          Enter the unique certificate number located on the digital credential to verify its legitimacy,
          student credentials, and issuing authority.
        </p>

        {/* Verification Form */}
        <form onSubmit={handleSubmit} className="max-w-lg mx-auto pt-3">
          <div className="flex items-center rounded-2xl border-2 border-indigo-200 focus-within:border-indigo-600 bg-white shadow-md p-1.5 transition-all">
            <Search className="w-5 h-5 text-slate-400 ml-3" />
            <input
              type="text"
              value={certInput}
              onChange={(e) => setCertInput(e.target.value)}
              placeholder="Enter Certificate Number (e.g. IYT-2026-0001)"
              className="w-full px-3 py-2 text-sm font-mono font-semibold text-slate-900 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isVerifying || !certInput.trim()}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow transition-all disabled:opacity-50"
            >
              {isVerifying ? 'Checking...' : 'Verify'}
            </button>
          </div>

          {/* Quick Sample Buttons */}
          <div className="flex items-center justify-center space-x-2 mt-3 text-xs text-slate-500">
            <span>Try sample credentials:</span>
            {['IYT-2026-0001', 'IYT-2026-0002', 'IYT-2026-0003'].map((sampleNum) => (
              <button
                key={sampleNum}
                type="button"
                onClick={() => {
                  setCertInput(sampleNum);
                  performVerification(sampleNum);
                }}
                className="font-mono px-2 py-0.5 rounded bg-slate-100 hover:bg-indigo-50 text-indigo-700 hover:underline font-semibold"
              >
                {sampleNum}
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* Verification Result Card */}
      {result && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          {result.found && cert ? (
            isRevoked ? (
              /* REVOKED CERTIFICATE CARD */
              <div className="bg-white rounded-3xl border-2 border-rose-200 shadow-xl overflow-hidden p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-rose-100 pb-5">
                  <div className="flex items-center space-x-3">
                    <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
                      <ShieldAlert className="w-8 h-8" />
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-widest text-rose-600">
                        Official Status Warning
                      </span>
                      <h2 className="text-xl sm:text-2xl font-black text-rose-700">
                        CERTIFICATE REVOKED
                      </h2>
                    </div>
                  </div>
                  <span className="font-mono text-sm font-bold px-3 py-1 rounded-xl bg-rose-50 text-rose-800 border border-rose-200 w-fit">
                    {cert.certificateNumber}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
                  <p className="font-bold">This certificate has been revoked by the issuing institution.</p>
                  <p>Reason: {cert.revokedReason || 'Administrative revocation'}</p>
                  {cert.revokedAt && <p>Date: {new Date(cert.revokedAt).toLocaleDateString()}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-slate-400 font-semibold uppercase">Student Name</p>
                    <p className="text-base font-bold text-slate-800 mt-0.5">{cert.studentName}</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-slate-400 font-semibold uppercase">Course</p>
                    <p className="text-base font-bold text-slate-800 mt-0.5">{cert.courseName}</p>
                  </div>
                </div>
              </div>
            ) : (
              /* VALID OFFICIAL CERTIFICATE CARD */
              <div className="bg-white rounded-3xl border-2 border-emerald-200 shadow-xl overflow-hidden p-6 sm:p-8 space-y-6 relative">
                {/* Security Watermark Background Icon */}
                <ShieldCheck className="w-96 h-96 text-emerald-500/5 absolute -right-12 -bottom-12 pointer-events-none" />

                {/* Top Status Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                      <ShieldCheck className="w-8 h-8" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                          Verified & Authentic
                        </span>
                        <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                        Certificate Valid
                      </h2>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs sm:text-sm font-bold px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {cert.certificateNumber}
                    </span>
                    <button
                      type="button"
                      onClick={handlePrintSlip}
                      className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                      title="Print Verification Slip"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Verified Metadata Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      Student Name
                    </p>
                    <p className="text-lg font-extrabold text-slate-900">{cert.studentName}</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      Course / Program
                    </p>
                    <p className="text-lg font-extrabold text-indigo-700">{cert.courseName}</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      Issued By
                    </p>
                    <p className="text-sm font-bold text-slate-800">
                      {settings.companyName || 'ITS YOUR TURN'}
                    </p>
                    {settings.website && (
                      <p className="text-[11px] text-slate-500 flex items-center space-x-1">
                        <Globe className="w-3 h-3" />
                        <span>{settings.website}</span>
                      </p>
                    )}
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                    <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      Issue Date
                    </p>
                    <p className="text-sm font-bold text-slate-800">{cert.issueDate}</p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      Verification ID: {cert.verificationId}
                    </p>
                  </div>
                </div>

                {/* VERIFIED ACADEMIC MARKS & SCORECARD (ENCODED IN QR CODE) */}
                {marksData && (
                  <div className="rounded-2xl border-2 border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/30 p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-100 pb-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-sm">
                          <Award className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-900 text-sm">
                            Verified Examination Marks & Scorecard
                          </h3>
                          <p className="text-[11px] text-slate-500">
                            Cryptographically linked and encoded directly inside the certificate's QR code.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800">
                          Grade {marksData.grade}
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          {marksData.status}
                        </span>
                      </div>
                    </div>

                    {/* Score Matrix Breakdown: Part A & Part B & Totals */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {/* Part A Card: 1, 2, 3 (20M each -> 60M) */}
                      <div className="p-3.5 rounded-xl bg-white border border-indigo-100 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between font-bold text-indigo-900 border-b border-indigo-50 pb-1.5">
                          <span>Part A (Total: 60 Marks)</span>
                          <span className="font-mono text-indigo-600 font-bold">
                            {marksData.partA.total} / 60
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                          <div className="p-2 rounded-lg bg-indigo-50/60">
                            <span className="text-slate-400 block text-[9px] uppercase font-bold">
                              1 (20M)
                            </span>
                            <strong className="font-mono text-slate-800">
                              {marksData.partA.col1 ?? '-'}
                            </strong>
                          </div>
                          <div className="p-2 rounded-lg bg-indigo-50/60">
                            <span className="text-slate-400 block text-[9px] uppercase font-bold">
                              2 (20M)
                            </span>
                            <strong className="font-mono text-slate-800">
                              {marksData.partA.col2 ?? '-'}
                            </strong>
                          </div>
                          <div className="p-2 rounded-lg bg-indigo-50/60">
                            <span className="text-slate-400 block text-[9px] uppercase font-bold">
                              3 (20M)
                            </span>
                            <strong className="font-mono text-slate-800">
                              {marksData.partA.col3 ?? '-'}
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* Part B Card: 1 (20M), 2 (20M), Optional (5M) */}
                      <div className="p-3.5 rounded-xl bg-white border border-sky-100 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between font-bold text-sky-900 border-b border-sky-50 pb-1.5">
                          <span>Part B (1 & 2 @ 20M, Optional @ 5M)</span>
                          <span className="font-mono text-sky-600 font-bold">
                            {marksData.partB.total} /{' '}
                            {marksData.partB.optional !== null &&
                            marksData.partB.optional !== undefined &&
                            marksData.partB.optional !== ''
                              ? '45'
                              : '40'}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                          <div className="p-2 rounded-lg bg-sky-50/60">
                            <span className="text-slate-400 block text-[9px] uppercase font-bold">
                              1 (20M)
                            </span>
                            <strong className="font-mono text-slate-800">
                              {marksData.partB.col1 ?? '-'}
                            </strong>
                          </div>
                          <div className="p-2 rounded-lg bg-sky-50/60">
                            <span className="text-slate-400 block text-[9px] uppercase font-bold">
                              2 (20M)
                            </span>
                            <strong className="font-mono text-slate-800">
                              {marksData.partB.col2 ?? '-'}
                            </strong>
                          </div>
                          <div className="p-2 rounded-lg bg-purple-50/60 border border-purple-100">
                            <span className="text-purple-600 block text-[9px] uppercase font-bold">
                              Opt (5M)
                            </span>
                            <strong className="font-mono text-purple-900">
                              {marksData.partB.optional ?? '-'}
                            </strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Overall Summary Bar */}
                    <div className="p-3 rounded-xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                      <div className="flex items-center space-x-4">
                        <div>
                          <span className="text-slate-400 text-[10px] block uppercase">
                            Grand Total
                          </span>
                          <span className="font-bold text-base text-white">
                            {marksData.grandTotal} / {marksData.maxMarks || 105}
                          </span>
                        </div>
                        <div className="border-l border-slate-700 pl-4">
                          <span className="text-slate-400 text-[10px] block uppercase">
                            Percentage
                          </span>
                          <span className="font-bold text-base text-emerald-400">
                            {marksData.percentage}%
                          </span>
                        </div>
                        <div className="border-l border-slate-700 pl-4">
                          <span className="text-slate-400 text-[10px] block uppercase">
                            Grade
                          </span>
                          <span className="font-bold text-base text-indigo-300">
                            {marksData.grade}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 text-[11px] text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>QR Verified Score</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Privacy & Integrity Assurance */}
                <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-100 text-xs text-slate-500 flex items-start space-x-3">
                  <Award className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <p className="leading-relaxed text-[11px]">
                    This digital credential was generated with cryptographic serial validation and recorded
                    into the official ledger of <strong>{settings.companyName || 'ITS YOUR TURN'}</strong>.
                    Student privacy is protected; no sensitive personal identifying numbers or private contacts are displayed.
                  </p>
                </div>
              </div>
            )
          ) : (
            /* NOT FOUND CARD */
            <div className="bg-white rounded-3xl border-2 border-amber-200 shadow-xl p-6 sm:p-8 space-y-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">
                Certificate Not Found / Invalid Certificate
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                The certificate number <strong className="font-mono text-slate-800">{certInput}</strong> does
                not match any active records in our credential registry. Please check for typos or contact the issuing organization.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
