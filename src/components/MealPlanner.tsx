import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  ShoppingBag,
  Check,
  Search,
} from "lucide-react";
import { MealPlanEntry, Recipe } from "../types";
import RecipeIcon from "./RecipeIcon";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";
import { useDialogFocusTrap } from "../hooks/useDialogFocusTrap";

interface MealPlannerProps {
  mealPlan: MealPlanEntry[];
  recipes: Recipe[];
  onRemoveMeal: (id: string) => Promise<void>;
  onViewRecipe: (recipeId: string) => void;
  onAddMeal?: (entry: Omit<MealPlanEntry, "id">) => Promise<void>;
}

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;

export default function MealPlanner({
  mealPlan,
  recipes,
  onRemoveMeal,
  onViewRecipe,
  onAddMeal,
}: MealPlannerProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedMobileDay, setSelectedMobileDay] = useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [showGroceryDrawer, setShowGroceryDrawer] = useState(false);
  const [checkedGroceries, setCheckedGroceries] = useState<Set<string>>(new Set());

  // Quick-add modal state
  const [addingForDate, setAddingForDate] = useState<string | null>(null);
  const [addingMealType, setAddingMealType] = useState<(typeof MEAL_TYPES)[number]>("Dinner");
  const [pickerQuery, setPickerQuery] = useState("");

  const quickAddRef = useRef<HTMLDivElement>(null);
  const groceryDrawerRef = useRef<HTMLDivElement>(null);

  useBodyScrollLock(Boolean(addingForDate) || showGroceryDrawer);
  useDialogFocusTrap(Boolean(addingForDate), quickAddRef);
  useDialogFocusTrap(showGroceryDrawer, groceryDrawerRef);

  useEffect(() => {
    if (!addingForDate && !showGroceryDrawer) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (addingForDate) setAddingForDate(null);
        else if (showGroceryDrawer) setShowGroceryDrawer(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [addingForDate, showGroceryDrawer]);

  const getWeekDays = (baseDate: Date) => {
    const sunday = new Date(baseDate);
    sunday.setDate(baseDate.getDate() - baseDate.getDay());
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const weekDays = getWeekDays(currentDate);

  const formatDateKey = (date: Date) => date.toISOString().split("T")[0];

  const weekDateSet = useMemo(
    () => new Set(weekDays.map((d) => formatDateKey(d))),
    [currentDate]
  );

  // Auto-generate consolidated grocery list from current week's meal plan
  const weeklyGroceries = useMemo(() => {
    const weekEntries = mealPlan.filter((m) => weekDateSet.has(m.date));
    const map = new Map<string, { name: string; unit: string; amount: number; count: number }>();

    for (const entry of weekEntries) {
      const recipe = recipes.find((r) => r.id === entry.recipeId);
      if (!recipe || !Array.isArray(recipe.ingredients)) continue;
      const ratio = (entry.servings || recipe.servings || 1) / (recipe.servings || 1);
      for (const ing of recipe.ingredients) {
        if (!ing || typeof ing.name !== "string" || !ing.name.trim()) continue;
        const unitStr = typeof ing.unit === "string" ? ing.unit.trim() : "";
        const key = `${ing.name.trim().toLowerCase()}__${unitStr.toLowerCase()}`;
        const existing = map.get(key);
        const scaledAmt = (Number.isFinite(ing.amount) ? ing.amount : 0) * ratio;
        if (existing) {
          existing.amount += scaledAmt;
          existing.count += 1;
        } else {
          map.set(key, {
            name: ing.name.trim(),
            unit: unitStr,
            amount: scaledAmt,
            count: 1,
          });
        }
      }
    }

    return Array.from(map.entries())
      .map(([key, val]) => ({ key, ...val }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [mealPlan, recipes, weekDateSet]);

  const recipeMap = useMemo(() => {
    const m = new Map<string, Recipe>();
    recipes.forEach((r) => {
      if (r.id) m.set(r.id, r);
    });
    return m;
  }, [recipes]);

  const getEntriesForDate = (dateStr: string) =>
    mealPlan.filter((entry) => entry.date === dateStr);

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const shiftWeek = (deltaDays: number) => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + deltaDays);
    setCurrentDate(next);
    setSelectedMobileDay(formatDateKey(next));
  };

  const weekRangeLabel = `${weekDays[0].toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })} – ${weekDays[6].toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;

  const pickerRecipes = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    if (!q) return recipes.slice(0, 20);
    return recipes.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.cuisine || "").toLowerCase().includes(q)
    );
  }, [recipes, pickerQuery]);

  const handleQuickAddRecipe = async (recipe: Recipe) => {
    if (!onAddMeal || !addingForDate || !recipe.id) return;
    await onAddMeal({
      date: addingForDate,
      mealType: addingMealType,
      recipeId: recipe.id,
      recipeTitle: recipe.title,
      servings: recipe.servings || 4,
    });
    setAddingForDate(null);
    setPickerQuery("");
  };

  return (
    <div className="space-y-6">
      {/* Cook Well Planner Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-full border border-border bg-card p-0.5">
            <button
              type="button"
              onClick={() => shiftWeek(-7)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              aria-label="Previous week"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setCurrentDate(now);
                setSelectedMobileDay(formatDateKey(now));
              }}
              className="px-3 h-8 rounded-full text-xs font-medium text-foreground hover:bg-secondary transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => shiftWeek(7)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              aria-label="Next week"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <span className="text-sm font-medium text-muted-foreground ml-1">
            {weekRangeLabel}
          </span>
        </div>

        {/* Auto-Generated Grocery List Trigger */}
        <button
          type="button"
          onClick={() => setShowGroceryDrawer(true)}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-foreground text-background hover:opacity-85 text-xs font-medium transition-opacity cursor-pointer"
        >
          <ShoppingBag className="w-3.5 h-3.5 text-primary" />
          <span>Grocery List</span>
          {weeklyGroceries.length > 0 && (
            <span className="font-mono text-[11px] opacity-80">({weeklyGroceries.length})</span>
          )}
        </button>
      </div>

      {/* Desktop 7-Day Planner Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={formatDateKey(weekDays[0])}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
        >
          <div className="hidden lg:grid grid-cols-7 gap-3">
            {weekDays.map((day) => {
              const dateStr = formatDateKey(day);
              const today = isToday(day);
              const dayEntries = getEntriesForDate(dateStr);

              return (
                <div
                  key={dateStr}
                  className={`flex flex-col min-h-[380px] rounded-2xl border p-3 transition-colors ${
                    today
                      ? "border-foreground/30 bg-card shadow-xs"
                      : "border-border bg-card/60"
                  }`}
                >
                  {/* Day Header */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/70">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                        {day.toLocaleDateString("en-US", { weekday: "short" })}
                      </p>
                      <div className="mt-1 flex items-center gap-1.5">
                        <span
                          className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-semibold tabular-nums ${
                            today
                              ? "bg-foreground text-background"
                              : "text-foreground"
                          }`}
                        >
                          {day.getDate()}
                        </span>
                      </div>
                    </div>

                    {onAddMeal && (
                      <button
                        type="button"
                        onClick={() => setAddingForDate(dateStr)}
                        className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                        title={`Add meal for ${day.toLocaleDateString("en-US", { weekday: "short" })}`}
                        aria-label={`Add meal for ${day.toLocaleDateString("en-US", { weekday: "short" })}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Planned Meals */}
                  <div className="flex-1 space-y-2">
                    {dayEntries.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center py-8">
                        <p className="text-[11px] text-muted-foreground">Nothing planned</p>
                      </div>
                    ) : (
                      dayEntries.map((entry) => {
                        const matchedRecipe = recipeMap.get(entry.recipeId);
                        return (
                          <div
                            key={entry.id}
                            className="group relative rounded-xl border border-border/80 bg-secondary/40 hover:bg-secondary/80 p-2.5 transition-all"
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                {entry.mealType}
                              </span>
                              <button
                                type="button"
                                onClick={() => entry.id && onRemoveMeal(entry.id)}
                                className="opacity-70 lg:opacity-0 lg:group-hover:opacity-100 focus-visible:opacity-100 p-0.5 text-muted-foreground hover:text-red-500 transition-opacity cursor-pointer"
                                title="Remove meal"
                                aria-label={`Remove ${entry.recipeTitle}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => onViewRecipe(entry.recipeId)}
                              className="w-full text-left flex items-start gap-2 cursor-pointer"
                            >
                              {matchedRecipe && (
                                <span className="block w-8 h-8 rounded-md overflow-hidden shrink-0 bg-muted mt-0.5">
                                  {matchedRecipe.imageUrl ? (
                                    <img
                                      src={matchedRecipe.imageUrl}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <RecipeIcon recipe={matchedRecipe} variant="compact" className="w-full h-full" />
                                  )}
                                </span>
                              )}
                              <span className="min-w-0 flex-1 block">
                                <span className="block text-xs font-medium text-foreground leading-snug line-clamp-2 group-hover:underline">
                                  {entry.recipeTitle}
                                </span>
                                <span className="block text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                                  {entry.servings} servings
                                </span>
                              </span>
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile / Tablet Day Strip + Focused Day Cards */}
          <div className="lg:hidden space-y-5">
            <div className="grid grid-cols-7 gap-1.5">
              {weekDays.map((day) => {
                const dateStr = formatDateKey(day);
                const selected = selectedMobileDay === dateStr;
                const hasMeals = getEntriesForDate(dateStr).length > 0;
                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => setSelectedMobileDay(dateStr)}
                    className={`flex flex-col items-center py-2.5 rounded-xl border text-xs transition-all cursor-pointer ${
                      selected
                        ? "bg-foreground text-background border-foreground"
                        : "bg-card text-foreground border-border hover:bg-secondary"
                    }`}
                  >
                    <span className={`text-[10px] uppercase ${selected ? "opacity-80" : "text-muted-foreground"}`}>
                      {day.toLocaleDateString("en-US", { weekday: "narrow" })}
                    </span>
                    <span className="text-sm font-semibold tabular-nums mt-0.5">
                      {day.getDate()}
                    </span>
                    <span
                      className={`mt-1 w-1.5 h-1.5 rounded-full ${
                        hasMeals ? (selected ? "bg-primary" : "bg-primary-dark") : "bg-transparent"
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {(() => {
              const activeDay =
                weekDays.find((d) => formatDateKey(d) === selectedMobileDay) || weekDays[0];
              const dateStr = formatDateKey(activeDay);
              const entries = getEntriesForDate(dateStr);

              return (
                <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      {activeDay.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                      })}
                    </h3>
                    {onAddMeal && (
                      <button
                        type="button"
                        onClick={() => setAddingForDate(dateStr)}
                        className="inline-flex items-center gap-1 h-9 sm:h-8 px-3 rounded-full bg-secondary hover:bg-secondary/80 text-xs font-medium text-foreground cursor-pointer shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Meal</span>
                      </button>
                    )}
                  </div>

                  {entries.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-8 text-center">
                      No meals planned for this day yet.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {entries.map((entry) => {
                        const matchedRecipe = recipeMap.get(entry.recipeId);
                        return (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-secondary/40"
                          >
                            <button
                              type="button"
                              onClick={() => onViewRecipe(entry.recipeId)}
                              className="flex items-center gap-3 min-w-0 text-left flex-1 cursor-pointer"
                            >
                              {matchedRecipe && (
                                <span className="block w-11 h-11 rounded-lg overflow-hidden shrink-0 bg-muted">
                                  {matchedRecipe.imageUrl ? (
                                    <img src={matchedRecipe.imageUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <RecipeIcon recipe={matchedRecipe} variant="compact" className="w-full h-full" />
                                  )}
                                </span>
                              )}
                              <span className="min-w-0 block">
                                <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                  {entry.mealType}
                                </span>
                                <span className="block text-sm font-medium text-foreground truncate">
                                  {entry.recipeTitle}
                                </span>
                                <span className="block text-xs text-muted-foreground tabular-nums">
                                  {entry.servings} servings
                                </span>
                              </span>
                            </button>
                            <button
                              type="button"
                              onClick={() => entry.id && onRemoveMeal(entry.id)}
                              className="p-2 text-muted-foreground hover:text-red-500 cursor-pointer shrink-0"
                              aria-label="Remove meal"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Quick-Add Recipe to Day Modal */}
      <AnimatePresence>
        {addingForDate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAddingForDate(null)}
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            />
            <motion.div
              ref={quickAddRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label="Add to meal plan"
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              className="relative w-full max-w-md rounded-2xl border border-border bg-background shadow-2xl overflow-hidden z-10 flex flex-col max-h-[min(85dvh,calc(100dvh-2rem))] outline-none"
            >
              <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Add to Meal Plan</h3>
                  <p className="text-xs text-muted-foreground">{addingForDate}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAddingForDate(null)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
                  aria-label="Close meal picker"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 space-y-3 border-b border-border shrink-0">
                <div className="flex gap-1.5">
                  {MEAL_TYPES.map((mt) => (
                    <button
                      key={mt}
                      type="button"
                      onClick={() => setAddingMealType(mt)}
                      className={`flex-1 h-9 sm:h-8 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                        addingMealType === mt
                          ? "bg-foreground text-background"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {mt}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={pickerQuery}
                    onChange={(e) => setPickerQuery(e.target.value)}
                    placeholder="Pick from your recipes..."
                    className="w-full h-10 pl-10 pr-4 rounded-full bg-secondary text-base sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-2 space-y-1">
                {pickerRecipes.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    No matching recipes found.
                  </p>
                ) : (
                  pickerRecipes.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleQuickAddRecipe(r)}
                      className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-secondary text-left transition-colors cursor-pointer"
                    >
                      <span className="block w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-muted">
                        {r.imageUrl ? (
                          <img src={r.imageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <RecipeIcon recipe={r} variant="compact" className="w-full h-full" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1 block">
                        <span className="block text-sm font-medium text-foreground truncate">{r.title}</span>
                        <span className="block text-xs text-muted-foreground">
                          {r.cuisine} · {r.servings} servings
                        </span>
                      </span>
                      <Plus className="w-4 h-4 text-muted-foreground shrink-0" />
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Auto-Generated Weekly Grocery List Drawer */}
      <AnimatePresence>
        {showGroceryDrawer && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGroceryDrawer(false)}
              className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            />
            <motion.div
              ref={groceryDrawerRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label="Weekly grocery list"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              className="relative w-full max-w-md bg-background border-l border-border h-full shadow-2xl flex flex-col z-10 pt-safe outline-none"
            >
              <div className="min-h-14 sm:min-h-16 py-2 px-5 border-b border-border flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Weekly Grocery List</h3>
                  <p className="text-xs text-muted-foreground">{weekRangeLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGroceryDrawer(false)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
                  aria-label="Close grocery list"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 pt-2 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
                {weeklyGroceries.length === 0 ? (
                  <div className="py-16 text-center space-y-2">
                    <ShoppingBag className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                    <p className="text-sm font-medium text-foreground">Your list is empty</p>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                      Add recipes to this week&apos;s planner and your grocery list will build itself automatically.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border/70">
                    {weeklyGroceries.map((item) => {
                      const checked = checkedGroceries.has(item.key);
                      return (
                        <li key={item.key}>
                          <button
                            type="button"
                            aria-pressed={checked}
                            onClick={() => {
                              const next = new Set(checkedGroceries);
                              if (next.has(item.key)) next.delete(item.key);
                              else next.add(item.key);
                              setCheckedGroceries(next);
                            }}
                            className="w-full flex items-center justify-between gap-3 py-3 text-left cursor-pointer select-none"
                          >
                            <span className="flex items-center gap-3 min-w-0">
                              <span
                                className={`w-4 h-4 rounded-full shrink-0 flex items-center justify-center border transition-colors ${
                                  checked
                                    ? "bg-primary border-primary text-primary-foreground"
                                    : "border-neutral-300 dark:border-neutral-600"
                                }`}
                              >
                                {checked && <Check className="w-2.5 h-2.5" strokeWidth={3} />}
                              </span>
                              <span className={`text-sm capitalize break-words ${checked ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                {item.name}
                              </span>
                            </span>
                            <span className="font-mono text-xs tabular-nums text-muted-foreground shrink-0">
                              {item.amount > 0 ? parseFloat(item.amount.toFixed(2)) : ""} {item.unit}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {checkedGroceries.size > 0 && (
                <div className="px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] border-t border-border shrink-0">
                  <button
                    type="button"
                    onClick={() => setCheckedGroceries(new Set())}
                    className="w-full h-10 rounded-full border border-border text-xs font-medium text-foreground hover:bg-secondary transition-colors cursor-pointer"
                  >
                    Uncheck all ({checkedGroceries.size})
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
