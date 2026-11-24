import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "./lib/firebase";
import { Recipe, MealPlanEntry, RecipeFilters, RecipeCollection } from "./types";
import RecipeCard from "./components/RecipeCard";
import RecipeModal from "./components/RecipeModal";
import RecipeFormModal from "./components/RecipeFormModal";
import MealPlanner from "./components/MealPlanner";
import RecipeBuilderGame from "./components/RecipeBuilderGame";
import CollectionPickerModal from "./components/CollectionPickerModal";
import { PWAInstallPopup } from "./components/PWAInstallPopup";
import { OfflineIndicator } from "./components/OfflineIndicator";
import { APP_VERSION, BUILD_DATE, BUILD_ID } from "./version";
import { getMealTypeButtonColor } from "./lib/utils";
import { STARTER_RECIPES } from "./data/starterRecipes";
import {
  BookOpen,
  Plus,
  Search,
  SlidersHorizontal,
  Calendar,
  X,
  Wand2,
  Moon,
  Sun,
  Download,
  Upload,
  RefreshCw,
  LogOut,
  PanelLeft,
  LayoutGrid,
  List,
  Lock,
  Database,
  ArrowUpDown,
  Bookmark,
  Trash2,
} from "lucide-react";

const INITIAL_FILTERS: RecipeFilters = {
  searchQuery: "",
  cuisine: "All",
  mealType: "All",
  maxCookingTime: 9999,
};

const recipeListContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03,
    },
  },
};

const recipeCardVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.28,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
};

const CUISINES = [
  "All", "Desi", "Persian", "Middle Eastern", "American", "Italian", "Mexican",
  "Asian", "Thai", "Mediterranean", "French", "Japanese", "Caribbean", "Other",
];

const MEAL_TYPE_CHIPS = ["Main", "Starter", "Side", "Dessert", "Snack", "Drink"] as const;

const PRESET_RECIPES: Recipe[] = STARTER_RECIPES;

type SortOrder = "newest" | "quickest" | "az";

export default function App() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [mealPlan, setMealPlan] = useState<MealPlanEntry[]>([]);
  const [collections, setCollections] = useState<RecipeCollection[]>(() => {
    try {
      const saved = localStorage.getItem("cookbook_collections");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
  const [collectionsUsingLocal, setCollectionsUsingLocal] = useState(true);
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [bookmarkTargetRecipe, setBookmarkTargetRecipe] = useState<Recipe | null>(null);
  const [isAddingCollection, setIsAddingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [filters, setFilters] = useState<RecipeFilters>(INITIAL_FILTERS);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [currentTab, setCurrentTab] = useState<"recipes" | "mealPlan" | "builder" | "addRecipe">("recipes");

  // Sidebar states (desktop collapse + mobile drawer)
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Loading & Fallback states
  const [loadingRecipes, setLoadingRecipes] = useState(true);
  const [loadingMeals, setLoadingMeals] = useState(true);
  const [isUsingLocalStorage, setIsUsingLocalStorage] = useState(false);

  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("cookbook_theme");
      if (saved !== null) return saved === "dark";
      return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (isDarkMode) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("cookbook_theme", "dark");
        if (metaTheme) metaTheme.setAttribute("content", "#17120F");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("cookbook_theme", "light");
        if (metaTheme) metaTheme.setAttribute("content", "#FBF7F0");
      }
    } catch {
      // ignore localStorage write errors
    }
  }, [isDarkMode]);

  // Modals
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [adminFeedback, setAdminFeedback] = useState<string | null>(null);
  const [isSyncingLocal, setIsSyncingLocal] = useState(false);
  const [passcode, setPasscode] = useState("");

  // Auth State
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem("cookbook_admin") === "true");
  const [authError, setAuthError] = useState<string | null>(null);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    (window as any).__COOKBOOK_VERSION__ = APP_VERSION;
    (window as any).__COOKBOOK_BUILD_DATE__ = BUILD_DATE;
    (window as any).__COOKBOOK_BUILD_ID__ = BUILD_ID;
    console.log(
      `%c[Cookbook]%c Version v${APP_VERSION} (${BUILD_DATE}) [${BUILD_ID}]`,
      "background: #0a0a0a; color: #5fd543; padding: 2px 6px; border-radius: 4px; font-weight: bold;",
      "color: inherit; font-weight: 500;"
    );
  }, []);

  const handleLogin = () => {
    setAuthError(null);
    setIsLoginModalOpen(true);
  };

  const submitPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode.toLowerCase() === "yes chef") {
      localStorage.setItem("cookbook_admin", "true");
      setIsAdmin(true);
      setDbError(null);
      setIsLoginModalOpen(false);
      setPasscode("");
      setAuthError(null);
    } else {
      setAuthError("Incorrect passcode.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("cookbook_admin");
    setIsAdmin(false);
    setIsAdminPanelOpen(false);
    setCurrentTab("recipes");
  };

  const handleLogoClick = () => {
    setCurrentTab("recipes");
    setActiveCollectionId(null);
    setIsDetailOpen(false);
    setActiveRecipe(null);
    setEditingRecipe(null);
    setFilters(INITIAL_FILTERS);
    setShowMoreFilters(false);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleExportRecipes = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(recipes, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `cookbook-backup-${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setAdminFeedback("Backup exported successfully!");
    } catch (err) {
      setAdminFeedback("Export failed: " + String(err));
    }
  };

  const handleImportRecipes = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          let addedCount = 0;
          const currentTitles = new Set(recipes.map((r) => r.title.trim().toLowerCase()));
          for (const item of imported) {
            if (item && item.title && !currentTitles.has(item.title.trim().toLowerCase())) {
              const { id, ...cleanItem } = item;
              await addDoc(collection(db, "recipes"), {
                ...cleanItem,
                createdAt: cleanItem.createdAt || new Date().toISOString(),
              });
              currentTitles.add(cleanItem.title.trim().toLowerCase());
              addedCount++;
            }
          }
          setAdminFeedback(`Imported ${addedCount} recipes successfully into database!`);
        } else {
          setAdminFeedback("Invalid JSON format: expected an array of recipes.");
        }
      } catch {
        setAdminFeedback("Error parsing backup JSON file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleSyncLocalStorage = async () => {
    setIsSyncingLocal(true);
    try {
      const stored = localStorage.getItem("zest_recipes");
      if (!stored) {
        setAdminFeedback("No local recipes cache found. Cloud is currently up to date!");
        setIsSyncingLocal(false);
        return;
      }
      const localList = JSON.parse(stored) as Recipe[];
      if (!Array.isArray(localList)) {
        setAdminFeedback("Local recipes cache is empty.");
        setIsSyncingLocal(false);
        return;
      }
      const cloudTitles = new Set(recipes.map((r) => r.title.trim().toLowerCase()));
      const cloudIds = new Set(recipes.map((r) => r.id));
      const missing = localList.filter(
        (lr) => lr && lr.title && !cloudIds.has(lr.id) && !cloudTitles.has(lr.title.trim().toLowerCase())
      );
      if (missing.length === 0) {
        setAdminFeedback("All recipes in local cache are already synced to Firestore!");
      } else {
        for (const item of missing) {
          const { id, ...cleanItem } = item;
          await addDoc(collection(db, "recipes"), {
            ...cleanItem,
            createdAt: cleanItem.createdAt || new Date().toISOString(),
          });
        }
        setAdminFeedback(`Recovered and uploaded ${missing.length} local recipe(s) to Firestore!`);
      }
    } catch (err) {
      setAdminFeedback("Sync error: " + String(err));
    } finally {
      setIsSyncingLocal(false);
    }
  };

  const loadRecipesFromLocalStorage = () => {
    setIsUsingLocalStorage(true);
    const stored = localStorage.getItem("zest_recipes");
    let parsed: Recipe[] = [];
    if (stored) {
      try {
        const raw = JSON.parse(stored);
        if (Array.isArray(raw)) parsed = raw;
      } catch {}
    }

    if (parsed.length > 0) {
      let updated = false;
      parsed = parsed.map((r) => {
        if (
          r.imageUrl &&
          (r.imageUrl.includes("pollinations.ai") ||
            r.imageUrl.includes("unsplash.com") ||
            r.imageUrl.includes("loremflickr.com") ||
            r.imageUrl.includes("picsum.photos"))
        ) {
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

  useEffect(() => {
    let unsubscribeRecipes = () => {};
    let unsubscribeMealPlan = () => {};

    try {
      const qRecipes = query(collection(db, "recipes"), orderBy("createdAt", "desc"));
      unsubscribeRecipes = onSnapshot(
        qRecipes,
        (snapshot) => {
          const list: Recipe[] = [];
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...docSnap.data() } as Recipe);
          });

          if (list.length > 0) {
            list.forEach(async (r) => {
              if (
                r.imageUrl &&
                (r.imageUrl.includes("pollinations.ai") ||
                  r.imageUrl.includes("unsplash.com") ||
                  r.imageUrl.includes("loremflickr.com") ||
                  r.imageUrl.includes("picsum.photos"))
              ) {
                r.imageUrl = "";
                if (isAdmin) {
                  try {
                    await updateDoc(doc(db, "recipes", r.id!), { imageUrl: "" });
                  } catch (e: any) {
                    if (e?.code === "permission-denied") {
                      setDbError("Database is secure but Rules are blocking access. Please update your Firestore Security Rules.");
                    }
                  }
                }
              }
            });
          }

          try {
            localStorage.setItem("zest_recipes", JSON.stringify(list));
          } catch {}

          setRecipes(list);
          setLoadingRecipes(false);
          setIsUsingLocalStorage(false);
          setDbError(null);
        },
        (error: any) => {
          if (error?.code === "permission-denied") {
            setDbError("Database is secure but Rules are blocking access. Please update your Firestore Security Rules.");
          } else {
            console.warn("Firestore recipes listener failed, using local storage:", error);
          }
          loadRecipesFromLocalStorage();
        }
      );

      const qMeals = query(collection(db, "mealPlan"), orderBy("date", "asc"));
      unsubscribeMealPlan = onSnapshot(
        qMeals,
        (snapshot) => {
          const list: MealPlanEntry[] = [];
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...docSnap.data() } as MealPlanEntry);
          });
          try {
            localStorage.setItem("zest_meals", JSON.stringify(list));
          } catch {}
          setMealPlan(list);
          setLoadingMeals(false);
        },
        (error: any) => {
          if (error?.code === "permission-denied") {
            setDbError("Database is secure but Rules are blocking access. Please update your Firestore Security Rules.");
          } else {
            console.warn("Firestore mealPlan listener failed, using local storage:", error);
          }
          loadMealsFromLocalStorage();
        }
      );
      let unsubscribeCollections = () => {};
      try {
        const qCollections = query(collection(db, "collections"), orderBy("createdAt", "desc"));
        unsubscribeCollections = onSnapshot(
          qCollections,
          (snapshot) => {
            const list: RecipeCollection[] = [];
            snapshot.forEach((docSnap) => {
              const data = docSnap.data() as any;
              list.push({
                id: docSnap.id,
                name: data.name || "Untitled",
                recipeIds: Array.isArray(data.recipeIds) ? data.recipeIds : [],
                createdAt: data.createdAt || new Date().toISOString(),
              });
            });
            try {
              localStorage.setItem("cookbook_collections", JSON.stringify(list));
            } catch {}
            setCollections(list);
            setCollectionsUsingLocal(false);
          },
          () => {
            // Silently fall back to localStorage if Firestore rules don't expose /collections yet
            setCollectionsUsingLocal(true);
          }
        );
      } catch {
        setCollectionsUsingLocal(true);
      }

      return () => {
        unsubscribeRecipes();
        unsubscribeMealPlan();
        unsubscribeCollections();
      };
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
      if (editingRecipe && editingRecipe.id) {
        const docRef = doc(db, "recipes", editingRecipe.id);
        await updateDoc(docRef, { ...recipeData });
        const updated = recipes.map((r) =>
          r.id === editingRecipe.id ? { ...recipeData, id: editingRecipe.id, createdAt: editingRecipe.createdAt } : r
        );
        try {
          localStorage.setItem("zest_recipes", JSON.stringify(updated));
        } catch {}
      } else {
        const newDoc = await addDoc(collection(db, "recipes"), {
          ...recipeData,
          createdAt: new Date().toISOString(),
        });
        const updated = [{ ...recipeData, id: newDoc.id, createdAt: new Date().toISOString() }, ...recipes];
        try {
          localStorage.setItem("zest_recipes", JSON.stringify(updated));
        } catch {}
      }
    }
    setEditingRecipe(null);
  };

  const handleDeleteRecipe = async (id: string) => {
    if (isUsingLocalStorage) {
      const updated = recipes.filter((r) => r.id !== id);
      setRecipes(updated);
      localStorage.setItem("zest_recipes", JSON.stringify(updated));
      const updatedMeals = mealPlan.filter((m) => m.recipeId !== id);
      setMealPlan(updatedMeals);
      localStorage.setItem("zest_meals", JSON.stringify(updatedMeals));
    } else {
      await deleteDoc(doc(db, "recipes", id));
      const updated = recipes.filter((r) => r.id !== id);
      try {
        localStorage.setItem("zest_recipes", JSON.stringify(updated));
      } catch {}
      const linkedMeals = mealPlan.filter((m) => m.recipeId === id);
      for (const meal of linkedMeals) {
        if (meal.id) {
          await deleteDoc(doc(db, "mealPlan", meal.id));
        }
      }
    }
  };

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
      await addDoc(collection(db, "mealPlan"), entryData);
    }
  };

  const handleRemoveMeal = async (id: string) => {
    if (isUsingLocalStorage) {
      const updated = mealPlan.filter((m) => m.id !== id);
      setMealPlan(updated);
      localStorage.setItem("zest_meals", JSON.stringify(updated));
    } else {
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
    }
  };

  const persistCollectionsLocal = (next: RecipeCollection[]) => {
    setCollections(next);
    try {
      localStorage.setItem("cookbook_collections", JSON.stringify(next));
    } catch {}
  };

  const handleCreateCollection = async (name: string, initialRecipeId?: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const payload = {
      name: trimmed,
      recipeIds: initialRecipeId ? [initialRecipeId] : [],
      createdAt: new Date().toISOString(),
    };

    if (!collectionsUsingLocal) {
      try {
        await addDoc(collection(db, "collections"), payload);
        return;
      } catch {
        setCollectionsUsingLocal(true);
      }
    }

    const newCol: RecipeCollection = {
      id: `col-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ...payload,
    };
    persistCollectionsLocal([newCol, ...collections]);
  };

  const handleToggleRecipeInCollection = async (collectionId: string, recipeId: string) => {
    const target = collections.find((c) => c.id === collectionId);
    if (!target) return;

    const exists = target.recipeIds.includes(recipeId);
    const nextIds = exists
      ? target.recipeIds.filter((id) => id !== recipeId)
      : [...target.recipeIds, recipeId];

    if (!collectionsUsingLocal && !collectionId.startsWith("col-")) {
      try {
        await updateDoc(doc(db, "collections", collectionId), { recipeIds: nextIds });
        return;
      } catch {
        setCollectionsUsingLocal(true);
      }
    }

    const next = collections.map((c) =>
      c.id === collectionId ? { ...c, recipeIds: nextIds } : c
    );
    persistCollectionsLocal(next);
  };

  const handleDeleteCollection = async (collectionId: string) => {
    if (activeCollectionId === collectionId) {
      setActiveCollectionId(null);
    }

    if (!collectionsUsingLocal && !collectionId.startsWith("col-")) {
      try {
        await deleteDoc(doc(db, "collections", collectionId));
        return;
      } catch {
        setCollectionsUsingLocal(true);
      }
    }

    persistCollectionsLocal(collections.filter((c) => c.id !== collectionId));
  };

  const activeCollection = useMemo(
    () => collections.find((c) => c.id === activeCollectionId) || null,
    [collections, activeCollectionId]
  );

  const bookmarkedRecipeIds = useMemo(() => {
    const set = new Set<string>();
    collections.forEach((c) => c.recipeIds.forEach((id) => set.add(id)));
    return set;
  }, [collections]);

  // Filtered & Sorted Recipes
  const filteredRecipes = useMemo(() => {
    const q = filters.searchQuery.trim().toLowerCase();
    const activeIds = activeCollection ? new Set(activeCollection.recipeIds) : null;

    const list = recipes.filter((recipe) => {
      if (activeIds && (!recipe.id || !activeIds.has(recipe.id))) {
        return false;
      }

      const matchesSearch =
        !q ||
        recipe.title.toLowerCase().includes(q) ||
        recipe.description?.toLowerCase().includes(q) ||
        recipe.cuisine?.toLowerCase().includes(q) ||
        recipe.ingredients.some((i) => i.name.toLowerCase().includes(q));

      const matchesCuisine = filters.cuisine === "All" || recipe.cuisine === filters.cuisine;
      const matchesMealType = filters.mealType === "All" || recipe.mealType === filters.mealType;
      const matchesTime = (recipe.cookingTime || 0) <= filters.maxCookingTime;

      return matchesSearch && matchesCuisine && matchesMealType && matchesTime;
    });

    if (sortOrder === "quickest") {
      return [...list].sort((a, b) => (a.cookingTime || 999) - (b.cookingTime || 999));
    }
    if (sortOrder === "az") {
      return [...list].sort((a, b) => a.title.localeCompare(b.title));
    }
    return list;
  }, [recipes, filters, sortOrder, activeCollection]);

  // Dynamic Sidebar Cuisine Counts
  const sidebarStats = useMemo(() => {
    const cuisineCounts = new Map<string, number>();
    recipes.forEach((r) => {
      if (r.cuisine) cuisineCounts.set(r.cuisine, (cuisineCounts.get(r.cuisine) || 0) + 1);
    });
    const topCuisines = Array.from(cuisineCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
    return { topCuisines };
  }, [recipes]);

  const hasActiveFilters =
    filters.searchQuery.trim() !== "" ||
    filters.cuisine !== "All" ||
    filters.mealType !== "All" ||
    filters.maxCookingTime < 9999;

  const cycleSortOrder = () => {
    setSortOrder((prev) => (prev === "newest" ? "quickest" : prev === "quickest" ? "az" : "newest"));
  };

  const pageTitle =
    currentTab === "recipes"
      ? activeCollection
        ? activeCollection.name
        : "Recipes"
      : currentTab === "mealPlan"
      ? "Meal Planner"
      : currentTab === "builder"
      ? "Recipe Builder"
      : editingRecipe
      ? "Edit Recipe"
      : "Add Recipe";

  const applyQuickCollection = (patch: Partial<RecipeFilters>) => {
    setCurrentTab("recipes");
    setActiveCollectionId(null);
    setFilters({ ...INITIAL_FILTERS, ...patch });
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const renderSidebarContent = () => (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground select-none">
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-sidebar-border/60 shrink-0">
        <button
          type="button"
          onClick={handleLogoClick}
          onDoubleClick={isAdmin ? () => setIsAdminPanelOpen(true) : handleLogin}
          className="flex items-center gap-2.5 text-left focus:outline-none group cursor-pointer"
          title={
            isAdmin
              ? `Admin Active • v${APP_VERSION}\nDouble-click for Data Control`
              : "Cookbook — Home (Double-click to sign in)"
          }
        >
          <span className="w-8 h-8 rounded-full bg-primary/15 border border-primary/40 text-primary-dark flex items-center justify-center shrink-0">
            <span className="font-serif italic text-base font-bold leading-none">C</span>
          </span>
          <div className="flex flex-col">
            <span className="font-serif text-[22px] font-semibold tracking-[-0.01em] text-foreground leading-none">
              Cookbook
            </span>
            <span className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground mt-0.5">
              Kitchen Archive
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="md:hidden w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-sidebar-accent cursor-pointer"
          aria-label="Close navigation"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Sidebar Nav Groups */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {/* Admin Kitchen Navigation */}
        {isAdmin && (
          <nav className="space-y-1">
            <p className="px-2.5 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Kitchen
            </p>

            <button
              type="button"
              onClick={() => {
                setCurrentTab("mealPlan");
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between gap-2.5 h-9 px-2.5 rounded-lg text-sm transition-colors cursor-pointer ${
                currentTab === "mealPlan"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground"
              }`}
            >
              <span className="flex items-center gap-2.5 truncate">
                <Calendar className="w-4 h-4 shrink-0" />
                <span>Meal Planner</span>
              </span>
              {mealPlan.length > 0 && (
                <span className="text-xs font-mono tabular-nums opacity-60">{mealPlan.length}</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setCurrentTab("builder");
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-sm transition-colors cursor-pointer ${
                currentTab === "builder"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground"
              }`}
            >
              <Wand2 className="w-4 h-4 shrink-0" />
              <span>Recipe Builder</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingRecipe(null);
                setCurrentTab("addRecipe");
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 h-9 px-2.5 rounded-lg text-sm transition-colors cursor-pointer ${
                currentTab === "addRecipe"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground"
              }`}
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Add Recipe</span>
            </button>
          </nav>
        )}

        {/* Custom Bookmarkable Collections */}
        <div className="space-y-1.5">
          <div className="px-2.5 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Collections
            </p>
            <button
              type="button"
              onClick={() => setIsAddingCollection((v) => !v)}
              className="w-5 h-5 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors cursor-pointer"
              title="New collection"
              aria-label="Create new collection"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {isAddingCollection && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newCollectionName.trim()) return;
                await handleCreateCollection(newCollectionName);
                setNewCollectionName("");
                setIsAddingCollection(false);
              }}
              className="px-1 flex items-center gap-1.5"
            >
              <input
                type="text"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                placeholder="e.g. Dinner Party"
                maxLength={60}
                autoFocus
                className="flex-1 min-w-0 h-8 px-2.5 rounded-lg bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
              <button
                type="submit"
                disabled={!newCollectionName.trim()}
                className="h-8 px-2.5 rounded-lg bg-foreground text-background text-[11px] font-medium hover:opacity-85 disabled:opacity-40 cursor-pointer shrink-0"
              >
                Add
              </button>
            </form>
          )}

          {collections.length === 0 && !isAddingCollection ? (
            <button
              type="button"
              onClick={() => setIsAddingCollection(true)}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border border-dashed border-sidebar-border text-xs text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors cursor-pointer text-left"
            >
              <Bookmark className="w-3.5 h-3.5 shrink-0 opacity-70" />
              <span className="truncate">New collection...</span>
            </button>
          ) : (
            <div className="space-y-0.5">
              {collections.map((col) => {
                const active = currentTab === "recipes" && activeCollectionId === col.id;
                const validCount = col.recipeIds.filter((id) =>
                  recipes.some((r) => r.id === id)
                ).length;
                return (
                  <div key={col.id} className="group relative flex items-center">
                    <button
                      type="button"
                      onClick={() => {
                        setCurrentTab("recipes");
                        setActiveCollectionId(active ? null : col.id);
                        setFilters(INITIAL_FILTERS);
                        setMobileMenuOpen(false);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className={`w-full flex items-center justify-between gap-2 h-8 px-2.5 rounded-lg text-[13px] transition-colors cursor-pointer ${
                        active
                          ? "bg-sidebar-accent text-foreground font-medium"
                          : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground"
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <Bookmark
                          className={`w-3.5 h-3.5 shrink-0 ${
                            active ? "fill-primary text-primary-dark" : ""
                          }`}
                        />
                        <span className="truncate">{col.name}</span>
                      </span>
                      <span className="text-[11px] font-mono tabular-nums opacity-60 group-hover:opacity-0 transition-opacity">
                        {validCount}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteCollection(col.id);
                      }}
                      className="absolute right-1.5 w-6 h-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 hover:bg-background transition-all cursor-pointer"
                      title={`Delete "${col.name}"`}
                      aria-label={`Delete collection ${col.name}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Dynamic Top Cuisines */}
        {sidebarStats.topCuisines.length > 0 && (
          <div className="space-y-1">
            <p className="px-2.5 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Cuisines
            </p>
            {sidebarStats.topCuisines.map(([cuisineName, count]) => (
              <button
                key={cuisineName}
                type="button"
                onClick={() => applyQuickCollection({ cuisine: cuisineName })}
                className={`w-full flex items-center justify-between h-8 px-2.5 rounded-lg text-[13px] transition-colors cursor-pointer ${
                  currentTab === "recipes" && filters.cuisine === cuisineName
                    ? "bg-sidebar-accent text-foreground font-medium"
                    : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-foreground"
                }`}
              >
                <span className="truncate">{cuisineName}</span>
                <span className="text-[11px] font-mono tabular-nums opacity-60">{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Utility Footer */}
      <div className="p-3 border-t border-sidebar-border/80 space-y-1 shrink-0">
        <button
          type="button"
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="w-full flex items-center justify-between h-9 px-2.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            {isDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            <span>{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
          </span>
        </button>

        {isAdmin ? (
          <button
            type="button"
            onClick={() => {
              setIsAdminPanelOpen(true);
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-between h-9 px-2.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-primary-dark" />
              <span>Data &amp; Backup</span>
            </span>
            <span className="font-mono text-[10px] opacity-60">v{APP_VERSION}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              handleLogin();
              setMobileMenuOpen(false);
            }}
            className="w-full flex items-center justify-between h-9 px-2.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5" />
              <span>Chef Sign In</span>
            </span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-svh w-full flex bg-background text-foreground font-sans transition-colors duration-200">
      {/* Desktop Collapsible Sidebar (Cook Well App Shell) */}
      <aside
        className={`hidden md:block shrink-0 border-r border-sidebar-border transition-[width] duration-200 ease-out overflow-hidden sticky top-0 h-svh ${
          sidebarOpen ? "w-64" : "w-0 border-r-0"
        }`}
      >
        <div className="w-64 h-full">{renderSidebarContent()}</div>
      </aside>

      {/* Mobile Slide-Over Sidebar Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 320 }}
              className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 border-r border-sidebar-border"
            >
              {renderSidebarContent()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Inset Column */}
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        {/* Alert Banners */}
        {dbError && (
          <div className="w-full bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 px-4 py-2 text-xs text-center font-medium border-b border-amber-200 dark:border-amber-900/50 flex items-center justify-between">
            <span className="flex-1 text-center">{dbError}</span>
            <button onClick={() => setDbError(null)} className="p-1 hover:opacity-75 cursor-pointer" aria-label="Dismiss">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {authError && (
          <div className="w-full bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-4 py-2 text-xs text-center font-medium border-b border-red-200 dark:border-red-900/50 flex items-center justify-between">
            <span className="flex-1 text-center">{authError}</span>
            <button onClick={() => setAuthError(null)} className="p-1 hover:opacity-75 cursor-pointer" aria-label="Dismiss">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Cook Well Sticky Top Page Bar */}
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-border/70 bg-background/90 px-4 md:px-6 backdrop-blur-md">
          {/* Sidebar Trigger */}
          <button
            type="button"
            onClick={() => {
              if (window.innerWidth < 768) {
                setMobileMenuOpen(true);
              } else {
                if (sidebarOpen) {
                  setCurrentTab("recipes");
                  setActiveCollectionId(null);
                  setFilters(INITIAL_FILTERS);
                }
                setSidebarOpen((v) => !v);
              }
            }}
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer -ml-1 shrink-0"
            aria-label="Toggle Sidebar"
            title={sidebarOpen ? "Collapse sidebar & show all recipes" : "Open sidebar"}
          >
            <PanelLeft className="w-4 h-4" />
          </button>

          {/* Page Title */}
          <h1 className="font-serif truncate text-2xl sm:text-[28px] font-semibold tracking-[-0.01em] text-foreground leading-none">
            {pageTitle}
          </h1>

          <span className="flex-1" aria-hidden="true" />

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {currentTab === "recipes" && (
              <>
                {/* Desktop Inline Search Pill */}
                <div className="relative hidden sm:block w-56 lg:w-72">
                  <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search recipes, ingredients..."
                    value={filters.searchQuery}
                    onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
                    className="w-full h-9 pl-9 pr-8 rounded-full bg-secondary text-sm text-foreground placeholder:text-muted-foreground border border-transparent focus:border-border focus:bg-background focus:outline-none transition-all"
                  />
                  {filters.searchQuery && (
                    <button
                      type="button"
                      onClick={() => setFilters((prev) => ({ ...prev, searchQuery: "" }))}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5"
                      aria-label="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Grid / List View Switcher */}
                <div className="hidden sm:inline-flex items-center rounded-full border border-border bg-secondary/60 p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                      viewMode === "grid"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Editorial Grid View"
                    aria-label="Grid view"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                      viewMode === "list"
                        ? "bg-background text-foreground shadow-xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Compact List View"
                    aria-label="List view"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            )}

            {/* Mobile Theme Toggle */}
            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="md:hidden inline-flex size-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Primary Pill CTA (Cook Well style) */}
            {isAdmin && currentTab !== "addRecipe" && (
              <button
                type="button"
                onClick={() => {
                  setEditingRecipe(null);
                  setCurrentTab("addRecipe");
                }}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-foreground text-background hover:opacity-85 text-xs sm:text-sm font-medium transition-opacity cursor-pointer"
              >
                <Plus className="w-4 h-4 text-primary" strokeWidth={2.5} />
                <span className="hidden xs:inline sm:inline">Add Recipe</span>
              </button>
            )}
          </div>
        </header>

        {/* Main Scrollable Content Area */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 pt-5 pb-24 md:pb-12">
          <AnimatePresence mode="wait">
            {currentTab === "recipes" ? (
              <motion.div
                key="tab-recipes"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="space-y-6"
              >
                {/* Mobile Search Input */}
                <div className="sm:hidden relative">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search recipes, ingredients..."
                    value={filters.searchQuery}
                    onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
                    className="w-full h-10 pl-10 pr-9 rounded-full bg-secondary text-sm text-foreground placeholder:text-muted-foreground border border-transparent focus:border-border focus:bg-background focus:outline-none"
                  />
                  {filters.searchQuery && (
                    <button
                      type="button"
                      onClick={() => setFilters((prev) => ({ ...prev, searchQuery: "" }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Cook Well Filter Pills Rail */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
                    {/* Sort Pill */}
                    <button
                      type="button"
                      onClick={cycleSortOrder}
                      className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full border border-border bg-card hover:bg-secondary text-xs font-medium text-foreground shrink-0 transition-colors cursor-pointer"
                      title="Change sort order"
                    >
                      <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
                      <span>
                        {sortOrder === "newest" ? "Newest" : sortOrder === "quickest" ? "Quickest" : "A–Z"}
                      </span>
                    </button>

                    {/* Meal Type Quick Pills with Category Colors */}
                    {MEAL_TYPE_CHIPS.map((type) => {
                      const selected = filters.mealType === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() =>
                            setFilters((prev) => ({
                              ...prev,
                              mealType: prev.mealType === type ? "All" : type,
                            }))
                          }
                          className={`h-8 px-3.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer ${getMealTypeButtonColor(
                            type,
                            selected
                          )}`}
                        >
                          {type}
                        </button>
                      );
                    })}

                    {/* More Filters (Cuisines) Pill */}
                    <button
                      type="button"
                      onClick={() => setShowMoreFilters((v) => !v)}
                      className={`inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full border text-xs font-medium shrink-0 transition-colors cursor-pointer ${
                        showMoreFilters || filters.cuisine !== "All"
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-card text-foreground hover:bg-secondary"
                      }`}
                    >
                      <SlidersHorizontal className="w-3 h-3" />
                      <span>
                        {filters.cuisine !== "All" ? filters.cuisine : "More filters"}
                      </span>
                    </button>

                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={() => setFilters(INITIAL_FILTERS)}
                        className="h-8 px-3 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground shrink-0 cursor-pointer underline underline-offset-2"
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  {/* Expandable Cuisine Filter Row */}
                  <AnimatePresence>
                    {showMoreFilters && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-2 pb-1 flex flex-wrap gap-1.5 border-t border-border/60">
                          {CUISINES.map((c) => {
                            const selected = filters.cuisine === c;
                            return (
                              <button
                                key={c}
                                type="button"
                                onClick={() => setFilters((prev) => ({ ...prev, cuisine: c }))}
                                className={`h-7 px-3 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                                  selected
                                    ? "bg-foreground text-background"
                                    : "bg-secondary/80 text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                {c === "All" ? "All Cuisines" : c}
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Active Collection Banner */}
                {activeCollection && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-secondary/50 px-4 py-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Bookmark className="w-4 h-4 fill-primary text-primary-dark shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {activeCollection.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {filteredRecipes.length} bookmarked{" "}
                          {filteredRecipes.length === 1 ? "recipe" : "recipes"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveCollectionId(null)}
                        className="h-8 px-3.5 rounded-full border border-border bg-background hover:bg-secondary text-xs font-medium text-foreground transition-colors cursor-pointer"
                      >
                        All Recipes
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCollection(activeCollection.id)}
                        className="h-8 px-3 rounded-full border border-border bg-background hover:text-red-500 text-xs font-medium text-muted-foreground transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Recipe Grid / List Stage */}
                {loadingRecipes ? (
                  /* Cook Well 4:5 Portrait Skeleton Loader */
                  <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {Array.from({ length: 10 }).map((_, idx) => (
                      <div key={idx} className="space-y-2.5">
                        <div className="aspect-[4/5] rounded-xl bg-muted animate-pulse" />
                        <div className="space-y-1.5 px-0.5">
                          <div className="h-4 w-3/4 rounded-md bg-muted animate-pulse" />
                          <div className="h-3 w-1/2 rounded-md bg-muted animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredRecipes.length === 0 ? (
                  <div className="py-20 text-center space-y-3 border border-dashed border-border rounded-2xl">
                    <p className="text-base font-medium text-foreground">
                      {activeCollection ? `No recipes in "${activeCollection.name}" yet` : "No recipes found"}
                    </p>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                      {activeCollection
                        ? "Tap the bookmark icon on any recipe card to save it into this collection."
                        : hasActiveFilters
                        ? "Try clearing your search or switching filter pills."
                        : "Start building your personal home cooking library."}
                    </p>
                    <div className="pt-2 flex justify-center gap-2">
                      {activeCollection && (
                        <button
                          type="button"
                          onClick={() => setActiveCollectionId(null)}
                          className="h-9 px-4 rounded-full bg-foreground text-background text-xs font-medium hover:opacity-85 cursor-pointer"
                        >
                          Browse All Recipes
                        </button>
                      )}
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={() => setFilters(INITIAL_FILTERS)}
                          className="h-9 px-4 rounded-full border border-border text-xs font-medium text-foreground hover:bg-secondary cursor-pointer"
                        >
                          Clear filters
                        </button>
                      )}
                      {isAdmin && !activeCollection && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRecipe(null);
                            setCurrentTab("addRecipe");
                          }}
                          className="h-9 px-4 rounded-full bg-foreground text-background text-xs font-medium hover:opacity-85 cursor-pointer"
                        >
                          Add Recipe
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <motion.div
                      key={`recipes-${viewMode}-${activeCollectionId || "all"}-${filters.cuisine}-${filters.mealType}-${filters.maxCookingTime}-${sortOrder}`}
                      variants={recipeListContainerVariants}
                      initial="hidden"
                      animate="visible"
                      className={
                        viewMode === "grid"
                          ? "grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                          : "grid grid-cols-1 md:grid-cols-2 gap-2.5"
                      }
                    >
                      {filteredRecipes.map((recipe) => (
                        <motion.div key={recipe.id} variants={recipeCardVariants} className="h-full">
                          <RecipeCard
                            recipe={recipe}
                            viewMode={viewMode}
                            isBookmarked={!!recipe.id && bookmarkedRecipeIds.has(recipe.id)}
                            onBookmark={(r) => setBookmarkTargetRecipe(r)}
                            onView={(r) => {
                              setActiveRecipe(r);
                              setIsDetailOpen(true);
                            }}
                          />
                        </motion.div>
                      ))}
                    </motion.div>

                    <p className="text-center text-xs text-muted-foreground pt-4 tabular-nums">
                      {activeCollection
                        ? `Showing ${filteredRecipes.length} saved in ${activeCollection.name}`
                        : `Showing ${filteredRecipes.length} of ${recipes.length} recipes`}
                    </p>
                  </div>
                )}
              </motion.div>
            ) : currentTab === "builder" && isAdmin ? (
              <motion.div
                key="tab-builder"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                <RecipeBuilderGame
                  onRecipeGenerated={(recipe) => {
                    if (!isAdmin) {
                      setActiveRecipe(recipe);
                      setIsDetailOpen(true);
                      return;
                    }
                    setEditingRecipe(recipe);
                    setCurrentTab("addRecipe");
                  }}
                />
              </motion.div>
            ) : currentTab === "addRecipe" && isAdmin ? (
              <motion.div
                key="tab-addRecipe"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
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
              </motion.div>
            ) : isAdmin ? (
              <motion.div
                key="tab-mealPlan"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
              >
                {loadingMeals ? (
                  <div className="py-16 flex justify-center">
                    <div className="w-5 h-5 border-2 border-border border-t-foreground rounded-full animate-spin" />
                  </div>
                ) : (
                  <MealPlanner
                    mealPlan={mealPlan}
                    recipes={recipes}
                    onRemoveMeal={handleRemoveMeal}
                    onViewRecipe={handleViewRecipeFromCalendar}
                    onAddMeal={handleAddToCalendar}
                  />
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </main>
      </div>

      {/* Full-Page Editorial Recipe Detail View */}
      <RecipeModal
        isOpen={isDetailOpen}
        recipe={activeRecipe}
        isAdmin={isAdmin}
        isBookmarked={!!activeRecipe?.id && bookmarkedRecipeIds.has(activeRecipe.id)}
        onBookmark={(r) => setBookmarkTargetRecipe(r)}
        onClose={() => {
          setIsDetailOpen(false);
          setActiveRecipe(null);
        }}
        onEdit={handleEditTrigger}
        onDelete={handleDeleteRecipe}
        onAddToCalendar={handleAddToCalendar}
      />

      {/* Save to Collection Modal */}
      <CollectionPickerModal
        recipe={bookmarkTargetRecipe}
        collections={collections}
        onClose={() => setBookmarkTargetRecipe(null)}
        onToggleRecipeInCollection={handleToggleRecipeInCollection}
        onCreateCollection={handleCreateCollection}
      />

      {/* Mobile Bottom Navigation Bar (Admin) */}
      {isAdmin && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/90 backdrop-blur-md border-t border-border px-2 py-2 pb-safe flex items-center justify-around z-40">
          {[
            { id: "recipes", label: "Recipes", Icon: BookOpen },
            { id: "mealPlan", label: "Planner", Icon: Calendar },
            { id: "builder", label: "Builder", Icon: Wand2 },
            { id: "addRecipe", label: "Add", Icon: Plus },
          ].map(({ id, label, Icon }) => {
            const active = currentTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  if (id === "addRecipe") setEditingRecipe(null);
                  setCurrentTab(id as any);
                }}
                className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-colors cursor-pointer ${
                  active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? "stroke-[2.2]" : "stroke-[1.7]"}`} />
                <span className="text-[11px] font-medium">{label}</span>
              </button>
            );
          })}
        </nav>
      )}

      {/* Admin & Data Control Modal */}
      <AnimatePresence>
        {isAdminPanelOpen && isAdmin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2 }}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-foreground tracking-tight">
                        Admin &amp; Data Control
                      </h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-secondary text-foreground font-medium">
                        v{APP_VERSION}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Manage database sync, JSON backups, and session settings.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdminPanelOpen(false);
                      setAdminFeedback(null);
                    }}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {adminFeedback && (
                  <div className="p-3 rounded-xl bg-primary/15 border border-primary/30 text-xs text-foreground font-medium">
                    {adminFeedback}
                  </div>
                )}

                <div className="space-y-2 p-3.5 rounded-xl bg-secondary/60 border border-border text-xs font-mono">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Database</span>
                    <span className="font-medium text-foreground flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      {isUsingLocalStorage ? "Local Cache" : "Firestore Connected"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Recipes</span>
                    <span className="font-medium text-foreground">{recipes.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Build</span>
                    <span className="text-muted-foreground">{BUILD_ID}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleExportRecipes}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-border bg-background hover:bg-secondary/60 transition-colors text-xs font-medium text-foreground cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <Download className="w-4 h-4 text-muted-foreground" />
                      <span>Export Recipes (JSON Backup)</span>
                    </span>
                    <span className="text-muted-foreground">Download</span>
                  </button>

                  <label className="w-full flex items-center justify-between p-3 rounded-xl border border-border bg-background hover:bg-secondary/60 transition-colors text-xs font-medium text-foreground cursor-pointer">
                    <span className="flex items-center gap-2.5">
                      <Upload className="w-4 h-4 text-muted-foreground" />
                      <span>Import Recipes (Backup JSON)</span>
                    </span>
                    <span className="text-muted-foreground">Upload</span>
                    <input type="file" accept=".json" onChange={handleImportRecipes} className="hidden" />
                  </label>

                  <button
                    type="button"
                    onClick={handleSyncLocalStorage}
                    disabled={isSyncingLocal}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-border bg-background hover:bg-secondary/60 transition-colors text-xs font-medium text-foreground cursor-pointer disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2.5">
                      <RefreshCw className={`w-4 h-4 text-muted-foreground ${isSyncingLocal ? "animate-spin" : ""}`} />
                      <span>Sync Local Storage to Cloud</span>
                    </span>
                    <span className="text-muted-foreground">Recover</span>
                  </button>
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 hover:underline cursor-pointer font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsAdminPanelOpen(false)}
                    className="h-9 px-4 rounded-full bg-secondary hover:bg-secondary/80 text-xs font-medium text-foreground transition-colors cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chef Sign In Modal */}
      <AnimatePresence>
        {isLoginModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2 }}
              className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            >
              <div className="p-6">
                <h3 className="text-lg font-semibold text-foreground tracking-tight mb-1">
                  Chef Sign In
                </h3>
                <p className="text-xs text-muted-foreground mb-5">
                  Enter the kitchen passcode to unlock editing, meal planning, and recipe importing.
                </p>

                <form onSubmit={submitPasscode} className="space-y-4">
                  <input
                    type="password"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Enter passcode..."
                    className="w-full h-11 px-4 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsLoginModalOpen(false);
                        setPasscode("");
                        setAuthError(null);
                      }}
                      className="h-9 px-4 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="h-9 px-5 rounded-full bg-foreground text-background hover:opacity-85 transition-opacity text-xs font-medium cursor-pointer"
                    >
                      Unlock
                    </button>
                  </div>
                </form>

                <div className="mt-5 pt-3 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                  <span>Version</span>
                  <span>
                    v{APP_VERSION} ({BUILD_DATE})
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <PWAInstallPopup />
      <OfflineIndicator />
    </div>
  );
}
