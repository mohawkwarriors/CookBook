import React, { useState, useEffect, useMemo } from "react";
import { Sparkles, ArrowRight, Loader2, Check, RefreshCw } from "lucide-react";
import { Recipe } from "../types";

interface RecipeBuilderGameProps {
  onRecipeGenerated: (recipe: Recipe) => void;
}

const QUESTION_BANK = [
  { id: "star", title: "What's the star ingredient today? 🌟", type: "text", placeholder: "e.g. Chicken, Tofu, Pasta..." },
  { id: "secondary", title: "Any secondary ingredient to throw in? 🥕", type: "text", placeholder: "e.g. Garlic, Spinach, Beans..." },
  { id: "time", title: "How much time do you have? ⏳", type: "choice", options: ["Under 15 mins 🏃", "About 30 mins ⏰", "Take my time 🧑‍🍳", "Weekend project 🏗️"] },
  { id: "method", title: "How are we cooking? 🔥", type: "choice", options: ["Stovetop 🍳", "Oven ♨️", "Microwave ⚡", "No-cook 🥗", "Surprise me 🎲"] },
  { id: "vibe", title: "What's the vibe? ✨", type: "choice", options: ["Comforting 🫂", "Fresh & Light 🌱", "Spicy 🔥", "Indulgent 🤤"] },
  { id: "mealType", title: "What meal is this for? 🍽️", type: "choice", options: ["Breakfast 🥞", "Lunch 🥪", "Dinner 🍷", "Snack 🥨"] },
  { id: "meatPref", title: "Meat or Veggie? 🥩🥦", type: "choice", options: ["Meat please 🥩", "Vegetarian 🌱", "Don't care 🤷"] },
  { id: "texture", title: "Texture preference? 🍞", type: "choice", options: ["Crunchy 💥", "Creamy 🥣", "Chewy 🥨", "Crispy 🍟"] },
  { id: "weather", title: "What's the weather like? ☀️🌧️", type: "choice", options: ["Hot & Sunny ☀️", "Cold & Rainy 🌧️", "Chilly Fall 🍂", "Breezy Spring 🌸"] },
  { id: "audience", title: "Who are we cooking for? 👥", type: "choice", options: ["Just me 👤", "Date night 🥂", "Family dinner 👨‍👩‍👧‍👦", "Party crowd 🎉"] },
  { id: "flavor", title: "Flavor profile? 👅", type: "choice", options: ["Sweet & Savory 🍯", "Sour & Tangy 🍋", "Rich & Umami 🍄", "Spicy & Bold 🌶️"] },
  { id: "hate", title: "Any ingredient you absolutely HATE? 🙅", type: "text", placeholder: "e.g. Cilantro, Olives, Mushrooms..." },
  { id: "fridge", title: "What's in your fridge that needs to go? 🧊", type: "text", placeholder: "e.g. Half an onion, wilting spinach..." },
  { id: "shape", title: "Pick a shape! 🔺", type: "choice", options: ["Round/Balls 🍡", "Long/Noodles 🍜", "Chopped/Diced 🔪", "Mashed 🥔"] },
  { id: "effort", title: "How much effort? 😓", type: "choice", options: ["Zero effort 🛋️", "A little chopping 🔪", "I want to feel like a chef 🧑‍🍳"] },
  { id: "tool", title: "What kitchen tool do you want to use? 🔪", type: "choice", options: ["Blender 🌪️", "Cast iron skillet 🍳", "Baking sheet ♨️", "Just a bowl 🥣"] },
  { id: "cheese", title: "Are we feeling cheesy today? 🧀", type: "choice", options: ["Extra cheese please! 🧀", "A little sprinkle 🤏", "No cheese for me 🙅"] },
  { id: "protein", title: "Pick a protein source! 🥚", type: "choice", options: ["Beans & Lentils 🫘", "Eggs 🍳", "Nuts & Seeds 🥜", "Meat/Poultry 🍗"] },
  { id: "spice", title: "What's your spice tolerance? 🌶️", type: "choice", options: ["None, keep it mild 😌", "A little kick 🌶️", "Burn my tongue off 🔥"] },
  { id: "base", title: "Pick a base! 🍚", type: "choice", options: ["Rice/Grains 🍚", "Pasta/Noodles 🍝", "Bread/Wrap 🥖", "Leafy Greens 🥗"] },
  { id: "mood", title: "What's your current mood? 🎭", type: "choice", options: ["Lazy 🦥", "Energetic ⚡", "Adventurous 🤠", "Nostalgic 🕰️"] },
  { id: "dominant", title: "Pick a dominant flavor! 🍋", type: "choice", options: ["Garlicky 🧄", "Lemony/Citrus 🍋", "Smoky 💨", "Herby 🌿"] },
  { id: "health", title: "How healthy are we trying to be? 🥗", type: "choice", options: ["Health is wealth 🧘", "Balanced ⚖️", "I want comfort food 🍔", "Full cheat day 🍩"] },
  { id: "sound", title: "Pick a cooking sound! 🍳", type: "choice", options: ["Sizzle 🥓", "Simmer 🍲", "Crunch 🥖", "Silence (no-cook) 🤫"] },
  { id: "beverage", title: "What's your beverage pairing? 🍷", type: "choice", options: ["Water 💧", "Tea/Coffee ☕", "Juice/Soda 🥤", "Mocktail/Non-alcoholic 🍹"] },
  { id: "secret", title: "Any secret ingredient you want to sneak in? 🤫", type: "text", placeholder: "e.g. Cinnamon, Cocoa powder, Anchovies..." },
  { id: "region", title: "Pick a regional inspiration! 🌍", type: "choice", options: ["Mediterranean 🫒", "South Asian 🍛", "Middle Eastern 🥙", "Tex-Mex 🌮"] },
  { id: "plating", title: "What's your plating style? 📸", type: "choice", options: ["Rustic & Messy 🏚️", "Fine Dining 🍽️", "Bowl food 🥣", "Eat from the pan 🍳"] },
  { id: "sweetness", title: "Sweetness level? 🍯", type: "choice", options: ["No sweet 🚫", "A hint of sweetness 🤏", "Sweet & Savory 🍯🥓", "Dessert level 🍰"] },
  { id: "color", title: "Pick a color palette! 🎨", type: "choice", options: ["Green & Vibrant 🥬", "Warm & Earthy 🍠", "Red & Fiery 🍅", "Rainbow 🌈"] }
];

export default function RecipeBuilderGame({ onRecipeGenerated }: RecipeBuilderGameProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentInput, setCurrentInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Dynamically select 8 random questions when the component mounts
  const [selectedQuestions, setSelectedQuestions] = useState<typeof QUESTION_BANK>([]);

  useEffect(() => {
    const shuffled = [...QUESTION_BANK].sort(() => 0.5 - Math.random());
    setSelectedQuestions(shuffled.slice(0, 8));
  }, []);

  if (selectedQuestions.length === 0) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-neutral-400" /></div>;
  }

  const question = selectedQuestions[currentIndex];
  const progress = ((currentIndex) / selectedQuestions.length) * 100;

  const handleNext = async (choice?: string) => {
    const answer = choice || currentInput;
    if (!answer.trim() && question.type === "text") return;

    const newAnswers = { ...answers, [question.id]: answer };
    setAnswers(newAnswers);
    setCurrentInput("");

    if (currentIndex < selectedQuestions.length - 1) {
      setCurrentIndex(curr => curr + 1);
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
      
      // Reset for next time
      setCurrentIndex(0);
      setAnswers({});
    } catch (err: any) {
      setError(err.message || "Oops, something went wrong in the kitchen.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (isGenerating) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="w-20 h-20 bg-accent-50 dark:bg-accent-500/10 rounded-full flex items-center justify-center mb-4 relative">
          <Sparkles className="w-10 h-10 text-accent-500 dark:text-accent-400 animate-pulse" />
          <div className="absolute inset-0 border-4 border-accent-200 dark:border-accent-900 border-t-accent-500 dark:border-t-accent-400 rounded-full animate-spin"></div>
        </div>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">Cooking up your recipe...</h2>
        <p className="text-neutral-500 dark:text-neutral-400 max-w-sm">
          Our AI chef is mixing your ingredients, adding a pinch of magic, and writing down the steps.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-500 dark:text-red-400 mb-2">
          ❌
        </div>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-50">Oh no!</h2>
        <p className="text-neutral-500 dark:text-neutral-400">{error}</p>
        <button
          onClick={() => generateRecipe(answers)}
          className="mt-4 px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-full font-medium hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4 flex flex-col min-h-[70vh]">
      
      {/* Progress Bar */}
      <div className="mb-12">
        <div className="w-full bg-neutral-100 dark:bg-neutral-700 h-2 rounded-full overflow-hidden">
          <div 
            className="bg-accent-500 dark:bg-accent-400 h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="flex-1 flex flex-col justify-center animate-fade-in">
        <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-neutral-50 mb-10 text-center leading-tight">
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
                if (e.key === 'Enter') handleNext();
              }}
              placeholder={question.placeholder}
              className="w-full text-center text-xl p-4 border-2 border-neutral-200 dark:border-neutral-600 bg-transparent text-neutral-900 dark:text-neutral-50 rounded-2xl focus:outline-none focus:border-accent-500 dark:focus:border-accent-400 focus:ring-4 focus:ring-accent-100 dark:focus:ring-accent-900/30 transition-all placeholder:text-neutral-300 dark:placeholder:text-neutral-600"
            />
            <button
              onClick={() => handleNext()}
              disabled={!currentInput.trim()}
              className="w-full py-4 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-2xl font-bold text-lg hover:bg-neutral-800 dark:hover:bg-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              Next <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto w-full">
            {question.options?.map((opt) => (
              <button
                key={opt}
                onClick={() => handleNext(opt)}
                className="p-5 border-2 border-neutral-100 dark:border-neutral-700 bg-[#FDFBF7] dark:bg-neutral-900 rounded-2xl text-lg font-medium text-neutral-700 dark:text-neutral-300 hover:border-accent-500 dark:hover:border-accent-400 hover:bg-accent-50 dark:hover:bg-accent-500/10 hover:text-accent-700 dark:hover:text-accent-300 transition-all transform active:scale-95 text-left flex items-center justify-between group"
              >
                <span>{opt}</span>
              </button>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
