import React, { useState, useEffect } from "react";
import { X, Clock, ChefHat, Users, Printer, Calendar, Edit2, Trash2, Minus, Plus, ListChecks, Check, ChevronDown, Activity, UtensilsCrossed } from "lucide-react";
import { Recipe, MealPlanEntry } from "../types";
import InstructionStep from "./InstructionStep";
import RecipeIcon from "./RecipeIcon";
import CookingMode from "./CookingMode";
import { formatTime } from "../lib/utils";

interface RecipeModalProps {
  recipe: Recipe | null;
  isOpen: boolean;
  isAdmin?: boolean;
  onClose: () => void;
  onEdit: (recipe: Recipe) => void;
  onDelete: (id: string) => Promise<void>;
  onAddToCalendar: (entry: Omit<MealPlanEntry, "id">) => Promise<void>;
}

const getMealTypeColor = (type: string | undefined) => {
  switch (type) {
    case "Starter": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-500";
    case "Main": return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-500";
    case "Side": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-500";
    case "Drink": return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-500";
    case "Dessert": return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-500";
    case "Snack": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500";
    default: return "border border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400";
  }
};

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

export default function RecipeModal({ recipe, isOpen, isAdmin, onClose, onEdit, onDelete, onAddToCalendar }: RecipeModalProps) {
  const [servings, setServings] = useState<number>(4);
  const [plannerDate, setPlannerDate] = useState("");
  const [plannerMeal, setPlannerMeal] = useState<"Breakfast" | "Lunch" | "Dinner" | "Snack">("Dinner");
  const [isPlanning, setIsPlanning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [plannedSuccess, setPlannedSuccess] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [completedIngredients, setCompletedIngredients] = useState<Set<number>>(new Set());
  const [isCookingModeOpen, setIsCookingModeOpen] = useState(false);

  // Initialize servings and dates
  useEffect(() => {
    if (recipe) {
      setServings(recipe.servings || 4);
      // Set default planner date to today
      const todayStr = new Date().toISOString().split("T")[0];
      setPlannerDate(todayStr);
      setPlannedSuccess(false);
      setShowDeleteConfirm(false);
      setCompletedSteps(new Set());
      setCompletedIngredients(new Set());
      setIsCookingModeOpen(false);
    }
  }, [recipe, isOpen]);

  if (!isOpen || !recipe) return null;

  // Scale multiplier
  const scaleRatio = servings / (recipe.servings || 1);

  // Helper to format scaled ingredient amounts beautifully
  const formatAmount = (amount: number) => {
    if (!amount) return "";
    const scaled = amount * scaleRatio;
    // Format to 2 decimal places max, removing trailing zeroes
    return parseFloat(scaled.toFixed(2)).toString();
  };

  const handleDecreaseServings = () => {
    if (servings > 1) setServings((prev) => prev - 1);
  };

  const handleIncreaseServings = () => {
    setServings((prev) => prev + 1);
  };

  const handlePlanMeal = async () => {
    if (!plannerDate) return;
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
      setTimeout(() => setPlannedSuccess(false), 3000);
    } catch (err) {
      console.error("Error adding to meal plan:", err);
    } finally {
      setIsPlanning(false);
    }
  };

  const handleDeleteClick = async () => {
    if (!recipe.id) return;
    
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div id="recipe-modal-overlay" className="fixed inset-0 z-50 flex flex-col bg-[#FDFBF7] dark:bg-neutral-800 overflow-hidden print:bg-white">
      <div id="recipe-modal-card" className="relative w-full h-full max-w-5xl mx-auto flex flex-col bg-[#FDFBF7] dark:bg-neutral-800 print:max-w-none print:w-full">
        
        {/* Header Block */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-700 print:hidden">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1.5 select-none cursor-pointer text-left focus:outline-none group bg-transparent border-0 p-0"
              title="Back to recipes"
              aria-label="Cookbook - Back to recipes"
            >
              <UtensilsCrossed className="w-5 h-5 text-neutral-900 dark:text-neutral-50 group-hover:text-accent-500 dark:group-hover:text-accent-400 transition-colors" />
              <span className="text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-50 group-hover:text-accent-500 dark:group-hover:text-accent-400 transition-colors">Cookbook</span>
            </button>
            <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-700 mx-1"></div>
            {recipe.mealType && (
              <span className={`text-xs uppercase tracking-wider font-bold px-2 py-0.5 rounded-full shrink-0 ${getMealTypeColor(recipe.mealType)}`}>
                {recipe.mealType}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCookingModeOpen(true)}
              className="px-3 py-1.5 bg-accent-500 hover:bg-accent-600 dark:bg-accent-600 dark:hover:bg-accent-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-xs active:scale-95 cursor-pointer"
              title="Start Full-Screen Cooking Mode"
            >
              <ChefHat className="w-3.5 h-3.5" />
              <span>Cooking Mode</span>
            </button>
            <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-700 mx-1"></div>
            {isAdmin && (
              <>
                <button
                  onClick={() => onEdit(recipe)}
                  className="p-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors flex items-center gap-1.5 text-xs font-medium"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={handleDeleteClick}
                  disabled={isDeleting}
                  className={`p-2 transition-colors flex items-center gap-1.5 text-xs font-medium rounded-md ${showDeleteConfirm ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40' : 'text-neutral-500 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400'}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {isDeleting ? "Deleting..." : showDeleteConfirm ? "Click to Confirm" : "Delete"}
                </button>
                <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-700 mx-1"></div>
              </>
            )}
            <button 
              onClick={onClose}
              className="p-1.5 text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Recipe Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-10 print:overflow-visible">
          {/* Cover & General Metadata */}
          <div className="flex flex-col md:flex-row gap-8">
            {recipe.imageUrl ? (
              <div className="w-full md:w-1/3 aspect-[4/3] rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 relative shrink-0">
                <img
                  src={recipe.imageUrl}
                  alt={recipe.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-full md:w-1/3 aspect-[4/3] rounded-xl overflow-hidden relative shrink-0">
                <RecipeIcon recipe={recipe} className="w-full h-full" />
              </div>
            )}
            <div className="flex-1 space-y-5">
              <h1 className="text-3xl md:text-4xl font-semibold text-neutral-900 dark:text-neutral-50 tracking-tight leading-tight">
                {recipe.title}
              </h1>
              {recipe.description && (
                <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-2xl">
                  {recipe.description}
                </p>
              )}

              {/* Fast Tags */}
              <div className="flex flex-wrap gap-3 pt-2 text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                <span className="flex items-center gap-1.5 border border-neutral-200 dark:border-neutral-700 px-2.5 py-1 rounded-md">
                  <Clock className="w-3.5 h-3.5" />
                  {formatTime(recipe.cookingTime)}
                </span>
                <span className="flex items-center gap-1.5 border border-neutral-200 dark:border-neutral-700 px-2.5 py-1 rounded-md">
                  <ChefHat className="w-3.5 h-3.5" />
                  {recipe.cuisine}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Servings Scaler */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-4 border-y border-neutral-100 dark:border-neutral-700 print:hidden">
            <div>
              <h4 className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                Servings
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Adjust serving size to scale ingredients automatically.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleDecreaseServings}
                className="w-8 h-8 flex items-center justify-center rounded-full border border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 hover:border-neutral-900 dark:hover:border-white hover:text-neutral-900 dark:hover:text-white transition-all disabled:opacity-35"
                disabled={servings <= 1}
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="w-6 text-center font-medium text-neutral-900 dark:text-neutral-50">
                {servings}
              </span>
              <button
                onClick={handleIncreaseServings}
                className="w-8 h-8 flex items-center justify-center rounded-full border border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 hover:border-neutral-900 dark:hover:border-white hover:text-neutral-900 dark:hover:text-white transition-all"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Core Content Grid: Ingredients & Instructions */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-10 md:gap-16">
            {/* Ingredients */}
            <div className="md:col-span-2 space-y-6">
              <h3 className="text-xs font-semibold text-neutral-900 dark:text-neutral-50 uppercase tracking-widest">
                Ingredients
              </h3>
              <div className="space-y-2 md:space-y-3">
                {recipe.ingredients.map((ing, idx) => {
                  const isCompleted = completedIngredients.has(idx);
                  return (
                    <div 
                      key={idx}
                      onClick={() => {
                        const newSet = new Set(completedIngredients);
                        if (newSet.has(idx)) newSet.delete(idx);
                        else newSet.add(idx);
                        setCompletedIngredients(newSet);
                      }}
                      className={`flex items-center justify-between gap-3 p-2 md:p-3 rounded-lg md:rounded-xl border md:border-2 transition-all cursor-pointer ${
                        isCompleted 
                          ? "border-neutral-100 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-400 dark:text-neutral-600" 
                          : "border-neutral-100 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-neutral-200 dark:hover:border-neutral-700 md:hover:border-neutral-300 dark:md:hover:border-neutral-600 hover:shadow-sm text-neutral-800 dark:text-neutral-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 md:gap-3">
                        <div className={`w-4 h-4 md:w-5 md:h-5 shrink-0 rounded-full flex items-center justify-center border md:border-2 transition-colors ${
                          isCompleted ? "bg-accent-100 dark:bg-accent-900/30 border-accent-200 dark:border-accent-800 text-accent-700 dark:text-accent-500" : "border-neutral-200 dark:border-neutral-600 text-transparent"
                        }`}>
                          <Check className="w-2.5 h-2.5 md:w-3 md:h-3" strokeWidth={3} />
                        </div>
                        <span className={`text-sm md:text-sm leading-tight transition-all ${isCompleted ? "line-through" : ""}`}>
                          {formatIngredientName(ing.name)}
                        </span>
                      </div>
                      <span className={`font-mono text-xs md:text-xs text-right shrink-0 transition-all ${isCompleted ? "text-neutral-400 dark:text-neutral-600" : "text-neutral-500 dark:text-neutral-400"}`}>
                        {formatAmount(ing.amount)} {ing.unit}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Instructions */}
            <div className="md:col-span-3 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold text-neutral-900 dark:text-neutral-50 uppercase tracking-widest">
                  Instructions
                </h3>
                <button
                  type="button"
                  onClick={() => setIsCookingModeOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent-50 dark:bg-accent-950/40 text-accent-700 dark:text-accent-400 border border-accent-200 dark:border-accent-800 rounded-lg text-xs font-semibold hover:bg-accent-100 dark:hover:bg-accent-900/40 transition-colors active:scale-95 cursor-pointer"
                  title="Open Step-by-Step Cooking Mode"
                >
                  <ChefHat className="w-3.5 h-3.5" />
                  <span>Cooking Mode</span>
                </button>
              </div>
              
              <div className="relative pb-4">
                {(() => {
                  type InstructionBlock = { type: 'single', step: string, idx: number } | { type: 'parallel', steps: { step: string, idx: number }[] };
                  const blocks: InstructionBlock[] = [];
                  let currentParallelBlock: { step: string, idx: number }[] | null = null;
                  
                  recipe.instructions.forEach((step, idx) => {
                    const lowerStep = step.toLowerCase().trim();
                    const isParallel = idx > 0 && (
                      lowerStep.startsWith("meanwhile") || 
                      lowerStep.startsWith("while") || 
                      lowerStep.startsWith("in parallel") || 
                      lowerStep.startsWith("separately") ||
                      lowerStep.startsWith("at the same time") ||
                      lowerStep.startsWith("for the ") ||
                      lowerStep.startsWith("to make the ") ||
                      lowerStep.startsWith("prepare the ")
                    );

                    if (isParallel) {
                      if (!currentParallelBlock) {
                        const lastBlock = blocks.pop();
                        if (lastBlock?.type === 'single') {
                          currentParallelBlock = [lastBlock, { step, idx }];
                          blocks.push({ type: 'parallel', steps: currentParallelBlock });
                        } else if (lastBlock?.type === 'parallel') {
                          lastBlock.steps.push({ step, idx });
                          blocks.push(lastBlock);
                          currentParallelBlock = lastBlock.steps;
                        } else {
                           blocks.push({ type: 'single', step, idx });
                        }
                      } else {
                        currentParallelBlock.push({ step, idx });
                      }
                    } else {
                      currentParallelBlock = null;
                      blocks.push({ type: 'single', step, idx });
                    }
                  });

                  return (
                    <div className="flex flex-col items-center space-y-8 relative">
                      {/* Center vertical spine line */}
                      <div className="absolute left-1/2 top-4 bottom-4 w-[2px] -ml-[1px] bg-neutral-200 dark:bg-neutral-700 z-0"></div>
                      
                      {blocks.map((block, bIdx) => {
                        if (block.type === 'single') {
                          return (
                            <div key={bIdx} className="w-full relative z-10">
                              <InstructionStep 
                                step={block.step}
                                idx={block.idx}
                                isCompleted={completedSteps.has(block.idx)}
                                isParallel={false}
                                onToggleComplete={() => {
                                  const newSet = new Set(completedSteps);
                                  if (newSet.has(block.idx)) newSet.delete(block.idx);
                                  else newSet.add(block.idx);
                                  setCompletedSteps(newSet);
                                }}
                              />
                            </div>
                          );
                        } else {
                          // Parallel block
                          const gridCols = block.steps.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3';
                          
                          // For gap-8 (2rem = 32px) on md, the center of columns:
                          // Col 1 center = calc(25% - 8px)
                          // Col 2 center (if 2 cols) = calc(75% + 8px)
                          // Distance from edge = calc(25% - 8px)
                          const edgeDist = block.steps.length === 2 ? 'calc(25% - 8px)' : 'calc(16.666% - 10px)';

                          return (
                            <div key={bIdx} className="w-full relative z-10 flex flex-col items-center">
                              {/* Horizontal branching line for Desktop */}
                              <div className="hidden md:block absolute top-[15px] h-[2px] bg-neutral-200 dark:bg-neutral-700 z-0" style={{ left: edgeDist, right: edgeDist }}></div>
                              
                              <div className={`w-full grid grid-cols-1 ${gridCols} gap-6 md:gap-8 relative z-10`}>
                                {block.steps.map(s => (
                                  <InstructionStep 
                                    key={s.idx}
                                    step={s.step}
                                    idx={s.idx}
                                    isCompleted={completedSteps.has(s.idx)}
                                    isParallel={true}
                                    onToggleComplete={() => {
                                      const newSet = new Set(completedSteps);
                                      if (newSet.has(s.idx)) newSet.delete(s.idx);
                                      else newSet.add(s.idx);
                                      setCompletedSteps(newSet);
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        }
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Notes section if exists */}
          {recipe.notes && (
            <div className="pt-6 border-t border-neutral-100 dark:border-neutral-700 text-sm space-y-3">
              <h4 className="font-semibold text-neutral-900 dark:text-neutral-50">Notes</h4>
              <ul className="list-disc pl-5 space-y-1.5 text-neutral-600 dark:text-neutral-400 leading-relaxed marker:text-accent-500">
                {(() => {
                  let parsedNotes = recipe.notes.split('\n').map(n => n.trim()).filter(Boolean);
                  
                  // If it's a single line with multiple sentences, split by period + space
                  if (parsedNotes.length === 1 && parsedNotes[0].includes('. ')) {
                    parsedNotes = parsedNotes[0]
                      .split(/\.\s+/)
                      .map(n => n.trim())
                      .filter(Boolean)
                      .map(n => n.endsWith('.') ? n : n + '.');
                  }

                  return parsedNotes.map((note, idx) => {
                    // Clean up existing bullet characters from the start of the string so we don't double-bullet
                    const cleanNote = note.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '');
                    return <li key={idx}>{cleanNote}</li>;
                  });
                })()}
              </ul>
            </div>
          )}

          {/* Nutrition Dropdown */}
          {recipe.nutrition && (
            <div className="pt-6 border-t border-neutral-100 dark:border-neutral-700 print:hidden">
              <details className="group [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex items-center justify-between cursor-pointer list-none py-2 select-none text-neutral-900 dark:text-neutral-50 hover:text-accent-500 dark:hover:text-accent-400 transition-colors">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-accent-500" />
                    <h4 className="font-medium text-sm">Estimated Nutritional Values (per serving)</h4>
                  </div>
                  <ChevronDown className="w-4 h-4 transition-transform duration-300 group-open:-rotate-180 text-neutral-400" />
                </summary>
                <div className="grid grid-cols-4 gap-4 pt-4 pb-2 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-xl text-center border border-neutral-100 dark:border-neutral-800">
                    <p className="text-xl font-bold text-neutral-900 dark:text-neutral-50">{recipe.nutrition.calories}</p>
                    <p className="text-xs uppercase tracking-wider font-semibold text-neutral-500 dark:text-neutral-400 mt-1">Calories</p>
                  </div>
                  <div className="bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-xl text-center border border-neutral-100 dark:border-neutral-800">
                    <p className="text-xl font-bold text-neutral-900 dark:text-neutral-50">{recipe.nutrition.protein}g</p>
                    <p className="text-xs uppercase tracking-wider font-semibold text-neutral-500 dark:text-neutral-400 mt-1">Protein</p>
                  </div>
                  <div className="bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-xl text-center border border-neutral-100 dark:border-neutral-800">
                    <p className="text-xl font-bold text-neutral-900 dark:text-neutral-50">{recipe.nutrition.carbs}g</p>
                    <p className="text-xs uppercase tracking-wider font-semibold text-neutral-500 dark:text-neutral-400 mt-1">Carbs</p>
                  </div>
                  <div className="bg-neutral-50 dark:bg-neutral-900/50 p-4 rounded-xl text-center border border-neutral-100 dark:border-neutral-800">
                    <p className="text-xl font-bold text-neutral-900 dark:text-neutral-50">{recipe.nutrition.fat}g</p>
                    <p className="text-xs uppercase tracking-wider font-semibold text-neutral-500 dark:text-neutral-400 mt-1">Fat</p>
                  </div>
                </div>
              </details>
            </div>
          )}

          {recipe.sourceUrl && (
            <p className="text-xs text-neutral-400 dark:text-neutral-500 print:hidden mt-8">
              Source:{" "}
              <a
                href={recipe.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-neutral-900 dark:hover:text-white"
              >
                {recipe.sourceUrl}
              </a>
            </p>
          )}

          {/* Quick Add to Meal Planner Section */}
          {isAdmin && (
            <div className="pt-8 mt-8 border-t border-neutral-100 dark:border-neutral-700 print:hidden space-y-4">
              <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-50 uppercase tracking-widest">
                Add to Meal Plan
              </h4>
              <div className="flex flex-col sm:flex-row gap-4 max-w-lg">
                <input
                  type="date"
                  value={plannerDate}
                  onChange={(e) => setPlannerDate(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-600 bg-transparent text-neutral-900 dark:text-neutral-50 rounded-md focus:outline-none focus:border-neutral-900 dark:focus:border-white focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white"
                />
                <select
                  value={plannerMeal}
                  onChange={(e) => setPlannerMeal(e.target.value as any)}
                  className="w-full sm:w-auto px-3 py-2 text-sm border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 rounded-md focus:outline-none focus:border-neutral-900 dark:focus:border-white focus:ring-1 focus:ring-neutral-900 dark:focus:ring-white"
                >
                  <option value="Breakfast">Breakfast</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Dinner">Dinner</option>
                  <option value="Snack">Snack</option>
                </select>
                <button
                  onClick={handlePlanMeal}
                  disabled={isPlanning || !plannerDate}
                  className="px-5 py-2 bg-neutral-900 dark:bg-white hover:bg-neutral-800 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 font-medium text-sm rounded-md transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {isPlanning ? "Adding..." : "Add to Plan"}
                </button>
              </div>

              {plannedSuccess && (
                <p className="text-xs text-neutral-500 font-medium animate-fade-in">
                  Added to your meal plan.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Print / Footer Action Bar */}
        <div className="px-6 py-4 border-t border-neutral-100 dark:border-neutral-700 flex justify-between items-center print:hidden">
          <p className="text-xs text-neutral-400 dark:text-neutral-500 font-mono">
            Original: {recipe.servings}s
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsCookingModeOpen(true)}
              className="text-xs font-medium text-accent-600 dark:text-accent-400 hover:underline flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ChefHat className="w-3.5 h-3.5" />
              Cooking Mode
            </button>
            <span className="text-neutral-300 dark:text-neutral-700">•</span>
            <button
              onClick={handlePrint}
              className="text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print
            </button>
          </div>
        </div>
      </div>

      {/* Step-by-Step Full-Screen Cooking Mode */}
      <CookingMode
        recipe={recipe}
        servings={servings}
        isOpen={isCookingModeOpen}
        completedSteps={completedSteps}
        completedIngredients={completedIngredients}
        onToggleStepComplete={(stepIdx) => {
          const newSet = new Set(completedSteps);
          if (newSet.has(stepIdx)) newSet.delete(stepIdx);
          else newSet.add(stepIdx);
          setCompletedSteps(newSet);
        }}
        onToggleIngredientComplete={(ingIdx) => {
          const newSet = new Set(completedIngredients);
          if (newSet.has(ingIdx)) newSet.delete(ingIdx);
          else newSet.add(ingIdx);
          setCompletedIngredients(newSet);
        }}
        onClose={() => setIsCookingModeOpen(false)}
      />
    </div>
  );
}
