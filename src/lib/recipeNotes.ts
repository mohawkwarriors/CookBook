const HTTP_URL_RE = /^https?:\/\//i;

const URL_OR_DOMAIN_RE =
  /(?:https?:\/\/|www\.|\b[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|co|io|blog|tv|uk|ca|au|in|food|kitchen|recipes)\b)/i;

const WEBSITE_PUBLICATION_RE =
  /\b(?:serious eats|food lab|nyt cooking|new york times|bon app[eé]tit|allrecipes|food network|epicurious|delish|tasty|smitten kitchen|budget bytes|half baked harvest|cookie and kate|sally'?s baking addiction|minimalist baker|love and lemons|skinnytaste|recipetin eats|cafe delites|well plated|inspired taste|hebbars kitchen|feel good foodie|sugar spun run|the modern proper|paint the kitchen red|lil'? luna|moribyan|a cozy kitchen|buttermilkbysam|youtube|tiktok|instagram|pinterest|substack|website|blog)\b/i;

const PERSONAL_ATTRIBUTION_RE =
  /\b(?:mom|mum|mama|dad|papa|grandma|grandmother|grandpa|nani|nana|dadi|dada|khala|khalo|phuppo|chachi|mami|aunt|auntie|uncle|sister|brother|cousin|family|wife|husband|neighbor|neighbour|friend)\b/i;

function isHandleLike(text: string): boolean {
  const trimmed = text.trim();
  return /^@?[a-z0-9][a-z0-9_.-]{2,}$/.test(trimmed) && !/\s/.test(trimmed);
}

/**
 * Returns true when a note line is a website/publication source credit
 * (e.g. "Recipe by buttermilkbysam", "Source: Serious Eats") rather than
 * a personal/family attribution or cooking tip.
 */
export function isWebsiteSourceNoteLine(rawLine: string, sourceUrl?: string): boolean {
  const clean = rawLine
    .trim()
    .replace(/^[-*•]\s*/, "")
    .replace(/^\d+\.\s*/, "")
    .trim();
  if (!clean) return false;

  const hasWebsiteSource = Boolean(sourceUrl && HTTP_URL_RE.test(sourceUrl.trim()));

  // Always preserve personal/family attributions unless they are explicitly citing a URL.
  if (PERSONAL_ATTRIBUTION_RE.test(clean) && !URL_OR_DOMAIN_RE.test(clean)) {
    return false;
  }

  // "Recipe by ..." / "Original recipe by ..."
  const recipeByMatch = clean.match(/^(?:original\s+)?recipe\s+by\s+(.+?)\.?$/i);
  if (recipeByMatch) {
    if (hasWebsiteSource) return true;
    const credit = recipeByMatch[1].trim();
    return (
      URL_OR_DOMAIN_RE.test(credit) ||
      WEBSITE_PUBLICATION_RE.test(credit) ||
      isHandleLike(credit)
    );
  }

  // "Source: ..." / "Original source: ..." / "Recipe source: ..." / "Credit: ..." / "Via: ..."
  const sourceLabelMatch = clean.match(
    /^(?:(?:original|recipe|web(?:site)?)\s+)?(?:source|credit|via|website)\s*:\s*(.+?)\.?$/i
  );
  if (sourceLabelMatch) {
    if (hasWebsiteSource) return true;
    const credit = sourceLabelMatch[1].trim();
    return (
      URL_OR_DOMAIN_RE.test(credit) ||
      WEBSITE_PUBLICATION_RE.test(credit) ||
      isHandleLike(credit)
    );
  }

  // "From <website>" / "Adapted from <website>" when the website is already linked
  if (
    hasWebsiteSource &&
    /^(?:(?:adapted|originally|taken|sourced|imported)\s+)?from\s+.+$/i.test(clean) &&
    (URL_OR_DOMAIN_RE.test(clean) || WEBSITE_PUBLICATION_RE.test(clean))
  ) {
    return true;
  }

  return false;
}

/**
 * Splits recipe notes into clean display bullets and removes redundant website
 * source attributions while preserving personal/family notes and cooking tips.
 */
export function parseDisplayNotes(notes?: string, sourceUrl?: string): string[] {
  if (!notes || !notes.trim()) return [];

  let parsed = notes
    .split("\n")
    .map((n) => n.trim())
    .filter(Boolean);

  if (parsed.length === 1 && parsed[0].includes(". ")) {
    parsed = parsed[0]
      .split(/\.\s+/)
      .map((n) => n.trim())
      .filter(Boolean)
      .map((n) => (n.endsWith(".") ? n : `${n}.`));
  }

  return parsed
    .filter((line) => !isWebsiteSourceNoteLine(line, sourceUrl))
    .map((line) => line.replace(/^[-*•]\s*/, "").replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);
}

/**
 * Strips website source credit lines from raw notes text (used during URL/web import).
 */
export function stripWebsiteSourceNotes(notes?: string, sourceUrl?: string): string {
  if (!notes || !notes.trim()) return "";
  return notes
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !isWebsiteSourceNoteLine(line, sourceUrl))
    .join("\n");
}
