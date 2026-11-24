export interface StandInPhoto {
  url: string;
  label: string;
  source: string;
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
  // Exclude vector graphics, icons, flags, maps, portraits, logos
  if (lower.endsWith(".svg") || lower.includes(".svg/") || lower.endsWith(".pdf") || lower.endsWith(".tif")) {
    return false;
  }
  const badWords = ["logo", "icon", "flag", "map", "diagram", "coat of arms", "portrait", "wikimedia", "commons-logo"];
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
      gsrsearch: query,
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
      gsrsearch: `${query} dish OR food OR recipe`,
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
  if (cleaned) queries.push(cleaned);
  if (title.trim() && title.trim().toLowerCase() !== cleaned.toLowerCase()) {
    queries.push(title.trim());
  }

  // Also try last 2 meaningful words (e.g. "Saffron Chicken Skewers" -> "Chicken Skewers")
  const words = cleaned.split(" ").filter((w) => w.length > 2);
  if (words.length >= 2) {
    queries.push(words.slice(-2).join(" "));
  }
  if (cuisine && cuisine !== "All" && cuisine !== "Other" && words.length > 0) {
    queries.push(`${cuisine} ${words[words.length - 1]} food`);
  }

  return Array.from(new Set(queries)).filter(Boolean);
}

/**
 * Fetches 4-6 related stand-in food photos from the internet for a given recipe title.
 * Tries the local Express API first, and falls back directly to CORS-open Wikimedia,
 * Wikipedia, and TheMealDB APIs so it works on both Node and static deployments.
 */
export async function searchStandInPhotos(title: string, cuisine?: string, maxResults = 6): Promise<StandInPhoto[]> {
  const trimmed = title.trim();
  if (!trimmed) return [];

  const seen = new Set<string>();
  const collected: StandInPhoto[] = [];

  const pushUnique = (items: StandInPhoto[]) => {
    for (const item of items) {
      if (!item?.url || seen.has(item.url)) continue;
      seen.add(item.url);
      collected.push(item);
      if (collected.length >= maxResults) break;
    }
  };

  // 1. Try Express backend endpoint if available (can pull broader web results too)
  try {
    const res = await fetch(
      `/api/search-recipe-images?q=${encodeURIComponent(trimmed)}${cuisine ? `&cuisine=${encodeURIComponent(cuisine)}` : ""}`
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data?.photos) && data.photos.length > 0) {
        pushUnique(data.photos);
        if (collected.length >= maxResults) return collected.slice(0, maxResults);
      }
    }
  } catch {
    // Static host or server unavailable — fall through cleanly to direct CORS APIs
  }

  // 2. Direct browser fallback: Wikipedia + Wikimedia Commons + TheMealDB
  const queries = buildSearchQueries(trimmed, cuisine);
  for (const q of queries) {
    if (collected.length >= maxResults) break;
    const [wikiPages, commons, mealdb] = await Promise.all([
      fetchWikipediaPagePhotos(q),
      fetchWikimediaPhotos(`${q} food`, 6),
      collected.length < 2 ? fetchTheMealDBPhotos(q) : Promise.resolve([]),
    ]);
    pushUnique(wikiPages);
    pushUnique(commons);
    pushUnique(mealdb);
  }

  return collected.slice(0, maxResults);
}
