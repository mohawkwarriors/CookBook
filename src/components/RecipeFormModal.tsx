import React, { useState, useEffect } from "react";
import { X, Loader2, Plus, Trash2, ArrowRight, Search, PenTool, Link2, Check } from "lucide-react";
import { Recipe, Ingredient, TopRatedRecipe } from "../types";
import TopRatedSearch from "./TopRatedSearch";

interface RecipeFormModalProps {
  onClose: () => void;
  onSave: (recipe: Omit<Recipe, "id" | "createdAt">) => Promise<void>;
  onBackgroundSave?: (recipe: Omit<Recipe, "id" | "createdAt">) => Promise<void>;
  editingRecipe?: Recipe | null;
}

const CUISINES = [
  "All", "American", "Italian", "Mexican", "Asian", "Indian", "Mediterranean", 
  "French", "Middle Eastern", "Japanese", "Thai", "Caribbean", "Other"
];

const MEAL_TYPES = ["All", "Starter", "Main", "Side", "Drink", "Dessert", "Snack"] as const;

export default function RecipeFormModal({ onClose, onSave, onBackgroundSave, editingRecipe }: RecipeFormModalProps) {
  const [activeTab, setActiveTab] = useState<"search" | "scraper" | "manual">("search");
  const [url, setUrl] = useState("");
  const [isScraping, setIsScraping] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cuisine, setCuisine] = useState("American");
  const [mealType, setMealType] = useState<typeof MEAL_TYPES[number] | "">("Main");
  const [cookingTime, setCookingTime] = useState<number>(30);
  const [servings, setServings] = useState<number>(4);
  const [ingredients, setIngredients] = useState<Ingredient[]>([{ name: "", amount: 1, unit: "" }]);
  const [instructions, setInstructions] = useState<string[]>([""]);
  const [imageUrl, setImageUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Populate form if editing
  useEffect(() => {
    if (editingRecipe) {
      setTitle(editingRecipe.title || "");
      setDescription(editingRecipe.description || "");
      setCuisine(editingRecipe.cuisine || "Other");
      setMealType((editingRecipe.mealType as any) || "Main");
      setCookingTime(editingRecipe.cookingTime || 30);
      setServings(editingRecipe.servings || 4);
      setIngredients(
        editingRecipe.ingredients && editingRecipe.ingredients.length > 0 
          ? editingRecipe.ingredients 
          : [{ name: "", amount: 1, unit: "" }]
      );
      setInstructions(
        editingRecipe.instructions && editingRecipe.instructions.length > 0 
          ? editingRecipe.instructions 
          : [""]
      );
      setImageUrl(editingRecipe.imageUrl || "");
      setNotes(editingRecipe.notes || "");
      setActiveTab("manual");
    } else {
      setTitle("");
      setDescription("");
      setCuisine("American");
      setMealType("Main");
      setCookingTime(30);
      setServings(4);
      setIngredients([{ name: "", amount: 1, unit: "" }]);
      setInstructions([""]);
      setImageUrl("");
      setNotes("");
      setUrl("");
      setActiveTab("search");
    }
    setScrapeError(null);
  }, [editingRecipe]);

  const handleSelectTopRecipe = (topRecipe: TopRatedRecipe) => {
    setTitle(topRecipe.title || "");
    setDescription(topRecipe.description || "");
    setCuisine(CUISINES.includes(topRecipe.cuisine) ? topRecipe.cuisine : "Other");
    setMealType(topRecipe.mealType || "Main");
    setCookingTime(topRecipe.cookingTime || 30);
    setServings(topRecipe.servings || 4);
    setIngredients(
      topRecipe.ingredients && topRecipe.ingredients.length > 0 
        ? topRecipe.ingredients 
        : [{ name: "", amount: 1, unit: "" }]
    );
    setInstructions(
      topRecipe.instructions && topRecipe.instructions.length > 0 
        ? topRecipe.instructions 
        : [""]
    );
    
    let combinedNotes = topRecipe.notes || "";
    if (topRecipe.keyTechnique) {
      combinedNotes = combinedNotes 
        ? `${combinedNotes}\n\nChef's Secret Technique: ${topRecipe.keyTechnique}`
        : `Chef's Secret Technique: ${topRecipe.keyTechnique}`;
    }
    if (topRecipe.source) {
      combinedNotes = combinedNotes
        ? `${combinedNotes}\nSource: ${topRecipe.source}`
        : `Source: ${topRecipe.source}`;
    }
    setNotes(combinedNotes);
    setImageUrl(topRecipe.imageUrl || "");
    setUrl(topRecipe.sourceUrl || "");
    
    // Smoothly jump to manual view so user can review and save
    setActiveTab("manual");
  };

  const handleQuickSaveTopRecipe = async (topRecipe: TopRatedRecipe) => {
    let combinedNotes = topRecipe.notes || "";
    if (topRecipe.keyTechnique) {
      combinedNotes = combinedNotes 
        ? `${combinedNotes}\n\nChef's Secret: ${topRecipe.keyTechnique}`
        : `Chef's Secret: ${topRecipe.keyTechnique}`;
    }
    if (topRecipe.source) {
      combinedNotes = combinedNotes
        ? `${combinedNotes}\nSource: ${topRecipe.source}`
        : `Source: ${topRecipe.source}`;
    }

    const safeIngredients = topRecipe.ingredients && topRecipe.ingredients.length > 0 
      ? topRecipe.ingredients.map(i => ({
          name: i.name || "Ingredient",
          amount: typeof i.amount === "number" ? i.amount : 0,
          unit: i.unit || ""
        }))
      : [{ name: "Main ingredient", amount: 1, unit: "serving" }];

    const recipeToSave: any = {
      title: topRecipe.title,
      description: topRecipe.description || "",
      cuisine: CUISINES.includes(topRecipe.cuisine) ? topRecipe.cuisine : "Other",
      mealType: topRecipe.mealType || "Main",
      cookingTime: topRecipe.cookingTime || 30,
      servings: topRecipe.servings || 4,
      ingredients: safeIngredients,
      instructions: topRecipe.instructions && topRecipe.instructions.length > 0 ? topRecipe.instructions : ["Follow chef instructions."],
      imageUrl: topRecipe.imageUrl || "",
      sourceUrl: topRecipe.sourceUrl || "",
      notes: combinedNotes || ""
    };

    if (topRecipe.nutrition) {
      recipeToSave.nutrition = topRecipe.nutrition;
    }

    if (onBackgroundSave) {
      await onBackgroundSave(recipeToSave);
    } else {
      await onSave(recipeToSave);
      onClose();
    }
  };

  const handleScrape = async () => {
    if (!url.trim()) return;
    setIsScraping(true);
    setScrapeError(null);

    try {
      const response = await fetch("/api/parse-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to extract recipe from this URL.");
      }

      const parsed: Recipe = await response.json();

      setTitle(parsed.title || "");
      setDescription(parsed.description || "");
      setCuisine(CUISINES.includes(parsed.cuisine) ? parsed.cuisine : "Other");
      setMealType(parsed.mealType || "Main");
      setCookingTime(parsed.cookingTime || 30);
      setServings(parsed.servings || 4);
      setIngredients(
        parsed.ingredients && parsed.ingredients.length > 0 
          ? parsed.ingredients 
          : [{ name: "", amount: 1, unit: "" }]
      );
      setInstructions(
        parsed.instructions && parsed.instructions.length > 0 
          ? parsed.instructions 
          : [""]
      );
      setNotes(parsed.notes || "");
      setImageUrl(parsed.imageUrl || ""); 
      
      setActiveTab("manual");
    } catch (err: any) {
      console.error("Scraping error:", err);
      setScrapeError(err.message || "Could not read recipe. You can enter details manually.");
    } finally {
      setIsScraping(false);
    }
  };

  const handleAddIngredient = () => {
    setIngredients((prev) => [...prev, { name: "", amount: 1, unit: "" }]);
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (index: number, field: keyof Ingredient, value: string | number) => {
    setIngredients((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddInstruction = () => {
    setInstructions((prev) => [...prev, ""]);
  };

  const handleRemoveInstruction = (index: number) => {
    setInstructions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleInstructionChange = (index: number, value: string) => {
    setInstructions((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const filteredIngredients = ingredients
      .filter((i) => i.name && i.name.trim() !== "")
      .map((i) => ({
        name: i.name.trim(),
        amount: typeof i.amount === "number" ? i.amount : 0,
        unit: i.unit ? i.unit.trim() : "",
      }));

    const filteredInstructions = instructions
      .filter((i) => i && i.trim() !== "")
      .map((i) => i.trim());

    if (filteredIngredients.length === 0) {
      alert("Please add at least one ingredient.");
      return;
    }
    if (filteredInstructions.length === 0) {
      alert("Please add at least one instruction step.");
      return;
    }

    setIsSaving(true);
    try {
      const recipeToSave: any = {
        title: title.trim(),
        description: description ? description.trim() : "",
        cuisine: cuisine || "Other",
        mealType: mealType && mealType !== "All" ? mealType : "Main",
        cookingTime: typeof cookingTime === "number" ? cookingTime : 30,
        servings: typeof servings === "number" ? servings : 4,
        ingredients: filteredIngredients,
        instructions: filteredInstructions,
        imageUrl: imageUrl ? imageUrl.trim() : "",
        sourceUrl: url ? url.trim() : "",
        notes: notes ? notes.trim() : "",
      };

      await onSave(recipeToSave);
      onClose();
    } catch (err) {
      console.error("Error saving recipe:", err);
      alert("Failed to save recipe. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full sm:max-w-4xl mx-auto bg-[#FDFBF7] dark:bg-neutral-800 sm:bg-white sm:dark:bg-neutral-850 sm:rounded-2xl sm:border border-neutral-200/80 dark:border-neutral-700 sm:shadow-sm flex flex-col sm:mb-8">
      {/* Responsive Header - Only show when editing to save space on Add Recipe page */}
      {editingRecipe && (
        <div className="shrink-0 flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-neutral-100 dark:border-neutral-800">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-50">
              Edit Recipe
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Update your recipe details below
            </p>
          </div>
        </div>
      )}

      {/* Segmented Mode Switcher (Equal 1/3 columns, highly touch-friendly on mobile) */}
      {!editingRecipe && (
        <div className="shrink-0 px-3 sm:px-6 pt-2.5 sm:pt-3 pb-2.5 sm:pb-2 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30">
          <div className="grid grid-cols-3 gap-1 p-1 bg-neutral-200/70 dark:bg-neutral-900 rounded-xl text-xs font-medium w-full max-w-md mx-auto">
            <button
              id="tab-search"
              type="button"
              onClick={() => setActiveTab("search")}
              className={`h-10 sm:h-8 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 rounded-lg transition-all cursor-pointer select-none active:scale-98 ${
                activeTab === "search"
                  ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50 shadow-xs font-bold"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
              }`}
            >
              <Search className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-amber-500 shrink-0" />
              <span className="hidden sm:inline truncate">Search</span>
            </button>

            <button
              id="tab-scraper"
              type="button"
              onClick={() => setActiveTab("scraper")}
              className={`h-10 sm:h-8 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 rounded-lg transition-all cursor-pointer select-none active:scale-98 ${
                activeTab === "scraper"
                  ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50 shadow-xs font-bold"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
              }`}
            >
              <Link2 className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-blue-500 shrink-0" />
              <span className="hidden sm:inline truncate">Paste URL</span>
            </button>

            <button
              id="tab-manual"
              type="button"
              onClick={() => setActiveTab("manual")}
              className={`h-10 sm:h-8 flex items-center justify-center gap-1 sm:gap-1.5 px-2 sm:px-3 rounded-lg transition-all cursor-pointer select-none active:scale-98 ${
                activeTab === "manual"
                  ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50 shadow-xs font-bold"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200"
              }`}
            >
              <PenTool className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-emerald-500 shrink-0" />
              <span className="hidden sm:inline truncate">Manual</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Tab Views */}
      <div className="p-3.5 sm:p-6 pb-20 sm:pb-6">
        {activeTab === "search" && !editingRecipe ? (
          <TopRatedSearch
            onSelectRecipe={handleSelectTopRecipe}
            onQuickSave={handleQuickSaveTopRecipe}
          />
        ) : activeTab === "scraper" && !editingRecipe ? (
          /* Simplified URL Import View - Mobile Optimized */
          <div className="max-w-xl mx-auto py-5 sm:py-8 space-y-4 text-center px-1 sm:px-0">
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-50">
                Import from any Website
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                Paste any recipe link from NYT Cooking, Serious Eats, food blogs, or websites to extract ingredients and steps.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleScrape();
              }}
              className="flex flex-col sm:flex-row gap-2.5 pt-2"
            >
              <input
                id="scraper-url-input"
                type="url"
                required
                placeholder="Paste recipe URL (e.g. https://...)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isScraping}
                className="w-full sm:flex-1 h-12 px-3.5 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white text-sm"
              />
              <button
                id="draw-recipe-btn"
                type="submit"
                disabled={isScraping || !url.trim()}
                className="w-full sm:w-auto h-12 px-6 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-semibold text-sm rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shrink-0 cursor-pointer shadow-xs active:scale-98"
              >
                {isScraping ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Extracting...</span>
                  </>
                ) : (
                  <>
                    <span>Import Recipe</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {scrapeError && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs rounded-xl border border-red-200 dark:border-red-800 text-left">
                {scrapeError}
              </div>
            )}
          </div>
        ) : (
          /* Mobile-Optimized Manual Form View */
          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6 max-w-3xl mx-auto">
            {/* Title & Description */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1 block">
                  Recipe Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="recipe-title-input"
                  type="text"
                  required
                  placeholder="e.g. Grandma's Lasagna"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1 block">
                  Short Description
                </label>
                <input
                  id="recipe-desc-textarea"
                  type="text"
                  placeholder="Brief note about the dish..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white text-sm"
                />
              </div>
            </div>

            {/* Quick Details: Time and Servings */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 bg-neutral-50/80 dark:bg-neutral-800/40 p-3 sm:p-3.5 rounded-xl border border-neutral-100 dark:border-neutral-800">
              <div>
                <label className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 block mb-1">
                  Cook Time (mins)
                </label>
                <input
                  id="recipe-time-input"
                  type="number"
                  min={1}
                  required
                  value={cookingTime}
                  onChange={(e) => setCookingTime(parseInt(e.target.value) || 0)}
                  className="w-full h-10 sm:h-9 px-2.5 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm sm:text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 block mb-1">
                  Servings
                </label>
                <input
                  id="recipe-servings-input"
                  type="number"
                  min={1}
                  required
                  value={servings}
                  onChange={(e) => setServings(parseInt(e.target.value) || 1)}
                  className="w-full h-10 sm:h-9 px-2.5 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm sm:text-xs focus:outline-none"
                />
              </div>
            </div>

            {/* Meal Type Buttons */}
            <div>
              <label className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 block mb-1.5">
                Meal Type
              </label>
              <div className="flex flex-wrap gap-2">
                {MEAL_TYPES.filter(t => t !== "All").map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setMealType(t as any)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      mealType === t
                        ? "bg-accent-500 dark:bg-accent-400 text-white dark:text-neutral-900 shadow-xs"
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Cuisine Buttons */}
            <div>
              <label className="text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 block mb-1.5">
                Cuisine
              </label>
              <div className="flex flex-wrap gap-2">
                {CUISINES.filter(c => c !== "All").map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCuisine(c)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      cuisine === c
                        ? "bg-accent-500 dark:bg-accent-400 text-white dark:text-neutral-900 shadow-xs"
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Ingredients - Touch & Screen Size Responsive */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-50">
                  Ingredients ({ingredients.length})
                </span>
                <button
                  id="add-ingredient-btn"
                  type="button"
                  onClick={handleAddIngredient}
                  className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1 cursor-pointer p-1"
                >
                  <Plus className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Add Item</span>
                </button>
              </div>

              <div className="space-y-2">
                {ingredients.map((ingredient, index) => (
                  <div key={index}>
                    {/* Mobile View (< sm): 2-tier card layout so ingredient name has ample space */}
                    <div className="sm:hidden p-2.5 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200/70 dark:border-neutral-700/60 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Ingredient name (e.g. Flour)"
                          required
                          value={ingredient.name}
                          onChange={(e) => handleIngredientChange(index, "name", e.target.value)}
                          className="flex-1 px-3 py-2 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredient(index)}
                          disabled={ingredients.length <= 1}
                          className="w-9 h-9 flex items-center justify-center text-neutral-400 hover:text-red-500 disabled:opacity-20 active:scale-95 shrink-0"
                          aria-label="Remove ingredient"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="relative">
                          <input
                            type="number"
                            placeholder="Qty"
                            step="any"
                            min="0"
                            value={ingredient.amount === 0 ? "" : ingredient.amount}
                            onChange={(e) => handleIngredientChange(index, "amount", parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:outline-none"
                          />
                        </div>
                        <input
                          type="text"
                          placeholder="Unit (tbsp, cups)"
                          value={ingredient.unit}
                          onChange={(e) => handleIngredientChange(index, "unit", e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Tablet/Desktop View (>= sm): Compact inline row */}
                    <div className="hidden sm:flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="Ingredient name (e.g. Flour)"
                        required
                        value={ingredient.name}
                        onChange={(e) => handleIngredientChange(index, "name", e.target.value)}
                        className="flex-1 px-3 py-2 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs focus:outline-none"
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        step="any"
                        min="0"
                        value={ingredient.amount === 0 ? "" : ingredient.amount}
                        onChange={(e) => handleIngredientChange(index, "amount", parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-2 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs text-center focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="Unit"
                        value={ingredient.unit}
                        onChange={(e) => handleIngredientChange(index, "unit", e.target.value)}
                        className="w-24 px-2 py-2 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveIngredient(index)}
                        disabled={ingredients.length <= 1}
                        className="p-2 text-neutral-400 hover:text-red-500 disabled:opacity-20 cursor-pointer"
                        aria-label="Remove ingredient"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Ingredient Full-Width Button on Mobile */}
              <button
                type="button"
                onClick={handleAddIngredient}
                className="w-full py-2.5 bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-98"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Ingredient</span>
              </button>
            </div>

            {/* Instructions - Touch & Screen Size Responsive */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-neutral-50">
                  Instructions ({instructions.length} steps)
                </span>
                <button
                  id="add-instruction-btn"
                  type="button"
                  onClick={handleAddInstruction}
                  className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white flex items-center gap-1 cursor-pointer p-1"
                >
                  <Plus className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Add Step</span>
                </button>
              </div>

              <div className="space-y-2">
                {instructions.map((step, index) => (
                  <div key={index} className="flex gap-2 items-start bg-neutral-50/60 dark:bg-neutral-800/30 p-2 sm:p-0 rounded-xl border sm:border-none border-neutral-100 dark:border-neutral-800">
                    <span className="w-6 h-6 mt-1 flex items-center justify-center bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-bold rounded-full shrink-0">
                      {index + 1}
                    </span>
                    <textarea
                      rows={2}
                      placeholder={`Step ${index + 1} description...`}
                      required
                      value={step}
                      onChange={(e) => handleInstructionChange(index, e.target.value)}
                      className="flex-1 px-3 py-2 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none resize-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveInstruction(index)}
                      disabled={instructions.length <= 1}
                      className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-red-500 disabled:opacity-20 mt-1 cursor-pointer shrink-0 active:scale-95"
                      aria-label="Remove step"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Step Full-Width Button on Mobile */}
              <button
                type="button"
                onClick={handleAddInstruction}
                className="w-full py-2.5 bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-98"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Step</span>
              </button>
            </div>

            {/* Notes (Optional) */}
            <div className="pt-1">
              <label className="text-xs font-bold text-neutral-900 dark:text-neutral-50 mb-1 block">
                Notes & Chef Tips <span className="text-neutral-400 font-normal">(Optional)</span>
              </label>
              <textarea
                id="recipe-notes-textarea"
                placeholder="Secret tips, substitutions, or pairing ideas..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none resize-none"
              />
            </div>

            {/* Save Buttons - Stacked on Mobile with Thumb-Friendly Tap Targets */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 pt-4 border-t border-neutral-150 dark:border-neutral-800">
              <button
                id="submit-form-btn"
                type="submit"
                disabled={isSaving}
                className="w-full sm:w-auto px-6 py-3.5 sm:py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm font-semibold rounded-xl hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm active:scale-98"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving to Cookbook...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save to Cookbook</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
