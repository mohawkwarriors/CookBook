interface Env {
  SERPER_API_KEY?: string;
  BRAVE_SEARCH_API_KEY?: string;
}

interface PagesContext {
  request: Request;
  env: Env;
}

interface PhotoResult {
  url: string;
  label: string;
  source: string;
  score: number;
}

const BLOCKED_DOMAINS = [
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
  "pinterest.com",
  "pinimg.com",
  "youtube.com",
  "ytimg.com",
  "tiktok.com",
  "facebook.com",
  "fbcdn.net",
  "instagram.com",
  "amazon.com",
  "walmart.com",
  "target.com",
  "treehugger.com",
  "ebay.com",
  "etsy.com",
];

// Acclaimed food blogs & culinary magazines boosted to the top of results
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
  "allrecipes.com",
  "delish.com",
  "feastingathome.com",
  "ambitiouskitchen.com",
  "budgetbytes.com",
  "pinchofyum.com",
  "minimalistbaker.com",
  "cookieandkate.com",
];

function cleanDishQuery(raw: string): string {
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

function isAllowedImage(url: string, width?: number, height?: number): boolean {
  if (!url || !url.startsWith("http")) return false;
  const lower = url.toLowerCase();
  if (
    lower.endsWith(".svg") ||
    lower.includes(".svg/") ||
    lower.endsWith(".gif") ||
    lower.endsWith(".pdf") ||
    lower.includes("logo") ||
    lower.includes("avatar") ||
    lower.includes("placeholder")
  ) {
    return false;
  }

  const host = getHostname(url);
  if (BLOCKED_DOMAINS.some((d) => host.includes(d) || lower.includes(d))) {
    return false;
  }

  if (width && height) {
    if (width < 450 || height < 450) return false;
    const ratio = width / height;
    // Reject ultra-wide banners or super-tall Pinterest infographics
    if (ratio > 2.0 || ratio < 0.48) return false;
  }

  return true;
}

function scoreImage(url: string, pageUrl: string, width?: number, height?: number): number {
  let score = 0;
  const host = getHostname(pageUrl || url);

  if (EDITORIAL_FOOD_DOMAINS.some((d) => host.includes(d))) {
    score += 40;
  }
  if (width && height) {
    // High-res bonus
    if (width >= 900 && height >= 900) score += 15;
    else if (width >= 700 && height >= 700) score += 8;

    // 4:5 portrait or square framing matches Cookbook's 4:5 cover cards best
    const ratio = width / height;
    if (ratio >= 0.65 && ratio <= 1.05) score += 20;
    else if (ratio > 1.05 && ratio <= 1.4) score += 10;
  }
  if (url.toLowerCase().includes(".jpg") || url.toLowerCase().includes(".jpeg") || url.toLowerCase().includes(".webp")) {
    score += 5;
  }
  return score;
}

async function searchWithSerper(query: string, apiKey: string): Promise<PhotoResult[]> {
  const res = await fetch("https://google.serper.dev/images", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: `${query} recipe food photography`,
      num: 20,
    }),
  });

  if (!res.ok) return [];
  const data = (await res.json()) as { images?: any[] };
  const results: PhotoResult[] = [];

  for (const item of data.images || []) {
    const url = item.imageUrl || "";
    const pageUrl = item.link || "";
    const w = Number(item.imageWidth) || undefined;
    const h = Number(item.imageHeight) || undefined;

    if (!isAllowedImage(url, w, h)) continue;
    if (pageUrl && BLOCKED_DOMAINS.some((d) => pageUrl.toLowerCase().includes(d))) continue;

    const domain = getHostname(pageUrl || url);
    results.push({
      url,
      label: item.title || query,
      source: domain || "Web",
      score: scoreImage(url, pageUrl, w, h),
    });
  }

  return results;
}

async function searchWithBrave(query: string, apiKey: string): Promise<PhotoResult[]> {
  const params = new URLSearchParams({
    q: `${query} recipe food photography`,
    count: "20",
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
  const results: PhotoResult[] = [];

  for (const item of data.results || []) {
    const url = item?.properties?.url || item?.thumbnail?.src || "";
    const pageUrl = item?.url || "";
    const w = Number(item?.properties?.width) || undefined;
    const h = Number(item?.properties?.height) || undefined;

    if (!isAllowedImage(url, w, h)) continue;
    if (pageUrl && BLOCKED_DOMAINS.some((d) => pageUrl.toLowerCase().includes(d))) continue;

    const domain = getHostname(pageUrl || url);
    results.push({
      url,
      label: item.title || query,
      source: domain || "Web",
      score: scoreImage(url, pageUrl, w, h),
    });
  }

  return results;
}

export const onRequestGet = async (context: PagesContext): Promise<Response> => {
  const reqUrl = new URL(context.request.url);
  const rawQuery = (reqUrl.searchParams.get("q") || "").trim();
  const cuisine = (reqUrl.searchParams.get("cuisine") || "").trim();

  if (!rawQuery) {
    return Response.json({ photos: [], provider: "none" });
  }

  const cleaned = cleanDishQuery(rawQuery);
  const queryWithCuisine =
    cuisine && cuisine !== "All" && cuisine !== "Other" && !cleaned.toLowerCase().includes(cuisine.toLowerCase())
      ? `${cleaned} ${cuisine}`
      : cleaned;

  const serperKey = context.env.SERPER_API_KEY;
  const braveKey = context.env.BRAVE_SEARCH_API_KEY;

  let candidates: PhotoResult[] = [];
  let provider: "serper" | "brave" | "none" = "none";

  try {
    if (serperKey) {
      provider = "serper";
      candidates = await searchWithSerper(queryWithCuisine, serperKey);
      if (candidates.length < 4 && queryWithCuisine !== cleaned) {
        const extra = await searchWithSerper(cleaned, serperKey);
        candidates = [...candidates, ...extra];
      }
    } else if (braveKey) {
      provider = "brave";
      candidates = await searchWithBrave(queryWithCuisine, braveKey);
      if (candidates.length < 4 && queryWithCuisine !== cleaned) {
        const extra = await searchWithBrave(cleaned, braveKey);
        candidates = [...candidates, ...extra];
      }
    }
  } catch (err) {
    console.error("Editorial image search error:", err);
  }

  // Deduplicate & sort by editorial quality score
  const seen = new Set<string>();
  const sorted = candidates
    .sort((a, b) => b.score - a.score)
    .filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    })
    .slice(0, 6)
    .map(({ url, label, source }) => ({ url, label, source }));

  return Response.json(
    { photos: sorted, provider },
    {
      headers: {
        "Cache-Control": "public, max-age=3600",
      },
    }
  );
};
