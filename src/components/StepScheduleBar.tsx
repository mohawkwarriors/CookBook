import React, { useId } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Clock,
  CalendarClock,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  X,
} from "lucide-react";
import {
  RecipeScheduleAnalysis,
  ComputedSchedule,
  formatClockTime,
  formatDurationShort,
  getDayLabel,
  getLocalDayDiff,
  roundUpToNext5Min,
  toTimeInputValue,
} from "../lib/stepScheduler";
import { formatTime } from "../lib/utils";

interface StepScheduleBarProps {
  analysis: RecipeScheduleAnalysis;
  schedule: ComputedSchedule | null;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  timeValue: string;
  dayOffset: number;
  onChangeTarget: (timeValue: string, dayOffset: number) => void;
  onClear: () => void;
  now: Date;
}

export default function StepScheduleBar({
  analysis,
  schedule,
  isExpanded,
  onToggleExpanded,
  timeValue,
  dayOffset,
  onChangeTarget,
  onClear,
  now,
}: StepScheduleBarProps) {
  const timeInputId = useId();
  const panelId = useId();

  const isStartInPast = Boolean(
    schedule && schedule.startTime.getTime() < now.getTime() - 60_000
  );
  const pastMinutes = schedule
    ? Math.max(1, Math.round((now.getTime() - schedule.startTime.getTime()) / 60_000))
    : 0;
  const earliestFinish = roundUpToNext5Min(
    new Date(now.getTime() + analysis.totalMinutes * 60_000)
  );
  const earliestFinishDayOffset = Math.max(0, getLocalDayDiff(earliestFinish, now));

  const showDayToggle =
    analysis.supportsMultiDay ||
    earliestFinishDayOffset >= 1 ||
    dayOffset >= 1 ||
    Boolean(schedule?.spansMultipleDays);

  const durationLabel = `~${formatTime(analysis.totalMinutes)}`;

  const formatEndpoint = (date: Date, dayPrefix: string | null) =>
    dayPrefix ? `${dayPrefix} ${formatClockTime(date)}` : formatClockTime(date);

  const scheduleStartLabel = schedule
    ? formatEndpoint(
        schedule.startTime,
        schedule.spansMultipleDays || dayOffset >= 1
          ? schedule.stepByIndex.get(analysis.orderedStepIndices[0])?.dayPrefix ?? null
          : null
      )
    : null;

  const scheduleFinishLabel = schedule
    ? formatEndpoint(schedule.finishTime, schedule.finishDayPrefix)
    : null;

  const earliestFinishLabel = `${
    earliestFinishDayOffset > 0 ? `${getDayLabel(earliestFinish, now)} ` : ""
  }${formatClockTime(earliestFinish)}`;

  return (
    <>
      {schedule && (
        <div className="hidden print:flex items-center justify-between gap-2 rounded-xl border border-border px-3.5 py-2 text-xs font-mono tabular-nums">
          <span>
            Schedule: Start {scheduleStartLabel} → Ready by {scheduleFinishLabel}
          </span>
          <span>{formatTime(schedule.totalMinutes)} total</span>
        </div>
      )}
      <div className="rounded-2xl border border-border bg-secondary/40 print:hidden">
        {/* Compact Collapsible Header */}
        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-8 h-8 rounded-full border border-border bg-card flex items-center justify-center shrink-0 text-primary-dark dark:text-primary">
              <CalendarClock className="w-4 h-4" />
            </span>
            <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-xs font-semibold text-foreground">Ready by</span>
              {schedule && !isExpanded ? (
                <span className="inline-flex items-center gap-1 text-xs font-mono font-medium tabular-nums text-primary-dark dark:text-primary">
                  <span>Start {scheduleStartLabel}</span>
                  <ArrowRight className="w-3 h-3" />
                  <span>{scheduleFinishLabel}</span>
                </span>
              ) : (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {durationLabel}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {schedule && (
              <button
                type="button"
                onClick={onClear}
                className="h-9 sm:h-8 px-3 sm:px-2.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-background/70 transition-colors cursor-pointer inline-flex items-center gap-1 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
              >
                <X className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
            <button
              type="button"
              aria-expanded={isExpanded}
              aria-controls={panelId}
              onClick={onToggleExpanded}
              className="h-9 sm:h-8 px-3.5 rounded-full border border-border bg-card text-foreground hover:bg-background text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
            >
              <Clock className="w-3.5 h-3.5 text-primary-dark dark:text-primary" />
              <span>{isExpanded ? "Hide" : schedule ? "Adjust" : "Set time"}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${
                  isExpanded ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>
        </div>

        {/* Expanded Time & Smart Day Controls */}
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              id={panelId}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden border-t border-border/70"
            >
              <div className="px-4 py-3.5 space-y-3">
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor={timeInputId}
                      className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      Ready by
                    </label>
                    <input
                      id={timeInputId}
                      name="targetFinishTime"
                      type="time"
                      value={timeValue}
                      onChange={(e) => onChangeTarget(e.target.value, dayOffset)}
                      className="min-h-[44px] sm:min-h-[38px] px-3 rounded-xl border border-border bg-card text-foreground font-mono text-base sm:text-sm tabular-nums focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
                    />
                  </div>

                  {/* Smart Multi-Day Toggle (shown only when multi-day / cross-midnight) */}
                  {showDayToggle && (
                    <div
                      className="inline-flex rounded-full border border-border bg-card p-1"
                      role="group"
                      aria-label="Target completion day"
                    >
                      <button
                        type="button"
                        aria-pressed={dayOffset === 0}
                        onClick={() => onChangeTarget(timeValue, 0)}
                        className={`h-9 sm:h-7 px-3 rounded-full text-xs font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 ${
                          dayOffset === 0
                            ? "bg-foreground text-background"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Today
                      </button>
                      <button
                        type="button"
                        aria-pressed={dayOffset === 1}
                        onClick={() => onChangeTarget(timeValue, 1)}
                        className={`h-9 sm:h-7 px-3 rounded-full text-xs font-medium transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 ${
                          dayOffset === 1
                            ? "bg-foreground text-background"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Tomorrow
                      </button>
                      {dayOffset >= 2 && schedule && (
                        <button
                          type="button"
                          aria-pressed={true}
                          onClick={() => onChangeTarget(timeValue, dayOffset)}
                          className="h-9 sm:h-7 px-3 rounded-full text-xs font-medium bg-foreground text-background transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
                        >
                          {getDayLabel(schedule.finishTime, now)}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Computed Schedule Summary Strip */}
                {schedule && (
                  <div className="rounded-xl border border-border/80 bg-card/80 px-3.5 py-2.5 space-y-1 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-muted-foreground">Start at</span>
                        <span className="font-mono font-semibold text-foreground tabular-nums">
                          {scheduleStartLabel}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Ready by</span>
                        <span className="font-mono font-semibold text-primary-dark dark:text-primary tabular-nums">
                          {scheduleFinishLabel}
                        </span>
                      </div>

                      <div className="font-mono text-[11px] text-muted-foreground tabular-nums">
                        <span>{formatTime(schedule.totalMinutes)} total</span>
                        {schedule.passiveMinutes >= 20 && (
                          <span> ({formatDurationShort(schedule.passiveMinutes)} passive)</span>
                        )}
                      </div>
                    </div>
                    {analysis.isEstimatedFromTotalTime && (
                      <p className="text-[11px] text-muted-foreground">
                        Step times estimated from total cook time
                      </p>
                    )}
                  </div>
                )}

                {/* Past Start-Time Warning */}
                {isStartInPast && schedule && (
                  <div
                    role="status"
                    className="rounded-xl border border-amber-300/80 dark:border-amber-800/70 bg-amber-50/90 dark:bg-amber-950/35 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2.5 text-xs text-amber-900 dark:text-amber-200"
                  >
                    <div className="flex items-start sm:items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 sm:mt-0 text-amber-600 dark:text-amber-400" />
                      <span>
                        First step starts{" "}
                        <strong className="font-semibold">
                          {formatDurationShort(pastMinutes)} ago
                        </strong>{" "}
                        — earliest finish is{" "}
                        <strong className="font-mono tabular-nums">
                          {earliestFinishLabel}
                        </strong>
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          onChangeTarget(
                            toTimeInputValue(earliestFinish),
                            earliestFinishDayOffset
                          )
                        }
                        className="h-7 px-2.5 rounded-full bg-amber-900 text-amber-50 dark:bg-amber-400 dark:text-neutral-950 text-[11px] font-semibold hover:opacity-90 transition-opacity cursor-pointer focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
                      >
                        Use {earliestFinishLabel}
                      </button>
                      {showDayToggle && dayOffset === 0 && (
                        <button
                          type="button"
                          onClick={() => onChangeTarget(timeValue, 1)}
                          className="h-7 px-2.5 rounded-full border border-amber-400/70 dark:border-amber-700 text-[11px] font-medium hover:bg-amber-100/70 dark:hover:bg-amber-900/40 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
                        >
                          Tomorrow
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
