import React from 'react';
import {
  Award,
  Database,
  FileCheck2,
  FolderGit2,
  Globe,
  GraduationCap,
  LayoutDashboard,
  Layers,
  Settings,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, setCurrentTab }) => {
  const navItems = [
    { id: 'website', label: 'Public Website', icon: Globe },
    { id: 'marks', label: 'Mark Portal (External)', icon: GraduationCap },
    { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'generator', label: 'Generate Certificates', icon: Sparkles, highlight: true },
    { id: 'batches', label: 'Certificate Batches', icon: FolderGit2 },
    { id: 'records', label: 'Certificate Registry', icon: Database },
    { id: 'templates', label: 'Template Library', icon: Layers },
    { id: 'verify', label: 'Verification Portal', icon: ShieldCheck },
    { id: 'settings', label: 'Company Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col justify-between h-[calc(100vh-4rem)] sticky top-16 hidden md:flex">
      <div className="p-4 space-y-1">
        <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Management
        </p>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20 font-semibold'
                  : item.highlight
                  ? 'text-indigo-600 bg-indigo-50/60 hover:bg-indigo-50 hover:text-indigo-700'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.highlight ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.highlight && !isActive && (
                <span className="inline-block w-2 h-2 rounded-full bg-indigo-500"></span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom Info Card */}
      <div className="p-4 border-t border-slate-100">
        <div className="p-3 bg-gradient-to-br from-slate-50 to-indigo-50/40 rounded-xl border border-slate-200/60 text-xs">
          <div className="flex items-center space-x-2 text-indigo-700 font-semibold mb-1">
            <FileCheck2 className="w-4 h-4" />
            <span>Official Engine</span>
          </div>
          <p className="text-slate-500 text-[11px] leading-relaxed">
            Unique numbering, QR verification & tamper-proof registry enabled.
          </p>
        </div>
      </div>
    </aside>
  );
};
