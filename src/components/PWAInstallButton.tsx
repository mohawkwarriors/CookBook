import React, { useState, useEffect, useRef } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, X, Share, PlusSquare, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useDialogFocusTrap } from '../hooks/useDialogFocusTrap';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useBodyScrollLock(showIOSGuide);
  useDialogFocusTrap(showIOSGuide, dialogRef);

  useEffect(() => {
    if (!showIOSGuide) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowIOSGuide(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showIOSGuide]);

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
        className="flex items-center gap-2 rounded-full bg-foreground hover:opacity-85 px-4 py-2 text-xs font-medium text-background transition-opacity shrink-0 cursor-pointer"
        aria-label="Install App"
      >
        <Download className="w-3.5 h-3.5 text-primary" />
        <span className="hidden sm:inline">Install App</span>
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
          className="flex items-center gap-2 rounded-full bg-secondary hover:bg-secondary/80 text-foreground px-4 py-2 text-xs font-medium transition-colors border border-border shrink-0 cursor-pointer"
          aria-label="Install on iOS"
        >
          <Smartphone className="w-3.5 h-3.5 text-primary-dark" />
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
                ref={dialogRef}
                tabIndex={-1}
                role="dialog"
                aria-modal="true"
                aria-label="Install on iPhone or iPad"
                initial={{ opacity: 0, scale: 0.93, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.93, y: 15 }}
                transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-full max-w-sm max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-2xl bg-card border border-border p-6 shadow-2xl z-10 outline-none"
              >
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition"
                  aria-label="Close guide"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex flex-col items-center text-center">
                  <div className="rounded-2xl bg-secondary p-4 mb-4">
                    <Smartphone className="w-7 h-7 text-foreground" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">
                    Install on iPhone or iPad
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    Add Cookbook to your home screen for quick offline access and full screen mode!
                  </p>
                </div>

                <div className="mt-6 space-y-4 border-t border-border pt-5 text-sm text-muted-foreground">
                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
                      1
                    </div>
                    <div className="flex-1 leading-relaxed">
                      Tap the <strong className="text-foreground inline-flex items-center gap-1 bg-secondary px-1.5 py-0.5 rounded text-xs font-medium"><Share className="w-3.5 h-3.5 inline" /> Share</strong> button in Safari&apos;s bottom toolbar.
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
                      2
                    </div>
                    <div className="flex-1 leading-relaxed">
                      Scroll down the share sheet and select <strong className="text-foreground inline-flex items-center gap-1 bg-secondary px-1.5 py-0.5 rounded text-xs font-medium"><PlusSquare className="w-3.5 h-3.5 inline" /> Add to Home Screen</strong>.
                    </div>
                  </div>
                </div>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowIOSGuide(false)}
                  className="mt-6 w-full rounded-full bg-foreground hover:opacity-85 py-3 text-sm font-medium text-background transition-opacity cursor-pointer"
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
