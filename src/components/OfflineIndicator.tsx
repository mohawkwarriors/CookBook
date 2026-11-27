import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface OfflineIndicatorProps {
  hasBottomNav?: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ hasBottomNav = false }) => {
  const isOnline = useOnlineStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className={`fixed left-4 right-4 sm:right-auto max-w-[calc(100vw-2rem)] z-40 flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background shadow-lg border border-border ${
            hasBottomNav
              ? 'bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] md:bottom-4'
              : 'bottom-[max(1rem,env(safe-area-inset-bottom,0px))]'
          }`}
        >
          <WifiOff className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="truncate">Offline — cached recipes &amp; meal plans available</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
