import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Globe,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  Building2,
  Mail,
  Lock,
  Database,
  Trash2,
  AlertTriangle,
  RotateCcw,
  ShieldAlert,
  X,
} from 'lucide-react';
import { CompanyLogo } from './CompanyLogo';
import { AuthorizedSignatureManager } from './AuthorizedSignatureManager';
import { CompanySettings } from '../types';
import { useSettings } from '../context/SettingsContext';
import { AVAILABLE_FONTS } from '../utils/defaultTemplates';
import { api } from '../services/api';

export const SettingsPage: React.FC = () => {
  const { settings, updateSettings } = useSettings();
  const [form, setForm] = useState<CompanySettings>({ ...settings });
  const [saveNotice, setSaveNotice] = useState(false);

  // Storage Stats & Clear Data State
  const [certCount, setCertCount] = useState(0);
  const [batchCount, setBatchCount] = useState(0);
  const [clearTarget, setClearTarget] = useState<'certificates' | 'batches' | 'marks' | 'all' | null>(null);
  const [confirmInput, setConfirmInput] = useState('');
  const [isClearing, setIsClearing] = useState(false);
  const [clearSuccessMsg, setClearSuccessMsg] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      const [certs, batches] = await Promise.all([
        api.getCertificates(),
        api.getBatches(),
      ]);
      setCertCount(certs.length);
      setBatchCount(batches.length);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings(form);
    setSaveNotice(true);
    setTimeout(() => setSaveNotice(false), 3000);
  };

  const handleExecuteClear = async () => {
    if (!clearTarget) return;
    setIsClearing(true);
    try {
      if (clearTarget === 'certificates') {
        await api.clearAllCertificates();
        setClearSuccessMsg('All certificate records cleared successfully.');
      } else if (clearTarget === 'batches') {
        await api.clearAllBatches();
        await api.clearAllCertificates();
        setClearSuccessMsg('All batches and certificates cleared successfully.');
      } else if (clearTarget === 'marks') {
        await api.clearAllMarkSessions();
        setClearSuccessMsg('All evaluation mark sessions cleared successfully.');
      } else if (clearTarget === 'all') {
        await api.clearAllData({ keepSettings: true, keepTemplates: true });
        setClearSuccessMsg('System reset complete: All certificates, batches, and evaluations purged.');
      }
      setClearTarget(null);
      setConfirmInput('');
      await loadStats();
      setTimeout(() => setClearSuccessMsg(null), 4000);
    } catch (err: any) {
      alert('Failed to clear data: ' + err.message);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
            Company Branding & System Settings
          </h1>
          <p className="text-xs text-slate-500">
            Configure global branding, certificate numbering defaults, and verification URLs.
          </p>
        </div>

        {saveNotice && (
          <span className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Settings Saved!</span>
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Identity */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <h2 className="font-bold text-slate-900 text-sm">Company & Issuing Authority</h2>
          </div>

          {/* Official Company Logo Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl bg-slate-50 border border-slate-200 gap-4">
            <div className="flex items-center space-x-4">
              <CompanyLogo size={64} showBorder={true} className="shadow-md" />
              <div>
                <span className="text-xs font-black text-slate-900 block tracking-tight">
                  Official Brand Logo (ITS YOUR TURN)
                </span>
                <span className="text-[11px] text-slate-500 block max-w-md">
                  Compulsory logo deployed across all certificate designs, templates, and website loading cover.
                </span>
              </div>
            </div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>Official Asset Locked</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Company / Organization Name *
              </label>
              <input
                type="text"
                value={form.companyName}
                onChange={(e) =>
                  setForm({ ...form, companyName: e.target.value, organizationName: e.target.value })
                }
                placeholder="e.g. ITS YOUR TURN"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Authorized Company Mail ID (Gmail Domain) *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={form.companyEmail || 'annuvetri@gmail.com'}
                  onChange={(e) => setForm({ ...form, companyEmail: e.target.value })}
                  placeholder="annuvetri@gmail.com"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:ring-2 focus:ring-indigo-500/20 font-mono"
                  required
                />
              </div>
              <p className="text-[10.5px] text-slate-400 mt-1">
                Certificate generation access and signature pasting are strictly locked to this Gmail address.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Official Website *
              </label>
              <input
                type="text"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="e.g. itsyourturn.co.in"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Signer Name
              </label>
              <input
                type="text"
                value={form.signerName}
                onChange={(e) => setForm({ ...form, signerName: e.target.value })}
                placeholder="e.g. Authorized Signatory"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Signer Title / Designation
              </label>
              <input
                type="text"
                value={form.signerTitle}
                onChange={(e) => setForm({ ...form, signerTitle: e.target.value })}
                placeholder="e.g. Program Director"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Authorized E-Signature Section */}
          <div className="pt-4 border-t border-slate-100">
            <AuthorizedSignatureManager />
          </div>
        </div>

        {/* Certificate Numbering Defaults */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            <h2 className="font-bold text-slate-900 text-sm">Default Certificate Numbering & Prefix</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Default Prefix *
              </label>
              <input
                type="text"
                value={form.certificatePrefix}
                onChange={(e) => setForm({ ...form, certificatePrefix: e.target.value })}
                placeholder="e.g. IYT-2026-"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs font-bold focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Default Start Number
              </label>
              <input
                type="number"
                min="1"
                value={form.defaultStartNumber}
                onChange={(e) =>
                  setForm({ ...form, defaultStartNumber: parseInt(e.target.value) || 1 })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs font-bold focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Number Padding Digits
              </label>
              <select
                value={form.numberPadding}
                onChange={(e) =>
                  setForm({ ...form, numberPadding: parseInt(e.target.value) || 4 })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs font-bold bg-white focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="3">3 Digits (001, 002)</option>
                <option value="4">4 Digits (0001, 0002)</option>
                <option value="5">5 Digits (00001, 00002)</option>
                <option value="6">6 Digits (000001)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Verification URL & Appearance */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-3 flex items-center space-x-2">
            <Globe className="w-4 h-4 text-indigo-600" />
            <h2 className="font-bold text-slate-900 text-sm">QR Code Verification URL & Fonts</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Verification Base URL
              </label>
              <input
                type="text"
                value={form.verificationBaseUrl}
                onChange={(e) => setForm({ ...form, verificationBaseUrl: e.target.value })}
                placeholder="e.g. https://itsyourturn.co.in or current host"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-indigo-500/20"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Embedded in QR codes on generated certificates.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Default Heading Font
              </label>
              <select
                value={form.defaultFont}
                onChange={(e) => setForm({ ...form, defaultFont: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs bg-white focus:ring-2 focus:ring-indigo-500/20"
              >
                {AVAILABLE_FONTS.map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-500/25 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save Settings</span>
          </button>
        </div>
      </form>

      {/* Clear Data & Storage Management Center */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-rose-600" />
            <h2 className="font-bold text-slate-900 text-sm">System Storage & Clear Data Center</h2>
          </div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500">
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {certCount} Certificates
            </span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
              {batchCount} Batches
            </span>
          </div>
        </div>

        {clearSuccessMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
            <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{clearSuccessMsg}</span>
          </div>
        )}

        <p className="text-xs text-slate-500">
          Manage local ledger storage and purge data when testing is concluded or when beginning a new production cycle.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Card 1: Clear Certificates Only */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-3">
            <div>
              <span className="text-xs font-bold text-slate-900 block">Clear Certificates</span>
              <p className="text-[11px] text-slate-500 mt-1">
                Removes all {certCount} certificates from verification registry without altering batch metadata.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setClearTarget('certificates');
                setConfirmInput('');
              }}
              className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-white hover:bg-rose-50 text-rose-700 border border-slate-200 hover:border-rose-200 flex items-center justify-center space-x-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Clear Certificates</span>
            </button>
          </div>

          {/* Card 2: Clear Batches & Certs */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-3">
            <div>
              <span className="text-xs font-bold text-slate-900 block">Clear Batches & Records</span>
              <p className="text-[11px] text-slate-500 mt-1">
                Deletes all {batchCount} batch packages and all issued certificate registries.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setClearTarget('batches');
                setConfirmInput('');
              }}
              className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-white hover:bg-rose-50 text-rose-700 border border-slate-200 hover:border-rose-200 flex items-center justify-center space-x-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Clear All Batches</span>
            </button>
          </div>

          {/* Card 3: Clear Mark Sessions */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between space-y-3">
            <div>
              <span className="text-xs font-bold text-slate-900 block">Clear Marks Sessions</span>
              <p className="text-[11px] text-slate-500 mt-1">
                Purges test and evaluation mark sheets from the examination evaluation portal.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setClearTarget('marks');
                setConfirmInput('');
              }}
              className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-white hover:bg-rose-50 text-rose-700 border border-slate-200 hover:border-rose-200 flex items-center justify-center space-x-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
              <span>Clear Marks Data</span>
            </button>
          </div>

          {/* Card 4: Full Reset */}
          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/40 flex flex-col justify-between space-y-3">
            <div>
              <span className="text-xs font-bold text-rose-950 block">Complete Clean Slate</span>
              <p className="text-[11px] text-rose-800 mt-1">
                Wipes all certificates, batches, and examination evaluations (retains your branding).
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setClearTarget('all');
                setConfirmInput('');
              }}
              className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs flex items-center justify-center space-x-1.5 transition-colors"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Wipe All Data</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {clearTarget && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Confirm Data Deletion</h3>
                <p className="text-xs text-slate-500 capitalize">Target: {clearTarget}</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This action will permanently delete the selected database records.
              Type <strong className="font-mono text-rose-600 font-bold">CONFIRM</strong> below to proceed:
            </p>

            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value.toUpperCase())}
              placeholder="CONFIRM"
              className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isClearing}
                onClick={() => setClearTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isClearing || confirmInput !== 'CONFIRM'}
                onClick={handleExecuteClear}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white shadow-sm transition-all ${
                  confirmInput === 'CONFIRM'
                    ? 'bg-rose-600 hover:bg-rose-700 cursor-pointer'
                    : 'bg-slate-300 cursor-not-allowed opacity-60'
                }`}
              >
                {isClearing ? 'Clearing...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
