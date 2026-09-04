import React from "react";
import { 
  Star, 
  Clock, 
  Users, 
  Check, 
  ChevronDown, 
  Loader2,
  BookmarkPlus,
  ArrowRight,
  Lightbulb,
  Utensils,
  BookOpen,
  Flame,
  Globe
} from "lucide-react";
import { TopRatedRecipe } from "../types";
import { formatTime } from "../lib/utils";

interface Props {
  recipe: TopRatedRecipe;
  index: number;
  isExpanded: boolean;
  isSavingThis: boolean;
  isSavedThis: boolean;
  onExpand: () => void;
  onSelect: () => void;
  onQuickSave: () => void;
}

const TopRatedSearchCard: React.FC<Props> = ({
  recipe,
  index,
  isExpanded,
  isSavingThis,
  isSavedThis,
  onExpand,
  onSelect,
  onQuickSave
}) => {
  return (
    <div className="bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-xl p-4 sm:p-5 transition-all hover:shadow-md hover:border-neutral-200 dark:hover:border-neutral-600">
      {/* Top Bar: Ranking, Source, Rating */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Badge Cluster */}
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 flex-wrap">
            <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-neutral-900 text-white dark:bg-neutral-700 dark:text-neutral-50">
              #{index + 1}
            </span>

            {recipe.source && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/50 truncate max-w-[200px] sm:max-w-none">
                {recipe.source}
              </span>
            )}

            {recipe.rating && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-700/50 px-2 py-0.5 rounded-md border border-neutral-200/50 dark:border-neutral-600/50">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {recipe.rating}
                {recipe.reviewCount && (
                  <span className="font-normal text-neutral-500 dark:text-neutral-400 text-[11px] hidden xs:inline">
                    ({recipe.reviewCount})
                  </span>
                )}
              </span>
            )}
          </div>

          <h3 className="text-sm sm:text-base font-bold text-neutral-900 dark:text-neutral-50 leading-tight">
            {recipe.title}
          </h3>
          {recipe.description && (
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
              {recipe.description}
            </p>
          )}
        </div>

        {/* Desktop Quick Action Buttons */}
        <div className="hidden sm:flex flex-col gap-2 shrink-0">
          <button
            type="button"
            onClick={onQuickSave}
            disabled={isSavingThis || isSavedThis}
            className={`h-9 px-3 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-1.5 active:scale-98 ${
              isSavedThis
                ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800/50 dark:text-green-400"
                : "border-neutral-200 dark:border-neutral-600 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700"
            }`}
          >
            {isSavingThis ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isSavedThis ? (
              <>
                <Check className="w-4 h-4 text-green-600 dark:text-green-500" />
                <span>Saved</span>
              </>
            ) : (
              <>
                <BookmarkPlus className="w-4 h-4" />
                <span>Save Quick</span>
              </>
            )}
          </button>
          
          <button
            type="button"
            onClick={onSelect}
            className="h-9 px-3 text-xs font-semibold bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-xl hover:bg-neutral-800 dark:hover:bg-white flex items-center justify-center gap-1.5 active:scale-98 shadow-xs"
          >
            <span>Customize</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Meta Bar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-[11px] sm:text-xs">
        <div className="flex items-center gap-1.5 font-medium text-neutral-700 dark:text-neutral-300">
          <Globe className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
          {recipe.cuisine} • {recipe.mealType || "Main"}
        </div>
        
        {recipe.cookingTime && (
          <div className="flex items-center gap-1.5 font-medium text-neutral-700 dark:text-neutral-300">
            <Clock className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
            {formatTime(recipe.cookingTime)}
          </div>
        )}

        {recipe.servings && (
          <div className="flex items-center gap-1.5 font-medium text-neutral-700 dark:text-neutral-300">
            <Users className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
            {recipe.servings} servings
          </div>
        )}

        {recipe.nutrition?.calories && (
          <span className="inline-flex items-center gap-1 text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700/50 px-2 py-1 rounded-md">
            <Flame className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
            {recipe.nutrition.calories} kcal
          </span>
        )}
      </div>

      {/* Highlighted Chef's Secret Technique Box */}
      {recipe.keyTechnique && (
        <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200/70 dark:border-amber-800/30 rounded-xl">
          <div className="flex items-center gap-1.5 text-amber-900 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
            <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>Chef's Secret Technique</span>
          </div>
          <p className="text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 font-medium leading-relaxed mt-1">
            {recipe.keyTechnique}
          </p>
        </div>
      )}

      {/* Mobile Action Buttons (Thumb-friendly & full-width) */}
      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700 sm:hidden">
        <button
          type="button"
          onClick={onQuickSave}
          disabled={isSavingThis || isSavedThis}
          className={`h-10 text-xs font-semibold rounded-xl border transition-all flex items-center justify-center gap-1.5 active:scale-98 ${
            isSavedThis
              ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800/50 dark:text-green-400"
              : "border-neutral-200 dark:border-neutral-600 text-neutral-800 dark:text-neutral-200 bg-neutral-50/80 dark:bg-neutral-800/80 hover:bg-neutral-100 dark:hover:bg-neutral-700"
          }`}
        >
          {isSavingThis ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isSavedThis ? (
            <>
              <Check className="w-4 h-4 text-green-600 dark:text-green-500" />
              <span>Saved</span>
            </>
          ) : (
            <>
              <BookmarkPlus className="w-4 h-4" />
              <span>Save</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onSelect}
          className="h-10 text-xs font-semibold bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-xl flex items-center justify-center gap-1.5 active:scale-98 shadow-xs"
        >
          <span>Customize</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Clean Dropdown Accordion for Ingredients & Steps */}
      <div className="mt-3 pt-2 sm:pt-2.5 border-t border-neutral-100 dark:border-neutral-700">
        <button
          type="button"
          onClick={onExpand}
          className="w-full min-h-[40px] flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700/50 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-neutral-100">
            <Utensils className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 group-hover:text-neutral-700 dark:group-hover:text-neutral-300 shrink-0" />
            <span className="truncate">
              Ingredients ({recipe.ingredients?.length || 0}) & Steps ({recipe.instructions?.length || 0})
            </span>
          </div>

          <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400 shrink-0 ml-1">
            <span className="hidden xs:inline">{isExpanded ? "Hide" : "View"}</span>
            <ChevronDown 
              className={`w-4 h-4 transition-transform duration-200 ${
                isExpanded ? "rotate-180" : ""
              }`} 
            />
          </div>
        </button>

        {/* Dropdown Content */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* Ingredients Panel */}
              <div className="bg-neutral-50 dark:bg-neutral-900/50 p-3.5 rounded-xl border border-neutral-100 dark:border-neutral-700/50">
                <div className="flex items-center gap-1.5 font-bold text-neutral-900 dark:text-neutral-100 mb-2.5 pb-1.5 border-b border-neutral-200/60 dark:border-neutral-700/60">
                  <Utensils className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                  <span>Ingredients ({recipe.ingredients?.length || 0})</span>
                </div>
                <ul className="space-y-1.5">
                  {recipe.ingredients?.map((ing, i) => (
                    <li key={i} className="flex items-baseline justify-between text-neutral-700 dark:text-neutral-300 py-1 border-b border-neutral-100 dark:border-neutral-700/50 last:border-none">
                      <span className="font-normal text-neutral-800 dark:text-neutral-200 pr-2">{ing.name}</span>
                      {(ing.amount || ing.unit) && (
                        <span className="font-semibold text-neutral-900 dark:text-neutral-100 shrink-0">
                          {ing.amount ? `${ing.amount} ` : ""}{ing.unit || ""}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Instructions Panel */}
              <div className="bg-neutral-50 dark:bg-neutral-900/50 p-3.5 rounded-xl border border-neutral-100 dark:border-neutral-700/50">
                <div className="flex items-center gap-1.5 font-bold text-neutral-900 dark:text-neutral-100 mb-2.5 pb-1.5 border-b border-neutral-200/60 dark:border-neutral-700/60">
                  <BookOpen className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                  <span>Instructions ({recipe.instructions?.length || 0} steps)</span>
                </div>
                <ol className="space-y-2.5">
                  {recipe.instructions?.map((step, i) => (
                    <li key={i} className="flex items-start gap-2.5 leading-relaxed text-neutral-700 dark:text-neutral-300">
                      <span className="w-5 h-5 rounded-full bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="flex-1 text-xs leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* Chef Notes & Substitutions if provided */}
            {recipe.notes && (
              <div className="p-3 bg-neutral-100 dark:bg-neutral-800/80 rounded-xl text-xs text-neutral-600 dark:text-neutral-300">
                <span className="font-bold text-neutral-900 dark:text-neutral-100">
                  Chef's Advice & Substitutions:{" "}
                </span>
                {recipe.notes}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
export default TopRatedSearchCard;
