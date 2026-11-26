import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  CheckCircle2,
  RotateCcw,
  Play,
  Pause,
  Clock,
  ListChecks,
  Maximize2,
  Minimize2,
  Utensils,
} from "lucide-react";
import { Recipe } from "../types";
import { parseInstructionChapters, parseIngredientGroups } from "../lib/recipeComponents";

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
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

const playTimerChime = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.5);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.2);
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
  const [direction, setDirection] = useState(1);
  const [showIngredients, setShowIngredients] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const parsedMethod = useMemo(
    () => parseInstructionChapters(recipe.instructions),
    [recipe.instructions]
  );

  const parsedIngredients = useMemo(
    () =>
      parseIngredientGroups(
        recipe.ingredients,
        parsedMethod.chapters.map((c) => c.title)
      ),
    [recipe.ingredients, parsedMethod.chapters]
  );

  const totalSteps = recipe.instructions.length;
  const activeStepMeta = parsedMethod.isMultiComponent
    ? parsedMethod.stepMetaByIndex.get(currentStep) || null
    : null;
  const currentInstruction = activeStepMeta
    ? activeStepMeta.text
    : recipe.instructions[currentStep] || "";
  const isCurrentCompleted = completedSteps.has(currentStep);

  // Cook Well signature feature: match ingredients mentioned in the active step
  const stepIngredients = useMemo(() => {
    const lowerStep = currentInstruction.toLowerCase();
    const stopWords = new Set(["fresh", "large", "small", "medium", "chopped", "diced", "minced", "sliced", "ground", "dried", "extra", "virgin", "kosher", "sea", "black", "white", "red", "green", "yellow", "whole", "unsalted", "salted", "cold", "warm", "hot", "water", "or", "and", "of", "for", "to", "with", "in", "finely", "roughly", "thinly"]);

    const activeChapterKey = activeStepMeta?.chapterTitle.trim().toLowerCase() ?? null;
    const hasMatchingGroup =
      Boolean(activeChapterKey) &&
      parsedIngredients.isGrouped &&
      parsedIngredients.groups.some(
        (g) => g.title.trim().toLowerCase() === activeChapterKey
      );

    return recipe.ingredients
      .map((ing, idx) => ({
        ing,
        idx,
        displayName: parsedIngredients.displayNameByIndex.get(idx) ?? ing.name,
        groupTitle: parsedIngredients.groupTitleByIndex.get(idx)?.trim().toLowerCase() ?? null,
      }))
      .filter(({ displayName, groupTitle }) => {
        if (hasMatchingGroup && groupTitle !== activeChapterKey) {
          return false;
        }
        const cleaned = displayName.toLowerCase().replace(/[^a-z\s]/g, " ");
        const words = cleaned.split(/\s+/).filter((w) => w.length >= 3 && !stopWords.has(w));
        if (words.length === 0) return lowerStep.includes(cleaned.trim());
        return words.some((w) => {
          const stem = w.endsWith("s") && w.length > 4 ? w.slice(0, -1) : w;
          return lowerStep.includes(stem);
        });
      });
  }, [
    currentInstruction,
    recipe.ingredients,
    activeStepMeta,
    parsedIngredients.isGrouped,
    parsedIngredients.groups,
    parsedIngredients.displayNameByIndex,
    parsedIngredients.groupTitleByIndex,
  ]);

  const initialTime = extractTimeInSeconds(currentInstruction);
  const [timeLeft, setTimeLeft] = useState<number>(initialTime || 0);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const newInitial = extractTimeInSeconds(currentInstruction);
    setTimeLeft(newInitial || 0);
    setTimerRunning(false);
  }, [currentStep, currentInstruction]);

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
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
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
      setIsFinished(true);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Escape") {
        if (showIngredients) setShowIngredients(false);
        else onClose();
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowDown" || e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentStep, totalSteps, showIngredients, isFinished]);

  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    if (showIngredients) return;
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || showIngredients) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(deltaX) > 55) {
      if (deltaX < 0) handleNext();
      else handlePrev();
    }
    touchStartX.current = null;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else if (document.exitFullscreen) {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  if (!isOpen) return null;

  const scaleRatio = servings / (recipe.servings || 1);
  const formatAmount = (amount: number) => {
    if (!amount) return "";
    const scaled = amount * scaleRatio;
    return parseFloat(scaled.toFixed(2)).toString();
  };

  const progressPercent = isFinished ? 100 : Math.round(((currentStep + 1) / Math.max(totalSteps, 1)) * 100);

  return (
    <div
      id="cooking-mode-overlay"
      className="fixed inset-0 z-[60] flex flex-col bg-background text-foreground select-none overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Ultra-crisp Top Linear Progress Bar */}
      <div className="h-1 w-full bg-secondary shrink-0">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>

      {/* Top Header */}
      <header className="h-16 px-4 sm:px-6 border-b border-border/80 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer shrink-0"
            title="Exit Let's Cook Mode (Esc)"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                <span className="w-2 h-2 rounded-full bg-primary" />
                Let&apos;s Cook
              </span>
              <span>·</span>
              <span className="tabular-nums">
                {servings} {servings === 1 ? "serving" : "servings"}
              </span>
            </div>
            <h2 className="text-sm font-medium text-muted-foreground truncate max-w-[200px] sm:max-w-md">
              {recipe.title}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowIngredients(!showIngredients)}
            className={`h-9 px-3.5 rounded-full border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
              showIngredients
                ? "bg-foreground text-background border-foreground"
                : "border-border text-foreground hover:bg-secondary"
            }`}
          >
            <ListChecks className="w-3.5 h-3.5" />
            <span>Ingredients</span>
            <span className="font-mono text-[11px] opacity-70">{recipe.ingredients.length}</span>
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="hidden sm:flex w-9 h-9 rounded-full border border-border items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Step Stage */}
      <div className="flex-1 flex flex-col justify-center max-w-3xl w-full mx-auto px-5 sm:px-8 py-6 overflow-y-auto">
        <AnimatePresence mode="wait" initial={false}>
          {!isFinished ? (
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: direction * 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -direction * 24 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-8"
            >
              {/* Step Counter & Mark Complete Pill */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  {activeStepMeta && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary-dark dark:text-primary text-xs font-semibold">
                      <span className="font-mono text-[10px] uppercase tracking-wider opacity-80">
                        Part {activeStepMeta.chapterNumber}
                      </span>
                      <span className="opacity-40">·</span>
                      <span>{activeStepMeta.chapterTitle}</span>
                    </span>
                  )}
                  <span className="font-mono text-xs font-medium uppercase tracking-widest text-muted-foreground tabular-nums">
                    Step {currentStep + 1} of {totalSteps}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => onToggleStepComplete(currentStep)}
                  className={`h-8 px-3.5 rounded-full border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                    isCurrentCompleted
                      ? "bg-primary/15 border-primary text-foreground"
                      : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Check className={`w-3.5 h-3.5 ${isCurrentCompleted ? "text-primary-dark" : ""}`} strokeWidth={2.5} />
                  <span>{isCurrentCompleted ? "Completed" : "Mark step done"}</span>
                </button>
              </div>

              {/* Instruction Copy */}
              <p className="text-2xl sm:text-3xl md:text-4xl font-medium text-foreground leading-[1.35] tracking-[-0.02em]">
                {currentInstruction}
              </p>

              {/* Step-Relevant Ingredients (Cook Well Signature Feature) */}
              {stepIngredients.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Ingredients in this step
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {stepIngredients.map(({ ing, idx, displayName }) => {
                      const done = completedIngredients.has(idx);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => onToggleIngredientComplete(idx)}
                          className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs sm:text-sm transition-all cursor-pointer ${
                            done
                              ? "border-primary/40 bg-primary/10 text-muted-foreground line-through"
                              : "border-border bg-secondary/60 text-foreground hover:border-foreground/30"
                          }`}
                        >
                          <span
                            className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border ${
                              done ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/50"
                            }`}
                          >
                            {done && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                          </span>
                          <span className="font-medium">{displayName}</span>
                          {(ing.amount > 0 || ing.unit) && (
                            <span className="font-mono text-xs text-muted-foreground tabular-nums">
                              {formatAmount(ing.amount)} {ing.unit}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Built-in Step Timer Pill */}
              {initialTime !== null && (
                <div className="pt-2">
                  <div className="inline-flex items-center gap-4 rounded-full border border-border bg-secondary/50 pl-4 pr-2.5 py-2">
                    <div className="flex items-center gap-2.5">
                      <Clock className={`w-4 h-4 ${timerRunning ? "text-primary-dark animate-pulse" : "text-muted-foreground"}`} />
                      <span
                        className={`font-mono text-xl font-semibold tabular-nums ${
                          timeLeft === 0 ? "text-red-500" : "text-foreground"
                        }`}
                      >
                        {formatTimerSeconds(timeLeft)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {timerRunning ? (
                        <button
                          type="button"
                          onClick={() => setTimerRunning(false)}
                          className="h-9 px-4 rounded-full bg-foreground text-background text-xs font-medium flex items-center gap-1.5 cursor-pointer hover:opacity-85"
                        >
                          <Pause className="w-3.5 h-3.5 fill-current" />
                          <span>Pause</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (timeLeft === 0) setTimeLeft(initialTime || 0);
                            setTimerRunning(true);
                          }}
                          className="h-9 px-4 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:brightness-95"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>{timeLeft === 0 ? "Restart" : timeLeft < initialTime ? "Resume" : "Start Timer"}</span>
                        </button>
                      )}

                      {timeLeft !== initialTime && (
                        <button
                          type="button"
                          onClick={() => {
                            setTimerRunning(false);
                            setTimeLeft(initialTime || 0);
                          }}
                          className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
                          title="Reset timer"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="celebration"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25 }}
              className="text-center max-w-md mx-auto space-y-6"
            >
              <div className="w-16 h-16 rounded-full bg-primary/15 border border-primary/30 text-primary-dark flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  All {totalSteps} steps complete
                </p>
                <h3 className="font-serif text-4xl font-semibold tracking-tight text-foreground">
                  Time to eat.
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  You finished cooking <span className="text-foreground font-medium">{recipe.title}</span>.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5 justify-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsFinished(false);
                    setCurrentStep(0);
                  }}
                  className="h-11 px-5 rounded-full border border-border text-sm font-medium text-foreground hover:bg-secondary flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Start Over</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="h-11 px-6 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-85 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Utensils className="w-4 h-4" />
                  <span>Back to Recipe</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Step Navigation Bar */}
      <footer className="border-t border-border/80 px-4 sm:px-6 py-4 shrink-0 bg-background">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStep === 0 && !isFinished}
            className="h-11 px-4 sm:px-5 rounded-full border border-border text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-30 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          {/* Compact Step Dots */}
          <div className="hidden sm:flex items-center gap-1.5">
            {recipe.instructions.map((_, idx) => {
              const active = !isFinished && idx === currentStep;
              const done = completedSteps.has(idx);
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setIsFinished(false);
                    setDirection(idx > currentStep ? 1 : -1);
                    setCurrentStep(idx);
                  }}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    active
                      ? "w-6 bg-foreground"
                      : done
                      ? "w-2 bg-primary"
                      : "w-2 bg-border hover:bg-muted-foreground/50"
                  }`}
                  title={`Step ${idx + 1}`}
                />
              );
            })}
          </div>

          {!isFinished ? (
            <button
              type="button"
              onClick={handleNext}
              className="h-11 px-5 sm:px-6 rounded-full bg-foreground text-background hover:opacity-85 text-sm font-medium transition-opacity flex items-center gap-1.5 cursor-pointer"
            >
              <span>{currentStep === totalSteps - 1 ? "Finish" : "Next Step"}</span>
              {currentStep === totalSteps - 1 ? (
                <Check className="w-4 h-4 text-primary" strokeWidth={2.5} />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-6 rounded-full bg-foreground text-background hover:opacity-85 text-sm font-medium cursor-pointer"
            >
              Done
            </button>
          )}
        </div>
      </footer>

      {/* Slide-Over Full Ingredients Drawer */}
      <AnimatePresence>
        {showIngredients && (
          <div className="fixed inset-0 z-[70] flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowIngredients(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              className="relative w-full max-w-md bg-background border-l border-border h-full shadow-2xl flex flex-col z-10"
            >
              <div className="h-16 px-5 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">All Ingredients</h3>
                  <p className="text-xs text-muted-foreground">
                    Scaled for {servings} {servings === 1 ? "serving" : "servings"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIngredients(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-3">
                {(() => {
                  const renderDrawerRow = (
                    ing: Recipe["ingredients"][number],
                    idx: number,
                    displayName: string
                  ) => {
                    const isDone = completedIngredients.has(idx);
                    return (
                      <li
                        key={idx}
                        onClick={() => onToggleIngredientComplete(idx)}
                        className="flex items-center justify-between gap-3 py-3.5 cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`w-4 h-4 rounded-full shrink-0 flex items-center justify-center border transition-colors ${
                              isDone
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-neutral-300 dark:border-neutral-600"
                            }`}
                          >
                            {isDone && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                          </span>
                          <span className={`text-sm ${isDone ? "line-through text-muted-foreground/60" : "text-foreground"}`}>
                            {displayName}
                          </span>
                        </div>
                        <span className="font-mono text-xs tabular-nums text-muted-foreground shrink-0">
                          {formatAmount(ing.amount)} {ing.unit}
                        </span>
                      </li>
                    );
                  };

                  if (!parsedIngredients.isGrouped) {
                    return (
                      <ul className="divide-y divide-border/70">
                        {recipe.ingredients.map((ing, idx) =>
                          renderDrawerRow(ing, idx, ing.name)
                        )}
                      </ul>
                    );
                  }

                  return (
                    <div className="space-y-5 py-1">
                      {parsedIngredients.groups.map((group) => (
                        <div key={group.id}>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-1">
                            {group.title}
                          </p>
                          <ul className="divide-y divide-border/70 border-y border-border/70">
                            {group.items.map((item) =>
                              renderDrawerRow(
                                item.ingredient,
                                item.originalIdx,
                                item.displayName
                              )
                            )}
                          </ul>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
