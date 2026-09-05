import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, 
  ChevronUp, 
  ChevronDown, 
  Check, 
  CheckCircle2, 
  RotateCcw, 
  Play, 
  Pause, 
  Clock, 
  ListChecks, 
  Maximize2, 
  Minimize2, 
  ChefHat, 
  Sparkles,
  Utensils,
  MousePointer
} from "lucide-react";
import { Recipe } from "../types";

interface CookingModeProps {
  recipe: Recipe;
  servings: number;
  isOpen: boolean;
  completedSteps: Set<number>;
  completedIngredients: Set<number>;
  onToggleStepComplete: (stepIdx: number) => void;
  onToggleIngredientComplete: (ingIdx: number) => void;
  onClose: () => void;
}

// Time extraction from step text
const extractTimeInSeconds = (text: string): number | null => {
  let totalSeconds = 0;
  let found = false;

  const hourMatch = text.match(/(\d+)\s*(?:hour|hours|hr|hrs)\b/i);
  if (hourMatch) {
    totalSeconds += parseInt(hourMatch[1], 10) * 3600;
    found = true;
  }

  const minuteMatch = text.match(/(\d+)\s*(?:minute|minutes|min|mins)\b/i);
  if (minuteMatch) {
    totalSeconds += parseInt(minuteMatch[1], 10) * 60;
    found = true;
  }

  const secondMatch = text.match(/(\d+)\s*(?:second|seconds|sec|secs)\b/i);
  if (secondMatch) {
    totalSeconds += parseInt(secondMatch[1], 10);
    found = true;
  }

  return found ? totalSeconds : null;
};

const formatTimerSeconds = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const playTimerChime = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    
    // First chime tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now); // D5
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.5);

    // Second chime tone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.2); // A5
    gain2.gain.setValueAtTime(0.3, now + 0.2);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.2);
    osc2.stop(now + 0.8);
  } catch {
    // AudioContext permission guard
  }
};

export default function CookingMode({
  recipe,
  servings,
  isOpen,
  completedSteps,
  completedIngredients,
  onToggleStepComplete,
  onToggleIngredientComplete,
  onClose,
}: CookingModeProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = down/next, -1 = up/prev
  const [showIngredients, setShowIngredients] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const totalSteps = recipe.instructions.length;
  const currentInstruction = recipe.instructions[currentStep] || "";
  const isCurrentCompleted = completedSteps.has(currentStep);

  // Check if step is parallel / concurrent
  const isParallel = currentStep > 0 && (() => {
    const lower = currentInstruction.toLowerCase().trim();
    return (
      lower.startsWith("meanwhile") ||
      lower.startsWith("while") ||
      lower.startsWith("in parallel") ||
      lower.startsWith("separately") ||
      lower.startsWith("at the same time") ||
      lower.startsWith("for the ") ||
      lower.startsWith("to make the ") ||
      lower.startsWith("prepare the ")
    );
  })();

  // Timer state for the current step
  const initialTime = extractTimeInSeconds(currentInstruction);
  const [timeLeft, setTimeLeft] = useState<number>(initialTime || 0);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset timer when step changes
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const newInitial = extractTimeInSeconds(currentInstruction);
    setTimeLeft(newInitial || 0);
    setTimerRunning(false);
  }, [currentStep, currentInstruction]);

  // Handle countdown
  useEffect(() => {
    if (timerRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setTimerRunning(false);
            playTimerChime();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning, timeLeft]);

  const handlePrev = () => {
    if (isFinished) {
      setIsFinished(false);
      return;
    }
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    } else {
      // Reached the end!
      setIsFinished(true);
    }
  };

  const handleJumpToStep = (stepIdx: number) => {
    setIsFinished(false);
    setDirection(stepIdx > currentStep ? 1 : -1);
    setCurrentStep(stepIdx);
  };

  // Keyboard navigation (ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Space)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "Escape") {
        if (showIngredients) {
          setShowIngredients(false);
        } else {
          onClose();
        }
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowDown" || e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentStep, totalSteps, showIngredients, isFinished]);

  // Mouse wheel scroll to advance or go back with smooth debouncing
  const lastWheelTime = useRef<number>(0);
  const handleWheel = (e: React.WheelEvent) => {
    if (showIngredients) return;
    const now = Date.now();
    if (now - lastWheelTime.current < 450) return;

    if (Math.abs(e.deltaY) > 28) {
      if (e.deltaY > 0) {
        // Scrolling down -> advance to next step
        handleNext();
        lastWheelTime.current = now;
      } else {
        // Scrolling up -> previous step
        handlePrev();
        lastWheelTime.current = now;
      }
    }
  };

  // Touch swipe support (swipe up/down)
  const touchStartY = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    if (showIngredients) return;
    touchStartY.current = e.touches[0].clientY;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null || showIngredients) return;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(deltaY) > 45) {
      if (deltaY < 0) {
        // Swiped up -> next step
        handleNext();
      } else {
        // Swiped down -> prev step
        handlePrev();
      }
    }
    touchStartY.current = null;
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  if (!isOpen) return null;

  const scaleRatio = servings / (recipe.servings || 1);
  const formatAmount = (amount: number) => {
    if (!amount) return "";
    const scaled = amount * scaleRatio;
    return parseFloat(scaled.toFixed(2)).toString();
  };

  // Vertical progress percentage calculation
  const progressPercent = isFinished ? 100 : Math.round(((currentStep + 1) / totalSteps) * 100);

  return (
    <div 
      id="cooking-mode-overlay" 
      className="fixed inset-0 z-[60] flex flex-col bg-[#FDFBF7] dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 select-none overflow-hidden"
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top Header Bar */}
      <header className="px-4 sm:px-6 py-3.5 border-b border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between gap-4 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Exit Cooking Mode (Esc)"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-accent-500 dark:bg-accent-400 text-white dark:text-neutral-900 flex items-center justify-center shrink-0 shadow-xs">
              <ChefHat className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-accent-600 dark:text-accent-400">
                  Cooking Mode
                </span>
                <span className="text-neutral-300 dark:text-neutral-700 hidden sm:inline">•</span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 hidden sm:inline">
                  {servings} {servings === 1 ? 'serving' : 'servings'}
                </span>
              </div>
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate max-w-xs sm:max-w-md">
                {recipe.title}
              </h2>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 text-neutral-500 dark:text-neutral-400 text-xs font-medium">
            <MousePointer className="w-3.5 h-3.5" />
            <span>Scroll or use ↑ / ↓</span>
          </div>

          <button
            type="button"
            onClick={() => setShowIngredients(!showIngredients)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
              showIngredients
                ? "bg-accent-500 text-white border-accent-500"
                : "border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            }`}
            title="View Ingredients"
          >
            <ListChecks className="w-4 h-4" />
            <span className="hidden sm:inline">Ingredients</span>
            <span className="font-mono text-[11px] opacity-80">({recipe.ingredients.length})</span>
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="hidden md:flex p-2 rounded-xl text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Vertical Stage: Vertical Progress Rail + Step Card */}
      <div className="flex-1 flex flex-row items-stretch justify-center px-2.5 sm:px-6 md:px-8 py-2.5 sm:py-6 max-w-5xl w-full mx-auto overflow-hidden relative gap-2.5 sm:gap-6 md:gap-8">
        
        {/* Vertical Progress Bar & Timeline Track */}
        <div className="flex flex-col items-center justify-between py-2 shrink-0 w-8 sm:w-14 select-none">
          {/* Vertical Progress Rail with Stepper Beads */}
          <div className="relative flex-1 flex flex-col items-center justify-between w-full my-1">
            {/* Background Vertical Line Track */}
            <div className="absolute top-2 bottom-2 left-1/2 -translate-x-1/2 w-1 sm:w-1.5 bg-neutral-200 dark:bg-neutral-800 rounded-full overflow-hidden">
              {/* Animated Vertical Progress Fill */}
              <motion.div
                className="w-full bg-accent-500 dark:bg-accent-400 rounded-full origin-top"
                initial={{ height: 0 }}
                animate={{ height: `${progressPercent}%` }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              />
            </div>

            {/* Vertical Step Nodes / Jump Dots */}
            {recipe.instructions.map((_, idx) => {
              const isDone = completedSteps.has(idx);
              const isCurrent = currentStep === idx && !isFinished;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleJumpToStep(idx)}
                  className={`relative z-10 flex items-center justify-center transition-all cursor-pointer rounded-full group ${
                    isCurrent
                      ? "w-8 h-8 sm:w-9 sm:h-9 bg-accent-500 dark:bg-accent-400 text-white dark:text-neutral-900 font-bold text-xs shadow-md ring-4 ring-accent-100 dark:ring-accent-950/60 scale-110"
                      : isDone
                      ? "w-6 h-6 sm:w-7 sm:h-7 bg-accent-100 dark:bg-accent-900/40 text-accent-700 dark:text-accent-400 border-2 border-accent-500 dark:border-accent-400 hover:scale-110"
                      : "w-5 h-5 sm:w-6 sm:h-6 bg-white dark:bg-neutral-800 border-2 border-neutral-300 dark:border-neutral-700 text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500 hover:scale-110"
                  }`}
                  title={`Step ${idx + 1}`}
                >
                  {isCurrent ? (
                    <span>{idx + 1}</span>
                  ) : isDone ? (
                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                  ) : (
                    <span className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 group-hover:block hidden">
                      {idx + 1}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom Step Count Indicator */}
          <div className="text-center mt-2">
            <span className="text-[10px] font-mono font-semibold uppercase text-neutral-400 dark:text-neutral-500">
              {currentStep + 1}/{totalSteps}
            </span>
          </div>
        </div>

        {/* Step Card Container with Vertical Scroll Animation */}
        <div className="flex-1 flex flex-col justify-center items-center overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            {!isFinished ? (
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: direction * 60, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -direction * 60, scale: 0.98 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="w-full flex-1 flex flex-col justify-center max-h-full"
              >
                {/* Card Container */}
                <div className="w-full bg-white dark:bg-neutral-800/90 border border-neutral-200/80 dark:border-neutral-700 rounded-3xl p-4 sm:p-8 md:p-10 shadow-sm flex flex-col justify-between min-h-0 sm:min-h-[420px] max-h-[calc(100vh-90px)] sm:max-h-[calc(100vh-210px)] overflow-y-auto relative transition-colors">
                  
                  {/* Step Header: Parallel tag & Mark Done (highlighted box removed for max real estate) */}
                  <div className="flex items-center justify-between gap-3 pb-3 sm:pb-4 border-b border-neutral-100 dark:border-neutral-700/80 shrink-0">
                    <div>
                      {isParallel ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded-md">
                          <Sparkles className="w-3 h-3" />
                          Meanwhile / In Parallel
                        </span>
                      ) : (
                        <div />
                      )}
                    </div>

                    {/* Toggle Step Completed */}
                    <button
                      type="button"
                      onClick={() => onToggleStepComplete(currentStep)}
                      className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                        isCurrentCompleted
                          ? "bg-accent-100 dark:bg-accent-900/30 border-accent-300 dark:border-accent-700 text-accent-700 dark:text-accent-300"
                          : "border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700/60"
                      }`}
                    >
                      <Check className={`w-3.5 h-3.5 ${isCurrentCompleted ? "text-accent-600 dark:text-accent-400" : "text-neutral-400"}`} strokeWidth={isCurrentCompleted ? 3 : 2} />
                      <span className="hidden sm:inline">{isCurrentCompleted ? "Step Completed" : "Mark as Done"}</span>
                      <span className="sm:hidden">{isCurrentCompleted ? "Done" : "Mark Done"}</span>
                    </button>
                  </div>

                  {/* Instruction Body Text */}
                  <div className="py-3 sm:py-8 my-auto overflow-y-auto">
                    <p className="text-base sm:text-2xl md:text-3xl font-medium text-neutral-900 dark:text-neutral-50 leading-normal sm:leading-relaxed md:leading-relaxed">
                      {currentInstruction}
                    </p>
                  </div>

                  {/* Optional Step Timer Widget */}
                  {initialTime !== null && (
                    <div className="pt-3 sm:pt-4 border-t border-neutral-100 dark:border-neutral-700/80 shrink-0">
                      <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 sm:p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/70 dark:border-neutral-700/60">
                        <div className="flex items-center gap-2.5 sm:gap-3">
                          <div className={`p-2 sm:p-2.5 rounded-xl ${timerRunning ? "bg-accent-500 text-white animate-pulse" : "bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"}`}>
                            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                          </div>
                          <div>
                            <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                              Step Timer
                            </p>
                            <p className={`font-mono text-lg sm:text-2xl font-bold ${
                              timeLeft === 0 
                                ? "text-red-500 dark:text-red-400" 
                                : timerRunning 
                                ? "text-accent-600 dark:text-accent-400" 
                                : "text-neutral-900 dark:text-neutral-100"
                            }`}>
                              {formatTimerSeconds(timeLeft)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2">
                          {timerRunning ? (
                            <button
                              type="button"
                              onClick={() => setTimerRunning(false)}
                              className="px-3.5 sm:px-4 py-1.5 sm:py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                            >
                              <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              <span>Pause</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                if (timeLeft === 0) setTimeLeft(initialTime || 0);
                                setTimerRunning(true);
                              }}
                              className="px-3.5 sm:px-4 py-1.5 sm:py-2 bg-accent-500 hover:bg-accent-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                            >
                              <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />
                              <span>{timeLeft === 0 ? "Restart" : timeLeft < initialTime ? "Resume" : "Start"}</span>
                            </button>
                          )}

                          {timeLeft !== initialTime && (
                            <button
                              type="button"
                              onClick={() => {
                                setTimerRunning(false);
                                setTimeLeft(initialTime || 0);
                              }}
                              className="p-1.5 sm:p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-200/50 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                              title="Reset Timer"
                            >
                              <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mobile-only Finish Button on Last Step */}
                  {currentStep === totalSteps - 1 && (
                    <div className="pt-3 sm:hidden shrink-0">
                      <button
                        type="button"
                        onClick={handleNext}
                        className="w-full py-2.5 px-4 rounded-xl bg-accent-500 hover:bg-accent-600 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                      >
                        <span>Finish Cooking</span>
                        <Check className="w-4 h-4" strokeWidth={2.5} />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              /* Celebration Complete View */
              <motion.div
                key="celebration"
                initial={{ opacity: 0, y: 50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -50, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="w-full text-center"
              >
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200/80 dark:border-neutral-700 rounded-3xl p-6 sm:p-12 shadow-sm max-w-xl mx-auto flex flex-col items-center">
                  <div className="w-20 h-20 rounded-full bg-accent-100 dark:bg-accent-950/50 border-4 border-accent-200 dark:border-accent-800 flex items-center justify-center text-accent-600 dark:text-accent-400 mb-6 shadow-inner">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>

                  <span className="text-xs font-bold uppercase tracking-widest text-accent-600 dark:text-accent-400 mb-2">
                    Recipe Finished
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-50 mb-3">
                    Bon Appétit!
                  </h3>
                  <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 max-w-sm mb-8 leading-relaxed">
                    You've successfully completed all {totalSteps} steps for <span className="font-semibold text-neutral-900 dark:text-neutral-200">{recipe.title}</span>. Time to plate up and enjoy!
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        setIsFinished(false);
                        setCurrentStep(0);
                      }}
                      className="px-6 py-3 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700/60 text-neutral-800 dark:text-neutral-200 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Start Over</span>
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-6 py-3 bg-accent-500 hover:bg-accent-600 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm cursor-pointer"
                    >
                      <Utensils className="w-4 h-4" />
                      <span>Return to Recipe</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Floating Quick Action Column on Desktop */}
        <div className="hidden md:flex flex-col justify-center items-center gap-2 py-4 shrink-0">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStep === 0 && !isFinished}
            className="p-3 rounded-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-xs active:scale-95 cursor-pointer"
            title="Previous Step (Up Arrow / Scroll Up)"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-neutral-200 dark:bg-neutral-800" />
          <button
            type="button"
            onClick={handleNext}
            className="p-3 rounded-2xl bg-accent-500 hover:bg-accent-600 dark:bg-accent-400 dark:hover:bg-accent-300 text-white dark:text-neutral-900 transition-all shadow-xs active:scale-95 cursor-pointer"
            title={currentStep === totalSteps - 1 ? "Finish Cooking" : "Next Step (Down Arrow / Scroll Down)"}
          >
            {currentStep === totalSteps - 1 ? (
              <Check className="w-5 h-5" strokeWidth={2.5} />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
        </div>

      </div>

      {/* Bottom Sticky Vertical Flow Bar - Hidden on mobile to maximize recipe screen space */}
      <footer className="hidden sm:block px-4 sm:px-8 py-3.5 border-t border-neutral-200/80 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 backdrop-blur-sm shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          {/* Previous Step Button (Vertical arrow) */}
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStep === 0 && !isFinished}
            className="h-11 px-4 sm:px-6 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 font-semibold text-sm flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all disabled:opacity-40 disabled:hover:bg-transparent cursor-pointer active:scale-98"
          >
            <ChevronUp className="w-5 h-5" />
            <span>Previous Step</span>
          </button>

          {/* Center Vertical Flow Information */}
          <div className="flex items-center gap-2 text-center text-xs text-neutral-500 dark:text-neutral-400">
            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
              Step {isFinished ? totalSteps : currentStep + 1}
            </span>
            <span>of</span>
            <span>{totalSteps}</span>
          </div>

          {/* Next / Finish Button (Vertical arrow) */}
          {!isFinished ? (
            <button
              type="button"
              onClick={handleNext}
              className="h-11 px-5 sm:px-7 rounded-2xl bg-accent-500 hover:bg-accent-600 dark:bg-accent-400 dark:hover:bg-accent-300 text-white dark:text-neutral-900 font-semibold text-sm flex items-center gap-2 transition-all shadow-sm cursor-pointer active:scale-98"
            >
              <span>{currentStep === totalSteps - 1 ? "Finish Cooking" : "Next Step"}</span>
              {currentStep === totalSteps - 1 ? (
                <Check className="w-5 h-5" strokeWidth={2.5} />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-5 sm:px-7 rounded-2xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 font-semibold text-sm flex items-center gap-2 transition-all shadow-sm cursor-pointer active:scale-98"
            >
              <span>Close</span>
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </footer>

      {/* Slide-over Scaled Ingredients Reference Drawer */}
      <AnimatePresence>
        {showIngredients && (
          <div className="fixed inset-0 z-[70] flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowIngredients(false)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-xs"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="relative w-full max-w-md bg-white dark:bg-neutral-800 h-full shadow-2xl flex flex-col z-10"
            >
              <div className="p-5 border-b border-neutral-100 dark:border-neutral-700 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-accent-100 dark:bg-accent-950/40 text-accent-700 dark:text-accent-400">
                    <ListChecks className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-base text-neutral-900 dark:text-neutral-50">
                      Recipe Ingredients
                    </h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Scaled for {servings} {servings === 1 ? 'serving' : 'servings'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIngredients(false)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Ingredients List */}
              <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
                {recipe.ingredients.map((ing, idx) => {
                  const isCompleted = completedIngredients.has(idx);
                  return (
                    <div
                      key={idx}
                      onClick={() => onToggleIngredientComplete(idx)}
                      className={`flex items-center justify-between gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                        isCompleted
                          ? "border-neutral-100 dark:border-neutral-700/60 bg-neutral-50 dark:bg-neutral-900/40 text-neutral-400 dark:text-neutral-500"
                          : "border-neutral-100 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-neutral-200 dark:hover:border-neutral-600 text-neutral-800 dark:text-neutral-200"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-colors ${
                          isCompleted
                            ? "bg-accent-100 dark:bg-accent-900/30 border-accent-200 dark:border-accent-800 text-accent-700 dark:text-accent-500"
                            : "border-neutral-300 dark:border-neutral-600 text-transparent"
                        }`}>
                          <Check className="w-3 h-3" strokeWidth={3} />
                        </div>
                        <span className={`text-sm leading-tight ${isCompleted ? "line-through" : ""}`}>
                          {ing.name}
                        </span>
                      </div>
                      <span className={`font-mono text-xs text-right shrink-0 ${isCompleted ? "text-neutral-400 dark:text-neutral-500" : "text-neutral-500 dark:text-neutral-400"}`}>
                        {formatAmount(ing.amount)} {ing.unit}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 border-t border-neutral-100 dark:border-neutral-700 text-center">
                <button
                  type="button"
                  onClick={() => setShowIngredients(false)}
                  className="w-full py-2.5 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
