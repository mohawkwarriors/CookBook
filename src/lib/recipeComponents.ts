import { Ingredient } from "../types";

export interface ParsedInstructionStep {
  originalIdx: number;
  text: string;
  chapterTitle: string;
}

export interface InstructionChapter {
  id: string;
  title: string;
  chapterNumber: number;
  steps: ParsedInstructionStep[];
}

export interface ParsedRecipeMethod {
  isMultiComponent: boolean;
  chapters: InstructionChapter[];
  /** Lookup by original 0-based index into recipe.instructions */
  stepMetaByIndex: Map<
    number,
    {
      text: string;
      chapterTitle: string;
      chapterNumber: number;
      stepInChapter: number;
      chapterStepCount: number;
    }
  >;
}

export interface ParsedIngredientItem {
  ingredient: Ingredient;
  originalIdx: number;
  displayName: string;
}

export interface IngredientGroup {
  id: string;
  title: string;
  items: ParsedIngredientItem[];
}

export interface ParsedRecipeIngredients {
  isGrouped: boolean;
  groups: IngredientGroup[];
  /** Clean display name without trailing component tag, keyed by original index */
  displayNameByIndex: Map<number, string>;
  /** Component group title for each ingredient index when grouped */
  groupTitleByIndex: Map<number, string>;
}

const STEP_PREFIX_RE = /^([A-Z][A-Za-z0-9 &/'-]{1,32}):\s+(.+)$/s;
const ING_PREFIX_RE = /^([A-Za-z][A-Za-z0-9 &/'-]{1,32}):\s+(.+)$/s;
const NON_COMPONENT_PREFIX_RE =
  /^(?:step\s*\d+|note|notes|tip|tips|pro\s*tip|optional|warning|caution|important|chef'?s?\s*note|serving\s*tip)$/i;

const TRAILING_PAREN_RE = /^(.+?)\s*\(([^()]+)\)\s*$/;
const NON_GROUP_PAREN_RE =
  /^(?:optional|to taste|divided|plus extra.*|as needed|drained|rinsed|drained and rinsed|peeled|chopped|finely chopped|diced|sliced|minced|beaten|melted|softened|room temperature|fresh|dried|thawed|cooked|uncooked|cubed|grated|shredded|crushed|halved|quartered|trimmed|seeded|cored|pitted|packed|sifted|warm|cold|hot|chilled|boiling|large|medium|small)$/i;

function normalizeKey(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/^for\s+the\s+/i, "")
    .replace(/\s+/g, " ");
}

function slugify(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function capitalizeLeadingChar(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function extractStepPrefix(step: string): { label: string; body: string } | null {
  const trimmed = step.trim();
  const match = trimmed.match(STEP_PREFIX_RE);
  if (!match) return null;

  const rawLabel = match[1].trim();
  const rawBody = match[2].trim();
  if (!rawBody) return null;
  if (NON_COMPONENT_PREFIX_RE.test(rawLabel)) return null;

  // Reject overly long prose phrases before a colon (more than 4 words)
  if (rawLabel.split(/\s+/).length > 4) return null;

  return {
    label: rawLabel,
    body: capitalizeLeadingChar(rawBody),
  };
}

/**
 * Parses flat instruction strings (e.g. "Beef: Release pressure...", "Curry: Blend...")
 * into ordered collapsible chapters ONLY when 2 or more distinct components are present.
 * Single-component recipes return `isMultiComponent: false` so they render unchanged.
 */
export function parseInstructionChapters(instructions: string[]): ParsedRecipeMethod {
  const stepMetaByIndex = new Map<
    number,
    {
      text: string;
      chapterTitle: string;
      chapterNumber: number;
      stepInChapter: number;
      chapterStepCount: number;
    }
  >();

  if (!instructions || instructions.length === 0) {
    return { isMultiComponent: false, chapters: [], stepMetaByIndex };
  }

  const extracted = instructions.map((raw, idx) => ({
    idx,
    raw,
    parsed: extractStepPrefix(raw),
  }));

  // Count distinct component labels across the recipe
  const canonicalTitleByKey = new Map<string, string>();
  for (const item of extracted) {
    if (!item.parsed) continue;
    const key = normalizeKey(item.parsed.label);
    if (!canonicalTitleByKey.has(key)) {
      canonicalTitleByKey.set(key, item.parsed.label);
    }
  }

  // Single-component (0 or 1 distinct component) -> keep recipe completely flat
  if (canonicalTitleByKey.size < 2) {
    return { isMultiComponent: false, chapters: [], stepMetaByIndex };
  }

  // Group contiguous runs in exact chronological cook order.
  // Leading unprefixed prep steps attach to the first chapter; subsequent unprefixed steps
  // inherit the currently active chapter so cook order is never broken.
  const chapters: InstructionChapter[] = [];
  const leadingUnprefixed: { idx: number; text: string }[] = [];
  let currentChapter: InstructionChapter | null = null;
  let currentKey: string | null = null;

  for (const item of extracted) {
    if (item.parsed) {
      const key = normalizeKey(item.parsed.label);
      const displayTitle = canonicalTitleByKey.get(key) || item.parsed.label;

      if (!currentChapter || currentKey !== key) {
        const chapterNumber = chapters.length + 1;
        currentChapter = {
          id: `${slugify(displayTitle) || "part"}-${chapterNumber}`,
          title: displayTitle,
          chapterNumber,
          steps: [],
        };
        currentKey = key;

        // Attach any leading unprefixed prep steps (e.g., "Preheat the oven...") to Part 1
        if (chapters.length === 0 && leadingUnprefixed.length > 0) {
          for (const prep of leadingUnprefixed) {
            currentChapter.steps.push({
              originalIdx: prep.idx,
              text: prep.text,
              chapterTitle: displayTitle,
            });
          }
          leadingUnprefixed.length = 0;
        }

        chapters.push(currentChapter);
      }

      currentChapter.steps.push({
        originalIdx: item.idx,
        text: item.parsed.body,
        chapterTitle: currentChapter.title,
      });
    } else if (!currentChapter) {
      leadingUnprefixed.push({ idx: item.idx, text: item.raw.trim() });
    } else {
      currentChapter.steps.push({
        originalIdx: item.idx,
        text: item.raw.trim(),
        chapterTitle: currentChapter.title,
      });
    }
  }

  // Populate O(1) step metadata lookup for CookingMode and progress checks
  for (const chapter of chapters) {
    const count = chapter.steps.length;
    chapter.steps.forEach((step, localIdx) => {
      stepMetaByIndex.set(step.originalIdx, {
        text: step.text,
        chapterTitle: chapter.title,
        chapterNumber: chapter.chapterNumber,
        stepInChapter: localIdx + 1,
        chapterStepCount: count,
      });
    });
  }

  return {
    isMultiComponent: chapters.length >= 2,
    chapters,
    stepMetaByIndex,
  };
}

function extractTrailingGroupTag(name: string): { cleanName: string; tag: string } | null {
  const trimmed = name.trim();
  const match = trimmed.match(TRAILING_PAREN_RE);
  if (!match) return null;

  const cleanName = match[1].trim();
  const tag = match[2].trim();
  if (!cleanName || !tag) return null;

  // Ignore measurements, fat ratios, sizes, or too-long notes
  if (/\d/.test(tag)) return null;
  if (tag.length > 28 || tag.split(/\s+/).length > 4) return null;
  if (NON_GROUP_PAREN_RE.test(tag)) return null;

  return { cleanName, tag };
}

function extractLeadingGroupPrefix(name: string): { cleanName: string; tag: string } | null {
  const trimmed = name.trim();
  const match = trimmed.match(ING_PREFIX_RE);
  if (!match) return null;

  const tag = match[1].trim();
  const cleanName = match[2].trim();
  if (!cleanName || !tag) return null;
  if (NON_COMPONENT_PREFIX_RE.test(tag)) return null;
  if (tag.length > 32 || tag.split(/\s+/).length > 4) return null;

  return { cleanName, tag };
}

function isStandaloneHeaderRow(ing: Ingredient): string | null {
  if ((ing.amount || 0) !== 0 || ing.unit.trim() !== "") return null;
  const trimmed = ing.name.trim();
  if (!trimmed.endsWith(":")) return null;
  const tag = trimmed.slice(0, -1).trim();
  if (!tag || tag.length > 32 || tag.split(/\s+/).length > 4) return null;
  if (NON_COMPONENT_PREFIX_RE.test(tag)) return null;
  return tag;
}

function toTitleCaseLabel(label: string): string {
  const cleaned = label.trim();
  if (!cleaned) return cleaned;
  // Preserve mixed/capitalized labels like "Milk Soak" or "BBQ Sauce", title-case all-lowercase labels like "for baking"
  if (cleaned === cleaned.toLowerCase()) {
    return cleaned.replace(/\b[a-z]/g, (ch) => ch.toUpperCase());
  }
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

/**
 * Groups ingredients by what part of the dish they make across:
 * A) Explicit `ing.group` field
 * B) Standalone header rows (e.g. `{ name: "Dough:", amount: 0, unit: "" }`)
 * C) Leading colon prefixes (e.g. "Dough: Bread Flour")
 * D) Trailing parenthetical tags (e.g. "Plain Yogurt (Curry)")
 * Leaves simple single-component recipes flat (`isGrouped: false`).
 */
export function parseIngredientGroups(
  ingredients: Ingredient[],
  instructionChapterTitles: string[] = []
): ParsedRecipeIngredients {
  const displayNameByIndex = new Map<number, string>();
  const groupTitleByIndex = new Map<number, string>();
  if (!ingredients || ingredients.length === 0) {
    return { isGrouped: false, groups: [], displayNameByIndex, groupTitleByIndex };
  }

  const chapterKeys = new Set(instructionChapterTitles.map(normalizeKey));
  let activeHeaderTag: string | null = null;

  const candidates = ingredients.map((ing, idx) => {
    const headerRowTag = isStandaloneHeaderRow(ing);
    if (headerRowTag) {
      activeHeaderTag = headerRowTag;
      return {
        ing,
        idx,
        isHeaderRow: true,
        isExplicitSection: true,
        extracted: null as { cleanName: string; tag: string } | null,
      };
    }

    if (ing.group && ing.group.trim()) {
      return {
        ing,
        idx,
        isHeaderRow: false,
        isExplicitSection: true,
        extracted: { cleanName: ing.name.trim(), tag: ing.group.trim() },
      };
    }

    const leading = extractLeadingGroupPrefix(ing.name);
    if (leading) {
      return {
        ing,
        idx,
        isHeaderRow: false,
        isExplicitSection: true,
        extracted: leading,
      };
    }

    const trailing = extractTrailingGroupTag(ing.name);
    if (trailing) {
      return {
        ing,
        idx,
        isHeaderRow: false,
        isExplicitSection: false,
        extracted: trailing,
      };
    }

    if (activeHeaderTag) {
      return {
        ing,
        idx,
        isHeaderRow: false,
        isExplicitSection: true,
        extracted: { cleanName: ing.name.trim(), tag: activeHeaderTag },
      };
    }

    return {
      ing,
      idx,
      isHeaderRow: false,
      isExplicitSection: false,
      extracted: null as { cleanName: string; tag: string } | null,
    };
  });

  const nonHeaderCandidates = candidates.filter((c) => !c.isHeaderRow);
  if (nonHeaderCandidates.length === 0) {
    ingredients.forEach((ing, idx) => displayNameByIndex.set(idx, ing.name));
    return { isGrouped: false, groups: [], displayNameByIndex, groupTitleByIndex };
  }

  const tagCounts = new Map<string, number>();
  const canonicalTagByKey = new Map<string, string>();
  const explicitKeys = new Set<string>();

  for (const c of nonHeaderCandidates) {
    if (!c.extracted) continue;
    const key = normalizeKey(c.extracted.tag);
    tagCounts.set(key, (tagCounts.get(key) || 0) + 1);
    if (c.isExplicitSection) {
      explicitKeys.add(key);
    }
    if (!canonicalTagByKey.has(key)) {
      canonicalTagByKey.set(key, toTitleCaseLabel(c.extracted.tag));
    }
  }

  const totalWithAnyCandidateTag = nonHeaderCandidates.filter((c) => c.extracted !== null).length;
  const highTagCoverage = totalWithAnyCandidateTag / nonHeaderCandidates.length >= 0.6;

  // Determine which tags represent actual component groups vs. single transliterations like "(Zeera)"
  const validGroupKeys = new Set<string>();
  for (const [key, count] of tagCounts.entries()) {
    const matchesChapter =
      chapterKeys.has(key) ||
      Array.from(chapterKeys).some((ck) => ck.includes(key) || key.includes(ck));
    if (explicitKeys.has(key) || count >= 2 || matchesChapter || highTagCoverage) {
      validGroupKeys.add(key);
    }
  }

  const validTaggedCount = nonHeaderCandidates.filter(
    (c) => c.extracted && validGroupKeys.has(normalizeKey(c.extracted.tag))
  ).length;
  const untaggedCount = nonHeaderCandidates.length - validTaggedCount;

  const hasMultipleExplicitGroups =
    validGroupKeys.size >= 2 &&
    (validTaggedCount / nonHeaderCandidates.length >= 0.5 ||
      (chapterKeys.size >= 2 && validTaggedCount >= 2) ||
      explicitKeys.size >= 2);

  const hasSingleSubGroupWithMain =
    validGroupKeys.size === 1 &&
    (tagCounts.get(Array.from(validGroupKeys)[0]) || 0) >= 2 &&
    untaggedCount >= 3;

  const isMultiComponent = hasMultipleExplicitGroups || hasSingleSubGroupWithMain;

  if (!isMultiComponent) {
    ingredients.forEach((ing, idx) => displayNameByIndex.set(idx, ing.name));
    return { isGrouped: false, groups: [], displayNameByIndex, groupTitleByIndex };
  }

  const untaggedTitle =
    untaggedCount / nonHeaderCandidates.length >= 0.4 ? "Main" : "Other";

  const groupMap = new Map<string, IngredientGroup>();
  const orderedGroups: IngredientGroup[] = [];

  for (const c of nonHeaderCandidates) {
    const isTagged = c.extracted && validGroupKeys.has(normalizeKey(c.extracted.tag));
    const key = isTagged ? normalizeKey(c.extracted!.tag) : "__untagged__";
    const title = isTagged
      ? canonicalTagByKey.get(key) || toTitleCaseLabel(c.extracted!.tag)
      : untaggedTitle;
    const displayName = isTagged ? c.extracted!.cleanName : c.ing.name;

    displayNameByIndex.set(c.idx, displayName);
    groupTitleByIndex.set(c.idx, title);

    let group = groupMap.get(key);
    if (!group) {
      group = {
        id: `${slugify(title) || "group"}-${orderedGroups.length + 1}`,
        title,
        items: [],
      };
      groupMap.set(key, group);
      orderedGroups.push(group);
    }

    group.items.push({
      ingredient: c.ing,
      originalIdx: c.idx,
      displayName,
    });
  }

  return {
    isGrouped: orderedGroups.length >= 2,
    groups: orderedGroups,
    displayNameByIndex,
    groupTitleByIndex,
  };
}
