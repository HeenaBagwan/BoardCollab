import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '../store';
import { setIsOffline } from '../store/canvasSlice';

export const OfflineBanner: React.FC = () => {
  const dispatch = useAppDispatch();
  const isOffline = useAppSelector((state) => state.canvas.isOffline);
  const [browserOffline, setBrowserOffline] = useState(!window.navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setBrowserOffline(false);
      dispatch(setIsOffline(false));
    };

    const handleOffline = () => {
      setBrowserOffline(true);
      dispatch(setIsOffline(true));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [dispatch]);

  const showBanner = isOffline || browserOffline;

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2 rounded-md bg-butter border border-ink text-ink shadow-[3px_4px_0px_#111110] text-xs font-mono font-medium"
        >
          <WifiOff className="w-4 h-4 text-ink" />
          <span>Offline mode — Changes saved locally and will auto-sync on reconnect</span>
          <RefreshCw className="w-3.5 h-3.5 text-ink animate-spin" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineBanner;
