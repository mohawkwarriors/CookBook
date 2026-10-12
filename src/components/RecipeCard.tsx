import React from "react";
import { motion } from "motion/react";
import { Clock, Plus } from "lucide-react";
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
      whileHover={{ y: -4, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } }}
      whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
      className="group cursor-pointer flex flex-col bg-white dark:bg-neutral-900 border border-neutral-100/50 dark:border-neutral-800/50 rounded-2xl hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] hover:border-neutral-200 dark:hover:border-neutral-700 transition-all duration-500 overflow-hidden h-full select-none"
    >
      {/* Recipe Cover Thumbnail */}
      <div className={`aspect-[16/10] w-full overflow-hidden relative ${hasImage ? 'bg-neutral-100 dark:bg-neutral-800' : 'bg-neutral-50 dark:bg-neutral-800/50'}`}>
        {hasImage ? (
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
             <RecipeIcon recipe={recipe} className="w-16 h-16 opacity-20 group-hover:scale-110 transition-transform duration-700 ease-out" />
          </div>
        )}
        
        {/* Overlays for premium feel */}
        <div className="absolute inset-0 bg-linear-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        {recipe.mealType && (
          <div className="absolute top-3 left-3">
             <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-lg backdrop-blur-md shadow-sm ${getMealTypeColor(recipe.mealType)}`}>
               {recipe.mealType}
             </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5 space-y-3">
        <div className="space-y-1">
          <h3 className="font-editorial text-xl sm:text-2xl text-neutral-900 dark:text-neutral-50 leading-tight transition-colors group-hover:text-accent-600 dark:group-hover:text-accent-400">
            {recipe.title}
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed">
            {recipe.description}
          </p>
        </div>
        
        <div className="mt-auto pt-3 flex items-center justify-between border-t border-neutral-50 dark:border-neutral-800/50">
          <div className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {formatTime(recipe.cookingTime)}
            </span>
            <span className="w-1 h-1 rounded-full bg-neutral-200 dark:bg-neutral-800" />
            <span>{recipe.cuisine}</span>
          </div>
          
          <div className="w-8 h-8 rounded-full border border-neutral-100 dark:border-neutral-800 flex items-center justify-center group-hover:bg-accent-500 group-hover:border-accent-500 transition-all duration-300">
             <Plus className="w-4 h-4 text-neutral-400 group-hover:text-white transition-colors" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
