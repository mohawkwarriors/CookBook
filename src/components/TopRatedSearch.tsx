import TopRatedSearchCard from "./TopRatedSearchCard";
import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  Search, 
  Sparkles, 
  Star, 
  Clock, 
  Users, 
  Check, 
  X, 
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

interface TopRatedSearchProps {
  onSelectRecipe: (recipe: TopRatedRecipe) => void;
  onQuickSave: (recipe: TopRatedRecipe) => Promise<void>;
}

const listContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.04,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const AUTO_RECOMMENDATIONS: TopRatedRecipe[] = [
  {
    id: "auto-1",
    title: "Classic Smash Burger",
    description: "Crispy edged, juicy center smash burgers with a tangy special sauce.",
    cuisine: "American",
    mealType: "Main",
    cookingTime: 15,
    servings: 4,
    source: "Kenji's Food Lab",
    rating: "4.9",
    reviewCount: "2.5k",
    ingredients: [
      { name: "Ground Beef (80/20)", amount: 1, unit: "lb" },
      { name: "American Cheese", amount: 4, unit: "slices" },
      { name: "Hamburger Buns", amount: 4, unit: "" },
      { name: "Salt and Pepper", amount: 1, unit: "tsp" }
    ],
    instructions: [
      "Divide the beef into 4 equal, loose portions. Do not pack them tight.",
      "Preheat a cast iron skillet or griddle until very hot.",
      "Place beef loosely on skillet and smash down hard with a heavy spatula. Season generously.",
      "Cook for 2 minutes until deeply crusted, scrape, flip, add cheese, and cook for 1 more minute."
    ]
  },
  {
    id: "auto-2",
    title: "Crispy Roast Potatoes",
    description: "Glass-like crispy exterior with a fluffy interior, roasted with rosemary.",
    cuisine: "British",
    mealType: "Side",
    cookingTime: 60,
    servings: 6,
    source: "Serious Eats",
    rating: "5.0",
    reviewCount: "4.1k",
    ingredients: [
      { name: "Russet Potatoes", amount: 3, unit: "lbs" },
      { name: "Baking Soda", amount: 0.5, unit: "tsp" },
      { name: "Olive Oil or Duck Fat", amount: 0.25, unit: "cup" },
      { name: "Fresh Rosemary", amount: 2, unit: "sprigs" }
    ],
    instructions: [
      "Peel and chunk potatoes. Boil in salted water with baking soda until edges begin to soften (about 10 mins).",
      "Drain and aggressively toss in the pot to create a starchy paste on the exterior.",
      "Toss with fat, spread on a baking sheet, and roast at 450°F (230°C) for 45-50 mins, flipping once."
    ]
  },
  {
    id: "auto-3",
    title: "Authentic Carbonara",
    description: "The classic Roman pasta dish requiring only 4 main ingredients.",
    cuisine: "Italian",
    mealType: "Main",
    cookingTime: 20,
    servings: 2,
    source: "Traditional Roman",
    rating: "4.8",
    reviewCount: "1.2k",
    ingredients: [
      { name: "Spaghetti or Rigatoni", amount: 0.5, unit: "lb" },
      { name: "Guanciale", amount: 4, unit: "oz" },
      { name: "Pecorino Romano", amount: 1, unit: "cup" },
      { name: "Large Eggs (1 whole, 2 yolks)", amount: 3, unit: "" }
    ],
    instructions: [
      "Cut guanciale into strips and render in a cold pan until crispy. Save the fat.",
      "Whisk eggs and grated pecorino together into a thick paste with lots of black pepper.",
      "Cook pasta until al dente. Save 1/2 cup pasta water.",
      "Off the heat, quickly toss pasta in guanciale fat, then vigorously stir in egg/cheese mixture, adding pasta water to create a creamy emulsion."
    ]
  },
  {
    id: "auto-4",
    title: "Miso Glazed Salmon",
    description: "Sweet, savory, and flaky salmon ready in under 15 minutes.",
    cuisine: "Japanese",
    mealType: "Main",
    cookingTime: 15,
    servings: 2,
    source: "Chef's Table",
    rating: "4.7",
    reviewCount: "850",
    ingredients: [
      { name: "Salmon Fillets", amount: 2, unit: "" },
      { name: "White Miso Paste", amount: 2, unit: "tbsp" },
      { name: "Mirin", amount: 1, unit: "tbsp" },
      { name: "Soy Sauce", amount: 1, unit: "tsp" }
    ],
    instructions: [
      "Whisk together miso, mirin, and soy sauce to form a glaze.",
      "Brush the glaze over the salmon fillets and let marinate for 10 minutes if possible.",
      "Broil the salmon on high for 6-8 minutes until the glaze is caramelized and fish is cooked."
    ]
  },
  {
    id: "auto-5",
    title: "Classic Margherita Pizza",
    description: "Simple, fresh, and perfectly balanced Neapolitan style pizza.",
    cuisine: "Italian",
    mealType: "Main",
    cookingTime: 12,
    servings: 2,
    source: "Pizzeria Napoli",
    rating: "4.9",
    reviewCount: "5.5k",
    ingredients: [
      { name: "Pizza Dough", amount: 1, unit: "ball" },
      { name: "San Marzano Tomatoes (crushed)", amount: 0.5, unit: "cup" },
      { name: "Fresh Mozzarella", amount: 4, unit: "oz" },
      { name: "Fresh Basil", amount: 4, unit: "leaves" }
    ],
    instructions: [
      "Stretch the dough out thin on a floured surface.",
      "Spread a thin layer of crushed tomatoes, leaving a crust border.",
      "Tear the mozzarella into small pieces and distribute evenly.",
      "Bake in a blazing hot oven (500°F+) for 8-10 minutes. Top with fresh basil immediately after baking."
    ]
  },
  {
    id: "auto-6",
    title: "French Onion Soup",
    description: "Rich beef broth with caramelized onions and a gruyere cheese crust.",
    cuisine: "French",
    mealType: "Starter",
    cookingTime: 90,
    servings: 4,
    source: "Bistro Classic",
    rating: "4.8",
    reviewCount: "3.2k",
    ingredients: [
      { name: "Yellow Onions", amount: 5, unit: "large" },
      { name: "Beef Broth", amount: 6, unit: "cups" },
      { name: "Baguette Slices", amount: 4, unit: "" },
      { name: "Gruyere Cheese", amount: 1.5, unit: "cups" }
    ],
    instructions: [
      "Thinly slice all onions and cook over low heat with butter for 45-60 mins until deeply caramelized.",
      "Add beef broth, bring to a simmer, and cook for 20 more minutes.",
      "Ladle soup into oven-safe bowls, top with a toasted baguette slice and a mound of grated gruyere.",
      "Broil until the cheese is melted, bubbly, and browned."
    ]
  }
];

export default function TopRatedSearch({ onSelectRecipe, onQuickSave }: TopRatedSearchProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Start with 5 random items on mount
  const [recipes, setRecipes] = useState<TopRatedRecipe[]>(() => {
    return [...AUTO_RECOMMENDATIONS].sort(() => 0.5 - Math.random()).slice(0, 5);
  });
  
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedRecipeId, setExpandedRecipeId] = useState<string | null>(null);
  const [savingRecipeId, setSavingRecipeId] = useState<string | null>(null);
  const [savedSuccessId, setSavedSuccessId] = useState<string | null>(null);

  const handleSearch = async (searchQueryText?: string, isLoadMore = false) => {
    const textToSearch = (searchQueryText ?? query).trim();
    if (!textToSearch) {
      if (hasSearched) {
        setHasSearched(false);
        setRecipes([...AUTO_RECOMMENDATIONS].sort(() => 0.5 - Math.random()).slice(0, 5));
      }
      return;
    }

    if (searchQueryText) {
      setQuery(searchQueryText);
    }

    const currentOffset = isLoadMore ? recipes.length : 0;

    if (isLoadMore) {
      setIsLoadingMore(true);
    } else {
      setIsSearching(true);
      setExpandedRecipeId(null);
    }
    setError(null);
    setHasSearched(true);

    try {
      const res = await fetch("/api/search-top-recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: textToSearch, offset: currentOffset }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        let rawErr = errData.error || `Server responded with error ${res.status}`;
        if (typeof rawErr === "string" && rawErr.trim().startsWith("{")) {
          try {
            const parsed = JSON.parse(rawErr);
            rawErr = parsed.error?.message || parsed.message || rawErr;
          } catch {}
        }
        throw new Error(rawErr);
      }

      const data = await res.json();
      if (isLoadMore) {
        setRecipes(prev => [...prev, ...(data.recipes || [])]);
      } else {
        setRecipes(data.recipes || []);
      }
    } catch (err: any) {
      console.error("Top recipe search error:", err);
      let message = err.message || "Failed to search recipes. Please try again.";
      if (message.includes("503") || message.includes("high demand") || message.includes("UNAVAILABLE")) {
        message = "The recipe search service is temporarily experiencing high traffic. Please try again in a few moments.";
      } else if (message.includes("429") || message.includes("quota") || message.includes("RESOURCE_EXHAUSTED")) {
        message = "Temporary rate limit reached. Please wait a moment and try again.";
      }
      setError(message);
    } finally {
      setIsSearching(false);
      setIsLoadingMore(false);
    }
  };

  const handleQuickSave = async (recipe: TopRatedRecipe, overrideId?: string) => {
    const recipeId = overrideId || recipe.id || recipe.title;
    setSavingRecipeId(recipeId);
    try {
      await onQuickSave(recipe);
      setSavedSuccessId(recipeId);
      setTimeout(() => {
        setSavedSuccessId(null);
      }, 2500);
    } catch (err) {
      console.error("Quick save failed:", err);
    } finally {
      setSavingRecipeId(null);
    }
  };

  return (
    <div className="w-full max-w-3xl space-y-5">
      {/* Search Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSearch();
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            id="top-recipe-search-input"
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value === "") {
                setHasSearched(false);
                setRecipes([...AUTO_RECOMMENDATIONS].sort(() => 0.5 - Math.random()).slice(0, 3));
              }
            }}
            placeholder="Search top-rated dishes (e.g. Smash Burger, Risotto)..."
            disabled={isSearching}
            className="w-full h-11 pl-11 pr-10 bg-card text-foreground border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-ring/20 text-sm placeholder:text-muted-foreground"
          />
          {query && !isSearching && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setHasSearched(false);
                setRecipes([...AUTO_RECOMMENDATIONS].sort(() => 0.5 - Math.random()).slice(0, 3));
              }}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-1"
              aria-label="Clear query"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          id="find-top-recipes-btn"
          type="submit"
          disabled={isSearching || !query.trim()}
          className="h-11 px-5 bg-foreground text-background rounded-full hover:opacity-85 transition-opacity flex items-center justify-center gap-2 text-sm font-medium disabled:opacity-40 shrink-0 cursor-pointer"
          aria-label="Search recipes"
        >
          {isSearching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">Search</span>
            </>
          )}
        </button>
      </form>

      {/* Loading State */}
      {isSearching && (
        <div className="py-12 text-center rounded-2xl bg-secondary/40 border border-border space-y-2 px-4">
          <Loader2 className="w-5 h-5 animate-spin text-foreground mx-auto" />
          <p className="text-sm font-medium text-foreground">
            Curating top-rated recipes...
          </p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Comparing archives from NYT Cooking, Serious Eats, America&apos;s Test Kitchen, and top chefs.
          </p>
        </div>
      )}

      {/* Error Message */}
      {error && !isSearching && (
        <div className="p-4 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-xs rounded-2xl border border-red-200 dark:border-red-900/50 flex items-center justify-between gap-3">
          <span>{error}</span>
          <button
            onClick={() => handleSearch()}
            className="text-xs font-semibold underline hover:no-underline cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Results List */}
      {!isSearching && recipes.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="font-medium text-foreground truncate pr-2">
              {hasSearched ? `Results for "${query}"` : "Curated Recommendations"}
            </span>
            <span className="shrink-0">Ranked by rating</span>
          </div>

          <motion.div
            key={`results-${query}-${hasSearched ? "searched" : "auto"}-${recipes.length}`}
            variants={listContainerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            {recipes.map((recipe, index) => {
              const recipeId = recipe.id || String(index + 1);
              const isExpanded = expandedRecipeId === recipeId;
              const isSavingThis = savingRecipeId === recipeId;
              const isSavedThis = savedSuccessId === recipeId;

              return (
                <motion.div key={recipeId} variants={cardVariants}>
                  <TopRatedSearchCard
                    recipe={recipe}
                    index={index}
                    isExpanded={isExpanded}
                    isSavingThis={isSavingThis}
                    isSavedThis={isSavedThis}
                    onExpand={() => setExpandedRecipeId(isExpanded ? null : recipeId)}
                    onSelect={() => onSelectRecipe(recipe)}
                    onQuickSave={() => handleQuickSave(recipe, recipeId)}
                  />
                </motion.div>
              );
            })}
          </motion.div>

          {hasSearched && recipes.length > 0 && !error && (
            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={() => handleSearch(undefined, true)}
                disabled={isLoadingMore}
                className="h-10 px-6 rounded-full border border-border bg-card hover:bg-secondary text-xs font-medium text-foreground transition-colors flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Loading more...</span>
                  </>
                ) : (
                  <span>Show more</span>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* No Results State */}
      {!isSearching && hasSearched && recipes.length === 0 && !error && (
        <div className="text-center py-10 bg-secondary/40 rounded-2xl border border-border p-6">
          <p className="text-sm font-medium text-foreground">
            No recipes found for &ldquo;{query}&rdquo;
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Try a simpler dish keyword like &ldquo;Roast Potatoes&rdquo; or &ldquo;Smash Burger&rdquo;.
          </p>
        </div>
      )}
    </div>
  );
}
