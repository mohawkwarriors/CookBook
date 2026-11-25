export interface StandInPhoto {
  url: string;
  fallbackUrl?: string;
  label: string;
  source: string;
}

export interface StandInSearchResult {
  photos: StandInPhoto[];
  provider: "serper" | "brave" | "wikimedia" | "none";
  diagnostic?: string;
}

/**
 * Compresses a user-selected image File to a lightweight JPEG data URL
 * (max 900px dimension, ~45-100KB) so it stores reliably inside Firestore documents.
 */
export async function compressImageFile(file: File, maxDimension = 900, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read image file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Invalid image file."));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported."));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

function isGoodFoodImageUrl(url: string, title = ""): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  const titleLower = title.toLowerCase();
  // Exclude vector graphics, icons, flags, maps, portraits, logos, and non-food places/objects
  if (lower.endsWith(".svg") || lower.includes(".svg/") || lower.endsWith(".pdf") || lower.endsWith(".tif")) {
    return false;
  }
  const badWords = [
    "logo",
    "icon",
    "flag",
    "map",
    "diagram",
    "coat of arms",
    "blason",
    "portrait",
    "commons-logo",
    "wiki-logo",
    "treehugger",
    "rooster",
    "livestock",
    "building",
    "station",
    "caniparc",
    "park",
    "street",
    "road",
    "bridge",
    "church",
    "cathedral",
    "statue",
    "monument",
    "sign",
    "dump",
    "rv ",
    "hotel",
    "museum",
    "castle",
    "house",
    "river",
    "city",
    "town",
    "village",
    "train",
    "airport",
    "school",
    "cemetery",
    "stamp",
    "marka",
    "coin",
    "auch",
  ];
  if (badWords.some((w) => titleLower.includes(w) || lower.includes(w))) {
    return false;
  }
  return true;
}

async function fetchWikimediaPhotos(query: string, limit = 8): Promise<StandInPhoto[]> {
  try {
    const params = new URLSearchParams({
      action: "query",
      generator: "search",
      gsrnamespace: "6",
      gsrsearch: `${query} (food OR dish OR soup OR recipe OR cuisine OR meal)`,
      gsrlimit: String(limit),
      prop: "imageinfo",
      iiprop: "url|mime",
      iiurlwidth: "800",
      format: "json",
      origin: "*",
    });
    const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    const pages = data?.query?.pages ? Object.values(data.query.pages) : [];
    const results: StandInPhoto[] = [];

    for (const page of pages as any[]) {
      const info = page?.imageinfo?.[0];
      const mime = info?.mime || "";
      const url = info?.thumburl || info?.url || "";
      const title = (page?.title || "").replace(/^File:/i, "").replace(/\.[^.]+$/, "");
      if (mime.startsWith("image/") && mime !== "image/svg+xml" && isGoodFoodImageUrl(url, title)) {
        results.push({ url, label: title, source: "Wikimedia" });
      }
    }
    return results;
  } catch {
    return [];
  }
}

async function fetchWikipediaPagePhotos(query: string): Promise<StandInPhoto[]> {
  try {
    const params = new URLSearchParams({
      action: "query",
      generator: "search",
      gsrsearch: query,
      gsrlimit: "6",
      prop: "pageimages",
      piprop: "thumbnail",
      pithumbsize: "800",
      format: "json",
      origin: "*",
    });
    const res = await fetch(`https://en.wikipedia.org/w/api.php?${params.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    const pages = data?.query?.pages ? Object.values(data.query.pages) : [];
    const results: StandInPhoto[] = [];

    for (const page of pages as any[]) {
      const url = page?.thumbnail?.source || "";
      const title = page?.title || query;
      if (url && isGoodFoodImageUrl(url, title)) {
        results.push({ url, label: title, source: "Wikipedia" });
      }
    }
    return results;
  } catch {
    return [];
  }
}

async function fetchTheMealDBPhotos(query: string): Promise<StandInPhoto[]> {
  try {
    const clean = query.split(/[\s,&()]+/).filter((w) => w.length > 2).slice(-2).join(" ");
    if (!clean) return [];
    const res = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(clean)}`);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data?.meals)) return [];
    return data.meals.slice(0, 4).map((m: any) => ({
      url: m.strMealThumb,
      label: m.strMeal,
      source: "TheMealDB",
    }));
  } catch {
    return [];
  }
}

function buildSearchQueries(title: string, cuisine?: string): string[] {
  const cleaned = title
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b(easy|quick|homemade|classic|best|authentic|simple|stovetop|instant pot|pressure cooker|air-fried|baked|multipurpose|style|with|and|sides)\b/gi, " ")
    .replace(/[&/,-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const queries: string[] = [];
  if (cuisine && cuisine !== "All" && cuisine !== "Other" && cleaned) {
    queries.push(`${cleaned} ${cuisine}`);
  }
  if (cleaned) queries.push(cleaned);
  if (title.trim() && title.trim().toLowerCase() !== cleaned.toLowerCase()) {
    queries.push(title.trim());
  }

  // Try last 2 meaningful words (e.g. "Saffron Chicken Skewers" -> "Chicken Skewers")
  const words = cleaned.split(" ").filter((w) => w.length > 2);
  if (words.length >= 2) {
    queries.push(words.slice(-2).join(" "));
  }
  // Try singularized version (e.g. "Aloo Cutlets" -> "Aloo Cutlet")
  if (cleaned.endsWith("s") && cleaned.length > 4) {
    queries.push(cleaned.slice(0, -1));
  }

  return Array.from(new Set(queries)).filter(Boolean);
}

/**
 * Fetches related stand-in food photos with provider diagnostics.
 * Tries the Worker/Pages/Express editorial API first (Serper/Brave), and only
 * falls back to food-qualified Wikipedia/Wikimedia/TheMealDB if unavailable.
 */
export async function searchStandInPhotosDetailed(
  title: string,
  cuisine?: string,
  maxResults = 10,
  options?: { forceRefresh?: boolean }
): Promise<StandInSearchResult> {
  const trimmed = title.trim();
  if (!trimmed) return { photos: [], provider: "none" };

  const seen = new Set<string>();
  const collected: StandInPhoto[] = [];
  let diagnostic: string | undefined;

  const pushUnique = (items: StandInPhoto[]) => {
    for (const item of items) {
      if (!item?.url || seen.has(item.url)) continue;
      seen.add(item.url);
      collected.push(item);
      if (collected.length >= maxResults) break;
    }
  };

  // 1. Try Worker / Pages Function / Express backend endpoint first
  try {
    const params = new URLSearchParams({ q: trimmed });
    if (cuisine && cuisine !== "All" && cuisine !== "Other") {
      params.set("cuisine", cuisine);
    }
    if (options?.forceRefresh) {
      params.set("fresh", "1");
      params.set("_t", String(Date.now()));
    }

    const res = await fetch(`/api/search-recipe-images?${params.toString()}`, {
      cache: options?.forceRefresh ? "no-store" : "default",
    });
    const contentType = res.headers.get("content-type") || "";

    if (res.ok && contentType.includes("application/json")) {
      const data = await res.json();
      const apiProvider = data?.provider as "serper" | "brave" | "wikimedia" | "none" | undefined;
      if (Array.isArray(data?.photos) && data.photos.length > 0) {
        pushUnique(data.photos);
        // Never pollute editorial Serper/Brave results with Wikimedia backfill
        if (apiProvider === "serper" || apiProvider === "brave") {
          return { photos: collected.slice(0, maxResults), provider: apiProvider };
        }
        return {
          photos: collected.slice(0, maxResults),
          provider: apiProvider || "wikimedia",
          diagnostic: data?.error || (data?.configured && !data.configured.serper && !data.configured.brave
            ? "Using Wikimedia fallback (SERPER_API_KEY not set in runtime environment)"
            : undefined),
        };
      }

      if (data?.error) {
        diagnostic = `Editorial search error: ${data.error}`;
      } else if (data?.configured && !data.configured.serper && !data.configured.brave) {
        diagnostic = "Using Wikimedia fallback (SERPER_API_KEY not detected in Worker runtime secrets)";
      } else if (apiProvider === "serper" || apiProvider === "brave") {
        diagnostic = `No editorial photos matched "${trimmed}" via ${apiProvider}`;
      }
    } else {
      diagnostic = `API endpoint /api/search-recipe-images returned ${res.status} (${contentType.split(";")[0] || "non-JSON"})`;
    }
  } catch (err: any) {
    diagnostic = `Could not reach /api/search-recipe-images (${err?.message || "network error"})`;
  }

  if (diagnostic) {
    console.warn("[StandInPhotos]", diagnostic);
  }

  // 2. Direct browser fallback: Wikipedia food articles + TheMealDB + food-qualified Wikimedia Commons
  const queries = buildSearchQueries(trimmed, cuisine);
  for (const q of queries) {
    if (collected.length >= maxResults) break;
    const [wikiPages, mealdb, commons] = await Promise.all([
      fetchWikipediaPagePhotos(`${q} food OR dish OR soup`),
      collected.length < 2 ? fetchTheMealDBPhotos(q) : Promise.resolve([]),
      fetchWikimediaPhotos(q, 8),
    ]);
    pushUnique(wikiPages);
    pushUnique(mealdb);
    pushUnique(commons);
  }

  return {
    photos: collected.slice(0, maxResults),
    provider: collected.length > 0 ? "wikimedia" : "none",
    diagnostic,
  };
}

/**
 * Backwards-compatible helper returning only the photo list.
 */
export async function searchStandInPhotos(
  title: string,
  cuisine?: string,
  maxResults = 6
): Promise<StandInPhoto[]> {
  const result = await searchStandInPhotosDetailed(title, cuisine, maxResults);
  return result.photos;
}
