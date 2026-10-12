import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { UtensilsCrossed, X, Share, PlusSquare, Smartphone, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const STORAGE_KEY = 'cookbook_install_prompt_resolved';

export const PWAInstallPopup: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [isOpen, setIsOpen] = useState(false);
  const [showIOSSteps, setShowIOSSteps] = useState(false);

  useEffect(() => {
    // Check if the user already responded or if app is already running as installed PWA
    const hasResolved = localStorage.getItem(STORAGE_KEY) === 'true';
    if (hasResolved || isInstalled) {
      return;
    }

    // Trigger popup on first visit when install capability is detected
    // We add a short delay so the page loads and settles first
    let timer: NodeJS.Timeout;
    if (isInstallable || isIOS) {
      timer = setTimeout(() => {
        // Double check resolved status before opening
        if (localStorage.getItem(STORAGE_KEY) !== 'true' && !isInstalled) {
          setIsOpen(true);
        }
      }, 1000);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isInstallable, isIOS, isInstalled]);

  const markResolvedAndClose = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // ignore storage errors
    }
    setIsOpen(false);
  };

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSSteps(true);
      return;
    }

    if (isInstallable) {
      try {
        await install();
      } catch (err) {
        console.warn('Install prompt error:', err);
      } finally {
        markResolvedAndClose();
      }
    } else {
      markResolvedAndClose();
    }
  };

  const handleDeclineClick = () => {
    markResolvedAndClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleDeclineClick}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 p-6 shadow-2xl z-10 overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-modal-title"
        >
          {/* Close button in top-right */}
          <button
            onClick={handleDeclineClick}
            className="absolute right-3.5 top-3.5 rounded-full p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {!showIOSSteps ? (
            <div className="flex flex-col items-center text-center">
              {/* App Icon badge matching brand palette */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-0.5 shadow-md shadow-emerald-500/20 mb-4 flex items-center justify-center">
                <div className="w-full h-full rounded-[14px] bg-[#FDFBF7] dark:bg-neutral-900 flex items-center justify-center border border-emerald-400/30">
                  <UtensilsCrossed className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>

              <h3 id="install-modal-title" className="text-xl font-bold text-neutral-900 dark:text-neutral-50 tracking-tight">
                Install Cookbook
              </h3>
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                Add Cookbook to your device for instant home screen access, offline recipe viewing, and a distraction-free full-screen experience.
              </p>

              {/* Action Buttons: Green Install button & Decline button */}
              <div className="mt-6 flex flex-col w-full gap-2.5">
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleInstallClick}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Install App</span>
                </motion.button>

                <button
                  type="button"
                  onClick={handleDeclineClick}
                  className="w-full py-2.5 px-4 rounded-xl text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-sm font-medium transition-colors cursor-pointer"
                >
                  Decline
                </button>
              </div>
            </div>
          ) : (
            /* iOS Instructions step */
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center mb-3">
                <Smartphone className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
              </div>

              <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-50">
                Install on iPhone or iPad
              </h3>
              <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                Follow these two simple steps in Safari:
              </p>

              <div className="mt-4 space-y-3 border-t border-neutral-100 dark:border-neutral-800 pt-4 text-left text-sm text-neutral-600 dark:text-neutral-300 w-full">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    1
                  </div>
                  <div className="flex-1 leading-relaxed text-xs sm:text-sm">
                    Tap the <strong className="text-neutral-900 dark:text-neutral-50 inline-flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded font-medium"><Share className="w-3 h-3 inline" /> Share</strong> button in Safari's bottom bar.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                    2
                  </div>
                  <div className="flex-1 leading-relaxed text-xs sm:text-sm">
                    Scroll down and tap <strong className="text-neutral-900 dark:text-neutral-50 inline-flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded font-medium"><PlusSquare className="w-3 h-3 inline" /> Add to Home Screen</strong>.
                  </div>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={markResolvedAndClose}
                className="mt-5 w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Got It</span>
              </motion.button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
