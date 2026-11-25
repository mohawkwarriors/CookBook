export interface EditorialPhotoResult {
  url: string;
  label: string;
  source: string;
}

interface ScoredPhoto extends EditorialPhotoResult {
  score: number;
}

const BLOCKED_DOMAINS = [
  // Watermarked stock agencies
  "shutterstock.com",
  "alamy.com",
  "gettyimages.com",
  "istockphoto.com",
  "dreamstime.com",
  "123rf.com",
  "depositphotos.com",
  "vecteezy.com",
  "freepik.com",
  "stock.adobe.com",
  "bigstockphoto.com",
  "canstockphoto.com",
  // Social media / amateur phone snapshots / video thumbnails / ecommerce
  "pinterest.com",
  "pinimg.com",
  "youtube.com",
  "ytimg.com",
  "tiktok.com",
  "facebook.com",
  "fbcdn.net",
  "instagram.com",
  "reddit.com",
  "redd.it",
  "quora.com",
  "imgur.com",
  "flickr.com",
  "cookpad.com",
  "allrecipes.com",
  "blogspot.com",
  "wikimedia.org",
  "wikipedia.org",
  "amazon.com",
  "walmart.com",
  "target.com",
  "treehugger.com",
  "ebay.com",
  "etsy.com",
];

// Acclaimed cookbooks, culinary magazines & editorial food blogs with DSLR/styled photography
const EDITORIAL_FOOD_DOMAINS = [
  "teaforturmeric.com",
  "ministryofcurry.com",
  "recipetineats.com",
  "seriouseats.com",
  "bonappetit.com",
  "nytimes.com",
  "cooking.nytimes.com",
  "halfbakedharvest.com",
  "themediterraneandish.com",
  "feelgoodfoodie.net",
  "persianmama.com",
  "unicornsinthekitchen.com",
  "indianhealthyrecipes.com",
  "cookwithmanali.com",
  "simplyrecipes.com",
  "epicurious.com",
  "loveandlemons.com",
  "smittenkitchen.com",
  "bbcgoodfood.com",
  "dishoom.com",
  "zaika.com",
  "myheartbeets.com",
  "pipingpotcurry.com",
  "twosleevers.com",
  "thewoksoflife.com",
  "justonecookbook.com",
  "sallysbakingaddiction.com",
  "preppykitchen.com",
  "kingarthurbaking.com",
  "foodandwine.com",
  "saveur.com",
  "tastingtable.com",
  "delish.com",
  "feastingathome.com",
  "ambitiouskitchen.com",
  "budgetbytes.com",
  "pinchofyum.com",
  "minimalistbaker.com",
  "cookieandkate.com",
  "ottolenghi.co.uk",
  "nigella.com",
  "mob.co.uk",
  "food52.com",
  "thekitchn.com",
  "rainbowplantlife.com",
  "playfulcooking.com",
  "milkandcardamom.com",
  "flourandspiceblog.com",
  "gimmesomeoven.com",
  "downshiftology.com",
  "onceuponachef.com",
  "delicious.com.au",
  "donnahay.com.au",
];

export function cleanDishQuery(raw: string): string {
  return (
    raw
      .replace(/\([^)]*\)/g, " ")
      .replace(
        /\b(easy|quick|homemade|classic|best|authentic|simple|stovetop|instant pot|pressure cooker|air-fried|multipurpose|style|sides)\b/gi,
        " "
      )
      .replace(/[&/,-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim() || raw.trim()
  );
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function isAllowedImage(url: string, pageUrl: string, width?: number, height?: number, minDim = 500): boolean {
  if (!url || !url.startsWith("http")) return false;
  const lower = url.toLowerCase();
  const pageLower = pageUrl.toLowerCase();

  if (
    lower.endsWith(".svg") ||
    lower.includes(".svg/") ||
    lower.endsWith(".gif") ||
    lower.endsWith(".pdf") ||
    lower.includes("logo") ||
    lower.includes("avatar") ||
    lower.includes("placeholder") ||
    lower.includes("collage") ||
    lower.includes("pin-") ||
    lower.includes("step-")
  ) {
    return false;
  }

  const host = getHostname(url);
  const pageHost = getHostname(pageUrl);
  if (
    BLOCKED_DOMAINS.some(
      (d) => host.includes(d) || pageHost.includes(d) || lower.includes(d) || pageLower.includes(d)
    )
  ) {
    return false;
  }

  if (width && height) {
    if (width < minDim || height < minDim) return false;
    const ratio = width / height;
    // Reject ultra-wide banners or super-tall text-heavy Pinterest pins
    if (ratio > 1.8 || ratio < 0.52) return false;
  }

  return true;
}

function scoreImage(url: string, pageUrl: string, title: string, width?: number, height?: number): number {
  let score = 0;
  const host = getHostname(pageUrl || url);
  const lowerTitle = title.toLowerCase();

  if (EDITORIAL_FOOD_DOMAINS.some((d) => host.includes(d))) {
    score += 55;
  }
  if (width && height) {
    if (width >= 1000 && height >= 1000) score += 20;
    else if (width >= 750 && height >= 750) score += 12;

    // 4:5 portrait framing matches Cookbook's cover cards best & signals DSLR food blogs
    const ratio = width / height;
    if (ratio >= 0.64 && ratio <= 0.92) score += 25;
    else if (ratio > 0.92 && ratio <= 1.1) score += 16;
    else if (ratio > 1.1 && ratio <= 1.45) score += 8;
  }
  if (lowerTitle.includes("step by step") || lowerTitle.includes("how to make") || lowerTitle.includes("collage")) {
    score -= 10;
  }
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes(".jpg") || lowerUrl.includes(".jpeg") || lowerUrl.includes(".webp")) {
    score += 5;
  }
  return score;
}

async function searchWithSerper(query: string, apiKey: string): Promise<ScoredPhoto[]> {
  const res = await fetch("https://google.serper.dev/images", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: `${query} recipe food photography`,
      num: 25,
    }),
  });

  if (!res.ok) return [];
  const data = (await res.json()) as { images?: any[] };
  const results: ScoredPhoto[] = [];

  for (const item of data.images || []) {
    const url = item.imageUrl || "";
    const pageUrl = item.link || "";
    const w = Number(item.imageWidth) || undefined;
    const h = Number(item.imageHeight) || undefined;
    const title = item.title || query;

    if (!isAllowedImage(url, pageUrl, w, h, 500)) continue;

    const domain = getHostname(pageUrl || url);
    results.push({
      url,
      label: title,
      source: domain || "Web",
      score: scoreImage(url, pageUrl, title, w, h),
    });
  }

  return results;
}

async function searchWithBrave(query: string, apiKey: string): Promise<ScoredPhoto[]> {
  const params = new URLSearchParams({
    q: `${query} recipe food photography`,
    count: "25",
    safesearch: "strict",
  });

  const res = await fetch(`https://api.search.brave.com/res/v1/images/search?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": apiKey,
    },
  });

  if (!res.ok) return [];
  const data = (await res.json()) as { results?: any[] };
  const results: ScoredPhoto[] = [];

  for (const item of data.results || []) {
    const url = item?.properties?.url || item?.thumbnail?.src || "";
    const pageUrl = item?.url || "";
    const w = Number(item?.properties?.width) || undefined;
    const h = Number(item?.properties?.height) || undefined;
    const title = item.title || query;

    if (!isAllowedImage(url, pageUrl, w, h, 500)) continue;

    const domain = getHostname(pageUrl || url);
    results.push({
      url,
      label: title,
      source: domain || "Web",
      score: scoreImage(url, pageUrl, title, w, h),
    });
  }

  return results;
}

export async function searchEditorialFoodImages(options: {
  query: string;
  cuisine?: string;
  serperKey?: string;
  braveKey?: string;
  maxResults?: number;
}): Promise<{ photos: EditorialPhotoResult[]; provider: "serper" | "brave" | "none" }> {
  const rawQuery = options.query.trim();
  const cuisine = (options.cuisine || "").trim();
  const maxResults = options.maxResults ?? 6;

  if (!rawQuery) {
    return { photos: [], provider: "none" };
  }

  const cleaned = cleanDishQuery(rawQuery);
  const queryWithCuisine =
    cuisine && cuisine !== "All" && cuisine !== "Other" && !cleaned.toLowerCase().includes(cuisine.toLowerCase())
      ? `${cleaned} ${cuisine}`
      : cleaned;

  let candidates: ScoredPhoto[] = [];
  let provider: "serper" | "brave" | "none" = "none";

  try {
    if (options.serperKey) {
      provider = "serper";
      candidates = await searchWithSerper(queryWithCuisine, options.serperKey);
      if (candidates.length < maxResults && queryWithCuisine !== cleaned) {
        const extra = await searchWithSerper(cleaned, options.serperKey);
        candidates = [...candidates, ...extra];
      }
    } else if (options.braveKey) {
      provider = "brave";
      candidates = await searchWithBrave(queryWithCuisine, options.braveKey);
      if (candidates.length < maxResults && queryWithCuisine !== cleaned) {
        const extra = await searchWithBrave(cleaned, options.braveKey);
        candidates = [...candidates, ...extra];
      }
    }
  } catch (err) {
    console.error("Editorial image search error:", err);
  }

  const seen = new Set<string>();
  const photos = candidates
    .sort((a, b) => b.score - a.score)
    .filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    })
    .slice(0, maxResults)
    .map(({ url, label, source }) => ({ url, label, source }));

  return { photos, provider };
}
