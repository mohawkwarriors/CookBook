import React, { useState, useEffect } from "react";
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy 
} from "firebase/firestore";
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from "firebase/auth";
import { db, auth } from "./lib/firebase";
import { Recipe, MealPlanEntry, RecipeFilters } from "./types";
import RecipeCard from "./components/RecipeCard";
import RecipeModal from "./components/RecipeModal";
import RecipeFormModal from "./components/RecipeFormModal";
import MealPlanner from "./components/MealPlanner";
import RecipeBuilderGame from "./components/RecipeBuilderGame";
import { 
  BookOpen, 
  Plus, 
  Search, 
  Filter,
  Sparkles, 
  UtensilsCrossed, 
  ChefHat, 
  Clock, 
  Calendar,
  X,
  Wand2,
  Moon,
  Sun
} from "lucide-react";

const INITIAL_FILTERS: RecipeFilters = {
  searchQuery: "",
  cuisine: "All",
  mealType: "All",
  maxCookingTime: 9999, // default to effectively no limit
};

const getMealTypeColor = (type: string | undefined, selected: boolean) => {
  if (!selected) return "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-transparent";
  switch (type) {
    case "Starter": return "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 border border-red-200 dark:border-red-800";
    case "Main": return "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400 border border-blue-200 dark:border-blue-800";
    case "Side": return "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 border border-green-200 dark:border-green-800";
    case "Drink": return "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400 border border-orange-200 dark:border-orange-800";
    case "Dessert": return "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-400 border border-purple-200 dark:border-purple-800";
    case "Snack": return "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800";
    default: return "border border-neutral-200 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400";
  }
};

const CUISINES = [
  "All", "Italian", "Mexican", "Asian", "American", "Indian", "Mediterranean", 
  "French", "Middle Eastern", "Japanese", "Thai", "Caribbean", "Other"
];

const PRESET_RECIPES: Recipe[] = [
  {
    id: "preset-1",
    title: "Saffron Lemon Garlic Butter Shrimp",
    description: "An incredibly quick, rich, pan-seared shrimp infused with fragrant saffron threads, fresh garlic cloves, and zesty lemon butter sauce.",
    cuisine: "Mediterranean",
    mealType: "Main",
    cookingTime: 15,
    servings: 2,
    imageUrl: "",
    ingredients: [
      { name: "Shrimp (peeled & deveined)", amount: 1, unit: "lb" },
      { name: "Butter", amount: 4, unit: "tbsp" },
      { name: "Garlic (minced)", amount: 4, unit: "cloves" },
      { name: "Lemon juice", amount: 2, unit: "tbsp" },
      { name: "Saffron threads", amount: 0.25, unit: "tsp" },
      { name: "Fresh Parsley (chopped)", amount: 2, unit: "tbsp" }
    ],
    instructions: [
      "In a small bowl, bloom the saffron threads in lemon juice for 5 minutes.",
      "Melt butter in a large skillet over medium-high heat. Add minced garlic and sauté for 1 minute until fragrant.",
      "Add shrimp to the skillet and sear for 2 minutes on one side.",
      "Flip the shrimp, then pour in the saffron-lemon juice mixture. Sauté for another 2 minutes until shrimp are pink and cooked through.",
      "Garnish with fresh parsley and serve warm."
    ],
    notes: "Serve with zucchini noodles or cauliflower rice to keep it strictly Keto!"
  },
  {
    id: "preset-2",
    title: "Spicy Creamy Vodka Pasta",
    description: "Rich tomato and cream reduction sautéed with shallots and finished with red pepper flakes and grated Parmesan cheese.",
    cuisine: "Italian",
    mealType: "Main",
    cookingTime: 25,
    servings: 4,
    imageUrl: "",
    ingredients: [
      { name: "Penne Pasta", amount: 1, unit: "lb" },
      { name: "Olive oil", amount: 2, unit: "tbsp" },
      { name: "Shallot (minced)", amount: 1, unit: "piece" },
      { name: "Tomato paste", amount: 0.5, unit: "cup" },
      { name: "Vodka", amount: 2, unit: "tbsp" },
      { name: "Heavy whipping cream", amount: 0.75, unit: "cup" },
      { name: "Red pepper flakes", amount: 1, unit: "tsp" },
      { name: "Parmesan cheese (grated)", amount: 0.5, unit: "cup" }
    ],
    instructions: [
      "Boil penne pasta in heavily salted water according to package directions. Save 1 cup of pasta water before draining.",
      "In a deep saucepan, heat olive oil over medium. Cook minced shallots until translucent (3 mins).",
      "Stir in tomato paste and red pepper flakes. Cook for 5 minutes, stirring constantly, until the paste turns a deep caramel color.",
      "Add vodka and stir to deglaze the pan. Let simmer for 2 minutes until the alcohol smell evaporates.",
      "Turn heat to low, stir in heavy cream until a rich orange sauce forms.",
      "Add cooked pasta, half of the parmesan, and a splash of pasta water. Toss vigorously to emulsify the sauce. Top with remaining parmesan."
    ],
    notes: "You can substitute vodka with vegetable broth and lemon squeeze for an alcohol-free version."
  }
];

export default function App() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [mealPlan, setMealPlan] = useState<MealPlanEntry[]>([]);
  const [filters, setFilters] = useState<RecipeFilters>(INITIAL_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [currentTab, setCurrentTab] = useState<"recipes" | "mealPlan" | "builder" | "addRecipe">("recipes");

  // Loading & Fallback states
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [loadingMeals, setLoadingMeals] = useState(true);
  const [isUsingLocalStorage, setIsUsingLocalStorage] = useState(false);

  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("cookbook_theme");
      if (saved !== null) {
        return saved === "dark";
      }
      return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      if (isDarkMode) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("cookbook_theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("cookbook_theme", "light");
      }
    } catch {
      // ignore localStorage write errors
    }
  }, [isDarkMode]);

  // Modals
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);

  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        const uIsAdmin = ["saahiressa@gmail.com", "yasmeenb518@gmail.com"].includes(u.email?.toLowerCase() || "");
        if (!uIsAdmin) {
          signOut(auth).catch(console.error);
          setAuthError("Unauthorized user. You do not have permission to access this application.");
          setUser(null);
        } else {
          setUser(u);
          setAuthError(null);
        }
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const isAdmin = user && ["saahiressa@gmail.com", "yasmeenb518@gmail.com"].includes(user.email?.toLowerCase() || "");

  const handleHiddenLogin = () => {
    setAuthError(null);
    if (user) {
      signOut(auth).catch(err => console.error("Sign out failed:", err));
    } else {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      signInWithPopup(auth, provider).catch((error) => {
        if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
          console.error("Login failed:", error);
        }
      });
    }
  };

  // Local Storage loaders (Fallback)
  const loadRecipesFromLocalStorage = () => {
    setIsUsingLocalStorage(true);
    const stored = localStorage.getItem("zest_recipes");
    if (stored) {
      let parsed = JSON.parse(stored) as Recipe[];
      // Strip out AI generated images so we fall back to icons
      let updated = false;
      parsed = parsed.map(r => {
          if (r.imageUrl && (r.imageUrl.includes("pollinations.ai") || r.imageUrl.includes("unsplash.com") || r.imageUrl.includes("loremflickr.com") || r.imageUrl.includes("picsum.photos"))) {
              updated = true;
              return { ...r, imageUrl: "" };
          }
          return r;
      });
      if (updated) localStorage.setItem("zest_recipes", JSON.stringify(parsed));
      setRecipes(parsed);
    } else {
      setRecipes(PRESET_RECIPES);
      localStorage.setItem("zest_recipes", JSON.stringify(PRESET_RECIPES));
    }
    setLoadingRecipes(false);
  };

  const loadMealsFromLocalStorage = () => {
    const stored = localStorage.getItem("zest_meals");
    if (stored) {
      setMealPlan(JSON.parse(stored));
    } else {
      setMealPlan([]);
    }
    setLoadingMeals(false);
  };

  // Sync to Firestore with LocalStorage Fallback
  useEffect(() => {
    let unsubscribeRecipes = () => {};
    let unsubscribeMealPlan = () => {};

    try {
      const qRecipes = query(collection(db, "recipes"), orderBy("createdAt", "desc"));
      unsubscribeRecipes = onSnapshot(
        qRecipes,
        (snapshot) => {
          const list: Recipe[] = [];
          snapshot.forEach((doc) => {
            list.push({ id: doc.id, ...doc.data() } as Recipe);
          });
          
          if (list.length === 0) {
            // Seed presets to Firestore if empty so the database looks gorgeous immediately!
            PRESET_RECIPES.forEach(async (p) => {
              const { id, ...cleanPreset } = p;
              await addDoc(collection(db, "recipes"), {
                ...cleanPreset,
                createdAt: new Date().toISOString(),
              });
            });
          } else {
            // Strip out AI generated images so we fall back to icons
            list.forEach(async (r) => {
              if (r.imageUrl && (r.imageUrl.includes("pollinations.ai") || r.imageUrl.includes("unsplash.com") || r.imageUrl.includes("loremflickr.com") || r.imageUrl.includes("picsum.photos"))) {
                r.imageUrl = ""; // Mutate locally
                try {
                  await updateDoc(doc(db, "recipes", r.id!), { imageUrl: "" });
                } catch (e) {
                  console.error("Failed to clear image for", r.title);
                }
              }
            });
            setRecipes(list);
            setLoadingRecipes(false);
            setIsUsingLocalStorage(false);
          }
        },
        (error) => {
          console.warn("Firestore recipes listener failed, using local storage:", error);
          loadRecipesFromLocalStorage();
        }
      );

      const qMeals = query(collection(db, "mealPlan"), orderBy("date", "asc"));
      unsubscribeMealPlan = onSnapshot(
        qMeals,
        (snapshot) => {
          const list: MealPlanEntry[] = [];
          snapshot.forEach((doc) => {
            list.push({ id: doc.id, ...doc.data() } as MealPlanEntry);
          });
          setMealPlan(list);
          setLoadingMeals(false);
        },
        (error) => {
          console.warn("Firestore mealPlan listener failed, using local storage:", error);
          loadMealsFromLocalStorage();
        }
      );
    } catch (err) {
      console.error("Firebase connections failed, defaulting to local storage.", err);
      loadRecipesFromLocalStorage();
      loadMealsFromLocalStorage();
    }

    return () => {
      unsubscribeRecipes();
      unsubscribeMealPlan();
    };
  }, []);

  // Save Recipe Action
  const handleSaveRecipe = async (recipeData: Omit<Recipe, "id" | "createdAt">) => {
    if (isUsingLocalStorage) {
      let updatedRecipes = [...recipes];
      if (editingRecipe && editingRecipe.id) {
        updatedRecipes = recipes.map((r) =>
          r.id === editingRecipe.id ? { ...recipeData, id: editingRecipe.id, createdAt: editingRecipe.createdAt } : r
        );
      } else {
        const newRecipe = {
          ...recipeData,
          id: `local-${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        updatedRecipes.unshift(newRecipe);
      }
      setRecipes(updatedRecipes);
      localStorage.setItem("zest_recipes", JSON.stringify(updatedRecipes));
    } else {
      // Cloud Firestore
      if (editingRecipe && editingRecipe.id) {
        const docRef = doc(db, "recipes", editingRecipe.id);
        await updateDoc(docRef, { ...recipeData });
      } else {
        await addDoc(collection(db, "recipes"), {
          ...recipeData,
          createdAt: new Date().toISOString(),
        });
      }
    }
    setEditingRecipe(null);
  };

  // Delete Recipe Action
  const handleDeleteRecipe = async (id: string) => {
    if (isUsingLocalStorage) {
      const updated = recipes.filter((r) => r.id !== id);
      setRecipes(updated);
      localStorage.setItem("zest_recipes", JSON.stringify(updated));
      // Remove any plan linked to it too
      const updatedMeals = mealPlan.filter((m) => m.recipeId !== id);
      setMealPlan(updatedMeals);
      localStorage.setItem("zest_meals", JSON.stringify(updatedMeals));
    } else {
      // Cloud Firestore
      await deleteDoc(doc(db, "recipes", id));
      // Clean up linked meals from database
      const linkedMeals = mealPlan.filter((m) => m.recipeId === id);
      for (const meal of linkedMeals) {
        if (meal.id) {
          await deleteDoc(doc(db, "mealPlan", meal.id));
        }
      }
    }
  };

  // Add Meal to Calendar Action
  const handleAddToCalendar = async (entryData: Omit<MealPlanEntry, "id">) => {
    if (isUsingLocalStorage) {
      const newEntry: MealPlanEntry = {
        ...entryData,
        id: `meal-${Date.now()}`,
      };
      const updated = [...mealPlan, newEntry];
      setMealPlan(updated);
      localStorage.setItem("zest_meals", JSON.stringify(updated));
    } else {
      // Cloud Firestore
      await addDoc(collection(db, "mealPlan"), entryData);
    }
  };

  // Remove Meal from Calendar Action
  const handleRemoveMeal = async (id: string) => {
    if (isUsingLocalStorage) {
      const updated = mealPlan.filter((m) => m.id !== id);
      setMealPlan(updated);
      localStorage.setItem("zest_meals", JSON.stringify(updated));
    } else {
      // Cloud Firestore
      await deleteDoc(doc(db, "mealPlan", id));
    }
  };

  const handleEditTrigger = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setIsDetailOpen(false);
    setCurrentTab("addRecipe");
  };

  const handleViewRecipeFromCalendar = (recipeId: string) => {
    const found = recipes.find((r) => r.id === recipeId);
    if (found) {
      setActiveRecipe(found);
      setIsDetailOpen(true);
    } else {
      console.warn("Recipe details could not be found. It might have been deleted.");
    }
  };

  // Filter Logic
  const filteredRecipes = recipes.filter((recipe) => {
    const matchesSearch = 
      recipe.title.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
      recipe.description?.toLowerCase().includes(filters.searchQuery.toLowerCase()) ||
      recipe.ingredients.some((i) => i.name.toLowerCase().includes(filters.searchQuery.toLowerCase()));

    const matchesCuisine = filters.cuisine === "All" || recipe.cuisine === filters.cuisine;
    const matchesMealType = filters.mealType === "All" || recipe.mealType === filters.mealType;

    const matchesTime = recipe.cookingTime <= filters.maxCookingTime;

    return matchesSearch && matchesCuisine && matchesMealType && matchesTime;
  });

  return (
    <div className="min-h-screen bg-[#FDFBF7] dark:bg-neutral-800 flex flex-col font-sans transition-colors duration-300">
      
      {/* Simple Clean Header */}
      <header className="border-b border-neutral-100 dark:border-neutral-700 bg-[#FDFBF7] dark:bg-neutral-800 sticky top-0 z-10 transition-colors duration-300">
        {authError && (
          <div className="w-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-4 py-2 text-sm text-center font-medium border-b border-red-200 dark:border-red-800 flex items-center justify-between">
            <span>{authError}</span>
            <button onClick={() => setAuthError(null)} className="p-1 hover:bg-red-200 dark:hover:bg-red-800/50 rounded-full cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-1.5 cursor-pointer"
            onDoubleClick={handleHiddenLogin}
          >
            <UtensilsCrossed className="w-5 h-5 text-neutral-900 dark:text-neutral-50" />
            <h1 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-50">Cookbook</h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white transition-colors rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 shrink-0"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Desktop Navigation */}
            <div className="hidden sm:flex items-center gap-4">
              {isAdmin && (
                <button
                  onClick={() => setCurrentTab(currentTab === "recipes" ? "mealPlan" : "recipes")}
                  className="text-sm font-medium text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-700 hover:text-neutral-900 dark:hover:text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                >
                {currentTab === "recipes" || currentTab === "builder" ? (
                  <>
                    <Calendar className="w-4 h-4" />
                    Meal Plan
                  </>
                ) : (
                  <>
                    <BookOpen className="w-4 h-4" />
                    Recipes
                  </>
                )}
                </button>
              )}

            {isAdmin && (
              <button
                onClick={() => setCurrentTab("builder")}
                className="text-sm font-medium text-accent-500 dark:text-accent-400 bg-accent-50 dark:bg-accent-500/10 hover:bg-accent-100 dark:hover:bg-accent-500/20 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Wand2 className="w-4 h-4" />
                I'm Feeling Lucky
              </button>
            )}

            {isAdmin && currentTab !== "addRecipe" && (
              <button
                onClick={() => {
                  setEditingRecipe(null);
                  setCurrentTab("addRecipe");
                }}
                className="text-sm font-medium text-white bg-neutral-900 dark:bg-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-neutral-200 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Recipe
              </button>
            )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 sm:pb-8 space-y-12">
        
        {currentTab === "recipes" ? (
          <div className="space-y-6 relative">
            <div className="md:sticky md:top-16 z-20 md:bg-[#FDFBF7]/95 md:dark:bg-neutral-800/95 md:backdrop-blur-sm md:py-4 md:-mx-4 md:px-4 md:-mt-4 transition-colors duration-300">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex w-full md:w-96 gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search recipes..."
                    value={filters.searchQuery}
                    onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
                    className="w-full pl-9 pr-4 py-2 bg-neutral-50 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50 border-none rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-200 dark:focus:ring-neutral-700 text-sm transition-colors"
                  />
                  {filters.searchQuery && (
                    <button
                      onClick={() => setFilters((prev) => ({ ...prev, searchQuery: "" }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`px-3 py-2 rounded-lg flex items-center justify-center transition-colors ${
                    showFilters || filters.cuisine !== "All" || filters.mealType !== "All"
                      ? "bg-accent-500 dark:bg-accent-400 text-white dark:text-neutral-900"
                      : "bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-600"
                  }`}
                  title="Toggle Filters"
                >
                  <Filter className="w-4 h-4" />
                </button>
              </div>
            </div>

              {/* Collapsible Filter Buttons */}
              {showFilters && (
                <div className="space-y-4 animate-in slide-in-from-top-2 fade-in duration-200 mt-4">
                  {/* Cuisine Filter Buttons */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  {CUISINES.map((c) => {
                    const isSelected = filters.cuisine === c;
                    
                    return (
                      <button
                        key={c}
                        onClick={() => setFilters((prev) => ({ ...prev, cuisine: c }))}
                        className={`text-xs uppercase tracking-wider font-bold px-3 py-1.5 rounded-full transition-all ${
                          isSelected
                            ? "bg-accent-500 dark:bg-accent-400 text-white dark:text-neutral-900 border border-transparent"
                            : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-transparent"
                        }`}
                      >
                        {c === "All" ? "All Cuisines" : c}
                      </button>
                    );
                  })}
                </div>

                {/* Meal Type Filter Buttons */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  {["All", "Main", "Starter", "Side", "Drink", "Dessert", "Snack"].map((m) => {
                    const isSelected = filters.mealType === m;
                    const baseClass = "text-xs uppercase tracking-wider font-bold px-3 py-1.5 rounded-full transition-all";
                    // Only pass the type into the color function if it's not "All" to get the proper colors
                    const colorClass = m === "All"
                      ? (isSelected 
                          ? "bg-accent-500 dark:bg-accent-400 text-white dark:text-neutral-900 border border-transparent"
                          : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-transparent")
                      : getMealTypeColor(m, isSelected);

                    return (
                      <button
                        key={m}
                        onClick={() => setFilters((prev) => ({ ...prev, mealType: m }))}
                        className={`${baseClass} ${colorClass}`}
                      >
                        {m === "All" ? "All Meals" : m}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            </div>

            {/* Recipes Cards Deck Grid */}
            <div>
              {loadingRecipes ? (
                <div className="py-20 flex justify-center">
                  <div className="w-6 h-6 border-2 border-neutral-200 border-t-neutral-800 rounded-full animate-spin"></div>
                </div>
              ) : filteredRecipes.length === 0 ? (
                <div className="text-center py-20 text-neutral-500">
                  <p className="text-sm">No recipes found.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                  {filteredRecipes.map((recipe) => (
                    <RecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      onView={(r) => {
                        setActiveRecipe(r);
                        setIsDetailOpen(true);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : currentTab === "builder" && isAdmin ? (
          <RecipeBuilderGame onRecipeGenerated={(recipe) => {
            if (!isAdmin) {
              // If not admin, just open the recipe in detail view
              setActiveRecipe(recipe);
              setIsDetailOpen(true);
              return;
            }
            // Automatically switch back to recipes and open the form with the generated recipe
            setEditingRecipe(recipe);
            setCurrentTab("addRecipe");
          }} />
        ) : currentTab === "addRecipe" && isAdmin ? (
          <RecipeFormModal
            onClose={() => {
              setCurrentTab("recipes");
              setEditingRecipe(null);
            }}
            onSave={async (recipe) => {
              await handleSaveRecipe(recipe);
              setCurrentTab("recipes");
            }}
            onBackgroundSave={async (recipe) => {
              await handleSaveRecipe(recipe);
            }}
            editingRecipe={editingRecipe}
          />
        ) : isAdmin ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-50">Weekly Meal Plan</h2>
            </div>
            {loadingMeals ? (
              <div className="py-12 flex justify-center">
                <div className="w-6 h-6 border-2 border-neutral-200 dark:border-neutral-600 border-t-neutral-800 dark:border-t-white rounded-full animate-spin"></div>
              </div>
            ) : (
              <MealPlanner
                mealPlan={mealPlan}
                recipes={recipes}
                onRemoveMeal={handleRemoveMeal}
                onViewRecipe={handleViewRecipeFromCalendar}
              />
            )}
          </div>
        ) : null}

      </main>

      {/* MODALS */}
      <RecipeModal
        isOpen={isDetailOpen}
        recipe={activeRecipe}
        isAdmin={isAdmin}
        onClose={() => {
          setIsDetailOpen(false);
          setActiveRecipe(null);
        }}
        onEdit={handleEditTrigger}
        onDelete={handleDeleteRecipe}
        onAddToCalendar={handleAddToCalendar}
      />
      {/* Mobile Bottom Navigation */}
      {isAdmin && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-[#FDFBF7] dark:bg-neutral-800 border-t border-neutral-100 dark:border-neutral-700 px-4 py-3 pb-safe flex items-center justify-around z-40 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] transition-colors duration-300">
          <button
            onClick={() => setCurrentTab("recipes")}
            className={`flex flex-col items-center gap-1 ${currentTab === "recipes" ? "text-neutral-900 dark:text-neutral-50" : "text-neutral-400 dark:text-neutral-500"} transition-colors w-16`}
          >
            <BookOpen className="w-5 h-5" />
            <span className="text-xs font-semibold tracking-wide">Recipes</span>
          </button>

          <button
            onClick={() => setCurrentTab("builder")}
            className={`flex flex-col items-center gap-1 ${currentTab === "builder" ? "text-accent-500 dark:text-accent-400" : "text-neutral-400 dark:text-neutral-500"} transition-colors w-16`}
          >
            <Wand2 className="w-5 h-5" />
            <span className="text-xs font-semibold tracking-wide">Lucky</span>
          </button>

          <button
            onClick={() => {
              setEditingRecipe(null);
              setCurrentTab("addRecipe");
            }}
            className={`flex flex-col items-center gap-1 ${currentTab === "addRecipe" ? "text-neutral-900 dark:text-neutral-50" : "text-neutral-400 dark:text-neutral-500"} hover:text-neutral-900 dark:hover:text-white transition-colors w-16`}
          >
            <Plus className="w-5 h-5" />
            <span className="text-xs font-semibold tracking-wide">Add</span>
          </button>

          <button
            onClick={() => setCurrentTab("mealPlan")}
            className={`flex flex-col items-center gap-1 ${currentTab === "mealPlan" ? "text-neutral-900 dark:text-neutral-50" : "text-neutral-400 dark:text-neutral-500"} transition-colors w-16`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-xs font-semibold tracking-wide">Planner</span>
          </button>
        </div>
      )}

    </div>
  );
}
