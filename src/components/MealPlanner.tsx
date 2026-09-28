import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { MealPlanEntry, Recipe } from "../types";

interface MealPlannerProps {
  mealPlan: MealPlanEntry[];
  recipes: Recipe[];
  onRemoveMeal: (id: string) => Promise<void>;
  onViewRecipe: (recipeId: string) => void;
}

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack"] as const;

export default function MealPlanner({ mealPlan, onRemoveMeal, onViewRecipe }: MealPlannerProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const getWeekDays = (baseDate: Date) => {
    const sunday = new Date(baseDate);
    const day = baseDate.getDay();
    sunday.setDate(baseDate.getDate() - day);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const weekDays = getWeekDays(currentDate);

  const formatDateKey = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const getMealEntries = (dateStr: string, mealType: typeof MEAL_TYPES[number]) => {
    return mealPlan.filter((entry) => entry.date === dateStr && entry.mealType === mealType);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Calendar Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-700 pb-4">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">Meal Plan</h2>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-neutral-900 dark:text-neutral-50 hidden sm:block">
            {formatMonthYear(weekDays[0])}
          </span>
          <div className="flex items-center gap-1">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() - 7)))}
              className="p-1 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-md text-neutral-400 dark:text-neutral-500 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setCurrentDate(new Date())}
              className="px-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
            >
              Today
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setCurrentDate(new Date(currentDate.setDate(currentDate.getDate() + 7)))}
              className="p-1 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-md text-neutral-400 dark:text-neutral-500 cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={formatDateKey(weekDays[0])}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Grid Week Planner Desktop view */}
          <div className="hidden lg:grid grid-cols-7 gap-4">
        {weekDays.map((day) => {
          const dateStr = formatDateKey(day);
          const active = isToday(day);

          return (
            <div key={dateStr} className="flex flex-col space-y-4">
              {/* Day Header */}
              <div className={`pb-2 border-b ${active ? "border-neutral-900 dark:border-white" : "border-neutral-100 dark:border-neutral-700"}`}>
                <div className={`text-xs font-medium ${active ? "text-neutral-900 dark:text-neutral-50" : "text-neutral-500 dark:text-neutral-400"}`}>
                  {day.toLocaleDateString("en-US", { weekday: "short" })}
                </div>
                <div className={`text-xl font-semibold mt-1 ${active ? "text-neutral-900 dark:text-neutral-50" : "text-neutral-400 dark:text-neutral-500"}`}>
                  {day.getDate()}
                </div>
              </div>

              {/* Day Content Slots */}
              <div className="space-y-4">
                {MEAL_TYPES.map((mealType) => {
                  const entries = getMealEntries(dateStr, mealType);
                  return (
                    <div key={mealType} className="space-y-2">
                      <div className="text-xs font-medium text-neutral-400 uppercase tracking-widest">
                        {mealType}
                      </div>

                      <div className="space-y-1">
                        {entries.length === 0 ? (
                          <div className="h-8 flex items-center text-xs text-neutral-300 dark:text-neutral-700">
                            -
                          </div>
                        ) : (
                          entries.map((entry) => (
                            <div key={entry.id} className="group relative pr-4">
                              <button
                                onClick={() => onViewRecipe(entry.recipeId)}
                                className="text-xs font-medium text-neutral-900 dark:text-neutral-50 hover:underline text-left leading-snug line-clamp-2"
                              >
                                {entry.recipeTitle}
                              </button>
                              <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                                {entry.servings}s
                              </div>

                              <button
                                onClick={() => entry.id && onRemoveMeal(entry.id)}
                                className="absolute right-0 top-0 p-1 opacity-0 group-hover:opacity-100 hover:text-red-500 text-neutral-400 dark:text-neutral-500 transition-opacity"
                                title="Remove"
                              >
                                &times;
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Week Planner Responsive View */}
      <div className="block lg:hidden space-y-8">
        {weekDays.map((day) => {
          const dateStr = formatDateKey(day);
          const active = isToday(day);

          return (
            <div key={dateStr} className="space-y-4">
              <div className={`pb-2 border-b ${active ? "border-neutral-900 dark:border-white" : "border-neutral-100 dark:border-neutral-700"}`}>
                <span className={`text-sm font-semibold ${active ? "text-neutral-900 dark:text-neutral-50" : "text-neutral-600 dark:text-neutral-400"}`}>
                  {day.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 pl-4">
                {MEAL_TYPES.map((mealType) => {
                  const entries = getMealEntries(dateStr, mealType);
                  if (entries.length === 0) return null;
                  return (
                    <div key={mealType} className="space-y-1">
                      <div className="text-xs font-medium text-neutral-400 uppercase tracking-widest">
                        {mealType}
                      </div>
                      {entries.map((entry) => (
                        <div key={entry.id} className="flex justify-between items-start gap-2">
                          <div>
                            <button
                              onClick={() => onViewRecipe(entry.recipeId)}
                              className="text-sm font-medium text-neutral-900 dark:text-neutral-50 hover:underline flex items-center gap-1"
                            >
                              {entry.recipeTitle}
                              <ExternalLink className="w-3 h-3 text-neutral-400 dark:text-neutral-500" />
                            </button>
                            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                              {entry.servings} servings
                            </div>
                          </div>
                          <button
                            onClick={() => entry.id && onRemoveMeal(entry.id)}
                            className="p-1 text-neutral-400 dark:text-neutral-500 hover:text-red-500"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
