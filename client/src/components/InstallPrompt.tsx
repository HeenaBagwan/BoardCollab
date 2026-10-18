import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-20 right-6 z-50 flex items-center gap-3 px-3.5 py-2.5 rounded-lg bg-paper-card border border-ink shadow-[3px_4px_0px_#111110] animate-fade-in font-mono text-xs">
      <div className="flex items-center gap-2 text-ink">
        <Download className="w-4 h-4 text-ink" />
        <span className="font-semibold">Install BoardCollab App</span>
      </div>
      <button
        onClick={handleInstall}
        className="btn-paper-accent px-2.5 py-1 text-[11px] font-bold cursor-pointer"
      >
        Install
      </button>
      <button
        onClick={() => setShowPrompt(false)}
        className="p-1 text-ink-muted hover:text-ink cursor-pointer"
        title="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default InstallPrompt;
