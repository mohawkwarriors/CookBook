import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Loader2,
  Plus,
  Trash2,
  ArrowRight,
  Search,
  PenTool,
  Link2,
  Check,
  Upload,
  Sparkles,
  X,
  RefreshCw,
  Image as ImageIcon,
} from "lucide-react";
import { Recipe, Ingredient, TopRatedRecipe } from "../types";
import TopRatedSearch from "./TopRatedSearch";
import RecipeIcon from "./RecipeIcon";
import { getMealTypeButtonColor } from "../lib/utils";
import { compressImageFile, searchStandInPhotosDetailed, StandInPhoto } from "../lib/imageSearch";

interface RecipeFormModalProps {
  onClose: () => void;
  onSave: (recipe: Omit<Recipe, "id" | "createdAt">) => Promise<void>;
  onBackgroundSave?: (recipe: Omit<Recipe, "id" | "createdAt">) => Promise<void>;
  editingRecipe?: Recipe | null;
}

const CUISINES = [
  "All", "Desi", "Persian", "Middle Eastern", "American", "Italian", "Mexican",
  "Asian", "Thai", "Mediterranean", "French", "Japanese", "Caribbean", "Other"
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
  const [mealType, setMealType] = useState<(typeof MEAL_TYPES)[number] | "">("Main");
  const [cookingTime, setCookingTime] = useState<number>(30);
  const [servings, setServings] = useState<number>(4);
  const [ingredients, setIngredients] = useState<Ingredient[]>([{ name: "", amount: 1, unit: "" }]);
  const [instructions, setInstructions] = useState<string[]>([""]);
  const [imageUrl, setImageUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Photo upload & stand-in suggestions state
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [standInPhotos, setStandInPhotos] = useState<StandInPhoto[]>([]);
  const [isLoadingStandIns, setIsLoadingStandIns] = useState(false);
  const [standInQuery, setStandInQuery] = useState("");
  const [standInDiagnostic, setStandInDiagnostic] = useState<string | null>(null);
  const [failedStandIns, setFailedStandIns] = useState<Set<string>>(new Set());
  const [fallbackStandIns, setFallbackStandIns] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadStandInPhotos = async (
    queryText: string,
    cuisineText?: string,
    forceRefresh = false
  ) => {
    const q = queryText.trim();
    if (!q) return;
    setIsLoadingStandIns(true);
    setFailedStandIns(new Set());
    setFallbackStandIns(new Set());
    setStandInDiagnostic(null);
    try {
      const result = await searchStandInPhotosDetailed(q, cuisineText, 10, { forceRefresh });
      setStandInPhotos(result.photos);
      setStandInDiagnostic(result.diagnostic || null);
    } finally {
      setIsLoadingStandIns(false);
    }
  };

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
      setStandInQuery(editingRecipe.title || "");
      setStandInPhotos([]);
      setStandInDiagnostic(null);
      setImageError(null);
      setActiveTab("manual");

      // Automatically pull related stand-in photos when editing a recipe with no uploaded photo
      if (!editingRecipe.imageUrl && editingRecipe.title) {
        loadStandInPhotos(editingRecipe.title, editingRecipe.cuisine);
      }
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
      setStandInQuery("");
      setStandInPhotos([]);
      setStandInDiagnostic(null);
      setImageError(null);
      setActiveTab("search");
    }
    setScrapeError(null);
    setFormError(null);
  }, [editingRecipe]);

  const handleImageFileSelect = async (file: File | undefined | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImageError("Please choose an image file (JPG, PNG, WebP, etc.).");
      return;
    }
    setIsUploadingImage(true);
    setImageError(null);
    try {
      const compressedDataUrl = await compressImageFile(file, 900, 0.8);
      setImageUrl(compressedDataUrl);
    } catch (err: any) {
      setImageError(err?.message || "Failed to process image. Please try another file.");
    } finally {
      setIsUploadingImage(false);
    }
  };

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

    const safeIngredients =
      topRecipe.ingredients && topRecipe.ingredients.length > 0
        ? topRecipe.ingredients.map((i) => ({
            name: i.name || "Ingredient",
            amount: typeof i.amount === "number" ? i.amount : 0,
            unit: i.unit || "",
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
      instructions:
        topRecipe.instructions && topRecipe.instructions.length > 0
          ? topRecipe.instructions
          : ["Follow chef instructions."],
      imageUrl: topRecipe.imageUrl || "",
      sourceUrl: topRecipe.sourceUrl || "",
      notes: combinedNotes || "",
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

  const handleAddIngredient = () => setIngredients((prev) => [...prev, { name: "", amount: 1, unit: "" }]);
  const handleRemoveIngredient = (index: number) => setIngredients((prev) => prev.filter((_, i) => i !== index));
  const handleIngredientChange = (index: number, field: keyof Ingredient, value: string | number) => {
    setIngredients((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddInstruction = () => setInstructions((prev) => [...prev, ""]);
  const handleRemoveInstruction = (index: number) => setInstructions((prev) => prev.filter((_, i) => i !== index));
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

    setFormError(null);
    if (filteredIngredients.length === 0) {
      setFormError("Please add at least one ingredient.");
      return;
    }
    if (filteredInstructions.length === 0) {
      setFormError("Please add at least one instruction step.");
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
      setFormError("Failed to save recipe. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const renderActionButtons = (submitButtonId: string) => (
    <>
      <button
        type="button"
        onClick={onClose}
        className="h-11 px-5 rounded-full border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
      >
        Cancel
      </button>
      <button
        id={submitButtonId}
        type="submit"
        disabled={isSaving}
        className="h-11 px-6 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-85 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
      >
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Saving...</span>
          </>
        ) : (
          <>
            <Check className="w-4 h-4 text-primary" strokeWidth={2.5} />
            <span>{editingRecipe ? "Save Changes" : "Save Recipe"}</span>
          </>
        )}
      </button>
    </>
  );

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-12">
      {/* Mode Switcher */}
      {!editingRecipe && (
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
          <div className="inline-flex items-center p-1 rounded-full bg-secondary border border-border/60 w-full sm:w-auto">
            {[
              { id: "search", label: "Discover", Icon: Search },
              { id: "scraper", label: "Import URL", Icon: Link2 },
              { id: "manual", label: "Write Manually", Icon: PenTool },
            ].map(({ id, label, Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  id={`tab-${id}`}
                  type="button"
                  onClick={() => setActiveTab(id as any)}
                  className={`flex-1 sm:flex-initial h-9 px-4 rounded-full text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    active
                      ? "bg-foreground text-background shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {activeTab === "search" && !editingRecipe ? (
          <motion.div
            key="tab-search-content"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
          >
            <TopRatedSearch
              onSelectRecipe={handleSelectTopRecipe}
              onQuickSave={handleQuickSaveTopRecipe}
            />
          </motion.div>
        ) : activeTab === "scraper" && !editingRecipe ? (
          <motion.div
            key="tab-scraper-content"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="max-w-xl mx-auto py-8 sm:py-12 space-y-5 text-center"
          >
            <div className="space-y-2">
              <h3 className="text-xl font-semibold tracking-tight text-foreground">
                Import from any website
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                Paste a link from NYT Cooking, Serious Eats, Cook Well, or any food blog to automatically extract ingredients and steps.
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
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isScraping}
                className="w-full sm:flex-1 h-11 px-4 bg-card text-foreground border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-ring/20 text-sm placeholder:text-muted-foreground"
              />
              <button
                id="draw-recipe-btn"
                type="submit"
                disabled={isScraping || !url.trim()}
                className="w-full sm:w-auto h-11 px-6 bg-foreground text-background font-medium text-sm rounded-full hover:opacity-85 transition-opacity flex items-center justify-center gap-2 disabled:opacity-40 shrink-0 cursor-pointer"
              >
                {isScraping ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Extracting...</span>
                  </>
                ) : (
                  <>
                    <span>Import</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {scrapeError && (
              <div className="p-3.5 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-xs rounded-2xl border border-red-200 dark:border-red-900/50 text-left">
                {scrapeError}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.form
            key="tab-manual-content"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            onSubmit={handleSubmit}
            className="space-y-8 max-w-3xl"
          >
            {/* Top Save Bar (Edit Mode) */}
            {editingRecipe && (
              <div className="space-y-3 pb-4 border-b border-border">
                <div className="flex items-center justify-end gap-3">
                  {renderActionButtons("submit-form-btn-top")}
                </div>
                {formError && (
                  <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-400 text-xs">
                    {formError}
                  </div>
                )}
              </div>
            )}

            {/* Title, Description & Cover Image URL */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Recipe Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="recipe-title-input"
                  type="text"
                  required
                  placeholder="e.g. Black Pepper Chicken Club Sandwich"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-11 px-4 bg-card text-foreground border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/20 text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Short Description
                </label>
                <input
                  id="recipe-desc-textarea"
                  type="text"
                  placeholder="What makes this dish great..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full h-11 px-4 bg-card text-foreground border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring/20 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Cook Time (mins)
                  </label>
                  <input
                    id="recipe-time-input"
                    type="number"
                    min={1}
                    required
                    value={cookingTime}
                    onChange={(e) => setCookingTime(parseInt(e.target.value) || 0)}
                    className="w-full h-10 px-3.5 bg-card text-foreground border border-border rounded-xl text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                    Servings
                  </label>
                  <input
                    id="recipe-servings-input"
                    type="number"
                    min={1}
                    required
                    value={servings}
                    onChange={(e) => setServings(parseInt(e.target.value) || 1)}
                    className="w-full h-10 px-3.5 bg-card text-foreground border border-border rounded-xl text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring/20"
                  />
                </div>
              </div>
            </div>

            {/* Recipe Cover Photo Upload & Internet Stand-In Photos */}
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <label className="text-sm font-semibold text-foreground block">
                    Recipe Photo
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Upload your own photo, or pick a stand-in photo from the web.
                  </p>
                </div>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl("")}
                    className="text-xs font-medium text-muted-foreground hover:text-red-500 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Remove photo</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start">
                {/* 4:5 Cover Preview */}
                <div className="sm:col-span-4">
                  <div className="relative aspect-[4/5] w-40 sm:w-full max-w-[190px] rounded-xl overflow-hidden border border-border bg-muted">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={title || "Recipe preview"}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <RecipeIcon
                        recipe={{
                          title: title || "New Recipe",
                          description,
                          cuisine,
                          mealType: (mealType && mealType !== "All" ? mealType : "Main") as any,
                          cookingTime,
                          servings,
                          ingredients,
                          instructions,
                        }}
                        variant="cover"
                        className="w-full h-full"
                      />
                    )}
                  </div>
                </div>

                {/* Upload Dropzone + Direct URL */}
                <div className="sm:col-span-8 space-y-3">
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleImageFileSelect(file);
                    }}
                    className="rounded-xl border border-dashed border-border hover:border-primary/60 bg-secondary/40 p-4 transition-colors"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        handleImageFileSelect(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                      className="hidden"
                    />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-background border border-border flex items-center justify-center shrink-0">
                          {isUploadingImage ? (
                            <Loader2 className="w-4 h-4 animate-spin text-primary-dark" />
                          ) : (
                            <Upload className="w-4 h-4 text-primary-dark" />
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-foreground">
                            {isUploadingImage ? "Optimizing photo..." : "Upload your own photo"}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Drag &amp; drop or choose from your device (auto-resized)
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingImage}
                        className="h-9 px-4 rounded-full bg-foreground text-background text-xs font-medium hover:opacity-85 transition-opacity shrink-0 cursor-pointer disabled:opacity-50"
                      >
                        Choose File
                      </button>
                    </div>
                  </div>

                  {imageError && (
                    <p className="text-xs text-red-600 dark:text-red-400">{imageError}</p>
                  )}

                  {/* Optional Direct Image URL Input */}
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground mb-1 block">
                      Or paste an image URL directly
                    </label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={imageUrl.startsWith("data:") ? "" : imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="w-full h-9 px-3 bg-card text-foreground border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-ring/20 placeholder:text-muted-foreground"
                    />
                  </div>
                </div>
              </div>

              {/* Stand-In Photos Picker */}
              <div className="rounded-2xl border border-border bg-secondary/35 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary-dark" />
                    <span className="text-xs font-semibold text-foreground">
                      Stand-In Photos from the Web
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <input
                      type="text"
                      value={standInQuery}
                      onChange={(e) => setStandInQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          loadStandInPhotos(standInQuery || title, cuisine, true);
                        }
                      }}
                      placeholder={title || "Search dish name..."}
                      className="flex-1 sm:w-48 h-8 px-3 rounded-full bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
                    />
                    <button
                      type="button"
                      onClick={() => loadStandInPhotos(standInQuery || title, cuisine, true)}
                      disabled={isLoadingStandIns || !(standInQuery.trim() || title.trim())}
                      className="h-8 px-3 rounded-full border border-border bg-background hover:bg-secondary text-xs font-medium text-foreground transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-40"
                    >
                      {isLoadingStandIns ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3 h-3" />
                      )}
                      <span>{standInPhotos.length > 0 ? "Refresh" : "Find Photos"}</span>
                    </button>
                  </div>
                </div>

                {standInDiagnostic && !isLoadingStandIns && (
                  <p className="text-[11px] text-amber-700 dark:text-amber-400">
                    {standInDiagnostic}
                  </p>
                )}

                {isLoadingStandIns ? (
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="aspect-[4/5] rounded-lg bg-muted animate-pulse" />
                    ))}
                  </div>
                ) : standInPhotos.filter((p) => !failedStandIns.has(p.url)).length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                    {standInPhotos
                      .filter((p) => !failedStandIns.has(p.url))
                      .slice(0, 6)
                      .map((photo) => {
                        const effectiveUrl =
                          fallbackStandIns.has(photo.url) && photo.fallbackUrl
                            ? photo.fallbackUrl
                            : photo.url;
                        const isSelected = imageUrl === effectiveUrl || imageUrl === photo.url;
                        return (
                          <button
                            key={photo.url}
                            type="button"
                            onClick={() => setImageUrl(isSelected ? "" : effectiveUrl)}
                            className={`group relative aspect-[4/5] rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                              isSelected
                                ? "border-primary ring-2 ring-primary/30 scale-[0.98]"
                                : "border-transparent hover:border-foreground/30"
                            }`}
                            title={`${photo.label}${photo.source ? ` (${photo.source})` : ""}`}
                          >
                            <img
                              src={effectiveUrl}
                              alt={photo.label}
                              referrerPolicy="no-referrer"
                              onError={() => {
                                if (photo.fallbackUrl && !fallbackStandIns.has(photo.url)) {
                                  setFallbackStandIns((prev) => new Set(prev).add(photo.url));
                                } else {
                                  setFailedStandIns((prev) => new Set(prev).add(photo.url));
                                }
                              }}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                            {photo.source && (
                              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/40 to-transparent px-1.5 pb-1 pt-3 text-[9px] font-medium text-white/95 truncate opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-left">
                                {photo.source}
                              </span>
                            )}
                            {isSelected && (
                              <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
                                <Check className="w-3 h-3" strokeWidth={3} />
                              </span>
                            )}
                          </button>
                        );
                      })}
                  </div>
                ) : (
                  <div className="py-4 text-center flex flex-col items-center gap-1 text-xs text-muted-foreground">
                    <ImageIcon className="w-4 h-4 opacity-50" />
                    <span>
                      {title.trim()
                        ? "Click \"Find Photos\" to pull stand-in photos for this dish."
                        : "Enter a recipe title above, then click \"Find Photos\"."}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Category & Cuisine Pills */}
            <div className="space-y-4 pt-2 border-t border-border">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-2">
                  Meal Type
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {MEAL_TYPES.filter((t) => t !== "All").map((t) => {
                    const selected = mealType === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setMealType(t as any)}
                        className={`h-8 px-3.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${getMealTypeButtonColor(
                          t,
                          selected
                        )}`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-2">
                  Cuisine
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CUISINES.filter((c) => c !== "All").map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCuisine(c)}
                      className={`h-8 px-3.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                        cuisine === c
                          ? "bg-foreground text-background"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Ingredients */}
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">
                  Ingredients ({ingredients.length})
                </span>
                <button
                  id="add-ingredient-btn"
                  type="button"
                  onClick={handleAddIngredient}
                  className="text-xs font-medium text-foreground hover:opacity-75 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Item</span>
                </button>
              </div>

              <div className="space-y-2">
                {ingredients.map((ingredient, index) => (
                  <div key={index} className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <input
                      type="text"
                      placeholder="Ingredient name (e.g. Chicken thighs)"
                      required
                      value={ingredient.name}
                      onChange={(e) => handleIngredientChange(index, "name", e.target.value)}
                      className="flex-1 h-10 px-3.5 bg-card text-foreground border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
                    />
                    <div className="flex gap-2 items-center">
                      <input
                        type="number"
                        placeholder="Qty"
                        step="any"
                        min="0"
                        value={ingredient.amount === 0 ? "" : ingredient.amount}
                        onChange={(e) => handleIngredientChange(index, "amount", parseFloat(e.target.value) || 0)}
                        className="w-20 h-10 px-2.5 bg-card text-foreground border border-border rounded-xl text-sm text-center tabular-nums focus:outline-none focus:ring-2 focus:ring-ring/20"
                      />
                      <input
                        type="text"
                        placeholder="Unit"
                        value={ingredient.unit}
                        onChange={(e) => handleIngredientChange(index, "unit", e.target.value)}
                        className="flex-1 sm:w-28 h-10 px-3 bg-card text-foreground border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/20"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveIngredient(index)}
                        disabled={ingredients.length <= 1}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-secondary disabled:opacity-20 cursor-pointer shrink-0"
                        aria-label="Remove ingredient"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddIngredient}
                className="w-full h-10 rounded-xl border border-dashed border-border hover:border-foreground/30 hover:bg-secondary/50 text-xs font-medium text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Ingredient</span>
              </button>
            </div>

            {/* Method Steps */}
            <div className="space-y-3 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">
                  Method ({instructions.length} steps)
                </span>
                <button
                  id="add-instruction-btn"
                  type="button"
                  onClick={handleAddInstruction}
                  className="text-xs font-medium text-foreground hover:opacity-75 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Step</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {instructions.map((step, index) => (
                  <div key={index} className="flex gap-2.5 items-start">
                    <span className="w-7 h-7 mt-1.5 flex items-center justify-center bg-foreground text-background text-xs font-semibold rounded-full shrink-0 tabular-nums">
                      {index + 1}
                    </span>
                    <textarea
                      rows={2}
                      placeholder={`Step ${index + 1}...`}
                      required
                      value={step}
                      onChange={(e) => handleInstructionChange(index, e.target.value)}
                      className="flex-1 px-3.5 py-2.5 bg-card text-foreground border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 resize-y"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveInstruction(index)}
                      disabled={instructions.length <= 1}
                      className="w-9 h-9 mt-1 rounded-full flex items-center justify-center text-muted-foreground hover:text-red-500 hover:bg-secondary disabled:opacity-20 cursor-pointer shrink-0"
                      aria-label="Remove step"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddInstruction}
                className="w-full h-10 rounded-xl border border-dashed border-border hover:border-foreground/30 hover:bg-secondary/50 text-xs font-medium text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Step</span>
              </button>
            </div>

            {/* Notes */}
            <div className="pt-4 border-t border-border">
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Notes &amp; Technique Tips (Optional)
              </label>
              <textarea
                id="recipe-notes-textarea"
                placeholder="Substitutions, timing tips, or the why behind the technique..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-3.5 py-2.5 bg-card text-foreground border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 resize-y"
              />
            </div>

            {formError && (
              <div className="p-3.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-400 text-xs">
                {formError}
              </div>
            )}

            {/* Footer Save Bar */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              {renderActionButtons("submit-form-btn")}
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
