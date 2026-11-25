import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

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

function extractJsonObject(text: string): any {
  let cleaned = text.trim();
  if (cleaned.includes("```")) {
    const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (match && match[1]) {
      cleaned = match[1].trim();
    }
  }

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    const startIdx = cleaned.indexOf("{");
    const endIdx = cleaned.lastIndexOf("}");
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      const slice = cleaned.slice(startIdx, endIdx + 1);
      return JSON.parse(slice);
    }
    throw e;
  }
}

// Simple HTML cleaning function to strip script, style, and navigation noise.
function cleanHtml(html: string): string {
  let cleaned = html.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, "");
  cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
  cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
  cleaned = cleaned.replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, "");
  cleaned = cleaned.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, "");
  cleaned = cleaned.replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "");
  cleaned = cleaned.replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "");
  cleaned = cleaned.replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "");
  cleaned = cleaned.replace(/\s+/g, " ");
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, "");
  return cleaned.slice(0, 50000); // 50k characters limit
}

// API Routes
app.post("/api/parse-url", async (req, res) => {
  const { url } = req.body;

  if (!url) {
    res.status(400).json({ error: "URL is required" });
    return;
  }

  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    let textToParse = "";

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const response = await fetch(proxyUrl, { signal: controller.signal });
      
      if (response.ok) {
        const json = await response.json();
        textToParse = cleanHtml(json.contents || "");
      }
      clearTimeout(timeoutId);
    } catch (e) {
      console.warn("Proxy fetch failed or timed out, relying on LLM knowledge base.");
    }

    const prompt = `Extract or reconstruct the recipe details for the following URL: ${url}

${textToParse ? `Here is some extracted webpage content to help you:\n\n${textToParse.slice(0, 15000)}` : "Use your internal knowledge base to reconstruct the recipe based on the URL."}

Instructions:
- CRITICAL DIETARY CONSTRAINT: This application strictly enforces a Halal diet. You MUST ensure the extracted recipe is 100% Halal.
  1. ABSOLUTELY NO PORK or pork derivatives (bacon, ham, lard, gelatin). If the original text contains them, you MUST seamlessly substitute them with a halal alternative (e.g., beef, chicken, lamb, or turkey bacon).
  2. ABSOLUTELY NO ALCOHOL (wine, beer, liquor) with the strict exception of wine vinegars and mirin, which are permitted. If the original text contains other alcohol, substitute it with a non-alcoholic alternative (like broth or juice) or omit it.
- Extract the title, a short descriptive summary, the cuisine type (e.g. Desi, Persian, Middle Eastern, Italian, Mexican, Asian, American, Mediterranean, Thai, French, Japanese, Caribbean, Other).
- Categorize the mealType as exactly one of: "Appetizer", "Main", "Side", "Drink", or "Dessert".
- Extract cookingTime in minutes (combining prep and cook time if necessary).
- Parse the list of ingredients, separating each into "name", "amount" (a decimal number), and "unit" (e.g., "cup", "tbsp", "g", "piece", or blank "" if it's an item count).
- Extract the instructions as a clean ordered array of steps.
- Add some cooking tips or notes if found.
- Estimate the nutritional values per serving, including calories, protein (g), carbs (g), and fat (g).
- If the recipe calls for any uncommon or hard-to-find ingredients, you MUST provide a suggestion for a common substitute in the notes section (e.g. "If you can't find X, you can substitute it with Y").
- Pick a short, 1-2 word search keyword that represents the main dish (e.g., "pasta", "salad", "cake") to be used for finding a matching placeholder image.
- If some of these values are missing in the text, make a sensible estimation or classification based on the URL and context.

OUTPUT FORMAT:
Provide your response strictly as a single JSON object inside a \`\`\`json code block. Do not include any other text.`;

    const responseText = await callGeminiWithFallback({
      prompt,
    });

    const parsedJson = extractJsonObject(responseText);
    
    // Automatically assign a matching drawn vector image
    if (parsedJson.imageKeyword) {
      parsedJson.imageUrl = "";
      delete parsedJson.imageKeyword;
    }

    res.json(parsedJson);
  } catch (error: any) {
    console.error("Scraper / Parser Error:", error);
    res.status(500).json({ error: error.message || "An error occurred while parsing the URL" });
  }
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
  if (!q) {
    res.json({ photos: [], provider: "none" });
    return;
  }

  const cleaned =
    q
      .replace(/\([^)]*\)/g, " ")
      .replace(
        /\b(easy|quick|homemade|classic|best|authentic|simple|stovetop|instant pot|pressure cooker|air-fried|baked|multipurpose|style|sides)\b/gi,
        " "
      )
      .replace(/[&/,-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim() || q;

  const blockedDomains = [
    "shutterstock.com", "alamy.com", "gettyimages.com", "istockphoto.com",
    "dreamstime.com", "123rf.com", "depositphotos.com", "vecteezy.com",
    "freepik.com", "stock.adobe.com", "pinterest.com", "pinimg.com",
    "youtube.com", "ytimg.com", "tiktok.com", "facebook.com", "instagram.com",
    "amazon.com", "walmart.com", "treehugger.com",
  ];
  const editorialDomains = [
    "teaforturmeric.com", "ministryofcurry.com", "recipetineats.com",
    "seriouseats.com", "bonappetit.com", "nytimes.com", "halfbakedharvest.com",
    "themediterraneandish.com", "feelgoodfoodie.net", "persianmama.com",
    "unicornsinthekitchen.com", "indianhealthyrecipes.com", "cookwithmanali.com",
    "simplyrecipes.com", "epicurious.com", "loveandlemons.com", "smittenkitchen.com",
    "bbcgoodfood.com", "dishoom.com", "myheartbeets.com", "pipingpotcurry.com",
    "thewoksoflife.com", "justonecookbook.com", "sallysbakingaddiction.com",
    "preppykitchen.com", "kingarthurbaking.com", "foodandwine.com", "saveur.com",
  ];

  const serperKey = process.env.SERPER_API_KEY;
  const braveKey = process.env.BRAVE_SEARCH_API_KEY;

  // 1. Primary: High-res editorial food-blog search via Serper.dev or Brave Search API
  if (serperKey || braveKey) {
    try {
      const searchQuery =
        cuisine && cuisine !== "All" && cuisine !== "Other" && !cleaned.toLowerCase().includes(cuisine.toLowerCase())
          ? `${cleaned} ${cuisine} recipe food photography`
          : `${cleaned} recipe food photography`;

      const scored: { url: string; label: string; source: string; score: number }[] = [];

      if (serperKey) {
        const serperRes = await fetch("https://google.serper.dev/images", {
          method: "POST",
          headers: { "X-API-KEY": serperKey, "Content-Type": "application/json" },
          body: JSON.stringify({ q: searchQuery, num: 20 }),
        });
        if (serperRes.ok) {
          const data: any = await serperRes.json();
          for (const item of data.images || []) {
            const url: string = item.imageUrl || "";
            const pageUrl: string = item.link || "";
            const w = Number(item.imageWidth) || 0;
            const h = Number(item.imageHeight) || 0;
            const lower = url.toLowerCase();
            if (!url.startsWith("http") || lower.endsWith(".svg") || lower.endsWith(".gif")) continue;
            if (blockedDomains.some((d) => lower.includes(d) || pageUrl.toLowerCase().includes(d))) continue;
            if (w && h && (w < 450 || h < 450 || w / h > 2.0 || w / h < 0.48)) continue;

            let host = "Web";
            try {
              host = new URL(pageUrl || url).hostname.replace(/^www\./, "");
            } catch {}
            let score = editorialDomains.some((d) => host.includes(d)) ? 40 : 0;
            if (w >= 900 && h >= 900) score += 15;
            if (w && h && w / h >= 0.65 && w / h <= 1.05) score += 20;
            scored.push({ url, label: item.title || cleaned, source: host, score });
          }
        }
      } else if (braveKey) {
        const braveRes = await fetch(
          `https://api.search.brave.com/res/v1/images/search?q=${encodeURIComponent(searchQuery)}&count=20&safesearch=strict`,
          { headers: { Accept: "application/json", "X-Subscription-Token": braveKey } }
        );
        if (braveRes.ok) {
          const data: any = await braveRes.json();
          for (const item of data.results || []) {
            const url: string = item?.properties?.url || item?.thumbnail?.src || "";
            const pageUrl: string = item?.url || "";
            const w = Number(item?.properties?.width) || 0;
            const h = Number(item?.properties?.height) || 0;
            const lower = url.toLowerCase();
            if (!url.startsWith("http") || lower.endsWith(".svg") || lower.endsWith(".gif")) continue;
            if (blockedDomains.some((d) => lower.includes(d) || pageUrl.toLowerCase().includes(d))) continue;
            if (w && h && (w < 450 || h < 450 || w / h > 2.0 || w / h < 0.48)) continue;

            let host = "Web";
            try {
              host = new URL(pageUrl || url).hostname.replace(/^www\./, "");
            } catch {}
            let score = editorialDomains.some((d) => host.includes(d)) ? 40 : 0;
            if (w >= 900 && h >= 900) score += 15;
            if (w && h && w / h >= 0.65 && w / h <= 1.05) score += 20;
            scored.push({ url, label: item.title || cleaned, source: host, score });
          }
        }
      }

      const seen = new Set<string>();
      const top = scored
        .sort((a, b) => b.score - a.score)
        .filter((p) => {
          if (seen.has(p.url)) return false;
          seen.add(p.url);
          return true;
        })
        .slice(0, 6)
        .map(({ url, label, source }) => ({ url, label, source }));

      if (top.length > 0) {
        res.json({ photos: top, provider: serperKey ? "serper" : "brave" });
        return;
      }
    } catch (err) {
      console.warn("Editorial image API error, falling back:", err);
    }
  }

  // 2. Fallback when no SERPER_API_KEY / BRAVE_SEARCH_API_KEY is configured yet
  const photos: { url: string; label: string; source: string }[] = [];
  const seen = new Set<string>();
  const addPhoto = (url: string, label: string, source: string) => {
    if (!url || seen.has(url)) return;
    const lower = url.toLowerCase();
    if (lower.endsWith(".svg") || lower.includes(".svg/") || lower.endsWith(".pdf")) return;
    seen.add(url);
    photos.push({ url, label, source });
  };

  try {
    const [commonsRes, wikiPageRes] = await Promise.allSettled([
      fetch(
        `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(
          cleaned
        )}&gsrlimit=8&prop=imageinfo&iiprop=url|mime&iiurlwidth=800&format=json`
      ).then((r) => (r.ok ? r.json() : null)),
      fetch(
        `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
          `${cleaned} food OR dish`
        )}&gsrlimit=6&prop=pageimages&piprop=thumbnail&pithumbsize=800&format=json`
      ).then((r) => (r.ok ? r.json() : null)),
    ]);

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

    if (wikiPageRes.status === "fulfilled" && wikiPageRes.value?.query?.pages) {
      for (const page of Object.values(wikiPageRes.value.query.pages) as any[]) {
        if (page?.thumbnail?.source) {
          addPhoto(page.thumbnail.source, page.title || cleaned, "Wikipedia");
        }
      }
    }
  } catch (err) {
    console.warn("Fallback image search error:", err);
  }

  res.json({ photos: photos.slice(0, 6), provider: "wikimedia" });
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
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

configureServer();
