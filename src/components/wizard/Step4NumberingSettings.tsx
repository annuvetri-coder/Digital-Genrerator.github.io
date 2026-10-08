import React from 'react';
import { CheckCircle2, Hash, ShieldCheck, SortAsc } from 'lucide-react';
import { NumberingConfig, NumberingMode, StudentRecord } from '../../types';
import { formatCertificateNumber } from '../../utils/numberingEngine';

interface Step4Props {
  config: NumberingConfig;
  setConfig: (cfg: NumberingConfig) => void;
  sampleStudents: StudentRecord[];
}

export const Step4NumberingSettings: React.FC<Step4Props> = ({
  config,
  setConfig,
  sampleStudents,
}) => {
  const modes: Array<{ id: NumberingMode; label: string; desc: string }> = [
    {
      id: 'alphabetical',
      label: 'Alphabetical Student Order (A → Z)',
      desc: 'Sorts student names alphabetically before issuing sequential numbers (e.g. Arun Kumar → 0001, Bala Kumar → 0002).',
    },
    {
      id: 'sequential',
      label: 'Sequential Numbering',
      desc: 'Standard incrementing serial sequence based on sorted index.',
    },
    {
      id: 'excel_order',
      label: 'Original Excel Order',
      desc: 'Maintains the exact order of rows as uploaded in the spreadsheet.',
    },
    {
      id: 'reg_no_order',
      label: 'Registration / S.No Order',
      desc: 'Sorts numerically by student S.No or registration ID column.',
    },
  ];

  const previewPrefix = config.prefix || 'IYT-2026-';
  const previewStart = config.startNumber || 1;
  const padding = config.paddingDigits || 4;

  // Generate live sample previews
  const previewItems = sampleStudents.slice(0, 4).map((student, idx) => {
    const num = previewStart + idx;
    const certNum = formatCertificateNumber(previewPrefix, num, padding, config.customSuffix);
    return {
      name: student.studentName || `Student ${idx + 1}`,
      certNum,
    };
  });

  return (
    <div className="space-y-6">
      {/* Ordering Method */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-900">Certificate Numbering Strategy</h2>
          <p className="text-xs text-slate-500">
            Choose how student records are sorted and assigned unique certificate numbers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {modes.map((m) => {
            const isSelected = config.mode === m.id;
            return (
              <div
                key={m.id}
                onClick={() => setConfig({ ...config, mode: m.id })}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/30 ring-2 ring-indigo-500/10'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-slate-900">{m.label}</span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{m.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Prefix & Starting Number Configuration */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="font-bold text-slate-900 text-sm">Number Formatting & Prefix</h3>
          <p className="text-xs text-slate-500">
            Configure company prefix, starting index, and number padding digits.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Prefix */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Prefix *
            </label>
            <input
              type="text"
              value={config.prefix}
              onChange={(e) => setConfig({ ...config, prefix: e.target.value })}
              placeholder="e.g. IYT-2026-"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-indigo-500/20 font-bold"
            />
            <div className="flex gap-1 mt-1.5">
              {['IYT-2026-', 'CERT-', 'ITSYOURTURN-', 'IYT-'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setConfig({ ...config, prefix: p })}
                  className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[10px] font-mono text-slate-600"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Starting Number */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Starting Number *
            </label>
            <input
              type="number"
              min="1"
              value={config.startNumber}
              onChange={(e) =>
                setConfig({ ...config, startNumber: Math.max(1, parseInt(e.target.value) || 1) })
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-indigo-500/20 font-bold"
            />
            <p className="text-[10px] text-slate-400 mt-1">e.g. 1 for 0001, or 100 for 0100</p>
          </div>

          {/* Padding Digits */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Number Padding Digits
            </label>
            <select
              value={config.paddingDigits}
              onChange={(e) =>
                setConfig({ ...config, paddingDigits: parseInt(e.target.value) || 4 })
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-indigo-500/20 font-bold bg-white"
            >
              <option value="3">3 Digits (001, 002)</option>
              <option value="4">4 Digits (0001, 0002)</option>
              <option value="5">5 Digits (00001, 00002)</option>
              <option value="6">6 Digits (000001)</option>
            </select>
            <p className="text-[10px] text-slate-400 mt-1">Zero-padded width</p>
          </div>

          {/* Custom Suffix */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Custom Suffix (Optional)
            </label>
            <input
              type="text"
              value={config.customSuffix || ''}
              onChange={(e) => setConfig({ ...config, customSuffix: e.target.value })}
              placeholder="e.g. -IN or empty"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        {/* Live Numbering Preview Box */}
        <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-indigo-300 flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Uniqueness Validation Engine • Live Simulated Numbering</span>
            </span>
            <span className="text-[11px] text-slate-400">Zero Duplicates Guaranteed</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 pt-1">
            {previewItems.map((item, idx) => (
              <div key={idx} className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700">
                <p className="text-[11px] text-slate-400 truncate">{item.name}</p>
                <p className="text-xs font-mono font-bold text-emerald-400 mt-0.5">{item.certNum}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
