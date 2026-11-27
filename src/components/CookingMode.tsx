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
import { ComputedSchedule, formatClockTime, formatDurationShort } from "../lib/stepScheduler";
import IngredientGroupCards from "./IngredientGroupCards";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";

interface CookingModeProps {
  recipe: Recipe;
  servings: number;
  isOpen: boolean;
  completedSteps: Set<number>;
  completedIngredients: Set<number>;
  schedule?: ComputedSchedule | null;
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
  schedule,
  onToggleStepComplete,
  onToggleIngredientComplete,
  onClose,
}: CookingModeProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [showIngredients, setShowIngredients] = useState(false);
  const [collapsedIngredientGroups, setCollapsedIngredientGroups] = useState<Set<string>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFinished, setIsFinished] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);
  const stageScrollRef = useRef<HTMLDivElement>(null);
  const ingredientsDrawerRef = useRef<HTMLDivElement>(null);
  const ingredientsBtnRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const wasIngredientsOpenRef = useRef(false);
  const isFinishedRef = useRef(isFinished);
  isFinishedRef.current = isFinished;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    setCollapsedIngredientGroups(new Set());
    setCurrentStep(0);
    setIsFinished(false);
    setShowIngredients(false);
  }, [recipe.id]);

  useEffect(() => {
    if (!isOpen) return;
    setCollapsedIngredientGroups(new Set());
    setShowIngredients(false);
    if (isFinishedRef.current) {
      setIsFinished(false);
      setCurrentStep(0);
    }
    if (stageScrollRef.current) {
      stageScrollRef.current.scrollTop = 0;
    }
  }, [isOpen]);

  useBodyScrollLock(isOpen);

  // Move focus into CookingMode dialog on open and restore safely on close
  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const timer = setTimeout(() => {
      const overlay = overlayRef.current;
      if (!overlay) return;
      const firstFocusable = overlay.querySelector<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      (firstFocusable || overlay).focus();
    }, 30);

    return () => {
      clearTimeout(timer);
      const prev = previousFocusRef.current;
      if (prev && typeof prev.focus === "function" && document.contains(prev) && prev.offsetParent !== null) {
        prev.focus();
      } else {
        document.getElementById("recipe-modal-overlay")?.focus();
      }
    };
  }, [isOpen]);

  // Focus management for slide-over Ingredients drawer
  useEffect(() => {
    if (!isOpen) {
      wasIngredientsOpenRef.current = false;
      return;
    }
    if (showIngredients) {
      wasIngredientsOpenRef.current = true;
      const timer = setTimeout(() => {
        const drawer = ingredientsDrawerRef.current;
        if (!drawer) return;
        const firstFocusable = drawer.querySelector<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        (firstFocusable || drawer).focus();
      }, 30);
      return () => clearTimeout(timer);
    } else if (wasIngredientsOpenRef.current) {
      wasIngredientsOpenRef.current = false;
      ingredientsBtnRef.current?.focus();
    }
  }, [isOpen, showIngredients]);

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
  const currentStepTiming = schedule?.stepByIndex.get(currentStep) ?? null;

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
      if (e.key === "Escape") {
        e.preventDefault();
        if (showIngredients) setShowIngredients(false);
        else onCloseRef.current();
        return;
      }

      if (e.key === "Tab") {
        const scope = showIngredients ? ingredientsDrawerRef.current : overlayRef.current;
        if (!scope) return;
        const focusables = (
          Array.from(
            scope.querySelectorAll(
              'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
          ) as HTMLElement[]
        ).filter((el) => el.offsetParent !== null);
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey) {
          if (!active || active === first || !scope.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else if (!active || active === last || !scope.contains(active)) {
          e.preventDefault();
          first.focus();
        }
        return;
      }

      // Do not hijack step navigation while the Ingredients drawer is open
      if (showIngredients) return;

      const targetEl = e.target instanceof HTMLElement ? e.target : null;
      if (targetEl?.closest('input, textarea, select, [contenteditable="true"]')) return;

      if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === " ") {
        if (targetEl?.closest('button, a, input, textarea, select, [role="button"]')) return;
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentStep, totalSteps, showIngredients, isFinished]);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    if (showIngredients || e.touches.length !== 1) {
      touchStartRef.current = null;
      return;
    }
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current || showIngredients || e.changedTouches.length !== 1) {
      touchStartRef.current = null;
      return;
    }
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    if (Math.abs(deltaX) > 65 && Math.abs(deltaX) > Math.abs(deltaY) * 1.6) {
      if (deltaX < 0) handleNext();
      else handlePrev();
    }
  };
  const handleTouchCancel = () => {
    touchStartRef.current = null;
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
      ref={overlayRef}
      id="cooking-mode-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Cooking mode: ${recipe.title}`}
      tabIndex={-1}
      className="fixed inset-0 h-dvh z-[60] flex flex-col bg-background text-foreground select-none overflow-hidden pt-safe outline-none"
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
      <header className="min-h-14 sm:min-h-16 py-2 px-3 sm:px-6 border-b border-border/80 flex items-center justify-between gap-2 sm:gap-4 shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 sm:w-9 sm:h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer shrink-0"
            title="Exit Let's Cook Mode (Esc)"
            aria-label="Exit cooking mode"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] sm:text-xs text-muted-foreground leading-tight">
              <span className="inline-flex items-center gap-1.5 font-medium text-foreground whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                <span>Let&apos;s Cook</span>
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums whitespace-nowrap">
                {servings} {servings === 1 ? "serving" : "servings"}
              </span>
              {schedule && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-primary-dark dark:text-primary tabular-nums whitespace-nowrap">
                    Ready{" "}
                    {schedule.finishDayPrefix ? `${schedule.finishDayPrefix} ` : ""}
                    {formatClockTime(schedule.finishTime)}
                  </span>
                </>
              )}
            </div>
            <h2 className="text-sm font-medium text-muted-foreground truncate mt-0.5">
              {recipe.title}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            ref={ingredientsBtnRef}
            type="button"
            onClick={() => setShowIngredients(!showIngredients)}
            className={`h-9 px-2.5 sm:px-3.5 rounded-full border text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
              showIngredients
                ? "bg-foreground text-background border-foreground"
                : "border-border text-foreground hover:bg-secondary"
            }`}
          >
            <ListChecks className="w-3.5 h-3.5 shrink-0" />
            <span>Ingredients</span>
            <span className="font-mono text-[11px] opacity-70 tabular-nums">{recipe.ingredients.length}</span>
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="hidden sm:flex w-9 h-9 rounded-full border border-border items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Step Stage — safe flex centering (my-auto on inner wrapper prevents top clipping when overflowing) */}
      <div
        ref={stageScrollRef}
        className="flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden overscroll-contain flex flex-col touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
      >
        <div className="my-auto shrink-0 w-full max-w-3xl mx-auto px-4 sm:px-8 py-5 sm:py-6">
          <AnimatePresence
            mode="wait"
            initial={false}
            onExitComplete={() => {
              if (stageScrollRef.current) {
                stageScrollRef.current.scrollTop = 0;
              }
            }}
          >
            {!isFinished ? (
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: direction * 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -direction * 24 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="space-y-5 sm:space-y-8"
              >
                {/* Step Counter & Mark Complete Pill */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 sm:gap-3">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 min-w-0">
                    {activeStepMeta && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/15 border border-primary/30 text-accent-700 dark:text-primary text-xs font-semibold max-w-full">
                        <span className="font-mono text-[10px] uppercase tracking-wider shrink-0">
                          Part {activeStepMeta.chapterNumber}
                        </span>
                        <span className="opacity-50 shrink-0">·</span>
                        <span className="truncate">{activeStepMeta.chapterTitle}</span>
                      </span>
                    )}
                    <span className="font-mono text-xs font-medium uppercase tracking-widest text-muted-foreground tabular-nums">
                      Step {currentStep + 1} of {totalSteps}
                    </span>
                    {currentStepTiming && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-secondary/60 text-xs font-mono font-medium text-foreground tabular-nums">
                        <Clock className="w-3 h-3 text-primary-dark dark:text-primary shrink-0" />
                        <span>
                          {currentStepTiming.isServeStep
                            ? `Ready · ${currentStepTiming.dayPrefix ? `${currentStepTiming.dayPrefix} · ` : ""}${currentStepTiming.formattedStart}`
                            : `Start ${currentStepTiming.dayPrefix ? `${currentStepTiming.dayPrefix} · ` : ""}${currentStepTiming.formattedStart}`}
                        </span>
                        {currentStepTiming.durationMinutes > 0 && (
                          <span className="text-muted-foreground">
                            · {currentStepTiming.isExplicit && !currentStepTiming.isOvernightEstimate ? "" : "~"}
                            {formatDurationShort(currentStepTiming.durationMinutes)}
                          </span>
                        )}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleStepComplete(currentStep)}
                    className={`h-9 px-3.5 rounded-full border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
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
                <p className="text-[22px] sm:text-3xl md:text-4xl font-medium text-foreground leading-[1.35] tracking-[-0.02em] break-words">
                  {currentInstruction}
                </p>

                {/* Step-Relevant Ingredients (Cook Well Signature Feature) */}
                {stepIngredients.length > 0 && (
                  <div className="space-y-2.5 pt-1 sm:pt-2">
                    <p className="text-xs sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Ingredients in this step
                    </p>
                    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2.5 sm:gap-2">
                      {stepIngredients.map(({ ing, idx, displayName }) => {
                        const done = completedIngredients.has(idx);
                        const qtyText = [formatAmount(ing.amount), ing.unit].filter(Boolean).join(" ");
                        return (
                          <button
                            key={idx}
                            type="button"
                            aria-pressed={done}
                            onClick={() => onToggleIngredientComplete(idx)}
                            className={`w-full sm:w-auto flex sm:inline-flex items-start justify-between sm:justify-start gap-3 sm:gap-2.5 rounded-2xl border px-3.5 py-3 sm:py-2 min-h-11 sm:min-h-9 text-[15px] sm:text-sm leading-snug max-w-full text-left transition-all cursor-pointer ${
                              done
                                ? "border-primary/40 bg-primary/10 text-muted-foreground line-through"
                                : "border-border bg-secondary/60 text-foreground hover:border-foreground/30"
                            }`}
                          >
                            <span className="flex items-start gap-2.5 sm:gap-2 min-w-0 flex-1 sm:flex-initial">
                              <span
                                className={`w-[18px] h-[18px] sm:w-4 sm:h-4 mt-[2px] rounded-full shrink-0 flex items-center justify-center border ${
                                  done ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/50"
                                }`}
                              >
                                {done && <Check className="w-3 h-3 sm:w-2.5 sm:h-2.5" strokeWidth={3} />}
                              </span>
                              <span className="font-medium min-w-0 break-words">{displayName}</span>
                            </span>
                            {qtyText && (
                              <span className="font-mono text-sm sm:text-xs leading-snug mt-[1px] text-muted-foreground tabular-nums whitespace-nowrap shrink-0 text-right">
                                {qtyText}
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
                  <div className="pt-1 sm:pt-2">
                    <div className="inline-flex flex-wrap items-center gap-3 sm:gap-4 rounded-2xl sm:rounded-full border border-border bg-secondary/50 pl-4 pr-2.5 py-2 max-w-full">
                      <div className="flex items-center gap-2.5">
                        <Clock className={`w-4 h-4 shrink-0 ${timerRunning ? "text-primary-dark animate-pulse" : "text-muted-foreground"}`} />
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
                            className="h-9 px-4 rounded-full bg-primary-dark text-primary-foreground dark:bg-primary dark:text-primary-foreground text-xs font-semibold flex items-center gap-1.5 cursor-pointer hover:brightness-95"
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
                            aria-label="Reset timer"
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
      </div>

      {/* Bottom Step Navigation Bar */}
      <footer className="border-t border-border/80 px-3 sm:px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:py-4 shrink-0 bg-background">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStep === 0 && !isFinished}
            className="h-11 px-3.5 sm:px-5 rounded-full border border-border text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-30 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <ChevronLeft className="w-4 h-4 shrink-0" />
            <span className="sm:hidden">Prev</span>
            <span className="hidden sm:inline">Previous</span>
          </button>

          {/* Compact Mobile Step Counter */}
          {!isFinished && totalSteps > 0 && (
            <span className="sm:hidden font-mono text-xs font-medium text-muted-foreground tabular-nums whitespace-nowrap">
              {currentStep + 1} / {totalSteps}
            </span>
          )}

          {/* Compact Step Dots (Tablet/Desktop) with touch-friendly hit area */}
          <div className="hidden sm:flex items-center flex-wrap justify-center">
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
                  className="p-2 -my-1.5 inline-flex items-center justify-center cursor-pointer group"
                  title={`Step ${idx + 1}`}
                  aria-label={`Go to step ${idx + 1}`}
                >
                  <span
                    className={`block h-2 rounded-full transition-all ${
                      active
                        ? "w-6 bg-foreground"
                        : done
                        ? "w-2 bg-primary"
                        : "w-2 bg-border group-hover:bg-muted-foreground/50"
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {!isFinished ? (
            <button
              type="button"
              onClick={handleNext}
              className="h-11 px-4 sm:px-6 rounded-full bg-foreground text-background hover:opacity-85 text-sm font-medium transition-opacity flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              {currentStep === totalSteps - 1 ? (
                <span>Finish</span>
              ) : (
                <>
                  <span className="sm:hidden">Next</span>
                  <span className="hidden sm:inline">Next Step</span>
                </>
              )}
              {currentStep === totalSteps - 1 ? (
                <Check className="w-4 h-4 text-primary shrink-0" strokeWidth={2.5} />
              ) : (
                <ChevronRight className="w-4 h-4 shrink-0" />
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="h-11 px-6 rounded-full bg-foreground text-background hover:opacity-85 text-sm font-medium cursor-pointer shrink-0"
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
              ref={ingredientsDrawerRef}
              role="dialog"
              aria-modal="true"
              aria-label="All ingredients"
              tabIndex={-1}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              className="relative w-full max-w-md bg-background border-l border-border h-full shadow-2xl flex flex-col z-10 pt-safe outline-none"
            >
              <div className="min-h-14 sm:min-h-16 py-2 px-5 border-b border-border flex items-center justify-between gap-2 shrink-0">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">All Ingredients</h3>
                  <p className="text-xs text-muted-foreground">
                    Scaled for {servings} {servings === 1 ? "serving" : "servings"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {parsedIngredients.isGrouped && (
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          collapsedIngredientGroups.size ===
                          parsedIngredients.groups.length
                        ) {
                          setCollapsedIngredientGroups(new Set());
                        } else {
                          setCollapsedIngredientGroups(
                            new Set(parsedIngredients.groups.map((g) => g.id))
                          );
                        }
                      }}
                      className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer px-2.5 py-2 rounded-full hover:bg-secondary"
                    >
                      {collapsedIngredientGroups.size ===
                      parsedIngredients.groups.length
                        ? "Expand all"
                        : "Collapse all"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowIngredients(false)}
                    className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
                    aria-label="Close ingredients"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
                {(() => {
                  const renderDrawerRow = (
                    ing: Recipe["ingredients"][number],
                    idx: number,
                    displayName: string
                  ) => {
                    const isDone = completedIngredients.has(idx);
                    const qtyText = [formatAmount(ing.amount), ing.unit].filter(Boolean).join(" ");
                    return (
                      <li key={idx}>
                        <button
                          type="button"
                          aria-pressed={isDone}
                          onClick={() => onToggleIngredientComplete(idx)}
                          className="w-full flex items-start justify-between gap-3 py-3.5 text-left cursor-pointer focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-[-2px]"
                        >
                          <span className="flex items-start gap-3 min-w-0 flex-1">
                            <span
                              className={`w-[18px] h-[18px] sm:w-4 sm:h-4 mt-[2px] rounded-full shrink-0 flex items-center justify-center border transition-colors ${
                                isDone
                                  ? "bg-primary border-primary text-primary-foreground"
                                  : "border-neutral-300 dark:border-neutral-600"
                              }`}
                            >
                              {isDone && <Check className="w-3 h-3 sm:w-2.5 sm:h-2.5" strokeWidth={3} />}
                            </span>
                            <span className={`text-[15px] sm:text-sm leading-snug break-words ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
                              {displayName}
                            </span>
                          </span>
                          {qtyText && (
                            <span className="font-mono text-sm sm:text-xs leading-snug mt-[1px] tabular-nums text-right whitespace-nowrap text-muted-foreground shrink-0">
                              {qtyText}
                            </span>
                          )}
                        </button>
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
                    <div className="py-1">
                      <IngredientGroupCards
                        groups={parsedIngredients.groups}
                        completedIngredients={completedIngredients}
                        collapsedGroups={collapsedIngredientGroups}
                        onToggleGroupCollapsed={(groupId) => {
                          setCollapsedIngredientGroups((prev) => {
                            const next = new Set(prev);
                            if (next.has(groupId)) next.delete(groupId);
                            else next.add(groupId);
                            return next;
                          });
                        }}
                        onToggleIngredient={onToggleIngredientComplete}
                        formatAmount={formatAmount}
                        compact={true}
                      />
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
