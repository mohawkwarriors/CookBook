import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, X, Share, PlusSquare, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.96 }}
        onClick={install}
        className="flex items-center gap-2 rounded-lg bg-orange-600 dark:bg-orange-500 hover:bg-orange-700 dark:hover:bg-orange-600 px-3.5 py-2 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all border border-orange-500/20 shrink-0 cursor-pointer"
        aria-label="Install App"
      >
        <Download className="w-4 h-4" />
        <span className="hidden xs:inline">Install App</span>
      </motion.button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-2 rounded-lg bg-orange-600/10 dark:bg-orange-500/10 hover:bg-orange-600/20 dark:hover:bg-orange-500/20 text-orange-700 dark:text-orange-400 px-3.5 py-2 text-sm font-semibold transition-all border border-orange-500/10 shrink-0 cursor-pointer"
          aria-label="Install on iOS"
        >
          <Smartphone className="w-4 h-4" />
          <span>Install App</span>
        </motion.button>

        <AnimatePresence>
          {showIOSGuide && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowIOSGuide(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              />

              {/* Modal Container */}
              <motion.div
                initial={{ opacity: 0, scale: 0.93, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.93, y: 15 }}
                transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 p-6 shadow-2xl z-10"
              >
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="absolute right-4 top-4 rounded-full p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                  aria-label="Close guide"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex flex-col items-center text-center">
                  <div className="rounded-2xl bg-orange-50 dark:bg-orange-950/40 p-4 mb-4">
                    <Smartphone className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-50">
                    Install on iPhone or iPad
                  </h3>
                  <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    Add Cookbook to your home screen for quick offline access and full screen mode!
                  </p>
                </div>

                <div className="mt-6 space-y-4 border-t border-neutral-100 dark:border-neutral-800 pt-5 text-sm text-neutral-600 dark:text-neutral-300">
                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-300">
                      1
                    </div>
                    <div className="flex-1 leading-relaxed">
                      Tap the <strong className="text-neutral-900 dark:text-neutral-50 inline-flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-xs font-medium"><Share className="w-3.5 h-3.5 inline" /> Share</strong> button in Safari's bottom toolbar.
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-300">
                      2
                    </div>
                    <div className="flex-1 leading-relaxed">
                      Scroll down the share sheet and select <strong className="text-neutral-900 dark:text-neutral-50 inline-flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-xs font-medium"><PlusSquare className="w-3.5 h-3.5 inline" /> Add to Home Screen</strong>.
                    </div>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowIOSGuide(false)}
                  className="mt-6 w-full rounded-xl bg-orange-600 hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 py-3 text-sm font-semibold text-white shadow-md transition-colors cursor-pointer"
                >
                  Got It
                </motion.button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </>
    );
  }

  // Fallback (e.g. desktop safari/firefox where install prompting isn't supported, or running inside wrapper)
  // Let's offer a subtle, beautiful manual install explanation if desired, or return null to avoid clutter.
  // We'll return null by default, as browser install prompts aren't supported on some configurations.
  return null;
};
