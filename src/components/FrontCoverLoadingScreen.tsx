import React, { useEffect, useState } from 'react';
import { CompanyLogo } from './CompanyLogo';
import { ShieldCheck } from 'lucide-react';

interface FrontCoverProps {
  onLoaded?: () => void;
  minDurationMs?: number;
}

export const FrontCoverLoadingScreen: React.FC<FrontCoverProps> = ({
  onLoaded,
  minDurationMs = 1400,
}) => {
  const [stage, setStage] = useState<'showing' | 'fading' | 'done'>('showing');
  const [progress, setProgress] = useState(15);
  const [statusText, setStatusText] = useState('Loading Official Certification Engine...');

  useEffect(() => {
    // Step progress
    const t1 = setTimeout(() => {
      setProgress(55);
      setStatusText('Validating Templates & Security Keys...');
    }, 400);

    const t2 = setTimeout(() => {
      setProgress(88);
      setStatusText('Initializing Tabulation Registry...');
    }, 850);

    const t3 = setTimeout(() => {
      setProgress(100);
      setStatusText('Ready');
      setStage('fading');
    }, minDurationMs);

    const t4 = setTimeout(() => {
      setStage('done');
      if (onLoaded) onLoaded();
    }, minDurationMs + 450);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [minDurationMs, onLoaded]);

  if (stage === 'done') return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-b from-white via-slate-50 to-slate-100 transition-opacity duration-500 ${
        stage === 'fading' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background Subtle Watermark Pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(#000000 1.5px, transparent 1.5px), radial-gradient(#000000 1.5px, #ffffff 1.5px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 flex flex-col items-center max-w-sm px-6 text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
        {/* Front Cover Main Official Logo */}
        <div className="relative group">
          <div className="absolute -inset-4 bg-gradient-to-r from-slate-200 via-indigo-100 to-slate-200 rounded-3xl blur-xl opacity-60 group-hover:opacity-100 transition-all duration-700 animate-pulse" />
          <div className="relative p-3 bg-white rounded-3xl shadow-2xl border-2 border-slate-900/10 flex items-center justify-center">
            <CompanyLogo size={140} showBorder={true} className="shadow-md" />
          </div>
        </div>

        {/* Brand Text */}
        <div className="space-y-1.5">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight uppercase">
            ITS YOUR TURN
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-600 tracking-wide">
            Digital Certificate Generator & Verification Suite
          </p>
        </div>

        {/* Progress Bar & Status */}
        <div className="w-full space-y-2 pt-2">
          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-slate-900 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span className="flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>{statusText}</span>
            </span>
            <span className="font-mono font-bold text-slate-700">{progress}%</span>
          </div>
        </div>

        {/* Official Badge */}
        <div className="pt-4 text-[10px] uppercase font-bold tracking-widest text-slate-400">
          Official Institutional Platform
        </div>
      </div>
    </div>
  );
};
