import { Recipe } from "../types";
import { ParsedRecipeMethod, parseInstructionChapters } from "./recipeComponents";

export interface StepBlockItem {
  step: string;
  idx: number;
  displayNumber: number;
}

export type InstructionBlock =
  | { type: "single"; item: StepBlockItem }
  | { type: "parallel"; items: StepBlockItem[] };

const PARALLEL_PREFIXES = [
  "meanwhile",
  "while",
  "in parallel",
  "separately",
  "at the same time",
  "for the ",
  "to make the ",
  "prepare the ",
];

export function isParallelStepText(step: string): boolean {
  const lowerStep = step.toLowerCase().trim();
  return PARALLEL_PREFIXES.some((prefix) => lowerStep.startsWith(prefix));
}

export function buildInstructionBlocks(items: StepBlockItem[]): InstructionBlock[] {
  const blocks: InstructionBlock[] = [];
  let currentParallelBlock: StepBlockItem[] | null = null;

  items.forEach((item, localIdx) => {
    const isParallel = localIdx > 0 && isParallelStepText(item.step);

    if (isParallel) {
      if (!currentParallelBlock) {
        const lastBlock = blocks.pop();
        if (lastBlock?.type === "single") {
          currentParallelBlock = [lastBlock.item, item];
          blocks.push({ type: "parallel", items: currentParallelBlock });
        } else if (lastBlock?.type === "parallel") {
          lastBlock.items.push(item);
          blocks.push(lastBlock);
          currentParallelBlock = lastBlock.items;
        } else {
          blocks.push({ type: "single", item });
        }
      } else {
        currentParallelBlock.push(item);
      }
    } else {
      currentParallelBlock = null;
      blocks.push({ type: "single", item });
    }
  });

  return blocks;
}

export type StepPhase = "proof" | "marinate" | "bake" | "cool" | "active";

export interface ParsedStepDuration {
  durationMinutes: number;
  isExplicit: boolean;
  isPassive: boolean;
  isOvernightEstimate: boolean;
  phase: StepPhase;
}

export interface AnalyzedStep {
  idx: number;
  text: string;
  chapterId?: string;
  chapterTitle?: string;
  durationMinutes: number;
  isExplicit: boolean;
  isPassive: boolean;
  isOvernightEstimate: boolean;
  isServeStep: boolean;
  phase: StepPhase;
}

export interface ScheduleBlock {
  blockIndex: number;
  chapterId?: string;
  isParallel: boolean;
  stepIndices: number[];
  durationMinutes: number;
}

export interface RecipeScheduleAnalysis {
  isEligible: boolean;
  supportsMultiDay: boolean;
  isEstimatedFromTotalTime: boolean;
  totalMinutes: number;
  passiveMinutes: number;
  activeMinutes: number;
  explicitStepCount: number;
  totalExplicitMinutes: number;
  reasonTags: string[];
  hasProofingOrFermenting: boolean;
  hasBakingOrRoasting: boolean;
  hasLongRestOrMarinate: boolean;
  stepsByIndex: Map<number, AnalyzedStep>;
  blocks: ScheduleBlock[];
  orderedStepIndices: number[];
}

export interface ComputedStepTiming {
  stepIdx: number;
  startTime: Date;
  endTime: Date;
  durationMinutes: number;
  isExplicit: boolean;
  isPassive: boolean;
  isOvernightEstimate: boolean;
  isServeStep: boolean;
  formattedStart: string;
  dayPrefix: string | null;
}

export interface ChapterStartSummary {
  chapterId: string;
  startTime: Date;
  formattedStart: string;
  dayPrefix: string | null;
}

export interface ComputedSchedule {
  startTime: Date;
  finishTime: Date;
  totalMinutes: number;
  passiveMinutes: number;
  activeMinutes: number;
  spansMultipleDays: boolean;
  finishDayPrefix: string | null;
  stepByIndex: Map<number, ComputedStepTiming>;
  chapterStartById: Map<string, ChapterStartSummary>;
}

const UNICODE_FRACTIONS: Record<string, string> = {
  "½": "1/2",
  "¼": "1/4",
  "¾": "3/4",
  "⅓": "1/3",
  "⅔": "2/3",
  "⅛": "1/8",
  "⅜": "3/8",
  "⅝": "5/8",
  "⅞": "7/8",
};

const WORD_NUMBERS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  twelve: 12,
  fifteen: 15,
  twenty: 20,
  thirty: 30,
  forty: 40,
  "forty-five": 45,
  "forty five": 45,
  sixty: 60,
};

function normalizeUnicodeFractions(input: string): string {
  // Normalize hyphenated mixed fractions like "1-1/2 hours" -> "1 1/2 hours"
  let out = input.replace(/(\d+)-(\d+\s*\/\s*\d+)/g, "$1 $2");
  for (const [sym, frac] of Object.entries(UNICODE_FRACTIONS)) {
    out = out.replace(new RegExp(`(\\d)\\s*${sym}`, "g"), `$1 ${frac}`);
    out = out.replace(new RegExp(sym, "g"), frac);
  }
  return out;
}

function parseNumericToken(raw: string): number | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;

  if (s === "half" || s === "half a" || s === "half an") return 0.5;
  if (s in WORD_NUMBERS) return WORD_NUMBERS[s];

  const mixedMatch = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1], 10);
    const num = parseInt(mixedMatch[2], 10);
    const den = parseInt(mixedMatch[3], 10);
    return den > 0 ? whole + num / den : whole;
  }

  const fracMatch = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fracMatch) {
    const num = parseInt(fracMatch[1], 10);
    const den = parseInt(fracMatch[2], 10);
    return den > 0 ? num / den : null;
  }

  const dec = parseFloat(s);
  return Number.isFinite(dec) ? dec : null;
}

function unitToMinutesFactor(unitRaw: string): number {
  const u = unitRaw.trim().toLowerCase();
  if (/^(?:d|day|days)$/.test(u)) return 1440;
  if (/^(?:h|hr|hrs|hour|hours)$/.test(u)) return 60;
  if (/^(?:m|min|mins|minute|minutes)$/.test(u)) return 1;
  if (/^(?:s|sec|secs|second|seconds)$/.test(u)) return 1 / 60;
  return 1;
}

function stripStorageClauses(text: string): string {
  // Split into sentence-like segments so storage/leftover sentences don't inflate cook time
  const segments = text.split(/(?<=[.!?])\s+|\n+/);
  const kept: string[] = [];

  for (const seg of segments) {
    const lower = seg.toLowerCase();
    const isStorageLine =
      /\b(?:store|leftovers?|keeps?|shelf life|reheat(?:ing)?)\b/.test(lower) &&
      /\b(?:day|days|week|weeks|month|months)\b/.test(lower);
    if (isStorageLine) continue;

    // Also strip inline trailing storage clauses after semicolon/comma
    const cleaned = seg.replace(
      /(?:[;,]\s*|\band\s+)(?:store|keeps?|leftovers?)\b[^.!?\n]*\b(?:day|days|week|weeks|month|months)\b[^.!?\n]*/gi,
      ""
    );
    kept.push(cleaned);
  }

  return kept.join(" ");
}

function classifyStepPhase(text: string, isOvernight: boolean): { phase: StepPhase; isPassive: boolean } {
  const lower = text.toLowerCase();

  if (/\b(?:proof(?:ing|ed)?|rise|risen|double in size|ferment(?:ing|ation)?|autolyse|sourdough|levain|bulk)\b/.test(lower)) {
    return { phase: "proof", isPassive: true };
  }

  if (
    isOvernight ||
    /\b(?:marinat(?:e|ing|ed)|brin(?:e|ing|ed)|chill(?:ing|ed)?|refrigerat(?:e|ing|ed)|freez(?:e|ing)|freezer|soak(?:ing|ed)?|steep(?:ing|ed)?|bloom(?:ing|ed)?)\b/.test(
      lower
    )
  ) {
    return { phase: "marinate", isPassive: true };
  }

  const isPreheatOnly =
    /\bpreheat(?:ing)?\b/.test(lower) &&
    !/\b(?:bak(?:e|ing|ed)|roast(?:ing|ed)?|broil(?:ing|ed)?|simmer(?:ing|ed)?|steam(?:ing|ed)?|brais(?:e|ing|ed))\b/.test(
      lower
    );

  if (
    !isPreheatOnly &&
    /\b(?:bak(?:e|ing|ed)|roast(?:ing|ed)?|broil(?:ing|ed)?|air\s*fry(?:ing)?|steam(?:ing|ed)?|brais(?:e|ing|ed)|pressure\s*cook|slow\s*cook|simmer(?:ing|ed)?|in the oven)\b/.test(
      lower
    )
  ) {
    return { phase: "bake", isPassive: true };
  }

  if (/\b(?:cool(?:ing|ed)?|rest(?:ing)?|let stand|stand(?:ing)?|firm up|set aside to cool)\b/.test(lower)) {
    return { phase: "cool", isPassive: true };
  }

  return { phase: "active", isPassive: false };
}

const NUMERIC_TOKEN = "(?:\\d+\\s+\\d+/\\d+|\\d+/\\d+|\\d+(?:\\.\\d+)?)";
const WORD_NUM_TOKEN =
  "(?:half an|half a|half|an|a|one|two|three|four|five|six|seven|eight|nine|ten|twelve|fifteen|twenty|thirty|forty-five|forty five|forty|sixty)";
const NUM_PATTERN = `(?:${NUMERIC_TOKEN}|${WORD_NUM_TOKEN})`;
const EXTRA_MODIFIER = "(?:(?:more|additional|extra)\\s+)?";
const UNIT_PATTERN = "(?:days?|hours?|hrs?|hr|minutes?|mins?|min|seconds?|secs?|sec)";

// Matches ranges like "15 to 20 minutes", "3-4 mins", "1.5 to 2 hours", compact "30min",
// "10 more minutes", or word numbers ("an hour"), plus optional "per side" / "on each side".
const DURATION_EXPR_RE = new RegExp(
  `\\b(?:(${NUMERIC_TOKEN})(?:\\s*(?:to|-|–|—)\\s*(${NUM_PATTERN}))?\\s*${EXTRA_MODIFIER}(${UNIT_PATTERN})|(${WORD_NUM_TOKEN})(?:\\s*(?:to|-|–|—)\\s*(${NUM_PATTERN}))?\\s+${EXTRA_MODIFIER}(${UNIT_PATTERN}))\\b(?:\\s*(?:per side|on each side|each side))?`,
  "gi"
);

export function parseStepDuration(text: string): ParsedStepDuration {
  const cleaned = normalizeUnicodeFractions(stripStorageClauses(text));
  let totalMinutes = 0;
  let foundExplicit = false;
  let foundHourOrDay = false;

  DURATION_EXPR_RE.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = DURATION_EXPR_RE.exec(cleaned)) !== null) {
    const fullMatch = match[0];
    const rawMin = match[1] ?? match[4] ?? "";
    const rawMax = match[2] ?? match[5];
    const unitRaw = match[3] ?? match[6] ?? "";

    const minVal = parseNumericToken(rawMin);
    const maxVal = rawMax ? parseNumericToken(rawMax) : null;
    if (minVal === null) continue;

    // Guard against ordinal idiom false positives like "add a second layer" or "a second baking sheet"
    if (maxVal === null && rawMin.trim().toLowerCase() === "a" && /^second$/i.test(unitRaw)) {
      continue;
    }

    // Guard against false-positive "a minute" in non-time idioms? Still safe, and ignore "0"
    const factor = unitToMinutesFactor(unitRaw);
    if (factor >= 60) {
      foundHourOrDay = true;
    }

    let minutes: number;
    if (maxVal !== null && maxVal >= minVal) {
      const minMinutes = minVal * factor;
      const maxMinutes = maxVal * factor;
      if (maxMinutes - minMinutes <= 30) {
        minutes = maxMinutes;
      } else {
        minutes = Math.round((minMinutes + maxMinutes) / 2);
      }
    } else {
      minutes = minVal * factor;
    }

    if (/(?:per side|on each side|each side)\s*$/i.test(fullMatch)) {
      minutes *= 2;
    }

    if (minutes > 0) {
      totalMinutes += minutes;
      foundExplicit = true;
    }
  }

  const mentionsOvernight = /\bovernight\b/i.test(cleaned);
  let isOvernightEstimate = false;

  if (!foundHourOrDay && mentionsOvernight) {
    totalMinutes += 480;
    foundExplicit = true;
    isOvernightEstimate = true;
  }

  const roundedMinutes = foundExplicit ? Math.max(1, Math.round(totalMinutes)) : 0;
  const { phase, isPassive } = classifyStepPhase(cleaned, isOvernightEstimate);

  return {
    durationMinutes: roundedMinutes,
    isExplicit: foundExplicit,
    isPassive,
    isOvernightEstimate,
    phase,
  };
}

function isPureServeStep(text: string, isLastStep: boolean): boolean {
  if (!isLastStep) return false;
  const lower = text.toLowerCase();
  const hasServeCue = /\b(?:serve|garnish|ladle|plate|spoon\b.*\bon top|enjoy)\b/.test(lower);
  const hasPrepOrCookCue =
    /\b(?:beat|whip|cook|bake|fry|boil|simmer|whisk|blend|mix|chop|knead|preheat|roast|broil|sear|grill)\b/.test(
      lower
    );
  return hasServeCue && !hasPrepOrCookCue;
}

export function analyzeRecipeSchedule(
  recipe: Recipe,
  parsedMethodInput?: ParsedRecipeMethod
): RecipeScheduleAnalysis {
  const instructions = recipe.instructions ?? [];
  const parsedMethod = parsedMethodInput ?? parseInstructionChapters(instructions);

  const combinedText = [recipe.title || "", recipe.description || "", ...instructions].join(" ");

  const hasProofingOrFermenting =
    /\b(?:proof(?:ing|ed)?|rise|risen|double in size|ferment(?:ing|ation)?|autolyse|sourdough|levain|yeast)\b/i.test(
      combinedText
    );
  const hasBakingOrRoasting =
    /\b(?:bak(?:e|ing|ed)|roast(?:ing|ed)?|preheat(?:ing)? (?:the )?oven|in the oven)\b/i.test(
      combinedText
    );
  const hasLongRestOrMarinate =
    /\b(?:marinat(?:e|ing)|brin(?:e|ing)|overnight|refrigerat(?:e|ing)|chill(?:ing)?|freezer)\b/i.test(
      combinedText
    );

  // Build step sequence matching RecipeModal's exact display order
  const orderedEntries: Array<{
    idx: number;
    text: string;
    chapterId?: string;
    chapterTitle?: string;
  }> = [];

  if (parsedMethod.isMultiComponent) {
    for (const chapter of parsedMethod.chapters) {
      for (const s of chapter.steps) {
        orderedEntries.push({
          idx: s.originalIdx,
          text: s.text,
          chapterId: chapter.id,
          chapterTitle: chapter.title,
        });
      }
    }
  } else {
    instructions.forEach((text, idx) => {
      orderedEntries.push({ idx, text });
    });
  }

  const lastOrderedIdx = orderedEntries.length > 0 ? orderedEntries[orderedEntries.length - 1].idx : -1;

  let explicitStepCount = 0;
  let totalExplicitMinutes = 0;

  const rawAnalyzed = orderedEntries.map((entry) => {
    const parsed = parseStepDuration(entry.text);
    const serveStep = !parsed.isExplicit && isPureServeStep(entry.text, entry.idx === lastOrderedIdx);

    if (parsed.isExplicit) {
      explicitStepCount += 1;
      totalExplicitMinutes += parsed.durationMinutes;
    }

    return {
      ...entry,
      ...parsed,
      isServeStep: serveStep,
    };
  });

  const isEligible =
    instructions.length > 0 &&
    (hasProofingOrFermenting ||
      (hasBakingOrRoasting && (explicitStepCount >= 1 || (recipe.cookingTime || 0) >= 25)) ||
      (recipe.cookingTime || 0) >= 45 ||
      totalExplicitMinutes >= 25 ||
      (explicitStepCount >= 2 && totalExplicitMinutes >= 20));

  const untimedWorkSteps = rawAnalyzed.filter((s) => !s.isExplicit && !s.isServeStep);
  const recipeCookTime = recipe.cookingTime || 0;
  let isEstimatedFromTotalTime = false;

  const stepsByIndex = new Map<number, AnalyzedStep>();

  if (explicitStepCount === 0 && recipeCookTime > 0 && untimedWorkSteps.length > 0) {
    isEstimatedFromTotalTime = true;
    const weights = untimedWorkSteps.map((s) => {
      const lower = s.text.toLowerCase();
      if (/\b(?:proof|rise|ferment|bake|roast|simmer|braise|marinate|chill)\b/.test(lower)) {
        return 2.5;
      }
      return 1;
    });
    const totalWeight = weights.reduce((acc, w) => acc + w, 0);
    let remaining = recipeCookTime;

    untimedWorkSteps.forEach((s, i) => {
      const alloc =
        i === untimedWorkSteps.length - 1
          ? Math.max(1, remaining)
          : Math.max(1, Math.round((recipeCookTime * weights[i]) / totalWeight));
      remaining = Math.max(0, remaining - alloc);
      stepsByIndex.set(s.idx, {
        idx: s.idx,
        text: s.text,
        chapterId: s.chapterId,
        chapterTitle: s.chapterTitle,
        durationMinutes: alloc,
        isExplicit: false,
        isPassive: s.isPassive,
        isOvernightEstimate: false,
        isServeStep: false,
        phase: s.phase,
      });
    });

    for (const s of rawAnalyzed) {
      if (!stepsByIndex.has(s.idx)) {
        stepsByIndex.set(s.idx, {
          idx: s.idx,
          text: s.text,
          chapterId: s.chapterId,
          chapterTitle: s.chapterTitle,
          durationMinutes: 0,
          isExplicit: false,
          isPassive: s.isPassive,
          isOvernightEstimate: false,
          isServeStep: s.isServeStep,
          phase: s.phase,
        });
      }
    }
  } else {
    const perUntimedFromRemainder =
      untimedWorkSteps.length > 0 && recipeCookTime > totalExplicitMinutes
        ? Math.max(2, Math.min(6, Math.round((recipeCookTime - totalExplicitMinutes) / untimedWorkSteps.length)))
        : null;

    for (const s of rawAnalyzed) {
      let durationMinutes = s.durationMinutes;
      if (!s.isExplicit) {
        if (s.isServeStep) {
          durationMinutes = 0;
        } else if (perUntimedFromRemainder !== null) {
          durationMinutes = perUntimedFromRemainder;
        } else {
          const isLongActive =
            s.text.length > 110 &&
            /\b(?:beat|whip|chop|dice|slice|knead|preheat|whisk|fold)\b/i.test(s.text);
          durationMinutes = isLongActive ? 5 : 3;
        }
      }

      stepsByIndex.set(s.idx, {
        idx: s.idx,
        text: s.text,
        chapterId: s.chapterId,
        chapterTitle: s.chapterTitle,
        durationMinutes,
        isExplicit: s.isExplicit,
        isPassive: s.isPassive,
        isOvernightEstimate: s.isOvernightEstimate,
        isServeStep: s.isServeStep,
        phase: s.phase,
      });
    }
  }

  // Group into chronological ScheduleBlocks matching RecipeModal's chapters + parallel blocks
  const blocks: ScheduleBlock[] = [];

  const pushBlocksForItems = (items: StepBlockItem[], chapterId?: string) => {
    const built = buildInstructionBlocks(items);
    for (const block of built) {
      if (block.type === "single") {
        const analyzed = stepsByIndex.get(block.item.idx);
        blocks.push({
          blockIndex: blocks.length,
          chapterId,
          isParallel: false,
          stepIndices: [block.item.idx],
          durationMinutes: analyzed?.durationMinutes ?? 0,
        });
      } else {
        const durations = block.items.map((it) => stepsByIndex.get(it.idx)?.durationMinutes ?? 0);
        blocks.push({
          blockIndex: blocks.length,
          chapterId,
          isParallel: true,
          stepIndices: block.items.map((it) => it.idx),
          durationMinutes: durations.length > 0 ? Math.max(...durations) : 0,
        });
      }
    }
  };

  if (parsedMethod.isMultiComponent) {
    for (const chapter of parsedMethod.chapters) {
      const items: StepBlockItem[] = chapter.steps.map((s, localIdx) => ({
        step: s.text,
        idx: s.originalIdx,
        displayNumber: localIdx + 1,
      }));
      pushBlocksForItems(items, chapter.id);
    }
  } else {
    const items: StepBlockItem[] = instructions.map((step, idx) => ({
      step,
      idx,
      displayNumber: idx + 1,
    }));
    pushBlocksForItems(items);
  }

  let totalMinutes = 0;
  let passiveMinutes = 0;
  let activeMinutes = 0;

  for (const block of blocks) {
    totalMinutes += block.durationMinutes;
    const blockSteps = block.stepIndices.map((idx) => stepsByIndex.get(idx)!).filter(Boolean);
    const blockHasPassive = blockSteps.some((s) => s.isPassive && s.durationMinutes > 0);
    if (blockHasPassive) {
      passiveMinutes += block.durationMinutes;
    } else {
      activeMinutes += block.durationMinutes;
    }
  }

  const reasonTags: string[] = [];
  if (hasProofingOrFermenting) reasonTags.push("Proofing");
  if (hasBakingOrRoasting) reasonTags.push("Baking");
  if (hasLongRestOrMarinate) {
    const hasMarinateWord = /\b(?:marinat(?:e|ing)|brin(?:e|ing))\b/i.test(combinedText);
    reasonTags.push(hasMarinateWord ? "Marinating" : "Chilling");
  }
  if (reasonTags.length < 2 && (totalMinutes >= 45 || recipeCookTime >= 45)) {
    reasonTags.push("Long cook");
  }
  if (reasonTags.length === 0 && explicitStepCount >= 1) {
    reasonTags.push("Timed steps");
  }

  const hasMultiDayCue =
    /\b(?:overnight|next day|following day|day before|\d+\s*(?:to|-|–|—)?\s*\d*\s*days?|(?:1[2-9]|[2-9]\d)\s*(?:to|-|–|—)?\s*\d*\s*(?:hours?|hrs?))\b/i.test(
      stripStorageClauses(combinedText)
    );
  const supportsMultiDay = hasMultiDayCue || totalMinutes >= 360;

  return {
    isEligible,
    supportsMultiDay,
    isEstimatedFromTotalTime,
    totalMinutes,
    passiveMinutes,
    activeMinutes,
    explicitStepCount,
    totalExplicitMinutes,
    reasonTags: reasonTags.slice(0, 2),
    hasProofingOrFermenting,
    hasBakingOrRoasting,
    hasLongRestOrMarinate,
    stepsByIndex,
    blocks,
    orderedStepIndices: orderedEntries.map((e) => e.idx),
  };
}

function getLocalDayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getLocalDayDiff(date: Date, referenceNow: Date): number {
  const targetMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const nowMidnight = new Date(
    referenceNow.getFullYear(),
    referenceNow.getMonth(),
    referenceNow.getDate()
  );
  return Math.round((targetMidnight.getTime() - nowMidnight.getTime()) / 86_400_000);
}

export function getDayLabel(date: Date, referenceNow: Date): string {
  const diffDays = getLocalDayDiff(date, referenceNow);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays === -1) return "Yesterday";

  return new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(date);
}

export function formatClockTime(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatDurationShort(minutes: number): string {
  if (!minutes || minutes <= 0) return "0m";
  const rounded = Math.round(minutes);
  const hrs = Math.floor(rounded / 60);
  const mins = rounded % 60;
  if (hrs > 0) {
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }
  return `${mins}m`;
}

export function toTimeInputValue(date: Date): string {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function buildTargetDate(timeValue: string, dayOffset: number, now: Date = new Date()): Date | null {
  const match = timeValue.trim().match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const mins = parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || mins < 0 || mins > 59) return null;

  const safeOffset = Math.max(0, Math.floor(dayOffset));
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + safeOffset, hours, mins, 0, 0);
}

export function roundUpToNext5Min(date: Date): Date {
  const ms = 5 * 60_000;
  return new Date(Math.ceil(date.getTime() / ms) * ms);
}

export interface FinishPreset {
  id: string;
  label: string;
  timeValue: string;
  dayOffset: number;
}

export function getSuggestedFinishPresets(now: Date, totalMinutes: number): FinishPreset[] {
  const presets: FinishPreset[] = [];
  const startNowFinish = roundUpToNext5Min(new Date(now.getTime() + totalMinutes * 60_000));
  const startNowDayOffset = Math.max(0, getLocalDayDiff(startNowFinish, now));

  presets.push({
    id: "start-now",
    label: "Start now",
    timeValue: toTimeInputValue(startNowFinish),
    dayOffset: startNowDayOffset,
  });

  const mealCandidates = [
    { id: "noon", hour: 12, minute: 0 },
    { id: "6pm", hour: 18, minute: 0 },
    { id: "7pm", hour: 19, minute: 0 },
    { id: "8pm", hour: 20, minute: 0 },
  ];

  const upcomingToday = mealCandidates.filter((c) => {
    const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), c.hour, c.minute, 0, 0);
    return candidate.getTime() > now.getTime() + 15 * 60_000;
  });

  const chosen = upcomingToday.length >= 2 ? upcomingToday.slice(0, 3) : mealCandidates.slice(0, 2);

  for (const c of chosen) {
    const dayOffset = upcomingToday.some((u) => u.id === c.id) ? 0 : 1;
    const target = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + dayOffset,
      c.hour,
      c.minute,
      0,
      0
    );
    presets.push({
      id: `${c.id}-${dayOffset}`,
      label: dayOffset === 1 ? `Tom ${formatClockTime(target)}` : formatClockTime(target),
      timeValue: toTimeInputValue(target),
      dayOffset,
    });
  }

  return presets;
}

export function computeStepSchedule(
  analysis: RecipeScheduleAnalysis,
  targetFinishDate: Date,
  now: Date = new Date()
): ComputedSchedule {
  const stepByIndex = new Map<number, ComputedStepTiming>();
  const chapterStartById = new Map<string, ChapterStartSummary>();

  let cursorMs = targetFinishDate.getTime();
  const blockAssignments: Array<{
    block: ScheduleBlock;
    startTime: Date;
    endTime: Date;
  }> = [];

  for (let i = analysis.blocks.length - 1; i >= 0; i--) {
    const block = analysis.blocks[i];
    const endTime = new Date(cursorMs);
    const startMs = cursorMs - block.durationMinutes * 60_000;
    const startTime = new Date(startMs);
    blockAssignments.push({ block, startTime, endTime });
    cursorMs = startMs;
  }

  blockAssignments.reverse();

  const overallStart = blockAssignments.length > 0 ? blockAssignments[0].startTime : new Date(targetFinishDate);
  const overallFinish = new Date(targetFinishDate);

  const todayKey = getLocalDayKey(now);
  const startKey = getLocalDayKey(overallStart);
  const finishKey = getLocalDayKey(overallFinish);
  const spansMultipleDays = startKey !== finishKey;
  const showDayLabels = spansMultipleDays || finishKey !== todayKey;
  const finishDayPrefix = showDayLabels ? getDayLabel(overallFinish, now) : null;

  for (const { block, startTime, endTime } of blockAssignments) {
    const formattedStart = formatClockTime(startTime);
    const dayPrefix = showDayLabels ? getDayLabel(startTime, now) : null;

    for (const stepIdx of block.stepIndices) {
      const analyzed = analysis.stepsByIndex.get(stepIdx);
      if (!analyzed) continue;

      stepByIndex.set(stepIdx, {
        stepIdx,
        startTime,
        endTime,
        durationMinutes: analyzed.durationMinutes,
        isExplicit: analyzed.isExplicit,
        isPassive: analyzed.isPassive,
        isOvernightEstimate: analyzed.isOvernightEstimate,
        isServeStep: analyzed.isServeStep,
        formattedStart,
        dayPrefix,
      });
    }

    if (block.chapterId && !chapterStartById.has(block.chapterId)) {
      chapterStartById.set(block.chapterId, {
        chapterId: block.chapterId,
        startTime,
        formattedStart,
        dayPrefix,
      });
    }
  }

  return {
    startTime: overallStart,
    finishTime: overallFinish,
    totalMinutes: analysis.totalMinutes,
    passiveMinutes: analysis.passiveMinutes,
    activeMinutes: analysis.activeMinutes,
    spansMultipleDays,
    finishDayPrefix,
    stepByIndex,
    chapterStartById,
  };
}
