export interface EditorialPhotoResult {
  url: string;
  fallbackUrl?: string;
  label: string;
  source: string;
}

export interface EditorialSearchResponse {
  photos: EditorialPhotoResult[];
  provider: "serper" | "brave" | "none";
  configured: {
    serper: boolean;
    brave: boolean;
  };
  error?: string;
}

interface RawCandidate {
  url: string;
  fallbackUrl?: string;
  pageUrl: string;
  title: string;
  width?: number;
  height?: number;
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
  "cookingwithayeh.com",
  "afghancooks.com",
  "thedeliciouscrescent.com",
  "littlespicejar.com",
  "fatimacooks.net",
  "spicecravings.com",
  "indianhealthyrecipes.com",
  "cookwithmanali.com",
  "hebbarskitchen.com",
  "vegrecipesofindia.com",
  "dassanasvegrecipes.com",
  "swasthisrecipes.com",
  "zaatarandzaytoun.com",
  "tasteofbeirut.com",
  "196flavors.com",
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
  "natashaskitchen.com",
  "cafedelites.com",
  "jocooks.com",
  "aheadofthyme.com",
  "damndelicious.net",
  "wellplated.com",
  "spendwithpennies.com",
  "thespruceeats.com",
  "foodnetwork.com",
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

function isAllowedImage(
  url: string,
  pageUrl: string,
  width?: number,
  height?: number,
  strict = true
): boolean {
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
    lower.includes("collage")
  ) {
    return false;
  }

  if (strict && (lower.includes("pin-") || lower.includes("step-"))) {
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

  const minDim = strict ? 500 : 300;
  const minRatio = strict ? 0.52 : 0.44;
  const maxRatio = strict ? 1.85 : 2.15;

  if (width && height) {
    if (width < minDim || height < minDim) return false;
    const ratio = width / height;
    if (ratio > maxRatio || ratio < minRatio) return false;
  }

  return true;
}

function scoreImage(url: string, pageUrl: string, title: string, width?: number, height?: number): number {
  let score = 0;
  const host = getHostname(pageUrl || url);
  const lowerTitle = title.toLowerCase();
  const lowerUrl = url.toLowerCase();

  if (EDITORIAL_FOOD_DOMAINS.some((d) => host.includes(d))) {
    score += 55;
  }
  if (width && height) {
    if (width >= 1000 && height >= 1000) score += 20;
    else if (width >= 750 && height >= 750) score += 12;
    else if (width >= 500 && height >= 500) score += 6;

    // 4:5 portrait framing matches Cookbook's cover cards best & signals DSLR food blogs
    const ratio = width / height;
    if (ratio >= 0.64 && ratio <= 0.92) score += 25;
    else if (ratio > 0.92 && ratio <= 1.1) score += 16;
    else if (ratio > 1.1 && ratio <= 1.45) score += 8;
  }
  if (
    lowerTitle.includes("step by step") ||
    lowerTitle.includes("how to make") ||
    lowerTitle.includes("collage") ||
    lowerUrl.includes("pin-") ||
    lowerUrl.includes("step-")
  ) {
    score -= 12;
  }
  if (lowerUrl.includes(".jpg") || lowerUrl.includes(".jpeg") || lowerUrl.includes(".webp")) {
    score += 5;
  }
  return score;
}

function filterAndScoreCandidates(raw: RawCandidate[], maxResults: number): ScoredPhoto[] {
  const toScored = (item: RawCandidate, bonus = 0): ScoredPhoto => {
    const domain = getHostname(item.pageUrl || item.url);
    return {
      url: item.url,
      fallbackUrl: item.fallbackUrl && item.fallbackUrl !== item.url ? item.fallbackUrl : undefined,
      label: item.title,
      source: domain || "Web",
      score: scoreImage(item.url, item.pageUrl, item.title, item.width, item.height) + bonus,
    };
  };

  const strictMatches = raw
    .filter((item) => isAllowedImage(item.url, item.pageUrl, item.width, item.height, true))
    .map((item) => toScored(item, 15));

  if (strictMatches.length >= maxResults) {
    return strictMatches;
  }

  const seenStrict = new Set(strictMatches.map((m) => m.url));
  const relaxedMatches = raw
    .filter(
      (item) =>
        !seenStrict.has(item.url) &&
        isAllowedImage(item.url, item.pageUrl, item.width, item.height, false)
    )
    .map((item) => toScored(item, 0));

  return [...strictMatches, ...relaxedMatches];
}

async function fetchSerperRaw(
  searchQuery: string,
  apiKey: string,
  fallbackTitle: string
): Promise<{ items: RawCandidate[]; error?: string }> {
  const res = await fetch("https://google.serper.dev/images", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: searchQuery,
      num: 30,
    }),
  });

  if (!res.ok) {
    let detail = "";
    try {
      detail = (await res.text()).slice(0, 120);
    } catch {
      // ignore body read errors
    }
    return { items: [], error: `Serper HTTP ${res.status}${detail ? `: ${detail}` : ""}` };
  }

  const data = (await res.json()) as { images?: any[] };
  const items: RawCandidate[] = [];

  for (const item of data.images || []) {
    const url = item.imageUrl || "";
    if (!url) continue;
    items.push({
      url,
      fallbackUrl: item.thumbnailUrl || undefined,
      pageUrl: item.link || "",
      width: Number(item.imageWidth) || undefined,
      height: Number(item.imageHeight) || undefined,
      title: item.title || fallbackTitle,
    });
  }

  return { items };
}

async function fetchBraveRaw(
  searchQuery: string,
  apiKey: string,
  fallbackTitle: string
): Promise<{ items: RawCandidate[]; error?: string }> {
  const params = new URLSearchParams({
    q: searchQuery,
    count: "25",
    safesearch: "strict",
  });

  const res = await fetch(`https://api.search.brave.com/res/v1/images/search?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": apiKey,
    },
  });

  if (!res.ok) {
    return { items: [], error: `Brave HTTP ${res.status}` };
  }

  const data = (await res.json()) as { results?: any[] };
  const items: RawCandidate[] = [];

  for (const item of data.results || []) {
    const url = item?.properties?.url || item?.thumbnail?.src || "";
    if (!url) continue;
    items.push({
      url,
      fallbackUrl: item?.thumbnail?.src || undefined,
      pageUrl: item?.url || "",
      width: Number(item?.properties?.width) || undefined,
      height: Number(item?.properties?.height) || undefined,
      title: item.title || fallbackTitle,
    });
  }

  return { items };
}

export async function searchEditorialFoodImages(options: {
  query: string;
  cuisine?: string;
  serperKey?: string;
  braveKey?: string;
  maxResults?: number;
}): Promise<EditorialSearchResponse> {
  const rawQuery = options.query.trim();
  const cuisine = (options.cuisine || "").trim();
  const maxResults = options.maxResults ?? 10;
  const serperKey = (options.serperKey || "").trim();
  const braveKey = (options.braveKey || "").trim();
  const configured = {
    serper: Boolean(serperKey),
    brave: Boolean(braveKey),
  };

  if (!rawQuery) {
    return { photos: [], provider: "none", configured };
  }

  const cleaned = cleanDishQuery(rawQuery);
  const queryWithCuisine =
    cuisine && cuisine !== "All" && cuisine !== "Other" && !cleaned.toLowerCase().includes(cuisine.toLowerCase())
      ? `${cleaned} ${cuisine}`
      : cleaned;

  let rawCandidates: RawCandidate[] = [];
  let provider: "serper" | "brave" | "none" = "none";
  let error: string | undefined;

  try {
    if (serperKey) {
      provider = "serper";
      const primary = await fetchSerperRaw(`${queryWithCuisine} recipe`, serperKey, cleaned);
      rawCandidates = primary.items;
      if (primary.error) error = primary.error;

      let scoredSoFar = filterAndScoreCandidates(rawCandidates, maxResults);
      if (!error && scoredSoFar.length < maxResults && queryWithCuisine !== cleaned) {
        const secondary = await fetchSerperRaw(`${cleaned} food recipe`, serperKey, cleaned);
        rawCandidates = [...rawCandidates, ...secondary.items];
        if (secondary.error) error = secondary.error;
      }
    } else if (braveKey) {
      provider = "brave";
      const primary = await fetchBraveRaw(`${queryWithCuisine} recipe`, braveKey, cleaned);
      rawCandidates = primary.items;
      if (primary.error) error = primary.error;

      let scoredSoFar = filterAndScoreCandidates(rawCandidates, maxResults);
      if (!error && scoredSoFar.length < maxResults && queryWithCuisine !== cleaned) {
        const secondary = await fetchBraveRaw(`${cleaned} food recipe`, braveKey, cleaned);
        rawCandidates = [...rawCandidates, ...secondary.items];
        if (secondary.error) error = secondary.error;
      }
    }
  } catch (err: any) {
    error = err?.message || "Editorial image search request failed";
    console.error("Editorial image search error:", err);
  }

  const scored = filterAndScoreCandidates(rawCandidates, maxResults);
  const seen = new Set<string>();
  const photos: EditorialPhotoResult[] = scored
    .sort((a, b) => b.score - a.score)
    .filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    })
    .slice(0, maxResults)
    .map(({ url, fallbackUrl, label, source }) =>
      fallbackUrl ? { url, fallbackUrl, label, source } : { url, label, source }
    );

  return error
    ? { photos, provider, configured, error }
    : { photos, provider, configured };
}
