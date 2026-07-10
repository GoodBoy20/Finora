import { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Shield, Copy, Check, AlertTriangle, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

const SecurityKeyDisplay = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // Guard: only accessible from registration flow
  const securityKey = location.state?.securityKey;
  const fromRegistration = location.state?.fromRegistration;

  if (!securityKey || !fromRegistration) {
    return <Navigate to="/register" replace />;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(securityKey);
      setCopied(true);
      toast.success('Security key copied to clipboard');
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = securityKey;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      toast.success('Security key copied to clipboard');
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleProceed = () => {
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 mb-4">
            <Shield size={32} className="text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Save Your Security Key</h1>
          <p className="text-gray-400 text-sm">Your account has been created successfully</p>
        </div>

        {/* Warning banner */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-amber-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-amber-300 font-semibold text-sm mb-1">
                This key will never be shown again
              </p>
              <p className="text-amber-200/70 text-sm">
                Store it somewhere safe before you continue — you will need it every time you log in.
                There is <strong>no way to recover</strong> this key if lost.
              </p>
            </div>
          </div>
        </div>

        {/* Security key display */}
        <div className="glass rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Lock size={16} className="text-emerald-400" />
            <label className="text-sm font-medium text-gray-300">Your Security Key</label>
          </div>

          <div className="relative">
            <div className="bg-navy-900 border border-navy-700 rounded-lg p-4 font-mono text-sm text-emerald-400 break-all leading-relaxed select-all">
              {securityKey}
            </div>
            <button
              onClick={handleCopy}
              className="absolute top-3 right-3 p-2 bg-navy-700 hover:bg-navy-600 rounded-lg transition-colors group"
              title="Copy to clipboard"
            >
              {copied ? (
                <Check size={16} className="text-emerald-400" />
              ) : (
                <Copy size={16} className="text-gray-400 group-hover:text-white" />
              )}
            </button>
          </div>

          <button
            onClick={handleCopy}
            className="w-full mt-3 py-2 bg-navy-700 hover:bg-navy-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {copied ? (
              <>
                <Check size={16} className="text-emerald-400" />
                Copied!
              </>
            ) : (
              <>
                <Copy size={16} />
                Copy to Clipboard
              </>
            )}
          </button>
        </div>

        {/* Confirmation */}
        <div className="glass rounded-2xl p-6">
          <label className="flex items-start gap-3 cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-navy-600 bg-navy-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-sm text-gray-300">
              I have safely stored my security key and understand that it{' '}
              <strong className="text-amber-400">cannot be recovered</strong> if lost.
            </span>
          </label>

          <button
            onClick={handleProceed}
            disabled={!confirmed}
            className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            Proceed to Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default SecurityKeyDisplay;
