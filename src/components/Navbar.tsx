import React from 'react';
import {
  Award,
  CheckCircle2,
  ExternalLink,
  Globe,
  GraduationCap,
  Home,
  LayoutDashboard,
  Lock,
  LogIn,
  LogOut,
  ShieldCheck,
  Sparkles,
  Wifi,
} from 'lucide-react';
import { CompanyLogo } from './CompanyLogo';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenLogin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab, onOpenLogin }) => {
  const { user, isAuthenticated, isCompanyAuthorized, authorizedCompanyEmail, logout } = useAuth();
  const { settings } = useSettings();

  const isWebsiteView = currentTab === 'website';

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div
          className="flex items-center space-x-3 cursor-pointer group"
          onClick={() => setCurrentTab('website')}
          title="Return to Website Home"
        >
          <CompanyLogo size={42} showBorder={true} className="group-hover:scale-105 transition-transform" />
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-slate-900 tracking-tight text-lg">
                {settings.companyName || 'ITS YOUR TURN'}
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Official
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Digital Certificate Generator & Registry</p>
          </div>
        </div>

        {/* Center / Navigation Links */}
        <nav className="hidden md:flex items-center space-x-1">
          <button
            onClick={() => setCurrentTab('website')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              currentTab === 'website'
                ? 'bg-slate-100 text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Website</span>
          </button>

          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              currentTab === 'dashboard'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setCurrentTab('generator')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              currentTab === 'generator'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-indigo-600 hover:bg-indigo-50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Generator</span>
          </button>

          <button
            onClick={() => setCurrentTab('verify')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              currentTab === 'verify'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-sky-700 hover:bg-sky-50'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-sky-500" />
            <span>Verify Portal</span>
          </button>

          <div className="flex items-center">
            <button
              onClick={() => setCurrentTab('marks')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-l-xl text-xs font-bold transition-all ${
                currentTab === 'marks'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-purple-700 bg-purple-50 hover:bg-purple-100 border-y border-l border-purple-200'
              }`}
              title="External Mark Evaluation & Tabulation Portal"
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Mark Portal</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const url = new URL(window.location.href);
                url.searchParams.set('portal', 'marks');
                url.searchParams.delete('tab');
                window.open(url.toString(), '_blank');
              }}
              className={`p-1.5 rounded-r-xl border transition-all ${
                currentTab === 'marks'
                  ? 'bg-purple-700 text-white border-purple-700 hover:bg-purple-800'
                  : 'bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100 hover:text-purple-800'
              }`}
              title="Open External Mark Portal in a new browser window"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center space-x-3">
          {/* Offline / Local Ready Indicator */}
          <div className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Wifi className="w-3 h-3 text-emerald-600" />
            <span>Offline Ready</span>
          </div>

          {/* Quick Switch to Generator/Dashboard Button */}
          {isWebsiteView ? (
            <button
              onClick={() => setCurrentTab('dashboard')}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-extrabold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-all active:scale-[0.98]"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Admin Console</span>
            </button>
          ) : (
            <button
              onClick={() => setCurrentTab('website')}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>View Website</span>
            </button>
          )}

          {/* Authorized Company Issuer Indicator */}
          <div className="hidden md:flex items-center">
            {isCompanyAuthorized ? (
              <div
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200"
                title={`Authorized Company Issuer: ${authorizedCompanyEmail} (Gmail Domain)`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span className="font-mono text-[10.5px] max-w-[150px] truncate">{authorizedCompanyEmail}</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={onOpenLogin}
                className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors"
                title={`Restricted to Company Email: ${authorizedCompanyEmail}. Click to sign in.`}
              >
                <Lock className="w-3 h-3 text-amber-600" />
                <span>Company Mail Required</span>
              </button>
            )}
          </div>

          {/* Auth Button */}
          {isAuthenticated ? (
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
              <div className="hidden sm:block text-right">
                <p className="text-xs font-semibold text-slate-800">{user?.name}</p>
                <p className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">{user?.email}</p>
              </div>
              <button
                onClick={logout}
                title="Logout"
                className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenLogin}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5 text-slate-500" />
              <span>Login</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
