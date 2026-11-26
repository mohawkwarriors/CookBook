import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { cleanDishQuery, searchEditorialFoodImages } from "./src/lib/editorialImageSearch";
import { parseRecipeFromUrl } from "./src/lib/recipeUrlParser";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err && err.type === "entity.parse.failed" && req.path.startsWith("/api/")) {
    res.setHeader("Cache-Control", "no-store");
    res.status(400).json({ error: "Invalid JSON request body." });
    return;
  }
  next(err);
});

// Initialize Google GenAI lazily to avoid crashing on start if the key is not set yet.
let aiInstance: GoogleGenAI | null = null;
function getAI() {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is missing. Please configure it in your Secrets panel.");
    }
    aiInstance = new GoogleGenAI({ 
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

interface GenerateOptions {
  prompt: string;
  responseMimeType?: string;
  responseSchema?: any;
  temperature?: number;
  tools?: any[];
}

// Resilient Gemini caller with automatic multi-model fallback and retry logic.
// Mitigates 503 high demand spikes and 429 rate limit errors transparently.
async function callGeminiWithFallback(options: GenerateOptions): Promise<string> {
  const ai = getAI();
  const models = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-3.1-flash-lite", "gemini-3.1-pro-preview", "gemini-2.5-flash"];
  let lastErr: any = null;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const config: any = {
          temperature: options.temperature ?? 0.2,
        };
        
        // Google Search Grounding does not support responseSchema / JSON Mode natively yet
        if (!options.tools) {
          if (options.responseMimeType) {
            config.responseMimeType = options.responseMimeType;
          }
          if (options.responseSchema) {
            config.responseSchema = options.responseSchema;
          }
        }
        
        if (options.tools) {
          config.tools = options.tools;
        }

        const res = await ai.models.generateContent({
          model,
          contents: options.prompt,
          config,
        });

        const text = res.text?.trim() || "";
        if (text) {
          return text;
        }
      } catch (err: any) {
        lastErr = err;
        const msg = (err?.message || "").toLowerCase();
        
        const isDemandOrRateLimit =
          msg.includes("503") ||
          msg.includes("high demand") ||
          msg.includes("unavailable");

        const isQuota = 
          msg.includes("429") || 
          msg.includes("quota") || 
          msg.includes("resource_exhausted");

        if (isDemandOrRateLimit) {
          console.log(`Gemini call on ${model} (attempt ${attempt + 1}) failed with high demand. Retrying...`);
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        } else if (isQuota) {
          console.log(`Gemini call on ${model} failed with quota limit. Switching model...`);
          break; // Don't retry same model if quota is exhausted
        } else {
          console.log(`Gemini call on ${model} (attempt ${attempt + 1}) failed with hard error. Switching model...`);
          break;
        }
      }
    }
  }

  throw lastErr || new Error("Unable to connect to AI models at this moment. Please try again.");
}

// Shared recipe JSON schema for parsing and generation
const RECIPE_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    description: { type: "STRING" },
    cuisine: { type: "STRING" },
    mealType: { type: "STRING" },
    cookingTime: { type: "INTEGER" },
    servings: { type: "INTEGER" },
    ingredients: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          amount: { type: "NUMBER" },
          unit: { type: "STRING" },
        },
        required: ["name", "amount", "unit"],
      },
    },
    instructions: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
    notes: { type: "STRING" },
    nutrition: {
      type: "OBJECT",
      properties: {
        calories: { type: "INTEGER" },
        protein: { type: "INTEGER" },
        carbs: { type: "INTEGER" },
        fat: { type: "INTEGER" },
      },
    },
    imageKeyword: { type: "STRING" },
  },
  required: [
    "title",
    "description",
    "cuisine",
    "mealType",
    "cookingTime",
    "servings",
    "ingredients",
    "instructions",
    "imageKeyword",
  ],
};

const SEARCH_RECIPES_SCHEMA = {
  type: "ARRAY",
  items: {
    type: "OBJECT",
    properties: {
      id: { type: "STRING" },
      title: { type: "STRING" },
      source: { type: "STRING" },
      rating: { type: "NUMBER" },
      reviewCount: { type: "STRING" },
      description: { type: "STRING" },
      keyTechnique: { type: "STRING" },
      cuisine: { type: "STRING" },
      mealType: { type: "STRING" },
      cookingTime: { type: "INTEGER" },
      servings: { type: "INTEGER" },
      ingredients: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            name: { type: "STRING" },
            amount: { type: "NUMBER" },
            unit: { type: "STRING" },
          },
          required: ["name", "amount", "unit"],
        },
      },
      instructions: {
        type: "ARRAY",
        items: { type: "STRING" },
      },
      notes: { type: "STRING" },
      nutrition: {
        type: "OBJECT",
        properties: {
          calories: { type: "INTEGER" },
          protein: { type: "INTEGER" },
          carbs: { type: "INTEGER" },
          fat: { type: "INTEGER" },
        },
      },
      sourceUrl: { type: "STRING" },
    },
    required: [
      "id",
      "title",
      "source",
      "rating",
      "reviewCount",
      "description",
      "cuisine",
      "mealType",
      "cookingTime",
      "servings",
      "ingredients",
      "instructions",
    ],
  },
};

function extractJsonArray(text: string): any[] {
  let cleaned = text.trim();
  if (cleaned.includes("```")) {
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (match && match[1]) {
      cleaned = match[1].trim();
    }
  }

  try {
    const res = JSON.parse(cleaned);
    if (Array.isArray(res)) return res;
    if (res && Array.isArray(res.recipes)) return res.recipes;
  } catch (e) {
    const startIdx = cleaned.indexOf("[");
    const endIdx = cleaned.lastIndexOf("]");
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const slice = cleaned.slice(startIdx, endIdx + 1);
      const res = JSON.parse(slice);
      if (Array.isArray(res)) return res;
    }
    throw e;
  }
  throw new Error("Failed to parse recipe array from response");
}

// API Routes
app.options("/api/parse-url", (_req, res) => {
  res.setHeader("Allow", "POST, OPTIONS");
  res.setHeader("Cache-Control", "no-store");
  res.status(204).end();
});

app.post("/api/parse-url", async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const rawUrl = typeof req.body?.url === "string" ? req.body.url : "";

  try {
    const result = await parseRecipeFromUrl({
      url: rawUrl,
      geminiApiKey: process.env.GEMINI_API_KEY,
    });

    if (!result.ok) {
      res.status(result.status).json({ error: result.error });
      return;
    }

    res.json(result.recipe);
  } catch (error: any) {
    console.error("Scraper / Parser Error:", error);
    res.status(500).json({ error: error?.message || "An error occurred while parsing the URL." });
  }
});

app.all("/api/parse-url", (_req, res) => {
  res.setHeader("Allow", "POST, OPTIONS");
  res.setHeader("Cache-Control", "no-store");
  res.status(405).json({ error: "Method not allowed. Use POST." });
});

app.post("/api/generate-recipe", async (req, res) => {
  const { preferences } = req.body;
  if (!preferences) {
    res.status(400).json({ error: "Preferences are required" });
    return;
  }

  try {
    const ai = getAI();

    const prompt = `Act as an expert, highly creative chef. Generate a unique, delicious, and cohesive recipe based on the following preferences provided by the user in a fun game:
    
    Preferences:
    ${JSON.stringify(preferences, null, 2)}
    
    Instructions:
    - CRITICAL DIETARY CONSTRAINT: This application strictly enforces a Halal diet. You MUST ensure the recipe generated is 100% Halal.
      1. ABSOLUTELY NO PORK or pork derivatives (bacon, ham, lard, gelatin).
      2. ABSOLUTELY NO ALCOHOL (wine, beer, liquor) with the strict exception of wine vinegars and mirin, which are permitted.
      3. If the user requests a non-halal dish, seamlessly adapt it using halal alternatives (e.g., use beef/turkey bacon instead of pork bacon, chicken broth instead of white wine) without breaking character.
    - Create a catchy, appetizing title.
    - Write a short, fun descriptive summary.
    - Extract the cuisine type based on the prompt (e.g. Desi, Persian, Middle Eastern, Italian, Mexican, Asian, American, Mediterranean, Thai, French, Japanese, Caribbean, Other).
    - Categorize the mealType as exactly one of: "Appetizer", "Main", "Side", "Drink", "Dessert", or "Snack".
    - Estimate cookingTime in minutes (combining prep and cook time).
    - Create a list of ingredients, separating each into "name", "amount" (a decimal number), and "unit".
    - Write clear, step-by-step instructions.
    - Add cooking tips or notes.
    - Estimate the nutritional values per serving, including calories, protein (g), carbs (g), and fat (g).
    - If the recipe calls for any uncommon or hard-to-find ingredients, you MUST provide a suggestion for a common substitute in the notes section (e.g. "If you can't find X, you can substitute it with Y").
    - Pick a short, 1-2 word search keyword that represents the main dish (e.g., "pasta", "salad", "cake") to be used for finding a matching placeholder image.`;

    const responseText = await callGeminiWithFallback({
      prompt,
      responseMimeType: "application/json",
      responseSchema: RECIPE_SCHEMA,
    });

    const parsedJson = JSON.parse(responseText || "{}");
    
    // Automatically assign a matching drawn vector image
    if (parsedJson.imageKeyword) {
      parsedJson.imageUrl = "";
      delete parsedJson.imageKeyword;
    }

    res.json(parsedJson);
  } catch (error: any) {
    console.error("Generator Error:", error);
    res.status(500).json({ error: error.message || "An error occurred while generating the recipe" });
  }
});

app.post("/api/search-top-recipes", async (req, res) => {
  const { query, offset = 0 } = req.body;
  if (!query || typeof query !== "string" || !query.trim()) {
    res.status(400).json({ error: "Recipe search query is required" });
    return;
  }

  try {
    const ai = getAI();
    const cleanQuery = query.trim();
    const startRank = offset + 1;
    const endRank = offset + 5;

    const prompt = `You are an elite culinary researcher and world-class culinary curator.
A cook is looking for the absolute best recipe for: "${cleanQuery}".

Search the web and culinary archives to identify the TOP 5 HIGHEST RATED, most praised, and best-reviewed recipes for "${cleanQuery}".
${offset > 0 ? `CRITICAL REQUIREMENT: The user is loading MORE results (Page ${offset / 5 + 1}). You MUST skip the top ${offset} most common recipes you usually suggest, and provide the next 5 unique highest-rated alternatives.` : ''}

CRITICAL SOURCE PRIORITIZATION:
You MUST prioritize authentic recipes from these authoritative culinary publications and master chefs whenever available for this dish:
1. NYT Cooking (New York Times Cooking)
2. America's Test Kitchen
3. Cook's Illustrated
4. Bon Appétit
5. Serious Eats
6. Joshua Weissman
7. Guga Foods
8. Alton Brown
9. J. Kenji López-Alt
10. Gordon Ramsay
11. Ethan Chlebowski

CRITICAL NEGATIVE EXCLUSION:
- ABSOLUTELY EXCLUDE Jamie Oliver. Under NO circumstances should you include any recipe from or affiliated with Jamie Oliver.

CRITICAL DIETARY RESTRICTION (Halal):
- This application strictly requires 100% Halal recipes.
1. ABSOLUTELY NO PORK or pork derivatives (bacon, ham, lard, pancetta, gelatin). If an acclaimed recipe uses them, seamlessly substitute with beef bacon, turkey bacon, halal beef/lamb/chicken, or omit.
2. ABSOLUTELY NO ALCOHOL (wine, beer, liquor) with the strict exception of wine vinegars and mirin, which are permitted. Substitute cooking wines with rich broth or grape juice + vinegar.

Return EXACTLY 5 recipes, ranked from ${startRank} to ${endRank}.
Format your output as a pure JSON array containing 5 objects matching this exact structure:
[
  {
    "id": "1",
    "title": "Full recipe title (e.g. J. Kenji López-Alt's The Best Crispy Roast Potatoes)",
    "source": "Publisher or Chef (e.g. 'Serious Eats / J. Kenji López-Alt', 'NYT Cooking', 'America\\'s Test Kitchen', 'Gordon Ramsay')",
    "rating": 4.9,
    "reviewCount": "2,400+ reviews",
    "description": "1-2 sentence description explaining why this specific recipe is renowned as top-tier.",
    "keyTechnique": "Signature technique or secret ingredient that sets this recipe apart (e.g. Boiling in alkaline water with baking soda before shaking to create gelatinized starch)",
    "cuisine": "Cuisine type (e.g. Italian, American, French, Asian, Mexican, etc.)",
    "mealType": "Starter" | "Main" | "Side" | "Drink" | "Dessert" | "Snack",
    "cookingTime": 45,
    "servings": 4,
    "ingredients": [
      { "name": "Yukon gold potatoes, quartered", "amount": 2, "unit": "lbs" }
    ],
    "instructions": [
      "Step 1...",
      "Step 2..."
    ],
    "notes": "Chef tip or pairing advice",
    "nutrition": {
      "calories": 380,
      "protein": 5,
      "carbs": 52,
      "fat": 14
    },
    "sourceUrl": "Link or domain attribution if known"
  }
]

Provide ONLY the JSON array inside a \`\`\`json code block with no extra prose.`;

    const responseText = await callGeminiWithFallback({
      prompt,
      responseMimeType: "application/json",
      responseSchema: SEARCH_RECIPES_SCHEMA,
      temperature: 0.2,
    });

    const recipes = extractJsonArray(responseText);

    // Filter out any potential Jamie Oliver mentions
    const filteredRecipes = recipes.filter((r: any) => {
      const src = (r.source || "").toLowerCase();
      const ttl = (r.title || "").toLowerCase();
      const desc = (r.description || "").toLowerCase();
      const isJamie = src.includes("jamie oliver") || ttl.includes("jamie oliver") || desc.includes("jamie oliver");
      return !isJamie;
    });

    res.json({ recipes: filteredRecipes.slice(0, 5) });
  } catch (error: any) {
    console.error("Top Recipe Search Error:", error);
    const rawMsg = error?.message || "";
    let friendly = "Could not retrieve recipes at this moment. Please try again.";
    if (rawMsg.includes("503") || rawMsg.includes("high demand") || rawMsg.includes("UNAVAILABLE")) {
      friendly = "The recipe search service is temporarily experiencing high traffic. Please try again in a few moments.";
    } else if (rawMsg.includes("429") || rawMsg.includes("quota") || rawMsg.includes("RESOURCE_EXHAUSTED")) {
      friendly = "Temporary rate limit reached. Please wait a moment and try again.";
    }
    res.status(500).json({ error: friendly });
  }
});

app.get("/api/search-recipe-images", async (req, res) => {
  const q = String(req.query.q || "").trim();
  const cuisine = String(req.query.cuisine || "").trim();
  const fresh = req.query.fresh === "1";

  const serperKey = process.env.SERPER_API_KEY;
  const braveKey = process.env.BRAVE_SEARCH_API_KEY;
  const configured = {
    serper: Boolean(serperKey?.trim()),
    brave: Boolean(braveKey?.trim()),
  };

  if (!q) {
    res.setHeader("Cache-Control", "no-store");
    res.json({ photos: [], provider: "none", configured });
    return;
  }

  // 1. Primary: High-res editorial food-blog search via Serper.dev or Brave Search API
  if (configured.serper || configured.brave) {
    const result = await searchEditorialFoodImages({
      query: q,
      cuisine,
      serperKey,
      braveKey,
      maxResults: 10,
    });
    res.setHeader(
      "Cache-Control",
      !fresh && result.photos.length > 0 ? "public, max-age=3600" : "no-store"
    );
    if (result.photos.length > 0 || result.error) {
      res.json(result);
      return;
    }
  }

  const cleaned = cleanDishQuery(q);
  const badFallbackWords = [
    "logo", "icon", "flag", "map", "diagram", "coat of arms", "blason", "portrait",
    "building", "station", "caniparc", "park", "street", "road", "bridge", "church",
    "cathedral", "statue", "monument", "sign", "dump", "hotel", "museum", "castle",
    "house", "river", "city", "town", "village", "train", "airport", "school",
    "cemetery", "stamp", "marka", "coin",
  ];

  // 2. Fallback when no SERPER_API_KEY / BRAVE_SEARCH_API_KEY is configured yet
  const photos: { url: string; label: string; source: string }[] = [];
  const seen = new Set<string>();
  const addPhoto = (url: string, label: string, source: string) => {
    if (!url || seen.has(url)) return;
    const lower = url.toLowerCase();
    const labelLower = label.toLowerCase();
    if (lower.endsWith(".svg") || lower.includes(".svg/") || lower.endsWith(".pdf")) return;
    if (badFallbackWords.some((w) => labelLower.includes(w) || lower.includes(w))) return;
    seen.add(url);
    photos.push({ url, label, source });
  };

  try {
    const qualifiedQuery =
      cuisine && cuisine !== "All" && cuisine !== "Other"
        ? `${cleaned} ${cuisine} (food OR dish OR soup OR cuisine OR recipe)`
        : `${cleaned} (food OR dish OR soup OR cuisine OR recipe)`;

    const [wikiPageRes, commonsRes] = await Promise.allSettled([
      fetch(
        `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
          `${cleaned} food OR dish OR soup`
        )}&gsrlimit=6&prop=pageimages&piprop=thumbnail&pithumbsize=800&format=json`
      ).then((r) => (r.ok ? r.json() : null)),
      fetch(
        `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(
          qualifiedQuery
        )}&gsrlimit=8&prop=imageinfo&iiprop=url|mime&iiurlwidth=800&format=json`
      ).then((r) => (r.ok ? r.json() : null)),
    ]);

    if (wikiPageRes.status === "fulfilled" && wikiPageRes.value?.query?.pages) {
      for (const page of Object.values(wikiPageRes.value.query.pages) as any[]) {
        if (page?.thumbnail?.source) {
          addPhoto(page.thumbnail.source, page.title || cleaned, "Wikipedia");
        }
      }
    }

    if (commonsRes.status === "fulfilled" && commonsRes.value?.query?.pages) {
      for (const page of Object.values(commonsRes.value.query.pages) as any[]) {
        const info = page?.imageinfo?.[0];
        if (info?.mime?.startsWith("image/") && info.mime !== "image/svg+xml") {
          addPhoto(
            info.thumburl || info.url,
            (page.title || cleaned).replace(/^File:/i, "").replace(/\.[^.]+$/, ""),
            "Wikimedia"
          );
        }
      }
    }
  } catch (err) {
    console.warn("Fallback image search error:", err);
  }

  res.setHeader("Cache-Control", "no-store");
  res.json({ photos: photos.slice(0, 6), provider: "wikimedia", configured });
});

// Configure Vite integration or static file serving
async function configureServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);

    app.get("*", async (req, res, next) => {
      if (req.path.startsWith("/api/")) {
        return next();
      }
      try {
        const fs = await import("fs");
        const htmlPath = path.resolve(process.cwd(), "index.html");
        let html = fs.readFileSync(htmlPath, "utf-8");
        html = await vite.transformIndexHtml(req.originalUrl, html);
        res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      if (req.path.startsWith("/api/")) {
        res.setHeader("Cache-Control", "no-store");
        res.status(404).json({ error: "API route not found." });
        return;
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

configureServer();
