import React, { useState } from 'react';
import {
  ArrowRight,
  Award,
  BarChart3,
  CheckCircle2,
  ChevronDown,
  Download,
  ExternalLink,
  Eye,
  FileArchive,
  FileSpreadsheet,
  Globe,
  GraduationCap,
  HelpCircle,
  Layers,
  Lock,
  PlusCircle,
  QrCode,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  Wifi,
} from 'lucide-react';
import { CompanyLogo } from './CompanyLogo';
import { useSettings } from '../context/SettingsContext';
import { generateSampleExcelFile } from '../utils/excelParser';
import { PRESET_TEMPLATES } from '../utils/defaultTemplates';

interface LandingPageProps {
  onGoToGenerator: () => void;
  onGoToVerify: (certNumber?: string) => void;
  onGoToAdmin: () => void;
  onGoToMarks: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onGoToGenerator,
  onGoToVerify,
  onGoToAdmin,
  onGoToMarks,
}) => {
  const { settings } = useSettings();
  const [quickCertNumber, setQuickCertNumber] = useState('');
  const [activeTemplateTab, setActiveTemplateTab] = useState(0);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const handleQuickVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickCertNumber.trim()) {
      onGoToVerify(quickCertNumber.trim());
    }
  };

  const faqs = [
    {
      q: 'Can I upload my own blank certificate with our company logos and signatures?',
      a: 'Yes, absolutely! You can upload blank templates in PNG, JPG, or PDF format. The system preserves your original artwork, border designs, stamps, and official logos with 100% clarity, adding student information only where you position the placeholder tags.',
    },
    {
      q: 'How does the digital QR verification work?',
      a: 'Each certificate is issued with a unique, cryptographically validated certificate number (e.g. IYT-2026-0001). The system automatically embeds a dynamic QR code pointing to the public verification portal. When scanned with any mobile camera, it displays an official verification badge confirming student name, course, and issue date.',
    },
    {
      q: 'How does the "Download All as ZIP" bulk export work?',
      a: 'Once your Excel list is uploaded and mapped, clicking "Download All as ZIP" compiles every student\'s certificate into a single compressed ZIP archive in your choice of vector PDF, PNG, or JPG formats with clean, standardized filenames (e.g., IYT-2026-0001_Arun_Kumar.pdf).',
    },
    {
      q: 'Can this platform run locally without an active internet connection?',
      a: 'Yes! The application features a self-contained local architecture with SQLite persistence and browser fallback. Bulk certificate rendering and ZIP generation happen entirely offline on your device with zero reliance on external APIs.',
    },
    {
      q: 'Can administrators revoke or cancel a certificate?',
      a: 'Yes. Authorized administrators can revoke any issued certificate in the Certificate Registry with a documented reason. When anyone scans or checks a revoked credential, the public verification portal displays a bold red "CERTIFICATE REVOKED" alert.',
    },
  ];

  return (
    <div className="space-y-16 sm:space-y-24 py-4">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-12 lg:p-16 shadow-2xl border border-slate-800">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
          {/* Official Brand Logo */}
          <div className="flex justify-center">
            <CompanyLogo size={80} showBorder={true} className="shadow-2xl ring-4 ring-white/20 hover:scale-105 transition-transform" />
          </div>

          {/* Badge */}
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold text-indigo-300 border border-white/15 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Official Credential Engine for {settings.companyName || 'ITS YOUR TURN'}</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
            Automated Digital Certificate Generation & Real-Time QR Verification
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
            Effortlessly transform blank templates and Excel spreadsheets into hundreds of authentic,
            tamper-proof certificates with unique serial numbering and instant bulk ZIP downloads.
          </p>

          {/* Primary Action Buttons */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3.5">
            <button
              onClick={onGoToGenerator}
              className="inline-flex items-center space-x-2.5 px-6 py-3.5 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-extrabold text-sm transition-all shadow-xl shadow-indigo-500/25 active:scale-[0.98]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Launch Certificate Generator</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => onGoToVerify()}
              className="inline-flex items-center space-x-2 px-5 py-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/20 transition-all backdrop-blur-sm"
            >
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              <span>Public Verification Portal</span>
            </button>

            <button
              onClick={onGoToMarks}
              className="inline-flex items-center space-x-2 px-5 py-3.5 rounded-2xl bg-purple-600/90 hover:bg-purple-600 text-white font-extrabold text-sm border border-purple-400/40 shadow-lg shadow-purple-900/30 transition-all"
            >
              <GraduationCap className="w-4 h-4 text-purple-200" />
              <span>External Mark Portal</span>
            </button>

            <button
              onClick={onGoToAdmin}
              className="inline-flex items-center space-x-2 px-5 py-3.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 font-bold text-sm border border-slate-700 transition-all"
            >
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Admin Management Suite</span>
            </button>
          </div>

          {/* Quick Certificate Search Bar Widget */}
          <div className="pt-6 max-w-md mx-auto">
            <form onSubmit={handleQuickVerifySubmit} className="relative flex items-center">
              <input
                type="text"
                value={quickCertNumber}
                onChange={(e) => setQuickCertNumber(e.target.value)}
                placeholder="Enter Certificate No. (e.g. IYT-2026-0001)"
                className="w-full pl-10 pr-24 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5" />
              <button
                type="submit"
                className="absolute right-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all"
              >
                Verify
              </button>
            </form>
            <div className="flex items-center justify-center space-x-2 mt-2 text-[11px] text-slate-400">
              <span>Try test serial:</span>
              <button
                type="button"
                onClick={() => onGoToVerify('IYT-2026-0001')}
                className="text-indigo-300 hover:underline font-mono"
              >
                IYT-2026-0001
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => onGoToVerify('IYT-2026-0002')}
                className="text-indigo-300 hover:underline font-mono"
              >
                IYT-2026-0002
              </button>
            </div>
          </div>

          {/* Trust Highlights */}
          <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-white/10 text-left">
            <div className="space-y-0.5">
              <div className="flex items-center space-x-1.5 text-emerald-400 font-bold text-xs sm:text-sm">
                <CheckCircle2 className="w-4 h-4" />
                <span>Zero Duplicates</span>
              </div>
              <p className="text-[11px] text-slate-400">Strict unique serial validation</p>
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center space-x-1.5 text-sky-400 font-bold text-xs sm:text-sm">
                <QrCode className="w-4 h-4" />
                <span>Scannable QR</span>
              </div>
              <p className="text-[11px] text-slate-400">Instant cryptographic check</p>
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center space-x-1.5 text-indigo-400 font-bold text-xs sm:text-sm">
                <FileArchive className="w-4 h-4" />
                <span>Bulk ZIP Package</span>
              </div>
              <p className="text-[11px] text-slate-400">1-click compressed download</p>
            </div>

            <div className="space-y-0.5">
              <div className="flex items-center space-x-1.5 text-purple-400 font-bold text-xs sm:text-sm">
                <Wifi className="w-4 h-4" />
                <span>100% Offline Ready</span>
              </div>
              <p className="text-[11px] text-slate-400">Runs locally without APIs</p>
            </div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE CERTIFICATE SHOWCASE */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
            High-Resolution Rendering
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Designed for Academic & Enterprise Excellence
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Preview the vector certificates generated by {settings.companyName || 'ITS YOUR TURN'}, complete with security seals, student names, and QR codes.
          </p>
        </div>

        {/* Template Selector Tabs */}
        <div className="flex items-center justify-center space-x-2">
          {PRESET_TEMPLATES.map((tmpl, idx) => (
            <button
              key={tmpl.id}
              onClick={() => setActiveTemplateTab(idx)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTemplateTab === idx
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tmpl.name}
            </button>
          ))}
        </div>

        {/* Certificate Display Card */}
        <div className="bg-white p-4 sm:p-6 rounded-3xl border border-slate-200 shadow-xl max-w-4xl mx-auto">
          <div className="aspect-[16/9] w-full rounded-2xl overflow-hidden border border-slate-200/80 shadow-inner relative flex items-center justify-center bg-slate-950">
            <img
              src={PRESET_TEMPLATES[activeTemplateTab]?.backgroundData}
              alt="Sample Certificate"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 right-4 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-mono border border-white/20 flex items-center space-x-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tamper-Proof Serial: IYT-2026-0001</span>
            </div>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 pt-2 border-t border-slate-100">
            <span>
              Recipient: <strong className="text-slate-800">Arun Kumar</strong> • Course:{' '}
              <strong className="text-indigo-600">IoT Training</strong> • Issue Date: 05 October 2026
            </span>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => onGoToVerify('IYT-2026-0001')}
                className="font-bold text-sky-600 hover:text-sky-800 flex items-center space-x-1"
              >
                <span>Verify this Certificate</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS (4-STEP WORKFLOW) */}
      <section className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-sm space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
            Simple 4-Step Process
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            How The Certificate Generator Works
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            From empty template to hundreds of ready-to-print certificates in minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Step 1 */}
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 relative">
            <span className="text-3xl font-black text-indigo-200 absolute top-4 right-4">01</span>
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">Upload Blank Template</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Upload your company's blank certificate design in PNG, JPG, or PDF format with official logos and borders intact.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 relative">
            <span className="text-3xl font-black text-indigo-200 absolute top-4 right-4">02</span>
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">Visual Drag & Drop Editor</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Drag and position fields like {'{{STUDENT_NAME}}'}, {'{{CERTIFICATE_NUMBER}}'}, course titles, and scannable QR codes with custom fonts.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 relative">
            <span className="text-3xl font-black text-indigo-200 absolute top-4 right-4">03</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">Upload Excel & Map Columns</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Upload your spreadsheet. The system automatically detects columns and assigns unique sequential or alphabetical certificate numbers.
            </p>
          </div>

          {/* Step 4 */}
          <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 relative">
            <span className="text-3xl font-black text-indigo-200 absolute top-4 right-4">04</span>
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <FileArchive className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">Bulk Generate & Download ZIP</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Click Generate to render individual PDF certificates with clean filenames and download the entire batch as a single ZIP archive.
            </p>
          </div>
        </div>

        {/* Excel Sample Helper Banner */}
        <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2.5 text-indigo-900">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600 flex-shrink-0" />
            <span>
              Need a template? Download our pre-formatted Excel template with sample student records.
            </span>
          </div>
          <button
            onClick={() => generateSampleExcelFile()}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 font-bold transition-colors whitespace-nowrap shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Sample Excel</span>
          </button>
        </div>
      </section>

      {/* CORE PLATFORM FEATURES */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
            Engineered For Reliability
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Key Features & Enterprise Security
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Every feature necessary to produce thousands of authentic credentials securely.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900">Automated Numbering Engine</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Configure sequential or alphabetical student order with custom prefix (e.g. IYT-2026-),
              custom start numbers, and zero-padding with guaranteed duplicate collision prevention.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900">Public Verification Portal</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Dedicated /verify portal allowing recruiters, academic councils, and employers to confirm credential legitimacy in seconds.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <FileArchive className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900">Download All as ZIP</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Package large batches of generated certificates into a single compressed ZIP file with
              individual PDF, PNG, or JPG formats and standardized filenames.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900">Drag-and-Drop Studio</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Full control over typography (Playfair Display, Cinzel, Montserrat, Inter), font sizes,
              text alignments, hex colors, and 1-click horizontal centering.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900">Revocation Management</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Audit and revoke certificates with documented reasons. Revoked credentials immediately trigger high-visibility alerts on public verification scans.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900">Batch Analytics & Reports</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Interactive monthly generation volume bar charts powered by Recharts, tracking batch health, success rates, and CSV ledger exports.
            </p>
          </div>
        </div>
      </section>

      {/* ABOUT ITS YOUR TURN */}
      <section className="bg-slate-900 text-white rounded-3xl p-8 sm:p-12 border border-slate-800 space-y-6">
        <div className="max-w-3xl space-y-3">
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
            About The Company
          </span>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
            ITS YOUR TURN — Empowering Next-Gen Technical Training
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            <strong>ITS YOUR TURN</strong> specializes in professional technology training, Internet of Things (IoT),
            embedded engineering, and corporate skill transformation. This certificate generator system ensures every
            graduate receives a verifiable, authenticated credential recognized across industries.
          </p>
          {settings.website && (
            <div className="pt-2">
              <a
                href={`https://${settings.website.replace(/^https?:\/\//, '')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-2 text-xs font-bold text-sky-400 hover:text-sky-300 underline"
              >
                <Globe className="w-4 h-4" />
                <span>Visit Official Website ({settings.website})</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>
      </section>

      {/* FREQUENTLY ASKED QUESTIONS */}
      <section className="space-y-6 max-w-3xl mx-auto">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
            Got Questions?
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs"
              >
                <button
                  type="button"
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between font-bold text-slate-900 text-sm hover:bg-slate-50/50 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      isOpen ? 'rotate-180 text-indigo-600' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 pb-5 text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* BOTTOM CTA BANNER */}
      <section className="rounded-3xl bg-gradient-to-r from-indigo-700 via-indigo-600 to-sky-600 text-white p-8 sm:p-12 text-center space-y-5 shadow-xl">
        <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
          Ready to Generate Your Company's Certificates?
        </h2>
        <p className="text-xs sm:text-sm text-indigo-100 max-w-xl mx-auto">
          Create certificate batches, upload student rosters, and generate hundreds of verified PDF credentials in seconds.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={onGoToGenerator}
            className="px-6 py-3.5 rounded-2xl bg-white text-indigo-700 font-extrabold text-sm hover:bg-slate-100 shadow-md transition-all active:scale-[0.98]"
          >
            Start Creating Certificates Now
          </button>
          <button
            onClick={() => onGoToVerify()}
            className="px-5 py-3.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white font-bold text-sm border border-white/20 transition-all"
          >
            Check Verification Portal
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="pt-8 border-t border-slate-200 text-xs text-slate-500 space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="font-extrabold text-slate-800 text-sm">
                {settings.companyName || 'ITS YOUR TURN'}
              </p>
              <p className="text-[11px] text-slate-400">Digital Certificate Generator & Verification Suite</p>
            </div>
          </div>

          <div className="flex items-center space-x-6 text-slate-600 font-medium">
            <button onClick={onGoToGenerator} className="hover:text-indigo-600">
              Generator
            </button>
            <button onClick={() => onGoToVerify()} className="hover:text-indigo-600">
              Verify Portal
            </button>
            <button onClick={onGoToMarks} className="hover:text-purple-600 text-purple-700 font-semibold">
              Mark Portal
            </button>
            <button onClick={onGoToAdmin} className="hover:text-indigo-600">
              Admin Portal
            </button>
            {settings.website && (
              <a
                href={`https://${settings.website.replace(/^https?:\/\//, '')}`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-indigo-600"
              >
                {settings.website}
              </a>
            )}
          </div>
        </div>

        <div className="text-center text-[11px] text-slate-400">
          © {new Date().getFullYear()} {settings.companyName || 'ITS YOUR TURN'}. All rights reserved. Cryptographically verified digital credentials.
        </div>
      </footer>
    </div>
  );
};
