export interface Ingredient {
  name: string;
  amount: number;
  unit: string;
}

export interface Recipe {
  id?: string;
  title: string;
  description: string;
  cuisine: string; // e.g. "Italian", "Mexican", "Asian", "American", "Indian", "Mediterranean", "Other"
  mealType?: "Starter" | "Main" | "Side" | "Drink" | "Dessert" | "Snack";
  cookingTime: number; // in minutes
  servings: number;
  ingredients: Ingredient[];
  instructions: string[];
  imageUrl?: string;
  sourceUrl?: string;
  notes?: string;
  nutrition?: {
    calories: number;
    protein: number; // in grams
    carbs: number; // in grams
    fat: number; // in grams
  };
  createdAt?: string;
}

export interface TopRatedRecipe extends Recipe {
  source?: string;
  rating?: number | string;
  reviewCount?: string;
  keyTechnique?: string;
  whyChosen?: string;
}

export interface MealPlanEntry {
  id?: string;
  date: string; // "YYYY-MM-DD"
  mealType: "Breakfast" | "Lunch" | "Dinner" | "Snack";
  recipeId: string;
  recipeTitle: string;
  servings: number;
}

export interface RecipeFilters {
  searchQuery: string;
  cuisine: string;
  mealType: string;
  maxCookingTime: number;
}
