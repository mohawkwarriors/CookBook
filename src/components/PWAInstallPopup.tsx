import React, { useState, useEffect, useRef } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { X, Share, PlusSquare, Smartphone, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import CookbookLogo from './CookbookLogo';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import { useDialogFocusTrap } from '../hooks/useDialogFocusTrap';

const STORAGE_KEY = 'cookbook_install_prompt_resolved';

export const PWAInstallPopup: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [isOpen, setIsOpen] = useState(false);
  const [showIOSSteps, setShowIOSSteps] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useBodyScrollLock(isOpen);
  useDialogFocusTrap(isOpen, dialogRef);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        markResolvedAndClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

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
          ref={dialogRef}
          tabIndex={-1}
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-sm max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-2xl bg-card border border-border p-6 shadow-2xl z-10 outline-none"
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-modal-title"
        >
          <button
            onClick={handleDeclineClick}
            className="absolute right-3.5 top-3.5 rounded-full p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {!showIOSSteps ? (
            <div className="flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#2A231E] text-[#F7F1E8] border border-white/10 shadow-sm mb-4 p-2.5 flex items-center justify-center">
                <CookbookLogo className="w-full h-full" />
              </div>

              <h3 id="install-modal-title" className="text-lg font-semibold text-foreground tracking-tight">
                Install Cookbook
              </h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Add Cookbook to your home screen for instant offline access and a full-screen cooking experience.
              </p>

              <div className="mt-6 flex flex-col w-full gap-2">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleInstallClick}
                  className="w-full h-11 px-4 rounded-full bg-foreground hover:opacity-85 text-background font-medium text-sm transition-opacity flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Smartphone className="w-4 h-4 text-primary" />
                  <span>Install App</span>
                </motion.button>

                <button
                  type="button"
                  onClick={handleDeclineClick}
                  className="w-full h-10 px-4 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary text-sm font-medium transition-colors cursor-pointer"
                >
                  Not now
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center mb-3">
                <Smartphone className="w-6 h-6 text-foreground" />
              </div>

              <h3 className="text-base font-semibold text-foreground">
                Install on iPhone or iPad
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Two quick steps in Safari:
              </p>

              <div className="mt-4 space-y-3 border-t border-border pt-4 text-left text-sm text-muted-foreground w-full">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
                    1
                  </div>
                  <div className="flex-1 leading-relaxed text-xs sm:text-sm">
                    Tap the <strong className="text-foreground inline-flex items-center gap-1 bg-secondary px-1.5 py-0.5 rounded font-medium"><Share className="w-3 h-3 inline" /> Share</strong> button in Safari&apos;s bottom bar.
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
                    2
                  </div>
                  <div className="flex-1 leading-relaxed text-xs sm:text-sm">
                    Scroll down and tap <strong className="text-foreground inline-flex items-center gap-1 bg-secondary px-1.5 py-0.5 rounded font-medium"><PlusSquare className="w-3 h-3 inline" /> Add to Home Screen</strong>.
                  </div>
                </div>
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={markResolvedAndClose}
                className="mt-5 w-full h-11 px-4 rounded-full bg-foreground hover:opacity-85 text-background font-medium text-sm transition-opacity flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4 text-primary" />
                <span>Got It</span>
              </motion.button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
