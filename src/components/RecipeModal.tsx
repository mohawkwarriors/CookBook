import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Clock,
  Calendar,
  Edit2,
  Trash2,
  Minus,
  Plus,
  Check,
  ChevronDown,
  ChevronRight,
  Play,
  ExternalLink,
  Utensils,
  Bookmark,
} from "lucide-react";
import { Recipe, MealPlanEntry } from "../types";
import InstructionStep from "./InstructionStep";
import RecipeIcon from "./RecipeIcon";
import CookingMode from "./CookingMode";
import { formatTime, getMealTypeColor } from "../lib/utils";
import { parseInstructionChapters, parseIngredientGroups } from "../lib/recipeComponents";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";

interface RecipeModalProps {
  recipe: Recipe | null;
  isOpen: boolean;
  isAdmin?: boolean;
  isBookmarked?: boolean;
  onBookmark?: (recipe: Recipe) => void;
  onClose: () => void;
  onEdit: (recipe: Recipe) => void;
  onDelete: (id: string) => Promise<void>;
  onAddToCalendar: (entry: Omit<MealPlanEntry, "id">) => Promise<void>;
}

const formatIngredientName = (name: string) => {
  if (!name) return "";
  const lowerExceptions = ["and", "or", "with", "in", "of", "to", "for"];
  return name
    .toLowerCase()
    .split(" ")
    .map((word, index) => {
      if (index > 0 && lowerExceptions.includes(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
};

interface StepBlockItem {
  step: string;
  idx: number;
  displayNumber: number;
}

type InstructionBlock =
  | { type: "single"; item: StepBlockItem }
  | { type: "parallel"; items: StepBlockItem[] };

const buildInstructionBlocks = (items: StepBlockItem[]): InstructionBlock[] => {
  const blocks: InstructionBlock[] = [];
  let currentParallelBlock: StepBlockItem[] | null = null;

  items.forEach((item, localIdx) => {
    const lowerStep = item.step.toLowerCase().trim();
    const isParallel =
      localIdx > 0 &&
      (lowerStep.startsWith("meanwhile") ||
        lowerStep.startsWith("while") ||
        lowerStep.startsWith("in parallel") ||
        lowerStep.startsWith("separately") ||
        lowerStep.startsWith("at the same time") ||
        lowerStep.startsWith("for the ") ||
        lowerStep.startsWith("to make the ") ||
        lowerStep.startsWith("prepare the "));

    if (isParallel) {
      if (!currentParallelBlock) {
        const lastBlock = blocks.pop();
        if (lastBlock?.type === "single") {
          currentParallelBlock = [lastBlock.item, item];
          blocks.push({ type: "parallel", items: currentParallelBlock });
        } else if (lastBlock?.type === "parallel") {
          lastBlock.items.push(item);
          blocks.push(lastBlock);
          currentParallelBlock = lastBlock.items;
        } else {
          blocks.push({ type: "single", item });
        }
      } else {
        currentParallelBlock.push(item);
      }
    } else {
      currentParallelBlock = null;
      blocks.push({ type: "single", item });
    }
  });

  return blocks;
};

export default function RecipeModal({
  recipe,
  isOpen,
  isAdmin,
  isBookmarked = false,
  onBookmark,
  onClose,
  onEdit,
  onDelete,
  onAddToCalendar,
}: RecipeModalProps) {
  const [servings, setServings] = useState<number>(4);
  const [plannerDate, setPlannerDate] = useState("");
  const [plannerMeal, setPlannerMeal] = useState<"Breakfast" | "Lunch" | "Dinner" | "Snack">("Dinner");
  const [showPlannerBar, setShowPlannerBar] = useState(false);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [plannedSuccess, setPlannedSuccess] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [completedIngredients, setCompletedIngredients] = useState<Set<number>>(new Set());
  const [collapsedChapters, setCollapsedChapters] = useState<Set<string>>(new Set());
  const [isCookingModeOpen, setIsCookingModeOpen] = useState(false);
  const [isIngredientsCollapsed, setIsIngredientsCollapsed] = useState(false);
  const [hasAutoCollapsed, setHasAutoCollapsed] = useState(false);
  const [ingScrollFade, setIngScrollFade] = useState({ top: false, bottom: false });
  const bodyRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const ingredientsScrollRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);

  useBodyScrollLock(Boolean(isOpen && recipe));

  const parsedMethod = useMemo(
    () => parseInstructionChapters(recipe?.instructions ?? []),
    [recipe?.instructions]
  );

  const parsedIngredients = useMemo(
    () =>
      parseIngredientGroups(
        recipe?.ingredients ?? [],
        parsedMethod.chapters.map((c) => c.title)
      ),
    [recipe?.ingredients, parsedMethod.chapters]
  );

  const scrollIngredientsToGroup = (chapterTitle: string) => {
    if (!parsedIngredients.isGrouped || window.innerWidth < 768) return;
    const scrollEl = ingredientsScrollRef.current;
    if (!scrollEl || scrollEl.scrollHeight <= scrollEl.clientHeight + 2) return;

    const normalized = chapterTitle.trim().toLowerCase();
    const matchingGroup = parsedIngredients.groups.find(
      (g) => g.title.trim().toLowerCase() === normalized
    );
    if (!matchingGroup) return;

    const target = scrollEl.querySelector<HTMLElement>(
      `[data-ing-group-id="${matchingGroup.id}"]`
    );
    if (!target) return;

    const targetTop = target.offsetTop - 8;
    scrollEl.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
  };

  const toggleStepComplete = (stepIdx: number) => {
    setCompletedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepIdx)) next.delete(stepIdx);
      else next.add(stepIdx);
      return next;
    });
  };

  const toggleIngredientComplete = (ingIdx: number) => {
    setCompletedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(ingIdx)) next.delete(ingIdx);
      else next.add(ingIdx);
      return next;
    });
  };

  const toggleChapterCollapsed = (chapterId: string, chapterTitle: string) => {
    setCollapsedChapters((prev) => {
      const next = new Set(prev);
      const willExpand = next.has(chapterId);
      if (willExpand) {
        next.delete(chapterId);
        scrollIngredientsToGroup(chapterTitle);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  };

  useEffect(() => {
    if (recipe) {
      setServings(recipe.servings || 4);
      const todayStr = new Date().toISOString().split("T")[0];
      setPlannerDate(todayStr);
      setPlannedSuccess(false);
      setShowPlannerBar(false);
      setShowDeleteConfirm(false);
      setCompletedSteps(new Set());
      setCompletedIngredients(new Set());
      setCollapsedChapters(new Set());
      setIsCookingModeOpen(false);
      setIsIngredientsCollapsed(false);
      setHasAutoCollapsed(false);
      if (bodyRef.current) {
        bodyRef.current.scrollTop = 0;
      }
      if (ingredientsScrollRef.current) {
        ingredientsScrollRef.current.scrollTop = 0;
      }
    }
  }, [recipe, isOpen]);

  // Move focus into dialog on open and restore to trigger element on close
  useEffect(() => {
    if (!isOpen || !recipe) return;
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
      if (prev && typeof prev.focus === "function" && document.contains(prev)) {
        prev.focus();
      }
    };
  }, [isOpen, recipe?.id]);

  // Track overflow fades on the desktop Ingredients scroll pane
  useEffect(() => {
    if (!isOpen || !recipe) return;
    const el = ingredientsScrollRef.current;
    if (!el) return;

    const updateFade = () => {
      const hasOverflow = el.scrollHeight > el.clientHeight + 4;
      const top = hasOverflow && el.scrollTop > 4;
      const bottom =
        hasOverflow && el.scrollTop + el.clientHeight < el.scrollHeight - 4;
      setIngScrollFade((prev) =>
        prev.top === top && prev.bottom === bottom ? prev : { top, bottom }
      );
    };

    const raf = requestAnimationFrame(updateFade);
    el.addEventListener("scroll", updateFade, { passive: true });
    window.addEventListener("resize", updateFade);
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(updateFade);
      ro.observe(el);
    }

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", updateFade);
      window.removeEventListener("resize", updateFade);
      if (ro) ro.disconnect();
    };
  }, [isOpen, recipe, parsedIngredients.isGrouped]);

  // Trap Tab focus inside dialog and close on Escape when Cooking Mode is not open
  useEffect(() => {
    if (!isOpen || isCookingModeOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "Tab" && overlayRef.current) {
        const focusables = (
          Array.from(
            overlayRef.current.querySelectorAll(
              'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
          ) as HTMLElement[]
        ).filter((el) => el.offsetParent !== null);
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey) {
          if (!active || active === first || !overlayRef.current.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else if (!active || active === last || !overlayRef.current.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, isCookingModeOpen, onClose]);

  useEffect(() => {
    const handleScroll = () => {
      const container = bodyRef.current;
      if (!container || window.innerWidth >= 768) return;
      const currentScrollY = container.scrollTop;
      if (currentScrollY > lastScrollY.current && currentScrollY > 40 && !hasAutoCollapsed && !isIngredientsCollapsed) {
        setIsIngredientsCollapsed(true);
        setHasAutoCollapsed(true);
      }
      lastScrollY.current = currentScrollY;
    };

    const container = bodyRef.current;
    if (container) container.addEventListener("scroll", handleScroll);
    return () => {
      if (container) container.removeEventListener("scroll", handleScroll);
    };
  }, [hasAutoCollapsed, isIngredientsCollapsed]);

  const scaleRatio = servings / (recipe?.servings || 1);

  const formatAmount = (amount: number) => {
    if (!amount) return "";
    const scaled = amount * scaleRatio;
    return parseFloat(scaled.toFixed(2)).toString();
  };

  const handlePlanMeal = async () => {
    if (!plannerDate || !recipe) return;
    setIsPlanning(true);
    try {
      await onAddToCalendar({
        date: plannerDate,
        mealType: plannerMeal,
        recipeId: recipe.id || "",
        recipeTitle: recipe.title,
        servings: servings,
      });
      setPlannedSuccess(true);
      setTimeout(() => {
        setPlannedSuccess(false);
        setShowPlannerBar(false);
      }, 1800);
    } catch (err) {
      console.error("Error adding to meal plan:", err);
    } finally {
      setIsPlanning(false);
    }
  };

  const handleDeleteClick = async () => {
    if (!recipe || !recipe.id) return;
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }
    setIsDeleting(true);
    try {
      await onDelete(recipe.id);
      onClose();
    } catch (err) {
      console.error("Error deleting recipe:", err);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && recipe && (
        <motion.div
          ref={overlayRef}
          key="recipe-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="recipe-modal-title"
          tabIndex={-1}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          id="recipe-modal-overlay"
          className="fixed inset-0 z-50 flex flex-col bg-background overflow-hidden print:bg-white outline-none"
        >
          {/* Cook Well Sticky Top Breadcrumb Bar */}
          <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-2 sm:gap-3 border-b border-border/80 bg-background/90 px-3 sm:px-4 md:px-6 backdrop-blur-md print:hidden">
            <nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 overflow-hidden items-center gap-1.5 text-sm">
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors cursor-pointer font-medium"
              >
                Recipes
              </button>
              <ChevronRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground/60 hidden sm:block" />
              <span className="truncate font-medium text-foreground hidden sm:inline">{recipe.title}</span>
            </nav>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              {onBookmark && (
                <button
                  type="button"
                  onClick={() => onBookmark(recipe)}
                  className={`inline-flex items-center justify-center gap-1.5 h-9 w-9 sm:w-auto sm:px-3.5 rounded-full border text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                    isBookmarked
                      ? "border-foreground bg-secondary text-foreground"
                      : "border-border bg-background text-foreground hover:bg-secondary"
                  }`}
                  title={isBookmarked ? "Saved in collection" : "Save to collection"}
                  aria-label={isBookmarked ? "Saved in collection" : "Save to collection"}
                >
                  <Bookmark
                    className={`w-3.5 h-3.5 ${isBookmarked ? "fill-primary text-primary-dark" : ""}`}
                  />
                  <span className="hidden sm:inline">{isBookmarked ? "Saved" : "Save"}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsCookingModeOpen(true)}
                className="inline-flex lg:hidden items-center gap-1.5 h-9 px-2.5 sm:px-4 rounded-full bg-foreground text-background hover:opacity-85 text-xs sm:text-sm font-medium transition-all cursor-pointer active:scale-[0.98]"
              >
                <Play className="w-3.5 h-3.5 fill-current text-primary" />
                <span className="sm:hidden">Cook</span>
                <span className="hidden sm:inline">Let&apos;s Cook</span>
              </button>

              {isAdmin && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowPlannerBar((v) => !v)}
                    className={`inline-flex items-center justify-center gap-1.5 h-9 w-9 sm:w-auto sm:px-3.5 rounded-full border text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                      showPlannerBar
                        ? "border-foreground bg-secondary text-foreground"
                        : "border-border bg-background text-foreground hover:bg-secondary"
                    }`}
                    title="Add to Meal Plan"
                    aria-label="Add to Meal Plan"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Plan</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onEdit(recipe)}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                    title="Edit recipe"
                    aria-label="Edit recipe"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={handleDeleteClick}
                    disabled={isDeleting}
                    className={`inline-flex items-center justify-center h-9 rounded-full border transition-colors cursor-pointer ${
                      showDeleteConfirm
                        ? "px-3 border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-xs font-medium gap-1.5"
                        : "w-9 border-border text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-secondary"
                    }`}
                    title="Delete recipe"
                    aria-label="Delete recipe"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {showDeleteConfirm && <span>{isDeleting ? "Deleting..." : "Confirm"}</span>}
                  </button>
                </>
              )}

              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center w-9 h-9 rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                aria-label="Close recipe"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </header>

          {/* Collapsible Inline Meal Plan Bar */}
          <AnimatePresence>
            {showPlannerBar && isAdmin && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-b border-border bg-secondary/50 print:hidden"
              >
                <div className="max-w-5xl mx-auto px-4 md:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                    <Calendar className="w-3.5 h-3.5 text-foreground" />
                    <span>Schedule to Meal Planner ({servings} servings)</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      value={plannerDate}
                      onChange={(e) => setPlannerDate(e.target.value)}
                      className="h-9 px-3 text-xs font-medium border border-border bg-background text-foreground rounded-full focus:outline-none focus:ring-2 focus:ring-ring/20"
                    />
                    <select
                      value={plannerMeal}
                      onChange={(e) => setPlannerMeal(e.target.value as any)}
                      className="h-9 px-3 text-xs font-medium border border-border bg-background text-foreground rounded-full focus:outline-none focus:ring-2 focus:ring-ring/20"
                    >
                      <option value="Breakfast">Breakfast</option>
                      <option value="Lunch">Lunch</option>
                      <option value="Dinner">Dinner</option>
                      <option value="Snack">Snack</option>
                    </select>
                    <button
                      type="button"
                      onClick={handlePlanMeal}
                      disabled={isPlanning || !plannerDate}
                      className="h-9 px-4 rounded-full bg-foreground text-background text-xs font-medium hover:opacity-85 transition-opacity disabled:opacity-50 cursor-pointer"
                    >
                      {plannedSuccess ? "Added!" : isPlanning ? "Adding..." : "Add to Plan"}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Scrollable Editorial Body */}
          <div ref={bodyRef} className="flex-1 overflow-y-auto print:overflow-visible">
            <motion.div
              id="recipe-modal-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-8 md:py-12 space-y-10 md:space-y-14"
            >
              {/* Hero Split */}
              <section className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-10 items-start">
                <div className="md:col-span-5">
                  <div className="aspect-[4/3] md:aspect-[4/5] w-full rounded-2xl overflow-hidden bg-muted border border-border/60">
                    {recipe.imageUrl ? (
                      <img
                        src={recipe.imageUrl}
                        alt={recipe.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <RecipeIcon recipe={recipe} variant="cover" className="w-full h-full" />
                    )}
                  </div>
                </div>

                <div className="md:col-span-7 flex flex-col justify-center space-y-6 md:pt-2">
                  {/* Category & Cuisine Tags */}
                  <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
                    {recipe.mealType && (
                      <span
                        className={`text-[11px] uppercase tracking-wider font-bold px-3 py-1 rounded-full shrink-0 ${getMealTypeColor(
                          recipe.mealType
                        )}`}
                      >
                        {recipe.mealType}
                      </span>
                    )}
                    {recipe.cuisine && (
                      <span className="rounded-full border border-border px-3 py-1">
                        {recipe.cuisine}
                      </span>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h1
                      id="recipe-modal-title"
                      className="font-serif text-4xl sm:text-5xl md:text-[52px] font-semibold text-foreground tracking-[-0.015em] leading-[1.06]"
                    >
                      {recipe.title}
                    </h1>
                    {recipe.description && (
                      <p className="text-[15px] sm:text-base text-muted-foreground leading-relaxed max-w-xl">
                        {recipe.description}
                      </p>
                    )}
                  </div>

                  {/* Editorial Key Specs & Nutrition Strip */}
                  <div className="border-y border-border max-w-md divide-y divide-border/70">
                    <div className="grid grid-cols-3 gap-4 py-5">
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                          Total Time
                        </p>
                        <p className="mt-1 text-sm sm:text-base font-semibold text-foreground tabular-nums flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          {formatTime(recipe.cookingTime)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                          Yield
                        </p>
                        <p className="mt-1 text-sm sm:text-base font-semibold text-foreground tabular-nums">
                          {servings} {servings === 1 ? "serving" : "servings"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                          Ingredients
                        </p>
                        <p className="mt-1 text-sm sm:text-base font-semibold text-foreground tabular-nums">
                          {recipe.ingredients.length} items
                        </p>
                      </div>
                    </div>

                    {recipe.nutrition && (
                      <div className="py-4 print:hidden">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2.5">
                          Nutrition · Per Serving
                        </p>
                        <div className="grid grid-cols-4 gap-3">
                          <div>
                            <p className="text-sm sm:text-[15px] font-semibold tabular-nums text-foreground">
                              {recipe.nutrition.calories}
                            </p>
                            <p className="text-[11px] text-muted-foreground">kcal</p>
                          </div>
                          <div>
                            <p className="text-sm sm:text-[15px] font-semibold tabular-nums text-foreground">
                              {recipe.nutrition.protein}g
                            </p>
                            <p className="text-[11px] text-muted-foreground">Protein</p>
                          </div>
                          <div>
                            <p className="text-sm sm:text-[15px] font-semibold tabular-nums text-foreground">
                              {recipe.nutrition.carbs}g
                            </p>
                            <p className="text-[11px] text-muted-foreground">Carbs</p>
                          </div>
                          <div>
                            <p className="text-sm sm:text-[15px] font-semibold tabular-nums text-foreground">
                              {recipe.nutrition.fat}g
                            </p>
                            <p className="text-[11px] text-muted-foreground">Fat</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Primary Action Row */}
                  <div className="flex flex-wrap items-center gap-3 print:hidden">
                    <button
                      type="button"
                      onClick={() => setIsCookingModeOpen(true)}
                      className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-foreground text-background hover:opacity-85 text-sm font-medium transition-all cursor-pointer active:scale-[0.98]"
                    >
                      <Play className="w-4 h-4 fill-current text-primary" />
                      <span>Start Cooking Mode</span>
                    </button>
                    {recipe.sourceUrl && /^https?:\/\//i.test(recipe.sourceUrl) && (
                      <a
                        href={recipe.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 h-11 px-4 rounded-full border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      >
                        <span>Original Source</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </section>

              {/* Core Two-Column Layout: Fixed/Sticky Ingredients + Instructions */}
              <section className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-12 pt-2 border-t border-border">
                {/* Left Column: Dedicated Ingredients + Scaler */}
                <div className="md:col-span-5 lg:col-span-4 md:sticky md:top-0 self-start flex flex-col md:max-h-[calc(100dvh-7rem)] print:static print:max-h-none space-y-5 pt-6 md:pt-8 md:pb-4">
                  <div className="flex items-center justify-between gap-2 shrink-0">
                    <h2 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
                      <button
                        type="button"
                        onClick={() => {
                          if (window.innerWidth < 768) {
                            setIsIngredientsCollapsed(!isIngredientsCollapsed);
                          }
                        }}
                        className="flex items-center gap-2 text-left md:cursor-default cursor-pointer"
                      >
                        <span>Ingredients</span>
                        <ChevronDown
                          className={`w-4 h-4 text-muted-foreground md:hidden transition-transform duration-200 ${
                            isIngredientsCollapsed ? "" : "rotate-180"
                          }`}
                        />
                      </button>
                    </h2>

                    {/* Compact Cook Well Servings Stepper Pill */}
                    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/60 p-1 print:hidden">
                      <button
                        type="button"
                        onClick={() => servings > 1 && setServings((s) => s - 1)}
                        disabled={servings <= 1}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-foreground hover:bg-background disabled:opacity-30 transition-colors cursor-pointer"
                        aria-label="Decrease servings"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-2 text-xs font-semibold tabular-nums text-foreground">
                        {servings}x
                      </span>
                      <button
                        type="button"
                        onClick={() => setServings((s) => s + 1)}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-foreground hover:bg-background transition-colors cursor-pointer"
                        aria-label="Increase servings"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {isIngredientsCollapsed && (
                    <p className="text-xs text-muted-foreground md:hidden -mt-2">
                      {recipe.ingredients.length} ingredients · {completedIngredients.size} checked
                    </p>
                  )}

                  <div className="relative md:flex-1 md:min-h-0 flex flex-col">
                    {/* Top overflow fade cue (desktop only, when scrolled down) */}
                    <div
                      aria-hidden="true"
                      className={`hidden md:block pointer-events-none absolute top-0 left-0 right-1.5 h-6 z-10 bg-gradient-to-b from-background to-transparent transition-opacity duration-200 print:hidden ${
                        ingScrollFade.top ? "opacity-100" : "opacity-0"
                      }`}
                    />

                    <div
                      ref={ingredientsScrollRef}
                      className={`transition-all duration-300 overflow-hidden md:flex-1 md:min-h-0 md:overflow-y-auto cookbook-scroll md:pr-2 print:overflow-visible print:max-h-none ${
                        isIngredientsCollapsed
                          ? "max-h-0 opacity-0 md:max-h-none md:opacity-100"
                          : "max-h-[4000px] opacity-100 md:max-h-none"
                      } ${ingScrollFade.bottom ? "md:pb-7" : ""}`}
                    >
                      {(() => {
                        const renderIngredientRow = (
                          ing: Recipe["ingredients"][number],
                          originalIdx: number,
                          displayName: string
                        ) => {
                          const isCompleted = completedIngredients.has(originalIdx);
                          return (
                            <li
                              key={originalIdx}
                              onClick={() => toggleIngredientComplete(originalIdx)}
                              className="flex items-center justify-between gap-3 py-3 cursor-pointer select-none group hover:bg-secondary/40 px-2 rounded-lg transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span
                                  className={`w-4 h-4 rounded-full shrink-0 flex items-center justify-center border transition-colors ${
                                    isCompleted
                                      ? "bg-primary border-primary text-primary-foreground"
                                      : "border-neutral-300 dark:border-neutral-600 group-hover:border-foreground"
                                  }`}
                                >
                                  {isCompleted && <Check className="w-2.5 h-2.5" strokeWidth={3.5} />}
                                </span>
                                <span
                                  className={`text-sm leading-snug transition-colors ${
                                    isCompleted
                                      ? "line-through text-muted-foreground/60"
                                      : "text-foreground"
                                  }`}
                                >
                                  {formatIngredientName(displayName)}
                                </span>
                              </div>
                              <span
                                className={`font-mono text-xs tabular-nums text-right shrink-0 ${
                                  isCompleted ? "text-muted-foreground/50" : "text-muted-foreground"
                                }`}
                              >
                                {formatAmount(ing.amount)} {ing.unit}
                              </span>
                            </li>
                          );
                        };

                        if (!parsedIngredients.isGrouped) {
                          return (
                            <ul className="divide-y divide-border/70 border-y border-border/70">
                              {recipe.ingredients.map((ing, idx) =>
                                renderIngredientRow(ing, idx, ing.name)
                              )}
                            </ul>
                          );
                        }

                        return (
                          <div className="space-y-5">
                            {parsedIngredients.groups.map((group) => (
                              <div key={group.id} data-ing-group-id={group.id}>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-1.5">
                                  {group.title}
                                </p>
                                <ul className="divide-y divide-border/70 border-y border-border/70">
                                  {group.items.map((item) =>
                                    renderIngredientRow(
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

                    {/* Bottom overflow fade cue (desktop only, when more ingredients exist below) */}
                    <div
                      aria-hidden="true"
                      className={`hidden md:flex pointer-events-none absolute bottom-0 left-0 right-1.5 h-10 z-10 items-end justify-center bg-gradient-to-t from-background via-background/80 to-transparent transition-opacity duration-200 print:hidden ${
                        ingScrollFade.bottom ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-border/80 bg-card/90 text-[10px] font-medium text-muted-foreground shadow-xs">
                        <span>More ingredients</span>
                        <ChevronDown className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Column: Method / Instructions */}
                <div className="md:col-span-7 lg:col-span-8 pt-2 md:pt-8 space-y-6">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
                      Method
                    </h2>
                    <div className="flex items-center gap-3">
                      {parsedMethod.isMultiComponent && (
                        <button
                          type="button"
                          onClick={() => {
                            if (collapsedChapters.size === parsedMethod.chapters.length) {
                              setCollapsedChapters(new Set());
                            } else {
                              setCollapsedChapters(
                                new Set(parsedMethod.chapters.map((c) => c.id))
                              );
                            }
                          }}
                          className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer print:hidden"
                        >
                          {collapsedChapters.size === parsedMethod.chapters.length
                            ? "Expand all"
                            : "Collapse all"}
                        </button>
                      )}
                      <span className="text-xs font-mono tabular-nums text-muted-foreground">
                        {completedSteps.size} / {recipe.instructions.length} completed
                      </span>
                    </div>
                  </div>

                  <div>
                    {(() => {
                      const renderBlocks = (blocks: InstructionBlock[], inCard: boolean) => (
                        <div className="divide-y divide-border/60">
                          {blocks.map((block, bIdx) => {
                            if (block.type === "single") {
                              return (
                                <div key={block.item.idx} className="py-1">
                                  <InstructionStep
                                    step={block.item.step}
                                    idx={block.item.idx}
                                    stepNumber={block.item.displayNumber}
                                    inCard={inCard}
                                    isCompleted={completedSteps.has(block.item.idx)}
                                    isParallel={false}
                                    onToggleComplete={() => toggleStepComplete(block.item.idx)}
                                  />
                                </div>
                              );
                            }

                            const gridCols =
                              block.items.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3";
                            return (
                              <div
                                key={`parallel-${bIdx}`}
                                className={`py-4 grid grid-cols-1 ${gridCols} gap-3 ${
                                  inCard ? "px-2" : ""
                                }`}
                              >
                                {block.items.map((s) => (
                                  <InstructionStep
                                    key={s.idx}
                                    step={s.step}
                                    idx={s.idx}
                                    stepNumber={s.displayNumber}
                                    inCard={inCard}
                                    isCompleted={completedSteps.has(s.idx)}
                                    isParallel={true}
                                    onToggleComplete={() => toggleStepComplete(s.idx)}
                                  />
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      );

                      // Single-component recipe: keep clean flat list with zero extra chrome
                      if (!parsedMethod.isMultiComponent) {
                        const flatBlocks = buildInstructionBlocks(
                          recipe.instructions.map((step, idx) => ({
                            step,
                            idx,
                            displayNumber: idx + 1,
                          }))
                        );
                        return renderBlocks(flatBlocks, false);
                      }

                      // Multi-component recipe: Option 3 Collapsible Chapters
                      return (
                        <div className="space-y-3.5">
                          {parsedMethod.chapters.map((chapter) => {
                            const doneInChapter = chapter.steps.filter((s) =>
                              completedSteps.has(s.originalIdx)
                            ).length;
                            const isChapterDone =
                              chapter.steps.length > 0 && doneInChapter === chapter.steps.length;
                            const isCollapsed = collapsedChapters.has(chapter.id);
                            const chapterBlocks = buildInstructionBlocks(
                              chapter.steps.map((s, localIdx) => ({
                                step: s.text,
                                idx: s.originalIdx,
                                displayNumber: localIdx + 1,
                              }))
                            );

                            return (
                              <section
                                key={chapter.id}
                                className={`rounded-2xl border overflow-hidden transition-colors ${
                                  isChapterDone
                                    ? "border-primary/40 bg-secondary/30"
                                    : "border-border bg-card/60"
                                }`}
                              >
                                <button
                                  type="button"
                                  aria-expanded={!isCollapsed}
                                  onClick={() => toggleChapterCollapsed(chapter.id, chapter.title)}
                                  className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-secondary/50 transition-colors cursor-pointer"
                                >
                                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 min-w-0">
                                    <span className="text-[11px] font-mono font-semibold uppercase tracking-[0.12em] text-primary-dark dark:text-primary shrink-0">
                                      Part {chapter.chapterNumber}
                                    </span>
                                    <h3
                                      className={`font-serif text-xl sm:text-[22px] font-semibold leading-tight tracking-tight transition-colors ${
                                        isChapterDone
                                          ? "text-muted-foreground line-through"
                                          : "text-foreground"
                                      }`}
                                    >
                                      {chapter.title}
                                    </h3>
                                  </div>

                                  <div className="flex items-center gap-2.5 shrink-0">
                                    <span
                                      className={`inline-flex items-center gap-1 text-xs font-mono tabular-nums px-2.5 py-0.5 rounded-full border transition-colors ${
                                        isChapterDone
                                          ? "bg-primary/15 text-primary-dark dark:text-primary border-primary/30 font-semibold"
                                          : "bg-secondary text-muted-foreground border-transparent"
                                      }`}
                                    >
                                      {isChapterDone ? (
                                        <>
                                          <Check className="w-3 h-3" strokeWidth={3} />
                                          <span>Complete</span>
                                        </>
                                      ) : (
                                        <span>
                                          {doneInChapter} / {chapter.steps.length}
                                        </span>
                                      )}
                                    </span>
                                    <ChevronDown
                                      className={`w-4 h-4 text-muted-foreground transition-transform duration-200 print:hidden ${
                                        isCollapsed ? "-rotate-90" : ""
                                      }`}
                                    />
                                  </div>
                                </button>

                                <AnimatePresence initial={false}>
                                  {!isCollapsed && (
                                    <motion.div
                                      key={`${chapter.id}-body`}
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                                      className="overflow-hidden border-t border-border/70 print:!h-auto print:!opacity-100"
                                    >
                                      <div className="px-2 sm:px-3 py-1">
                                        {renderBlocks(chapterBlocks, true)}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </section>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Notes & Technique Callout */}
                  {recipe.notes && (
                    <div className="mt-8 rounded-2xl border border-border bg-secondary/50 p-5 sm:p-6 space-y-3">
                      <div className="flex items-center gap-2">
                        <Utensils className="w-4 h-4 text-primary-dark" />
                        <h3 className="text-sm font-semibold text-foreground">
                          Notes &amp; Technique
                        </h3>
                      </div>
                      <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                        {(() => {
                          let parsedNotes = recipe.notes
                            .split("\n")
                            .map((n) => n.trim())
                            .filter(Boolean);
                          if (parsedNotes.length === 1 && parsedNotes[0].includes(". ")) {
                            parsedNotes = parsedNotes[0]
                              .split(/\.\s+/)
                              .map((n) => n.trim())
                              .filter(Boolean)
                              .map((n) => (n.endsWith(".") ? n : n + "."));
                          }
                          return parsedNotes.map((note, idx) => {
                            const cleanNote = note
                              .replace(/^[-*•]\s*/, "")
                              .replace(/^\d+\.\s*/, "");
                            return (
                              <li key={idx} className="flex items-start gap-2.5">
                                <span className="mt-2 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                                <span>{cleanNote}</span>
                              </li>
                            );
                          });
                        })()}
                      </ul>
                    </div>
                  )}
                </div>
              </section>
            </motion.div>
          </div>

          {/* Step-by-Step Full-Screen "Let's Cook" Mode */}
          <CookingMode
            recipe={recipe}
            servings={servings}
            isOpen={isCookingModeOpen}
            completedSteps={completedSteps}
            completedIngredients={completedIngredients}
            onToggleStepComplete={(stepIdx) => {
              const next = new Set(completedSteps);
              if (next.has(stepIdx)) next.delete(stepIdx);
              else next.add(stepIdx);
              setCompletedSteps(next);
            }}
            onToggleIngredientComplete={(ingIdx) => {
              const next = new Set(completedIngredients);
              if (next.has(ingIdx)) next.delete(ingIdx);
              else next.add(ingIdx);
              setCompletedIngredients(next);
            }}
            onClose={() => setIsCookingModeOpen(false)}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
