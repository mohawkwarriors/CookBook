import React from "react";
import { motion } from "motion/react";
import { Clock } from "lucide-react";
import { Recipe } from "../types";
import RecipeIcon from "./RecipeIcon";
import { formatTime } from "../lib/utils";

interface RecipeCardProps {
  key?: string | number;
  recipe: Recipe;
  onView: (recipe: Recipe) => void;
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

export default function RecipeCard({ recipe, onView }: RecipeCardProps) {
  const hasImage = !!recipe.imageUrl;

  return (
    <motion.div
      onClick={() => onView(recipe)}
      whileHover={{ y: -3, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }}
      whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
      className="group cursor-pointer flex flex-row items-center bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 rounded-xl hover:shadow-md hover:border-neutral-200 dark:hover:border-neutral-600 transition-all overflow-hidden h-full p-2 gap-3 select-none"
    >
      {/* Recipe Cover Thumbnail */}
      <div className={`w-[68px] h-[68px] sm:w-[76px] sm:h-[76px] shrink-0 overflow-hidden rounded-lg relative ${hasImage ? 'bg-neutral-100 dark:bg-neutral-800' : 'bg-neutral-50 dark:bg-neutral-800/50'}`}>
        {hasImage ? (
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500 ease-out"
          />
        ) : (
          <RecipeIcon recipe={recipe} className="w-full h-full group-hover:scale-108 transition-transform duration-500 ease-out" />
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 py-1 pr-2 min-w-0">
        <h3 className="font-sans font-semibold text-sm sm:text-base text-neutral-900 dark:text-neutral-50 line-clamp-2 transition-colors group-hover:text-accent-600 dark:group-hover:text-accent-400">
          {recipe.title}
        </h3>
        
        <div className="mt-1.5 flex items-center flex-wrap gap-x-2 gap-y-1.5 text-[11px] text-neutral-500 dark:text-neutral-400">
          <span className="flex items-center gap-1 font-medium whitespace-nowrap">
            <Clock className="w-3 h-3" />
            {formatTime(recipe.cookingTime)}
          </span>
          <span className="text-neutral-300 dark:text-neutral-600 hidden sm:inline">•</span>
          <span className="font-medium whitespace-nowrap truncate max-w-[100px] sm:max-w-none">
            {recipe.cuisine}
          </span>
          {recipe.mealType && (
            <>
              <span className="text-neutral-300 dark:text-neutral-600 hidden sm:inline">•</span>
              <span className={`text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-md shrink-0 ${getMealTypeColor(recipe.mealType)}`}>
                {recipe.mealType}
              </span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
