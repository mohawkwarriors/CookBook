import type { Ingredient, Recipe } from "../types";
import { stripWebsiteSourceNotes } from "./recipeNotes";

export interface ParseRecipeUrlOptions {
  url: string;
  geminiApiKey?: string;
  fetchImpl?: typeof fetch;
}

export type ParsedRecipeData = Omit<Recipe, "id" | "createdAt"> & {
  mealType: NonNullable<Recipe["mealType"]>;
  imageUrl: string;
  sourceUrl: string;
  notes: string;
};

export interface ParseRecipeUrlResult {
  ok: boolean;
  status: number;
  recipe?: ParsedRecipeData;
  method?: "json-ld" | "microdata" | "gemini";
  error?: string;
}

const VALID_CUISINES = [
  "Desi",
  "Persian",
  "Middle Eastern",
  "American",
  "Italian",
  "Mexican",
  "Asian",
  "Thai",
  "Mediterranean",
  "French",
  "Japanese",
  "Caribbean",
  "Other",
] as const;

const VALID_MEAL_TYPES = [
  "Starter",
  "Main",
  "Side",
  "Drink",
  "Dessert",
  "Snack",
] as const;

type MealType = (typeof VALID_MEAL_TYPES)[number];

const MAX_URL_LENGTH = 2048;
const MAX_REDIRECTS = 5;
const FETCH_TIMEOUT_MS = 12_000;
const MAX_HTML_BYTES = 2 * 1024 * 1024; // 2 MB streaming cap
const GEMINI_TIMEOUT_MS = 20_000;

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,application/ld+json;q=0.8,*/*;q=0.7",
  "Accept-Language": "en-US,en;q=0.9",
};

const BLOCKED_CONTENT_TYPE_PREFIXES = [
  "image/",
  "video/",
  "audio/",
  "application/pdf",
  "application/octet-stream",
  "application/zip",
  "font/",
];

const UNICODE_FRACTIONS: Record<string, number> = {
  "¼": 0.25,
  "½": 0.5,
  "¾": 0.75,
  "⅐": 1 / 7,
  "⅑": 1 / 9,
  "⅒": 0.1,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "⅕": 0.2,
  "⅖": 0.4,
  "⅗": 0.6,
  "⅘": 0.8,
  "⅙": 1 / 6,
  "⅚": 5 / 6,
  "⅛": 0.125,
  "⅜": 0.375,
  "⅝": 0.625,
  "⅞": 0.875,
};

const NAMED_HTML_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  hellip: "…",
  deg: "°",
  frac12: "½",
  frac14: "¼",
  frac34: "¾",
  times: "×",
  eacute: "é",
  egrave: "è",
  aacute: "á",
  ntilde: "ñ",
  uuml: "ü",
};

const KNOWN_UNITS = new Set([
  "g",
  "gram",
  "grams",
  "kg",
  "kilogram",
  "kilograms",
  "mg",
  "oz",
  "ounce",
  "ounces",
  "lb",
  "lbs",
  "pound",
  "pounds",
  "ml",
  "milliliter",
  "milliliters",
  "millilitre",
  "millilitres",
  "l",
  "liter",
  "liters",
  "litre",
  "litres",
  "dl",
  "tsp",
  "tsps",
  "teaspoon",
  "teaspoons",
  "tbsp",
  "tbsps",
  "tbs",
  "tablespoon",
  "tablespoons",
  "cup",
  "cups",
  "c",
  "pt",
  "pint",
  "pints",
  "qt",
  "quart",
  "quarts",
  "gal",
  "gallon",
  "gallons",
  "fl",
  "clove",
  "cloves",
  "slice",
  "slices",
  "piece",
  "pieces",
  "pc",
  "pcs",
  "sprig",
  "sprigs",
  "stalk",
  "stalks",
  "bunch",
  "bunches",
  "head",
  "heads",
  "can",
  "cans",
  "jar",
  "jars",
  "package",
  "packages",
  "pkg",
  "packet",
  "packets",
  "bag",
  "bags",
  "box",
  "boxes",
  "bottle",
  "bottles",
  "stick",
  "sticks",
  "pinch",
  "pinches",
  "dash",
  "dashes",
  "handful",
  "handfuls",
  "sheet",
  "sheets",
  "strip",
  "strips",
  "rib",
  "ribs",
  "ear",
  "ears",
  "fillet",
  "fillets",
  "breast",
  "breasts",
  "thigh",
  "thighs",
  "leaf",
  "leaves",
  "pod",
  "pods",
  "inch",
  "inches",
  "cm",
  "mm",
  "drop",
  "drops",
  "scoop",
  "scoops",
  "loaf",
  "loaves",
  "wedge",
  "wedges",
]);

const GENERIC_SECTION_NAMES = new Set([
  "instructions",
  "instruction",
  "directions",
  "direction",
  "method",
  "steps",
  "preparation",
  "procedure",
  "recipe",
  "how to make",
  "how to make it",
]);

function roundAmount(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * 1000) / 1000;
}

function isPrivateIpv4Octets(a: number, b: number, c: number, d: number): boolean {
  if (
    !Number.isInteger(a) ||
    !Number.isInteger(b) ||
    !Number.isInteger(c) ||
    !Number.isInteger(d) ||
    a < 0 ||
    a > 255 ||
    b < 0 ||
    b > 255 ||
    c < 0 ||
    c > 255 ||
    d < 0 ||
    d > 255
  ) {
    return true;
  }
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a === 127) return true; // 127.0.0.0/8 loopback
  if (a === 169 && b === 254) return true; // 169.254.0.0/16 link-local / metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 0 && c === 0) return true; // 192.0.0.0/24
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 benchmark
  if (a >= 224) return true; // multicast & reserved (224/4, 240/4)
  return false;
}

function isBlockedHost(rawHostname: string): boolean {
  const host = rawHostname
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.+$/, "");

  if (!host) return true;

  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".home.arpa") ||
    host === "metadata.goog" ||
    host === "metadata.google.internal" ||
    host === "instance-data"
  ) {
    return true;
  }

  // IPv4 dotted-quad check (WHATWG URL normalizes hex/octal/integer IPv4 to dotted decimal)
  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    return isPrivateIpv4Octets(
      Number(ipv4Match[1]),
      Number(ipv4Match[2]),
      Number(ipv4Match[3]),
      Number(ipv4Match[4])
    );
  }

  // IPv6 checks
  if (host.includes(":")) {
    if (host === "::" || host === "::1" || host === "0:0:0:0:0:0:0:0" || host === "0:0:0:0:0:0:0:1") {
      return true;
    }

    // IPv4-mapped (::ffff:), IPv4-compatible (::), and SIIT IPv4-translated (::ffff:0:) dotted forms
    const mappedDotted = host.match(/^::(?:ffff:(?:0:)?)?(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (mappedDotted) {
      return isPrivateIpv4Octets(
        Number(mappedDotted[1]),
        Number(mappedDotted[2]),
        Number(mappedDotted[3]),
        Number(mappedDotted[4])
      );
    }

    // IPv4-mapped (::ffff:XXXX:XXXX), IPv4-compatible (::XXXX:XXXX), and SIIT (::ffff:0:XXXX:XXXX) hex forms
    const mappedHex = host.match(/^(?:0:)*::(?:ffff:(?:0:)?)?([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (mappedHex) {
      const hi = parseInt(mappedHex[1], 16);
      const lo = parseInt(mappedHex[2], 16);
      return isPrivateIpv4Octets((hi >> 8) & 0xff, hi & 0xff, (lo >> 8) & 0xff, lo & 0xff);
    }

    // Block remaining deprecated ::/96 and ::ffff:0:0/96 ranges
    if (host.startsWith("::ffff:") || /^::[0-9a-f]{1,4}$/.test(host)) {
      return true;
    }

    // NAT64 well-known prefix 64:ff9b::/96 and 6to4 2002::/16
    if (host.startsWith("64:ff9b:") || host.startsWith("2002:")) {
      return true;
    }

    // First 16-bit hextet checks: ULA fc00::/7, link-local fe80::/10, multicast ff00::/8
    const firstHextet = host.split(":")[0];
    if (firstHextet) {
      const val = parseInt(firstHextet, 16);
      if (!Number.isNaN(val)) {
        if ((val & 0xfe00) === 0xfc00) return true; // fc00::/7
        if ((val & 0xffc0) === 0xfe80) return true; // fe80::/10
        if ((val & 0xff00) === 0xff00) return true; // ff00::/8
      }
    }
  }

  // Require at least one dot for non-IP hostnames (blocks bare internal hostnames like "redis")
  if (!host.includes(".") && !host.includes(":")) {
    return true;
  }

  return false;
}

export function validatePublicHttpUrl(
  rawUrl: string,
  baseUrl?: string
): { ok: boolean; url?: URL; error?: string } {
  const trimmed = (rawUrl || "").trim();
  if (!trimmed) {
    return { ok: false, error: "Please enter a recipe URL." };
  }
  if (trimmed.length > MAX_URL_LENGTH) {
    return { ok: false, error: "The URL is too long to process." };
  }

  const hadExplicitScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed);
  let candidate = trimmed;
  if (!baseUrl && !hadExplicitScheme) {
    candidate = `https://${candidate}`;
  }

  let parsed: URL;
  try {
    parsed = baseUrl ? new URL(candidate, baseUrl) : new URL(candidate);
  } catch {
    return { ok: false, error: "Please enter a valid web URL (for example, https://...)." };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "Only http:// and https:// recipe links are supported." };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, error: "URLs with embedded credentials are not allowed." };
  }

  if (parsed.port && parsed.port !== "80" && parsed.port !== "443") {
    return { ok: false, error: "Only standard web ports (80 and 443) are supported." };
  }

  const bareHost = parsed.hostname.trim().toLowerCase().replace(/\.+$/, "");
  if (
    !baseUrl &&
    !bareHost.includes(".") &&
    !bareHost.includes(":") &&
    bareHost !== "localhost" &&
    bareHost !== "instance-data" &&
    !bareHost.startsWith("metadata")
  ) {
    return { ok: false, error: "Please enter a valid web URL (for example, https://...)." };
  }

  if (isBlockedHost(parsed.hostname)) {
    return { ok: false, error: "Private or local network URLs cannot be imported." };
  }

  return { ok: true, url: parsed };
}

function sanitizeImageUrl(raw: unknown, pageUrl: string): string {
  if (typeof raw !== "string" || !raw.trim()) return "";
  const validated = validatePublicHttpUrl(raw.trim(), pageUrl);
  if (!validated.ok) return "";
  const href = validated.url.toString();
  if (href.length > MAX_URL_LENGTH) return "";
  return href;
}

export function decodeHtmlEntities(input: string): string {
  if (!input) return "";
  return input
    .replace(/&(?:#x([0-9a-fA-F]{1,6})|#(\d{1,7})|([a-zA-Z][a-zA-Z0-9]{1,12}));/g, (match, hex, dec, name) => {
      if (hex) {
        const cp = parseInt(hex, 16);
        if (cp >= 0x20 && cp <= 0x10ffff) {
          try {
            return String.fromCodePoint(cp);
          } catch {
            return match;
          }
        }
        return " ";
      }
      if (dec) {
        const cp = parseInt(dec, 10);
        if (cp >= 0x20 && cp <= 0x10ffff) {
          try {
            return String.fromCodePoint(cp);
          } catch {
            return match;
          }
        }
        return " ";
      }
      if (name) {
        const mapped = NAMED_HTML_ENTITIES[name.toLowerCase()];
        if (mapped !== undefined) return mapped;
      }
      return match;
    })
    .replace(/\u00a0/g, " ");
}

function cleanText(input: unknown, preserveNewlines = false): string {
  if (typeof input !== "string") return "";
  let text = input
    .replace(/<br\s*\/?>/gi, preserveNewlines ? "\n" : " ")
    .replace(/<\/(?:p|div|li|h[1-6])>/gi, preserveNewlines ? "\n" : " ")
    .replace(/<[^>]+>/g, " ");
  text = decodeHtmlEntities(text);
  if (preserveNewlines) {
    return text
      .split(/\r?\n/)
      .map((line) => line.replace(/[ \t]+/g, " ").trim())
      .filter(Boolean)
      .join("\n")
      .trim();
  }
  return text.replace(/\s+/g, " ").trim();
}

export function parseIsoDurationMinutes(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }
  if (typeof value !== "string") return 0;
  const trimmed = value.trim();
  if (!trimmed) return 0;

  // ISO-8601 duration: e.g. PT6H, PT16H25M, P1DT2H30M, PT45M, PT90S
  const iso = trimmed.match(
    /^P(?:(\d+(?:\.\d+)?)D)?(?:T(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i
  );
  if (iso && (iso[1] || iso[2] || iso[3] || iso[4])) {
    const days = parseFloat(iso[1] || "0");
    const hours = parseFloat(iso[2] || "0");
    const mins = parseFloat(iso[3] || "0");
    const secs = parseFloat(iso[4] || "0");
    const total = days * 1440 + hours * 60 + mins + secs / 60;
    return total > 0 ? Math.max(1, Math.round(total)) : 0;
  }

  // Human-readable fallback: "1 hr 30 mins", "45 minutes"
  let total = 0;
  const dMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*(?:days?|d)\b/i);
  const hMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/i);
  const mMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*(?:minutes?|mins?|m)\b/i);
  if (dMatch) total += parseFloat(dMatch[1]) * 1440;
  if (hMatch) total += parseFloat(hMatch[1]) * 60;
  if (mMatch) total += parseFloat(mMatch[1]);
  if (total > 0) return Math.max(1, Math.round(total));

  if (/^\d+$/.test(trimmed)) {
    const n = parseInt(trimmed, 10);
    return n > 0 ? n : 0;
  }

  return 0;
}

function parseServings(value: unknown): { servings: number; yieldNote: string } {
  const candidates: string[] = [];
  if (typeof value === "number" && Number.isFinite(value) && value >= 1) {
    return { servings: Math.min(999, Math.round(value)), yieldNote: "" };
  }
  if (typeof value === "string") {
    candidates.push(value);
  } else if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "number" && Number.isFinite(item) && item >= 1) {
        return { servings: Math.min(999, Math.round(item)), yieldNote: "" };
      }
      if (typeof item === "string" && item.trim()) {
        candidates.push(item);
      }
    }
  }

  let descriptiveNote = "";
  for (const raw of candidates) {
    const cleaned = cleanText(raw);
    if (!cleaned) continue;

    // Strip pan/baking dimensions like "9x13", "8 x 8 inch", "9×13" before parsing servings
    const withoutDimensions = cleaned.replace(
      /\b\d+(?:\.\d+)?\s*[x×]\s*\d+(?:\.\d+)?(?:\s*(?:inch|inches|in|cm|mm|"))?\b/gi,
      ""
    );

    // Pure number candidate (common on WP Recipe Maker: ["6", "6 servings"])
    const pureNum = withoutDimensions.trim().match(/^(\d{1,3})$/);
    if (pureNum) {
      const n = parseInt(pureNum[1], 10);
      if (n >= 1 && n <= 200) return { servings: n, yieldNote: "" };
    }

    // Range like "3 - 4 servings" or "4 to 6"
    const rangeMatch = withoutDimensions.match(/\b(\d{1,3})\s*(?:[-–—]|to)\s*(\d{1,3})\b/i);
    if (rangeMatch) {
      const upper = parseInt(rangeMatch[2], 10);
      if (upper >= 1 && upper <= 200) {
        return { servings: upper, yieldNote: "" };
      }
    }

    // Explicit serving/portion/slice count (e.g. "1 9x13 pan (12 slices)" -> 12)
    const explicitMatch = withoutDimensions.match(
      /\b(\d{1,3})\s*(?:servings?|portions?|people|slices?|pieces?|bars?|squares?|cookies?|muffins?|tacos?|sandwiches?|rolls?|buns?|cups?)\b/i
    );
    if (explicitMatch) {
      const n = parseInt(explicitMatch[1], 10);
      if (n >= 1 && n <= 200) {
        return { servings: n, yieldNote: "" };
      }
    }

    // Fallback numeric yield count
    const countMatch = withoutDimensions.match(/\b(\d{1,3})\b/);
    if (countMatch) {
      const n = parseInt(countMatch[1], 10);
      if (n >= 1 && n <= 200) {
        return { servings: n, yieldNote: "" };
      }
    }

    if (!descriptiveNote) {
      descriptiveNote = cleaned;
    }
  }

  return { servings: 4, yieldNote: descriptiveNote };
}

function parseNumericToken(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;

  // Replace unicode fractions with spaced decimal additions
  let normalized = s;
  for (const [glyph, val] of Object.entries(UNICODE_FRACTIONS)) {
    if (normalized.includes(glyph)) {
      const idx = normalized.indexOf(glyph);
      const before = normalized.slice(0, idx).trim();
      const after = normalized.slice(idx + glyph.length).trim();
      if (!after) {
        const whole = before ? parseFloat(before) : 0;
        if (!Number.isNaN(whole)) {
          return roundAmount(whole + val);
        }
      }
    }
  }

  // Mixed number: "1 1/2" or "1-1/2"
  const mixed = normalized.match(/^(\d+)\s*[-\s]\s*(\d+)\s*\/\s*(\d+)$/);
  if (mixed) {
    const denom = parseInt(mixed[3], 10);
    if (denom > 0) {
      return roundAmount(parseInt(mixed[1], 10) + parseInt(mixed[2], 10) / denom);
    }
  }

  // Simple fraction: "3/4"
  const frac = normalized.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (frac) {
    const denom = parseInt(frac[2], 10);
    if (denom > 0) {
      return roundAmount(parseInt(frac[1], 10) / denom);
    }
  }

  // Plain decimal / integer
  if (/^\d+(?:\.\d+)?$/.test(normalized)) {
    const val = parseFloat(normalized);
    return Number.isFinite(val) ? roundAmount(val) : null;
  }

  return null;
}

const QTY_TOKEN_PATTERN =
  "(?:\\d+\\s+\\d+\\s*/\\s*\\d+|\\d+\\s*/\\s*\\d+|\\d+(?:\\.\\d+)?\\s*[¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]|[¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]|\\d+(?:\\.\\d+)?)";

const RANGE_PREFIX_RE = new RegExp(
  `^(${QTY_TOKEN_PATTERN})\\s*(?:[-–—]|to)\\s*(${QTY_TOKEN_PATTERN})(?:\\s+|$)(.*)$`,
  "i"
);
const SINGLE_PREFIX_RE = new RegExp(`^(${QTY_TOKEN_PATTERN})(?:\\s+|$)(.*)$`);
const ATTACHED_UNIT_RE = /^(\d+(?:\.\d+)?)([a-zA-Z]{1,10})\b\s*(.*)$/;
const DIMENSION_PREFIX_RE = /^\d+(?:\.\d+)?\s*[x×]\s*\d+/i;

function splitUnitAndName(rest: string): { unit: string; name: string } {
  const trimmed = rest.trim();
  if (!trimmed) return { unit: "", name: "" };

  // Handle "fl oz" / "fl. oz."
  const flOz = trimmed.match(/^fl\.?\s*oz\.?\b\s*(.*)$/i);
  if (flOz) {
    return { unit: "fl oz", name: flOz[1].replace(/^of\s+/i, "").trim() };
  }

  // Handle parenthetical container size right after qty: e.g. "(14-oz) can diced tomatoes"
  const parenContainer = trimmed.match(/^(\([^)]{1,24}\))\s+([a-zA-Z]+\.?)\b\s*(.*)$/);
  if (parenContainer) {
    const candidateUnit = parenContainer[2].replace(/\.$/, "").toLowerCase();
    if (KNOWN_UNITS.has(candidateUnit)) {
      const rem = parenContainer[3].replace(/^of\s+/i, "").trim();
      return {
        unit: parenContainer[2].replace(/\.$/, ""),
        name: rem ? `${rem} ${parenContainer[1]}` : parenContainer[1],
      };
    }
  }

  // Standard first-word unit check
  const firstWordMatch = trimmed.match(/^([a-zA-Z]+\.?)\b\s*(.*)$/);
  if (firstWordMatch) {
    const rawUnit = firstWordMatch[1].replace(/\.$/, "");
    const lowerUnit = rawUnit.toLowerCase();
    if (KNOWN_UNITS.has(lowerUnit)) {
      let remainder = firstWordMatch[2].trim();
      // Preserve parenthetical metric weight e.g. "2 cups (240g) Flour" -> unit "cups", name "Flour (240g)"
      const parenAfterUnit = remainder.match(/^(\([^)]{1,24}\))\s+(.+)$/);
      if (parenAfterUnit) {
        remainder = `${parenAfterUnit[2].trim()} ${parenAfterUnit[1]}`;
      }
      remainder = remainder.replace(/^of\s+/i, "").trim();
      return { unit: rawUnit, name: remainder };
    }
  }

  return { unit: "", name: trimmed };
}

function cleanIngredientName(name: string): string {
  return name
    .replace(/\(\s*,\s*/g, "(")
    .replace(/\(\(([^()]+)\)\)/g, "($1)")
    .replace(/^[,\s-]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseIngredientLine(rawLine: string): Ingredient {
  const cleaned = cleanText(rawLine);
  if (!cleaned) return { name: "", amount: 0, unit: "" };

  // Avoid misparsing equipment/pan dimensions like "9x13 baking dish"
  if (DIMENSION_PREFIX_RE.test(cleaned)) {
    return { name: cleanIngredientName(cleaned), amount: 0, unit: "" };
  }

  // 1. Cook Well comma-postfix format: "Yeast, 9 g" or "Extra Virgin Olive Oil, 20 g + a drizzle"
  const commaIdx = cleaned.lastIndexOf(",");
  if (commaIdx > 0 && !/^\d|^[¼½¾⅓⅔⅛⅜⅝⅞]/.test(cleaned)) {
    const leftName = cleaned.slice(0, commaIdx).trim();
    const rightMeasure = cleaned.slice(commaIdx + 1).trim();
    const rightMatch = rightMeasure.match(
      new RegExp(`^(${QTY_TOKEN_PATTERN})\\s*([a-zA-Z]+\\.?)?(.*)$`)
    );
    if (leftName && rightMatch && !DIMENSION_PREFIX_RE.test(rightMeasure)) {
      const amount = parseNumericToken(rightMatch[1]);
      if (amount !== null && amount > 0) {
        const rawUnit = (rightMatch[2] || "").replace(/\.$/, "");
        const trailing = (rightMatch[3] || "").trim();
        const isKnownUnit = rawUnit && KNOWN_UNITS.has(rawUnit.toLowerCase());
        const unit = isKnownUnit ? rawUnit : "";
        const extra = isKnownUnit ? trailing : `${rawUnit} ${trailing}`.trim();
        const finalName = extra
          ? cleanIngredientName(`${leftName} (${extra})`)
          : cleanIngredientName(leftName);
        return { name: finalName, amount, unit };
      }
    }
  }

  // 2. Range prefix: "2-3 cloves garlic" or "2 to 3 tbsp oil"
  const rangeMatch = cleaned.match(RANGE_PREFIX_RE);
  if (rangeMatch) {
    const low = parseNumericToken(rangeMatch[1]);
    const high = parseNumericToken(rangeMatch[2]);
    const rest = rangeMatch[3].trim();
    if (low !== null && high !== null && rest) {
      const { unit, name } = splitUnitAndName(rest);
      const finalName = cleanIngredientName(name || rest);
      return {
        name: finalName,
        amount: roundAmount(high),
        unit,
      };
    }
  }

  // 3. Attached metric unit prefix: "450g bread flour", "20ml water"
  const attachedMatch = cleaned.match(ATTACHED_UNIT_RE);
  if (attachedMatch && KNOWN_UNITS.has(attachedMatch[2].toLowerCase())) {
    const amount = parseNumericToken(attachedMatch[1]);
    const rest = attachedMatch[3].trim();
    if (amount !== null && rest) {
      return {
        name: cleanIngredientName(rest),
        amount,
        unit: attachedMatch[2],
      };
    }
  }

  // 4. Standard prefix: "1 1/4 lbs chicken", "½ cup sugar", "3 large eggs"
  const singleMatch = cleaned.match(SINGLE_PREFIX_RE);
  if (singleMatch) {
    const amount = parseNumericToken(singleMatch[1]);
    const rest = singleMatch[2].trim();
    if (amount !== null && rest) {
      const { unit, name } = splitUnitAndName(rest);
      return {
        name: cleanIngredientName(name || rest),
        amount,
        unit,
      };
    }
  }

  // 5. Unquantified ingredient: "Flaky salt", "Rosemary", "Salt and pepper to taste"
  return { name: cleanIngredientName(cleaned), amount: 0, unit: "" };
}

function sanitizeSectionLabel(raw: string): string {
  let label = cleanText(raw)
    .replace(/:+$/g, "")
    .replace(/[^A-Za-z0-9 &/'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!label) return "";
  if (GENERIC_SECTION_NAMES.has(label.toLowerCase())) return "";

  const words = label.split(/\s+/);
  if (words.length > 4) {
    label = label.replace(/^for\s+the\s+/i, "").trim();
  }
  const trimmedWords = label.split(/\s+/);
  if (trimmedWords.length > 4) {
    label = trimmedWords.slice(0, 4).join(" ");
  }
  if (label.length > 32) {
    label = label.slice(0, 32).trim();
  }
  if (label.length < 2) return "";

  label = label.charAt(0).toUpperCase() + label.slice(1);
  if (!/^[A-Z][A-Za-z0-9 &/'-]{1,32}$/.test(label)) return "";
  return label;
}

function formatHowToStep(rawName: unknown, rawText: unknown): string {
  const text = cleanText(rawText, true);
  const name = cleanText(rawName).replace(/:/g, "").trim();

  if (!text) return name;
  if (!name) return text;

  // Ignore generic step labels like "Step 1", "1.", or duplicates of the opening text
  if (/^(?:step\s*)?\d+\.?$/i.test(name)) return text;
  if (name.length > 60) return text;

  const normName = name.toLowerCase().replace(/[.…]+$/, "").trim();
  const normText = text.toLowerCase();
  if (normName.length >= 6 && normText.startsWith(normName.slice(0, Math.min(normName.length, 24)))) {
    return text;
  }

  // Use em-dash (not colon) so single-component step headings never trigger multi-component chapter splits
  return `${name} — ${text}`;
}

function extractInstructions(rawInstructions: unknown): string[] {
  if (!rawInstructions) return [];

  if (typeof rawInstructions === "string") {
    const cleaned = cleanText(rawInstructions, true);
    return cleaned
      .split(/\n+/)
      .map((s) => s.replace(/^\d+[.)]\s+/, "").trim())
      .filter(Boolean);
  }

  const list = Array.isArray(rawInstructions) ? rawInstructions : [rawInstructions];

  // Detect genuine multi-component HowToSections (>= 2 distinct non-generic named sections)
  const sectionLabels = new Set<string>();
  for (const entry of list) {
    if (entry && typeof entry === "object") {
      const typeVal = (entry as any)["@type"];
      const isSection =
        typeVal === "HowToSection" ||
        (Array.isArray(typeVal) && typeVal.includes("HowToSection")) ||
        Array.isArray((entry as any).itemListElement);
      if (isSection) {
        const label = sanitizeSectionLabel((entry as any).name);
        if (label) sectionLabels.add(label.toLowerCase());
      }
    }
  }
  const useSectionPrefixes = sectionLabels.size >= 2;

  const steps: string[] = [];

  const pushStep = (stepText: string, sectionPrefix: string) => {
    const trimmed = stepText.trim();
    if (!trimmed) return;
    if (sectionPrefix) {
      steps.push(`${sectionPrefix}: ${trimmed}`);
    } else {
      steps.push(trimmed);
    }
  };

  const visit = (node: unknown, activeSectionPrefix: string) => {
    if (!node) return;
    if (typeof node === "string") {
      const cleaned = cleanText(node, true);
      if (cleaned) pushStep(cleaned, activeSectionPrefix);
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) visit(item, activeSectionPrefix);
      return;
    }
    if (typeof node === "object") {
      const obj = node as Record<string, unknown>;
      const typeVal = obj["@type"];
      const types = Array.isArray(typeVal) ? typeVal : typeof typeVal === "string" ? [typeVal] : [];
      const isSection =
        types.some((t) => typeof t === "string" && t.endsWith("HowToSection")) ||
        obj.itemListElement !== undefined;

      if (isSection && obj.itemListElement !== undefined) {
        const label = useSectionPrefixes ? sanitizeSectionLabel(String(obj.name || "")) : "";
        visit(obj.itemListElement, label || activeSectionPrefix);
        return;
      }

      const formatted = formatHowToStep(obj.name, obj.text ?? obj.description);
      if (formatted) {
        pushStep(formatted, activeSectionPrefix);
      }
    }
  };

  visit(list, "");
  return steps;
}

function mapCuisine(rawCuisine: unknown, rawKeywords: unknown, rawCategory: unknown): string {
  const parts: string[] = [];
  const add = (val: unknown) => {
    if (typeof val === "string") parts.push(val);
    else if (Array.isArray(val)) val.forEach(add);
  };
  add(rawCuisine);
  add(rawCategory);
  add(rawKeywords);

  const combined = parts.join(" ").toLowerCase();
  if (!combined) return "Other";

  if (/\b(?:desi|indian|pakistani|bangladeshi|punjabi|hyderabadi|south asian|mughlai|gujarati|kashmiri)\b/.test(combined)) {
    return "Desi";
  }
  if (/\b(?:persian|iranian)\b/.test(combined)) return "Persian";
  if (/\b(?:middle eastern|lebanese|turkish|arabic|arab|levantine|syrian|moroccan|egyptian|palestinian|iraqi|yemeni|afghan)\b/.test(combined)) {
    return "Middle Eastern";
  }
  if (/\b(?:italian|sicilian|neapolitan|tuscan|focaccia|risotto|pasta)\b/.test(combined)) return "Italian";
  if (/\b(?:mexican|tex-mex|oaxacan)\b/.test(combined)) return "Mexican";
  if (/\b(?:thai)\b/.test(combined)) return "Thai";
  if (/\b(?:japanese|ramen|sushi|teriyaki|izakaya)\b/.test(combined)) return "Japanese";
  if (/\b(?:french|provencal|bistro)\b/.test(combined)) return "French";
  if (/\b(?:mediterranean|greek|spanish|tapas)\b/.test(combined)) return "Mediterranean";
  if (/\b(?:caribbean|jamaican|cuban|puerto rican|trinidadian)\b/.test(combined)) return "Caribbean";
  if (/\b(?:asian|chinese|korean|vietnamese|filipino|indonesian|malaysian|taiwanese|cantonese|sichuan)\b/.test(combined)) {
    return "Asian";
  }
  if (/\b(?:american|southern|cajun|creole|bbq|barbecue|new england)\b/.test(combined)) return "American";

  for (const valid of VALID_CUISINES) {
    if (combined.includes(valid.toLowerCase())) return valid;
  }

  return "Other";
}

function mapMealType(rawCategory: unknown, rawKeywords: unknown, title: string): MealType {
  const parts: string[] = [];
  const add = (val: unknown) => {
    if (typeof val === "string") parts.push(val);
    else if (Array.isArray(val)) val.forEach(add);
  };
  add(rawCategory);
  add(rawKeywords);
  parts.push(title);

  const combined = parts.join(" ").toLowerCase();

  if (/\b(?:dessert|cake|cookie|cookies|brownie|pie|tart|pastry|ice cream|pudding|cupcake|cheesecake|sweet treat)\b/.test(combined)) {
    return "Dessert";
  }
  if (/\b(?:drink|beverage|smoothie|mocktail|lemonade|chai|latte|coffee|tea|juice|shake)\b/.test(combined)) {
    return "Drink";
  }
  if (/\b(?:appetizer|starter|hors d'oeuvre|antipasti|dip|bruschetta)\b/.test(combined)) {
    return "Starter";
  }
  if (/\b(?:snack|bite|bites|chips|popcorn|trail mix|granola bar)\b/.test(combined)) {
    return "Snack";
  }
  if (/\b(?:side dish|side|bread|flatbread|focaccia|naan|roti|salad|coleslaw|fries|rice pilaf|condiment|chutney|salsa)\b/.test(combined)) {
    // Unless explicitly labeled as a main course / entree / dinner
    if (!/\b(?:main course|main dish|entree|entrée)\b/.test(combined)) {
      return "Side";
    }
  }
  return "Main";
}

function parseMacroNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return Math.round(value);
  }
  if (typeof value !== "string") return null;
  const match = value.match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const parsed = parseFloat(match[1]);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null;
}

function parseNutrition(raw: unknown): Recipe["nutrition"] | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;
  const calories = parseMacroNumber(obj.calories);
  const protein = parseMacroNumber(obj.proteinContent ?? obj.protein);
  const carbs = parseMacroNumber(obj.carbohydrateContent ?? obj.carbs);
  const fat = parseMacroNumber(obj.fatContent ?? obj.fat);

  if (calories === null && protein === null && carbs === null && fat === null) {
    return undefined;
  }

  return {
    calories: calories ?? 0,
    protein: protein ?? 0,
    carbs: carbs ?? 0,
    fat: fat ?? 0,
  };
}

interface HalalRule {
  pattern: RegExp;
  replacement: string;
  note: string;
}

const HALAL_RULES: HalalRule[] = [
  {
    pattern: /(?<!\b(?:turkey|beef|chicken|lamb|halal|vegan|vegetarian|plant-based|tempeh|coconut|soy)\s)\b(?:pork\s+)?bacon\b/gi,
    replacement: "beef bacon",
    note: "Replaced bacon with Halal beef bacon.",
  },
  {
    pattern: /\bpancetta\b/gi,
    replacement: "halal beef bacon",
    note: "Replaced pancetta with Halal beef bacon.",
  },
  {
    pattern: /\bprosciutto\b/gi,
    replacement: "halal bresaola (cured beef)",
    note: "Replaced prosciutto with Halal bresaola.",
  },
  {
    pattern: /\bguanciale\b/gi,
    replacement: "halal beef bacon",
    note: "Replaced guanciale with Halal beef bacon.",
  },
  {
    pattern: /\bpepperoni\b/gi,
    replacement: "halal beef pepperoni",
    note: "Replaced pepperoni with Halal beef pepperoni.",
  },
  {
    pattern: /(?<!\b(?:turkey|beef|chicken|lamb|halal|vegan|vegetarian|plant-based)\s)\b(?:pork\s+)?(?:ham|gammon)\b/gi,
    replacement: "halal smoked turkey",
    note: "Replaced ham with Halal smoked turkey.",
  },
  {
    pattern: /\bpork\s+belly\b/gi,
    replacement: "beef short ribs",
    note: "Replaced pork belly with beef short ribs.",
  },
  {
    pattern: /\b(?:ground\s+pork|pork\s+sausage|pork\s+chops?|pork\s+shoulder|pork\s+tenderloin|pork\s+loin|pork\s+ribs?|pork)\b/gi,
    replacement: "halal beef or chicken",
    note: "Replaced pork with Halal beef or chicken.",
  },
  {
    pattern: /\blard\b/gi,
    replacement: "ghee or vegetable shortening",
    note: "Replaced lard with ghee or vegetable shortening.",
  },
  {
    pattern: /(?<!\b(?:halal|beef|fish|vegan|plant|kosher)\s)\bgelatine?\b/gi,
    replacement: "agar-agar (or halal beef gelatin)",
    note: "Replaced gelatin with agar-agar or Halal beef gelatin.",
  },
  {
    pattern: /(?<!\b(?:non-alcoholic|alcohol-free|zero-proof)\s)\b(?:dry\s+)?(?:red|white|ros[eé]|cooking|marsala|madeira|port|shaoxing|rice)\s+wine\b(?!\s+vinegar)/gi,
    replacement: "rich broth with a splash of grape juice and vinegar",
    note: "Substituted wine with broth and a splash of grape juice/vinegar.",
  },
  {
    pattern: /(?<!\b(?:non-alcoholic|alcohol-free|zero-proof)\s)\bwine\b(?!\s+vinegar)/gi,
    replacement: "rich broth with a splash of grape juice and vinegar",
    note: "Substituted wine with broth and a splash of grape juice/vinegar.",
  },
  {
    pattern: /\b(?:dry\s+|sweet\s+)?(?:marsala|vermouth)\b/gi,
    replacement: "grape juice with a splash of vinegar and broth",
    note: "Substituted fortified wine with grape juice, vinegar, and broth.",
  },
  {
    pattern: /(?<!\b(?:non-alcoholic|alcohol-free|zero-proof)\s)\b(?:dry\s+)?sherry\b(?!\s+vinegar)/gi,
    replacement: "apple cider vinegar diluted with broth",
    note: "Substituted sherry with broth and apple cider vinegar.",
  },
  {
    pattern: /(?<!\b(?:non-alcoholic|alcohol-free|zero-proof)\s)\bchampagne\b(?!\s+(?:vinegar|grapes?|mangoe?s?))/gi,
    replacement: "sparkling white grape juice",
    note: "Substituted champagne with sparkling white grape juice.",
  },
  {
    pattern: /(?<!\b(?:root|ginger|birch|non-alcoholic|alcohol-free|zero-proof)\s)\b(?:dark\s+|light\s+|amber\s+|lager\s+|stout\s+)?beer\b/gi,
    replacement: "rich beef or vegetable broth",
    note: "Substituted beer with rich broth.",
  },
  {
    pattern: /\b(?:guinness|(?:dark|irish|oatmeal|imperial)\s+stout)\b/gi,
    replacement: "rich beef broth with a splash of molasses",
    note: "Substituted stout with beef broth and molasses.",
  },
  {
    pattern: /\bhard\s+cider\b/gi,
    replacement: "non-alcoholic apple cider",
    note: "Substituted hard cider with non-alcoholic apple cider.",
  },
  {
    pattern: /\b(?:vodka|tequila|brandy|cognac|whiskey|whisky|scotch|rye\s+whisk(?:ey|y)|kahl[uú]a|amaretto|grand\s+marnier|cointreau|triple\s+sec|liqueur)\b/gi,
    replacement: "non-alcoholic broth or juice",
    note: "Substituted alcohol with a non-alcoholic alternative.",
  },
  {
    pattern: /\bbourbon\b(?!\s+vanilla)/gi,
    replacement: "apple juice with a touch of vanilla",
    note: "Substituted bourbon with apple juice and vanilla.",
  },
  {
    pattern: /(?<!\b(?:non-alcoholic|alcohol-free)\s)\b(?:dark\s+|light\s+|spiced\s+|white\s+)?rum\b(?!\s+extract)/gi,
    replacement: "apple or pineapple juice with molasses",
    note: "Substituted rum with non-alcoholic juice.",
  },
  {
    pattern: /\bgin\b/gi,
    replacement: "sparkling water with juniper and citrus",
    note: "Substituted gin with non-alcoholic juniper citrus water.",
  },
  {
    pattern: /(?<!for\s+the\s+)\bsake\b(?!\s+of\b)/gi,
    replacement: "rice vinegar diluted with water",
    note: "Substituted sake with diluted rice vinegar.",
  },
];

function applyHalalGuardrail(recipe: ParsedRecipeData): ParsedRecipeData {
  const triggeredNotes = new Set<string>();

  const transform = (text: string): string => {
    let result = text;
    for (const rule of HALAL_RULES) {
      rule.pattern.lastIndex = 0;
      if (rule.pattern.test(result)) {
        rule.pattern.lastIndex = 0;
        result = result.replace(rule.pattern, rule.replacement);
        triggeredNotes.add(rule.note);
      }
    }
    return result;
  };

  const ingredients = recipe.ingredients.map((ing) => ({
    ...ing,
    name: transform(ing.name),
  }));
  const instructions = recipe.instructions.map((step) => transform(step));

  let notes = recipe.notes;
  if (triggeredNotes.size > 0) {
    const halalSummary = `Halal Adaptation: ${Array.from(triggeredNotes).join(" ")}`;
    notes = notes ? `${notes}\n\n${halalSummary}` : halalSummary;
  }

  return {
    ...recipe,
    ingredients,
    instructions,
    notes,
  };
}

function collectNodesById(node: unknown, map: Map<string, Record<string, unknown>>): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) collectNodesById(item, map);
    return;
  }
  const obj = node as Record<string, unknown>;
  if (typeof obj["@id"] === "string") {
    map.set(obj["@id"], obj);
  }
  if (obj["@graph"]) collectNodesById(obj["@graph"], map);
}

function isRecipeNode(obj: Record<string, unknown>): boolean {
  const typeVal = obj["@type"];
  if (typeof typeVal === "string") {
    return typeVal === "Recipe" || typeVal.endsWith("/Recipe");
  }
  if (Array.isArray(typeVal)) {
    return typeVal.some(
      (t) => typeof t === "string" && (t === "Recipe" || t.endsWith("/Recipe"))
    );
  }
  return false;
}

function findRecipeNodes(node: unknown, out: Record<string, unknown>[]): void {
  if (!node || typeof node !== "object") return;
  if (Array.isArray(node)) {
    for (const item of node) findRecipeNodes(item, out);
    return;
  }
  const obj = node as Record<string, unknown>;
  if (isRecipeNode(obj)) {
    out.push(obj);
    return;
  }
  if (obj["@graph"]) findRecipeNodes(obj["@graph"], out);
  if (obj.mainEntity) findRecipeNodes(obj.mainEntity, out);
  if (obj.mainEntityOfPage) findRecipeNodes(obj.mainEntityOfPage, out);
  if (obj.hasPart) findRecipeNodes(obj.hasPart, out);
}

function extractImageFromSchema(
  rawImage: unknown,
  pageUrl: string,
  idMap: Map<string, Record<string, unknown>>
): string {
  const candidates: string[] = [];

  const visit = (val: unknown) => {
    if (!val) return;
    if (typeof val === "string") {
      candidates.push(val);
      return;
    }
    if (Array.isArray(val)) {
      for (const item of val) visit(item);
      return;
    }
    if (typeof val === "object") {
      const obj = val as Record<string, unknown>;
      if (typeof obj.url === "string") candidates.push(obj.url);
      if (typeof obj.contentUrl === "string") candidates.push(obj.contentUrl);
      if (typeof obj["@id"] === "string" && !obj.url && !obj.contentUrl) {
        const ref = idMap.get(obj["@id"]);
        if (ref && ref !== obj) {
          if (typeof ref.url === "string") candidates.push(ref.url);
          if (typeof ref.contentUrl === "string") candidates.push(ref.contentUrl);
        }
      }
    }
  };

  visit(rawImage);

  for (const candidate of candidates) {
    const safe = sanitizeImageUrl(candidate, pageUrl);
    if (safe) return safe;
  }
  return "";
}

function extractMetaContent(html: string, names: string[]): string {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re1 = new RegExp(
      `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`,
      "i"
    );
    const m1 = html.match(re1);
    if (m1?.[1]) return cleanText(m1[1]);

    const re2 = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`,
      "i"
    );
    const m2 = html.match(re2);
    if (m2?.[1]) return cleanText(m2[1]);
  }
  return "";
}

function repairAndParseJsonLd(raw: string): unknown | null {
  let cleaned = raw
    .trim()
    .replace(/^\/\*\s*<!\[CDATA\[\s*\*\//i, "")
    .replace(/\/\*\s*\]\]>\s*\*\/$/i, "")
    .replace(/^<!--/, "")
    .replace(/-->$/, "")
    .trim();

  if (!cleaned) return null;

  try {
    return JSON.parse(cleaned);
  } catch {
    // Repair unescaped control characters inside JSON strings (common in WordPress plugins)
    const repaired = cleaned.replace(/[\u0000-\u001f]/g, (ch) => {
      if (ch === "\n") return "\\n";
      if (ch === "\r") return "\\r";
      if (ch === "\t") return "\\t";
      return "";
    });
    try {
      return JSON.parse(repaired);
    } catch {
      return null;
    }
  }
}

function finalizeRecipe(
  partial: {
    title: string;
    description: string;
    cuisine: string;
    mealType: MealType;
    cookingTime: number;
    servings: number;
    ingredients: Ingredient[];
    instructions: string[];
    imageUrl: string;
    sourceUrl: string;
    notes: string;
    nutrition?: Recipe["nutrition"];
  }
): ParsedRecipeData {
  const safeCuisine = VALID_CUISINES.includes(partial.cuisine as any)
    ? partial.cuisine
    : "Other";
  const safeMealType: MealType = VALID_MEAL_TYPES.includes(partial.mealType)
    ? partial.mealType
    : "Main";

  let notes = stripWebsiteSourceNotes(partial.notes, partial.sourceUrl);
  let cookingTime = Math.round(partial.cookingTime || 0);
  if (cookingTime <= 0) cookingTime = 30;
  if (cookingTime > 5999) {
    const days = Math.round((cookingTime / 1440) * 10) / 10;
    const durationNote = `Total time listed as ~${days} days (capped at 99 hrs 59 min in the timer field).`;
    notes = notes ? `${notes}\n\n${durationNote}` : durationNote;
    cookingTime = 5999;
  }

  const servings = Math.max(1, Math.min(999, Math.round(partial.servings || 4)));

  const ingredients = partial.ingredients
    .map((ing) => ({
      name: cleanIngredientName(ing.name || ""),
      amount: roundAmount(ing.amount),
      unit: cleanText(ing.unit || "").slice(0, 32),
    }))
    .filter((ing) => ing.name.length > 0);

  const instructions = partial.instructions
    .map((step) => step.trim())
    .filter((step) => step.length > 0);

  const recipe: ParsedRecipeData = {
    title: partial.title.trim() || "Imported Recipe",
    description: partial.description.trim(),
    cuisine: safeCuisine,
    mealType: safeMealType,
    cookingTime,
    servings,
    ingredients,
    instructions,
    imageUrl: partial.imageUrl,
    sourceUrl: partial.sourceUrl,
    notes,
  };

  if (partial.nutrition) {
    recipe.nutrition = partial.nutrition;
  }

  return applyHalalGuardrail(recipe);
}

function extractFromJsonLd(html: string, pageUrl: string): ParsedRecipeData | null {
  const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  const recipeNodes: Record<string, unknown>[] = [];
  const idMap = new Map<string, Record<string, unknown>>();

  let match: RegExpExecArray | null;
  while ((match = scriptRe.exec(html)) !== null) {
    const attrs = match[1];
    if (!/\btype\s*=\s*["']?application\/ld\+json(?:\s*;[^"'\s>]*)?["']?/i.test(attrs)) {
      continue;
    }
    const parsed = repairAndParseJsonLd(match[2]);
    if (!parsed) continue;
    collectNodesById(parsed, idMap);
    findRecipeNodes(parsed, recipeNodes);
  }

  if (recipeNodes.length === 0) return null;

  // Select the most complete Recipe node
  let best = recipeNodes[0];
  let bestScore = -1;
  for (const node of recipeNodes) {
    const ingCount = Array.isArray(node.recipeIngredient) ? node.recipeIngredient.length : 0;
    const instCount = Array.isArray(node.recipeInstructions)
      ? node.recipeInstructions.length
      : typeof node.recipeInstructions === "string" && node.recipeInstructions.trim()
      ? 1
      : 0;
    const score = ingCount * 2 + instCount * 2 + (node.name ? 1 : 0);
    if (score > bestScore) {
      bestScore = score;
      best = node;
    }
  }

  const title = cleanText(best.name) || extractMetaContent(html, ["og:title", "twitter:title"]);
  const description =
    cleanText(best.description) ||
    extractMetaContent(html, ["og:description", "description", "twitter:description"]);

  const rawIngredients: string[] = Array.isArray(best.recipeIngredient)
    ? best.recipeIngredient.map((x) => String(x || ""))
    : Array.isArray(best.ingredients)
    ? best.ingredients.map((x) => String(x || ""))
    : [];

  const ingredients = rawIngredients
    .map((line) => parseIngredientLine(line))
    .filter((ing) => ing.name.length > 0);

  const instructions = extractInstructions(best.recipeInstructions);

  if (ingredients.length === 0 && instructions.length === 0) {
    return null;
  }

  const totalMins = parseIsoDurationMinutes(best.totalTime);
  const prepMins = parseIsoDurationMinutes(best.prepTime);
  const cookMins = parseIsoDurationMinutes(best.cookTime ?? best.performTime);
  const cookingTime = totalMins > 0 ? totalMins : prepMins + cookMins;

  const { servings, yieldNote } = parseServings(best.recipeYield);
  const cuisine = mapCuisine(best.recipeCuisine, best.keywords, best.recipeCategory);
  const mealType = mapMealType(best.recipeCategory, best.keywords, title);

  const imageUrl =
    extractImageFromSchema(best.image, pageUrl, idMap) ||
    sanitizeImageUrl(extractMetaContent(html, ["og:image", "twitter:image"]), pageUrl);

  const nutrition = parseNutrition(best.nutrition);

  const noteParts: string[] = [];
  if (yieldNote) noteParts.push(`Yield: ${yieldNote}`);

  return finalizeRecipe({
    title,
    description,
    cuisine,
    mealType,
    cookingTime,
    servings,
    ingredients,
    instructions,
    imageUrl,
    sourceUrl: pageUrl,
    notes: noteParts.join("\n"),
    nutrition,
  });
}

function extractMicrodataValues(html: string, prop: string): string[] {
  const results: string[] = [];
  // Linear non-backtracking scan for itemprop="<prop>"
  const tagRe = new RegExp(
    `<([a-zA-Z0-9]+)\\b[^>]*\\bitemprop=["']${prop}["'][^>]*>`,
    "gi"
  );
  let match: RegExpExecArray | null;
  while ((match = tagRe.exec(html)) !== null && results.length < 100) {
    const tagName = match[1].toLowerCase();
    const openTag = match[0];

    // Self-contained content attribute (e.g. <meta itemprop="totalTime" content="PT30M">)
    const contentAttr = openTag.match(/\bcontent=["']([^"']+)["']/i);
    if (contentAttr?.[1]) {
      const val = cleanText(contentAttr[1]);
      if (val) results.push(val);
      continue;
    }

    const startIdx = match.index + openTag.length;
    const closeToken = `</${tagName}>`;
    const closeIdx = html.toLowerCase().indexOf(closeToken, startIdx);
    if (closeIdx !== -1 && closeIdx - startIdx <= 4000) {
      const val = cleanText(html.slice(startIdx, closeIdx));
      if (val) results.push(val);
    }
  }
  return results;
}

function extractFromMicrodata(html: string, pageUrl: string): ParsedRecipeData | null {
  if (!/schema\.org\/Recipe/i.test(html)) return null;

  const rawIngredients = [
    ...extractMicrodataValues(html, "recipeIngredient"),
    ...extractMicrodataValues(html, "ingredients"),
  ];
  const rawInstructions = extractMicrodataValues(html, "recipeInstructions");

  if (rawIngredients.length === 0 && rawInstructions.length === 0) {
    return null;
  }

  const title =
    extractMicrodataValues(html, "name")[0] ||
    extractMetaContent(html, ["og:title", "twitter:title"]);
  const description =
    extractMicrodataValues(html, "description")[0] ||
    extractMetaContent(html, ["og:description", "description"]);

  const totalMins = parseIsoDurationMinutes(extractMicrodataValues(html, "totalTime")[0]);
  const prepMins = parseIsoDurationMinutes(extractMicrodataValues(html, "prepTime")[0]);
  const cookMins = parseIsoDurationMinutes(extractMicrodataValues(html, "cookTime")[0]);
  const cookingTime = totalMins > 0 ? totalMins : prepMins + cookMins;

  const { servings, yieldNote } = parseServings(extractMicrodataValues(html, "recipeYield")[0]);
  const cuisine = mapCuisine(
    extractMicrodataValues(html, "recipeCuisine"),
    extractMicrodataValues(html, "keywords"),
    extractMicrodataValues(html, "recipeCategory")
  );
  const mealType = mapMealType(
    extractMicrodataValues(html, "recipeCategory"),
    extractMicrodataValues(html, "keywords"),
    title
  );

  const imageUrl = sanitizeImageUrl(
    extractMetaContent(html, ["og:image", "twitter:image"]),
    pageUrl
  );

  return finalizeRecipe({
    title,
    description,
    cuisine,
    mealType,
    cookingTime,
    servings,
    ingredients: rawIngredients.map(parseIngredientLine).filter((i) => i.name),
    instructions: rawInstructions,
    imageUrl,
    sourceUrl: pageUrl,
    notes: yieldNote ? `Yield: ${yieldNote}` : "",
  });
}

export function extractRecipeFromHtml(
  html: string,
  pageUrl: string
): { recipe: ParsedRecipeData; method: "json-ld" | "microdata" } | null {
  const fromJsonLd = extractFromJsonLd(html, pageUrl);
  if (fromJsonLd) {
    return { recipe: fromJsonLd, method: "json-ld" };
  }
  const fromMicrodata = extractFromMicrodata(html, pageUrl);
  if (fromMicrodata) {
    return { recipe: fromMicrodata, method: "microdata" };
  }
  return null;
}

function cleanHtmlForLlm(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, " ")
    .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, " ")
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, " ")
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 15_000);
}

async function extractWithGeminiFallback(
  pageUrl: string,
  html: string,
  geminiApiKey: string,
  fetchImpl: typeof fetch
): Promise<ParsedRecipeData | null> {
  const snippet = html ? cleanHtmlForLlm(html) : "";
  const ogImage = html
    ? sanitizeImageUrl(extractMetaContent(html, ["og:image", "twitter:image"]), pageUrl)
    : "";

  const prompt = `Extract or reconstruct the recipe for the URL: ${pageUrl}

${snippet ? `Webpage text excerpt:\n${snippet}` : "The page blocked direct fetching; reconstruct the well-known recipe from this URL if you know it."}

Rules:
- Enforce a 100% Halal diet: substitute any pork/pork-derivatives with Halal beef/chicken/turkey, and substitute alcohol (except wine vinegars and mirin) with non-alcoholic broth or juice.
- cuisine must be one of: ${VALID_CUISINES.join(", ")}.
- mealType must be one of: ${VALID_MEAL_TYPES.join(", ")}.
- cookingTime must be total minutes (integer).
- servings must be an integer >= 1.
- ingredients: array of { "name": string, "amount": number, "unit": string }.
- instructions: ordered array of clear step strings.
- notes: optional cooking tips or technique notes only — do NOT include website names, URLs, author credits, or "Recipe by ..." / "Source: ..." lines (the website is already linked separately).
- Return ONLY a single JSON object with keys: title, description, cuisine, mealType, cookingTime, servings, ingredients, instructions, notes, nutrition ({ calories, protein, carbs, fat }).`;

  const models = ["gemini-2.5-flash", "gemini-2.0-flash"];

  for (const model of models) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS);
    try {
      const res = await fetchImpl(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": geminiApiKey,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              responseMimeType: "application/json",
            },
          }),
          signal: controller.signal,
        }
      );

      if (!res.ok) {
        await res.body?.cancel().catch(() => {});
        continue;
      }

      const data: any = await res.json();
      const text: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
      if (!text.trim()) continue;

      let cleaned = text.trim();
      if (cleaned.includes("```")) {
        const m = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (m?.[1]) cleaned = m[1].trim();
      }
      const parsed = JSON.parse(cleaned);
      if (!parsed || typeof parsed !== "object") continue;

      const rawIngs: Ingredient[] = Array.isArray(parsed.ingredients)
        ? parsed.ingredients.map((i: any) => ({
            name: String(i?.name || ""),
            amount: typeof i?.amount === "number" ? i.amount : parseFloat(String(i?.amount || "0")) || 0,
            unit: String(i?.unit || ""),
          }))
        : [];
      const rawSteps: string[] = Array.isArray(parsed.instructions)
        ? parsed.instructions.map((s: any) => cleanText(String(s || ""), true)).filter(Boolean)
        : [];

      if (rawIngs.length === 0 && rawSteps.length === 0) continue;

      const rawMeal = String(parsed.mealType || "");
      const normalizedMeal: MealType =
        rawMeal.toLowerCase() === "appetizer"
          ? "Starter"
          : VALID_MEAL_TYPES.includes(rawMeal as MealType)
          ? (rawMeal as MealType)
          : mapMealType(rawMeal, "", String(parsed.title || ""));

      return finalizeRecipe({
        title: cleanText(parsed.title) || "Imported Recipe",
        description: cleanText(parsed.description),
        cuisine: VALID_CUISINES.includes(parsed.cuisine)
          ? parsed.cuisine
          : mapCuisine(parsed.cuisine, "", ""),
        mealType: normalizedMeal,
        cookingTime: typeof parsed.cookingTime === "number" ? parsed.cookingTime : 30,
        servings: typeof parsed.servings === "number" ? parsed.servings : 4,
        ingredients: rawIngs,
        instructions: rawSteps,
        imageUrl: ogImage,
        sourceUrl: pageUrl,
        notes: cleanText(parsed.notes, true),
        nutrition: parseNutrition(parsed.nutrition),
      });
    } catch {
      // Try next fallback model
    } finally {
      clearTimeout(timer);
    }
  }

  return null;
}

async function fetchHtmlBounded(
  initialUrl: URL,
  fetchImpl: typeof fetch
): Promise<{
  ok: boolean;
  html?: string;
  finalUrl?: string;
  status?: number;
  upstreamStatus?: number;
  error?: string;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    let currentUrl = initialUrl;
    const visited = new Set<string>([currentUrl.toString()]);

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      let response: Response;
      try {
        response = await fetchImpl(currentUrl.toString(), {
          method: "GET",
          headers: BROWSER_HEADERS,
          redirect: "manual",
          signal: controller.signal,
        });
      } catch (err: any) {
        if (controller.signal.aborted || err?.name === "AbortError") {
          return {
            ok: false,
            status: 504,
            error: "The recipe website took too long to respond. Please try again or enter the recipe manually.",
          };
        }
        return {
          ok: false,
          status: 502,
          error: "Could not connect to that website. Check the link and try again.",
        };
      }

      // Follow 3xx redirects safely with SSRF validation on every hop
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        await response.body?.cancel().catch(() => {});
        if (!location) {
          return {
            ok: false,
            status: 502,
            upstreamStatus: response.status,
            error: "The website returned an incomplete redirect.",
          };
        }
        if (hop === MAX_REDIRECTS) {
          return {
            ok: false,
            status: 502,
            error: "The link redirected too many times.",
          };
        }
        const nextValidation = validatePublicHttpUrl(location, currentUrl.toString());
        if (!nextValidation.ok) {
          return { ok: false, status: 400, error: nextValidation.error };
        }
        const nextHref = nextValidation.url.toString();
        if (visited.has(nextHref)) {
          return { ok: false, status: 502, error: "The link resulted in a redirect loop." };
        }
        visited.add(nextHref);
        currentUrl = nextValidation.url;
        continue;
      }

      if (!response.ok) {
        await response.body?.cancel().catch(() => {});
        if (response.status === 404 || response.status === 410) {
          return {
            ok: false,
            status: 422,
            upstreamStatus: response.status,
            error: `Recipe page not found (HTTP ${response.status}). Check that the URL opens in your browser.`,
          };
        }
        if (response.status === 401 || response.status === 402 || response.status === 403) {
          return {
            ok: false,
            status: 502,
            upstreamStatus: response.status,
            error: `This website blocked automated recipe access (HTTP ${response.status}). You can copy the recipe into the Write Manually tab instead.`,
          };
        }
        return {
          ok: false,
          status: 502,
          upstreamStatus: response.status,
          error: `The website returned HTTP ${response.status}. Please try again or enter the recipe manually.`,
        };
      }

      const contentType = (response.headers.get("content-type") || "").toLowerCase();
      if (BLOCKED_CONTENT_TYPE_PREFIXES.some((prefix) => contentType.startsWith(prefix))) {
        await response.body?.cancel().catch(() => {});
        return {
          ok: false,
          status: 422,
          error: "That link points to a file or media asset rather than a recipe webpage.",
        };
      }

      // Stream response up to MAX_HTML_BYTES while preserving UTF-8 chunk boundaries
      let html = "";
      if (response.body && typeof response.body.getReader === "function") {
        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8", { fatal: false });
        let bytesRead = 0;

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (!value) continue;

            const remaining = MAX_HTML_BYTES - bytesRead;
            if (value.byteLength >= remaining) {
              html += decoder.decode(value.subarray(0, remaining), { stream: false });
              bytesRead = MAX_HTML_BYTES;
              await reader.cancel().catch(() => {});
              break;
            }
            html += decoder.decode(value, { stream: true });
            bytesRead += value.byteLength;
          }
          if (bytesRead < MAX_HTML_BYTES) {
            html += decoder.decode();
          }
        } catch (err: any) {
          await reader.cancel().catch(() => {});
          if (controller.signal.aborted || err?.name === "AbortError") {
            return {
              ok: false,
              status: 504,
              error: "Reading the recipe webpage timed out. Please try again.",
            };
          }
          return {
            ok: false,
            status: 502,
            error: "The connection was interrupted while reading the recipe webpage. Please try again.",
          };
        }
      } else {
        try {
          const text = await response.text();
          html = text.slice(0, MAX_HTML_BYTES);
        } catch (err: any) {
          if (controller.signal.aborted || err?.name === "AbortError") {
            return {
              ok: false,
              status: 504,
              error: "Reading the recipe webpage timed out. Please try again.",
            };
          }
          return {
            ok: false,
            status: 502,
            error: "The connection was interrupted while reading the recipe webpage. Please try again.",
          };
        }
      }

      return { ok: true, html, finalUrl: currentUrl.toString() };
    }

    return { ok: false, status: 502, error: "Could not resolve the recipe link." };
  } finally {
    clearTimeout(timer);
  }
}

export async function parseRecipeFromUrl(
  options: ParseRecipeUrlOptions
): Promise<ParseRecipeUrlResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const validated = validatePublicHttpUrl(options.url);
  if (!validated.ok) {
    return { ok: false, status: 400, error: validated.error };
  }

  const fetched = await fetchHtmlBounded(validated.url, fetchImpl);

  if (fetched.ok) {
    const structured = extractRecipeFromHtml(fetched.html, fetched.finalUrl);
    if (structured) {
      return {
        ok: true,
        status: 200,
        recipe: structured.recipe,
        method: structured.method,
      };
    }

    if (options.geminiApiKey?.trim()) {
      const fromGemini = await extractWithGeminiFallback(
        fetched.finalUrl,
        fetched.html,
        options.geminiApiKey.trim(),
        fetchImpl
      );
      if (fromGemini) {
        return { ok: true, status: 200, recipe: fromGemini, method: "gemini" };
      }
    }

    return {
      ok: false,
      status: 422,
      error:
        "No recipe data was found on that webpage. Try a direct recipe page link or use the Write Manually tab.",
    };
  }

  // If the target site blocked direct fetch (401/402/403) and Gemini key is available, attempt AI fallback
  if (
    options.geminiApiKey?.trim() &&
    (fetched.upstreamStatus === 401 || fetched.upstreamStatus === 402 || fetched.upstreamStatus === 403)
  ) {
    const fromGemini = await extractWithGeminiFallback(
      validated.url.toString(),
      "",
      options.geminiApiKey.trim(),
      fetchImpl
    );
    if (fromGemini) {
      return { ok: true, status: 200, recipe: fromGemini, method: "gemini" };
    }
  }

  return { ok: false, status: fetched.status, error: fetched.error };
}
