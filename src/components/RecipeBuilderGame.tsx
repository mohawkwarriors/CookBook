import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import { Recipe } from "../types";

interface RecipeBuilderGameProps {
  onRecipeGenerated: (recipe: Recipe) => void;
}

const QUESTION_BANK = [
  { id: "star", title: "What's the star ingredient today?", type: "text", placeholder: "e.g. Chicken, Tofu, Pasta..." },
  { id: "secondary", title: "Any secondary ingredient to throw in?", type: "text", placeholder: "e.g. Garlic, Spinach, Beans..." },
  { id: "time", title: "How much time do you have?", type: "choice", options: ["Under 15 mins", "About 30 mins", "Take my time", "Weekend project"] },
  { id: "method", title: "How do you want to cook?", type: "choice", options: ["Stovetop", "Oven", "Microwave", "No-cook", "Surprise me"] },
  { id: "vibe", title: "What's the vibe?", type: "choice", options: ["Comforting", "Fresh & Light", "Spicy", "Indulgent"] },
  { id: "mealType", title: "What meal is this for?", type: "choice", options: ["Breakfast", "Lunch", "Dinner", "Snack"] },
  { id: "meatPref", title: "Protein preference?", type: "choice", options: ["Meat or Poultry", "Vegetarian", "Either works"] },
  { id: "texture", title: "Texture you're craving?", type: "choice", options: ["Crunchy", "Creamy", "Chewy", "Crispy"] },
  { id: "weather", title: "What's the weather like?", type: "choice", options: ["Hot & Sunny", "Cold & Rainy", "Chilly Fall", "Breezy Spring"] },
  { id: "audience", title: "Who are you cooking for?", type: "choice", options: ["Just me", "Date night", "Family dinner", "Hosting a crowd"] },
  { id: "flavor", title: "Pick a flavor profile", type: "choice", options: ["Sweet & Savory", "Bright & Tangy", "Rich & Umami", "Spicy & Bold"] },
  { id: "hate", title: "Any ingredient you want to avoid?", type: "text", placeholder: "e.g. Cilantro, Olives, Mushrooms..." },
  { id: "fridge", title: "Anything in the fridge to use up?", type: "text", placeholder: "e.g. Half an onion, wilting spinach..." },
  { id: "effort", title: "How much effort tonight?", type: "choice", options: ["Minimal prep", "Some chopping", "Full chef mode"] },
  { id: "tool", title: "Preferred kitchen tool?", type: "choice", options: ["Blender", "Cast iron skillet", "Sheet pan", "One pot"] },
  { id: "cheese", title: "How much cheese?", type: "choice", options: ["Extra cheesy", "A light sprinkle", "No cheese"] },
  { id: "protein", title: "Pick a protein source", type: "choice", options: ["Beans & Lentils", "Eggs", "Nuts & Seeds", "Meat or Poultry"] },
  { id: "spice", title: "Spice level?", type: "choice", options: ["Mild", "Medium kick", "Very spicy"] },
  { id: "base", title: "Pick a base", type: "choice", options: ["Rice & Grains", "Pasta & Noodles", "Bread or Wrap", "Leafy Greens"] },
  { id: "dominant", title: "Pick a dominant note", type: "choice", options: ["Garlicky", "Citrusy", "Smoky", "Herby"] },
  { id: "health", title: "Nutrition goal?", type: "choice", options: ["High protein & light", "Balanced", "Comfort food", "Indulgent treat"] },
  { id: "secret", title: "Any secret ingredient to sneak in?", type: "text", placeholder: "e.g. Miso, Cinnamon, Anchovies..." },
  { id: "region", title: "Pick a regional inspiration", type: "choice", options: ["Mediterranean", "South Asian", "Middle Eastern", "Tex-Mex"] },
  { id: "plating", title: "Serving style?", type: "choice", options: ["Rustic family-style", "Composed plate", "Grain or noodle bowl", "Straight from the skillet"] },
];

export default function RecipeBuilderGame({ onRecipeGenerated }: RecipeBuilderGameProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentInput, setCurrentInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<typeof QUESTION_BANK>([]);

  useEffect(() => {
    const shuffled = [...QUESTION_BANK].sort(() => 0.5 - Math.random());
    setSelectedQuestions(shuffled.slice(0, 8));
  }, []);

  if (selectedQuestions.length === 0) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const question = selectedQuestions[currentIndex];
  const progress = ((currentIndex + 1) / selectedQuestions.length) * 100;

  const handleNext = async (choice?: string) => {
    const answer = choice || currentInput;
    if (!answer.trim() && question.type === "text") return;

    const newAnswers = { ...answers, [question.id]: answer };
    setAnswers(newAnswers);
    setCurrentInput("");

    if (currentIndex < selectedQuestions.length - 1) {
      setCurrentIndex((curr) => curr + 1);
    } else {
      await generateRecipe(newAnswers);
    }
  };

  const generateRecipe = async (finalAnswers: Record<string, string>) => {
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: finalAnswers }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate recipe.");
      }

      const recipe: Recipe = await res.json();
      onRecipeGenerated(recipe);
      setCurrentIndex(0);
      setAnswers({});
    } catch (err: any) {
      setError(err.message || "Something went wrong while building your recipe.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-5">
        <div className="w-14 h-14 rounded-full bg-secondary border border-border flex items-center justify-center relative">
          <Sparkles className="w-6 h-6 text-primary-dark animate-pulse" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Building your custom recipe...
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Combining your ingredients, technique preferences, and flavor profile.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Couldn&apos;t generate recipe</h2>
        <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
        <button
          onClick={() => generateRecipe(answers)}
          className="mt-2 h-11 px-6 bg-foreground text-background rounded-full text-sm font-medium hover:opacity-85 transition-opacity flex items-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Try Again</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 sm:py-14 flex flex-col min-h-[65vh]">
      {/* Clean Progress Header */}
      <div className="mb-12 space-y-3">
        <div className="flex justify-between items-center text-xs">
          <span className="font-medium text-muted-foreground">Recipe Framework Builder</span>
          <span className="font-mono tabular-nums text-muted-foreground">
            {currentIndex + 1} / {selectedQuestions.length}
          </span>
        </div>
        <div className="w-full bg-secondary h-1 rounded-full overflow-hidden">
          <div
            className="bg-primary h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question Stage */}
      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="flex-1 flex flex-col justify-center space-y-8"
        >
          <h2 className="font-serif text-4xl sm:text-5xl font-semibold text-foreground tracking-[-0.015em] leading-tight text-center">
            {question.title}
          </h2>

          {question.type === "text" ? (
            <div className="max-w-md mx-auto w-full space-y-4">
              <input
                type="text"
                autoFocus
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleNext();
                }}
                placeholder={question.placeholder}
                className="w-full text-center text-lg py-4 px-5 bg-card text-foreground border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-ring/20 placeholder:text-muted-foreground"
              />
              <button
                onClick={() => handleNext()}
                disabled={!currentInput.trim()}
                className="w-full h-12 bg-foreground text-background rounded-full font-medium text-sm hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto w-full">
              {question.options?.map((opt) => (
                <button
                  key={opt}
                  onClick={() => handleNext(opt)}
                  className="p-4 sm:p-5 border border-border bg-card hover:border-foreground hover:bg-secondary/60 rounded-2xl text-sm sm:text-base font-medium text-foreground transition-all active:scale-[0.98] text-left flex items-center justify-between group cursor-pointer"
                >
                  <span>{opt}</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
