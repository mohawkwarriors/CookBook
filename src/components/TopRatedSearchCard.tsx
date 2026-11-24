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
  Globe,
} from "lucide-react";
import { TopRatedRecipe } from "../types";
import { formatTime, getMealTypeColor } from "../lib/utils";

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
  onQuickSave,
}) => {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 transition-colors hover:border-foreground/20">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-full bg-foreground text-background">
              #{index + 1}
            </span>

            {recipe.source && (
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-secondary text-foreground truncate max-w-[200px] sm:max-w-none">
                {recipe.source}
              </span>
            )}

            {recipe.rating && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground tabular-nums">
                <Star className="w-3 h-3 fill-foreground text-foreground" />
                <span className="text-foreground font-semibold">{recipe.rating}</span>
                {recipe.reviewCount && <span>({recipe.reviewCount})</span>}
              </span>
            )}
          </div>

          <h3 className="text-base font-semibold text-foreground tracking-tight leading-snug">
            {recipe.title}
          </h3>
          {recipe.description && (
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
              {recipe.description}
            </p>
          )}
        </div>

        {/* Desktop Actions */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onQuickSave}
            disabled={isSavingThis || isSavedThis}
            className={`h-9 px-3.5 text-xs font-medium rounded-full border transition-colors flex items-center gap-1.5 cursor-pointer ${
              isSavedThis
                ? "bg-primary/15 border-primary/40 text-foreground"
                : "border-border text-foreground hover:bg-secondary"
            }`}
          >
            {isSavingThis ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isSavedThis ? (
              <>
                <Check className="w-3.5 h-3.5 text-primary-dark" strokeWidth={2.5} />
                <span>Saved</span>
              </>
            ) : (
              <>
                <BookmarkPlus className="w-3.5 h-3.5" />
                <span>Quick Save</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onSelect}
            className="h-9 px-4 text-xs font-medium bg-foreground text-background rounded-full hover:opacity-85 transition-opacity flex items-center gap-1.5 cursor-pointer"
          >
            <span>Customize</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Meta Strip */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3 text-xs text-muted-foreground">
        {recipe.mealType && (
          <span
            className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full shrink-0 ${getMealTypeColor(
              recipe.mealType
            )}`}
          >
            {recipe.mealType}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5" />
          {recipe.cuisine}
        </span>
        {recipe.cookingTime && (
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <Clock className="w-3.5 h-3.5" />
            {formatTime(recipe.cookingTime)}
          </span>
        )}
        {recipe.servings && (
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <Users className="w-3.5 h-3.5" />
            {recipe.servings} servings
          </span>
        )}
        {recipe.nutrition?.calories && (
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Flame className="w-3.5 h-3.5" />
            {recipe.nutrition.calories} kcal
          </span>
        )}
      </div>

      {recipe.keyTechnique && (
        <div className="mt-3 p-3.5 bg-secondary/60 border border-border rounded-xl">
          <div className="flex items-center gap-1.5 text-foreground font-semibold text-[11px] uppercase tracking-wider">
            <Lightbulb className="w-3.5 h-3.5 text-primary-dark shrink-0" />
            <span>Key Technique</span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-1">
            {recipe.keyTechnique}
          </p>
        </div>
      )}

      {/* Mobile Actions */}
      <div className="grid grid-cols-2 gap-2 mt-3.5 pt-3.5 border-t border-border sm:hidden">
        <button
          type="button"
          onClick={onQuickSave}
          disabled={isSavingThis || isSavedThis}
          className={`h-9 text-xs font-medium rounded-full border flex items-center justify-center gap-1.5 cursor-pointer ${
            isSavedThis
              ? "bg-primary/15 border-primary/40 text-foreground"
              : "border-border text-foreground hover:bg-secondary"
          }`}
        >
          {isSavingThis ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : isSavedThis ? (
            <>
              <Check className="w-3.5 h-3.5 text-primary-dark" />
              <span>Saved</span>
            </>
          ) : (
            <>
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span>Save</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onSelect}
          className="h-9 text-xs font-medium bg-foreground text-background rounded-full flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <span>Customize</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Preview Accordion */}
      <div className="mt-3 pt-2.5 border-t border-border/70">
        <button
          type="button"
          onClick={onExpand}
          className="w-full flex items-center justify-between py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-1.5 truncate">
            <Utensils className="w-3.5 h-3.5 shrink-0" />
            <span>
              Ingredients ({recipe.ingredients?.length || 0}) &amp; Steps ({recipe.instructions?.length || 0})
            </span>
          </span>
          <span className="flex items-center gap-1 shrink-0 ml-2">
            <span>{isExpanded ? "Hide" : "Preview"}</span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
          </span>
        </button>

        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-border/70 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="bg-secondary/50 p-3.5 rounded-xl border border-border/60">
              <div className="flex items-center gap-1.5 font-semibold text-foreground mb-2 pb-1.5 border-b border-border/60">
                <Utensils className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Ingredients</span>
              </div>
              <ul className="divide-y divide-border/50">
                {recipe.ingredients?.map((ing, i) => (
                  <li key={i} className="flex items-baseline justify-between py-1.5 gap-2">
                    <span className="text-foreground">{ing.name}</span>
                    {(ing.amount || ing.unit) && (
                      <span className="font-mono text-muted-foreground shrink-0 tabular-nums">
                        {ing.amount ? `${ing.amount} ` : ""}
                        {ing.unit || ""}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-secondary/50 p-3.5 rounded-xl border border-border/60">
              <div className="flex items-center gap-1.5 font-semibold text-foreground mb-2 pb-1.5 border-b border-border/60">
                <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Method</span>
              </div>
              <ol className="space-y-2">
                {recipe.instructions?.map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5 leading-relaxed text-muted-foreground">
                    <span className="w-5 h-5 rounded-full bg-foreground text-background font-semibold text-[10px] flex items-center justify-center shrink-0 mt-0.5 tabular-nums">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-foreground/90">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopRatedSearchCard;
