import React, { useState } from 'react';
import { Award, Lock, LogIn, Mail, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { login, authorizedCompanyEmail, setAuthorizedCompanyEmail } = useAuth();
  const { settings } = useSettings();
  const [email, setEmail] = useState(authorizedCompanyEmail || 'itsyourturn.official@gmail.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Sync state if authorizedCompanyEmail changes
  React.useEffect(() => {
    if (authorizedCompanyEmail) {
      setEmail(authorizedCompanyEmail);
    }
  }, [authorizedCompanyEmail]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        onClose();
      } else {
        setError(res.error || 'Authentication failed');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 sm:p-8 space-y-6 shadow-2xl relative border border-slate-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-md shadow-indigo-500/20">
            <Award className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Company Mail Sign In</h2>
          <div className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            Gmail Domain Issuer Authorization
          </div>
          <p className="text-xs text-slate-500">
            Certificate generation and e-signature pasting are restricted exclusively to your company's official Gmail account.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Company Mail ID (Gmail Domain)
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yourcompany@gmail.com"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium"
              />
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              No private domain needed • Works under Gmail domain
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Admin Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
              />
            </div>
          </div>

          {/* Quick autofill helper */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-700">Authorized Company Issuer:</span>
              <button
                type="button"
                onClick={() => setEmail(authorizedCompanyEmail)}
                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold underline"
              >
                Use Official
              </button>
            </div>
            <p className="font-mono text-[10.5px] text-slate-800">{authorizedCompanyEmail}</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 transition-all flex items-center justify-center space-x-1.5"
          >
            <LogIn className="w-4 h-4" />
            <span>{loading ? 'Authenticating...' : 'Sign In as Company Issuer'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
