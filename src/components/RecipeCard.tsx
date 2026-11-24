import React from "react";
import { motion } from "motion/react";
import { Clock, ChevronRight, Bookmark } from "lucide-react";
import { Recipe } from "../types";
import RecipeIcon from "./RecipeIcon";
import { formatTime, getMealTypeColor } from "../lib/utils";

interface RecipeCardProps {
  key?: string | number;
  recipe: Recipe;
  onView: (recipe: Recipe) => void;
  viewMode?: "grid" | "list";
  isBookmarked?: boolean;
  onBookmark?: (recipe: Recipe) => void;
}

export default function RecipeCard({
  recipe,
  onView,
  viewMode = "grid",
  isBookmarked = false,
  onBookmark,
}: RecipeCardProps) {
  const hasImage = !!recipe.imageUrl;

  if (viewMode === "list") {
    return (
      <motion.div
        onClick={() => onView(recipe)}
        whileTap={{ scale: 0.992 }}
        className="group cursor-pointer flex items-center gap-3.5 p-2.5 rounded-xl border border-border/80 bg-card hover:bg-secondary/60 hover:border-foreground/15 transition-all select-none"
      >
        <div className="w-14 h-14 shrink-0 overflow-hidden rounded-lg bg-muted relative">
          {hasImage ? (
            <img
              src={recipe.imageUrl}
              alt={recipe.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ease-out"
            />
          ) : (
            <RecipeIcon recipe={recipe} variant="compact" className="w-full h-full" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-foreground truncate group-hover:underline underline-offset-2 decoration-foreground/30">
            {recipe.title}
          </h3>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            {recipe.mealType && (
              <span
                className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full shrink-0 ${getMealTypeColor(
                  recipe.mealType
                )}`}
              >
                {recipe.mealType}
              </span>
            )}
            <span className="truncate">{recipe.cuisine}</span>
            <span className="opacity-40">·</span>
            <span className="inline-flex items-center gap-1 tabular-nums shrink-0">
              <Clock className="w-3 h-3" />
              {formatTime(recipe.cookingTime)}
            </span>
          </div>
        </div>

        {onBookmark && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onBookmark(recipe);
            }}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
              isBookmarked
                ? "text-foreground bg-secondary"
                : "text-muted-foreground/60 hover:text-foreground hover:bg-secondary"
            }`}
            title={isBookmarked ? "Saved in collection" : "Save to collection"}
            aria-label={isBookmarked ? "Manage collections for this recipe" : "Save to collection"}
          >
            <Bookmark
              className={`w-4 h-4 ${isBookmarked ? "fill-foreground text-foreground" : ""}`}
            />
          </button>
        )}

        <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0 mr-1" />
      </motion.div>
    );
  }

  return (
    <motion.article
      onClick={() => onView(recipe)}
      whileTap={{ scale: 0.985, transition: { duration: 0.1 } }}
      className="group cursor-pointer flex flex-col select-none h-full"
    >
      {/* Cook Well 4:5 Portrait Cover Frame */}
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-muted border border-border/50">
        {hasImage ? (
          <>
            <img
              src={recipe.imageUrl}
              alt={recipe.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-[1.03]"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/35 via-black/10 to-transparent opacity-80" />
          </>
        ) : (
          <RecipeIcon
            recipe={recipe}
            variant="cover"
            className="w-full h-full transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          />
        )}

        {/* Top-Right Bookmark Action */}
        {onBookmark && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onBookmark(recipe);
            }}
            className={`absolute top-2.5 right-2.5 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md transition-all cursor-pointer active:scale-90 ${
              isBookmarked
                ? "bg-foreground text-background shadow-sm opacity-100"
                : hasImage
                ? "bg-black/45 text-white hover:bg-black/70 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                : "bg-background/85 text-foreground/70 hover:text-foreground border border-border/60 shadow-[0_1px_2px_rgba(0,0,0,0.04)] opacity-90 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
            }`}
            title={isBookmarked ? "Saved in collection" : "Save to collection"}
            aria-label={isBookmarked ? "Manage collections for this recipe" : "Save to collection"}
          >
            <Bookmark
              className={`w-3.5 h-3.5 ${isBookmarked ? "fill-primary text-primary" : ""}`}
            />
          </button>
        )}

        {/* Minimal Frosted Time Pill */}
        {recipe.cookingTime > 0 && (
          <div
            className={`absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium tabular-nums backdrop-blur-md ${
              hasImage
                ? "bg-black/55 text-white"
                : "bg-background/85 text-foreground border border-border/60 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
            }`}
          >
            <Clock className="w-3 h-3 opacity-80" />
            <span>{formatTime(recipe.cookingTime)}</span>
          </div>
        )}
      </div>

      {/* Borderless Editorial Text + Food Category Color Tag */}
      <div className="flex flex-col gap-1.5 pt-2.5 px-0.5">
        <h3 className="text-[14px] sm:text-[15px] font-medium text-foreground leading-snug line-clamp-2 group-hover:underline decoration-foreground/30 underline-offset-2">
          {recipe.title}
        </h3>
        <div className="flex items-center flex-wrap gap-1.5 text-xs text-muted-foreground">
          {recipe.mealType && (
            <span
              className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full shrink-0 ${getMealTypeColor(
                recipe.mealType
              )}`}
            >
              {recipe.mealType}
            </span>
          )}
          {recipe.cuisine && (
            <span className="truncate text-xs text-muted-foreground">
              {recipe.cuisine}
            </span>
          )}
        </div>
      </div>
    </motion.article>
  );
}
