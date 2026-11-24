import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Check, Play, Pause, RotateCcw, Clock } from "lucide-react";

interface InstructionStepProps {
  key?: React.Key;
  step: string;
  idx: number;
  isCompleted: boolean;
  isParallel: boolean;
  onToggleComplete: () => void;
}

const extractTimeInSeconds = (text: string): number | null => {
  let totalSeconds = 0;
  let found = false;

  const hourMatch = text.match(/(\d+)\s*(?:hour|hours|hr|hrs)\b/i);
  if (hourMatch) {
    totalSeconds += parseInt(hourMatch[1], 10) * 3600;
    found = true;
  }

  const minuteMatch = text.match(/(\d+)\s*(?:minute|minutes|min|mins)\b/i);
  if (minuteMatch) {
    totalSeconds += parseInt(minuteMatch[1], 10) * 60;
    found = true;
  }

  const secondMatch = text.match(/(\d+)\s*(?:second|seconds|sec|secs)\b/i);
  if (secondMatch) {
    totalSeconds += parseInt(secondMatch[1], 10);
    found = true;
  }

  return found ? totalSeconds : null;
};

const formatTime = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

export default function InstructionStep({
  step,
  idx,
  isCompleted,
  isParallel,
  onToggleComplete,
}: InstructionStepProps) {
  const initialTime = extractTimeInSeconds(step);

  const [timeLeft, setTimeLeft] = useState(initialTime || 0);
  const [timerState, setTimerState] = useState<"idle" | "running" | "paused">("idle");

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerState === "running" && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setTimerState("idle");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerState, timeLeft]);

  const handleStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (timeLeft === 0 && initialTime) {
      setTimeLeft(initialTime);
    }
    setTimerState("running");
  };

  const handlePause = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTimerState("paused");
  };

  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTimerState("idle");
    setTimeLeft(initialTime || 0);
  };

  const isTimerActive = timerState !== "idle" || timeLeft !== initialTime;
  const isTimerRed = isTimerActive && timeLeft <= 5;
  const isTimerYellow = isTimerActive && timeLeft <= 30 && !isTimerRed;

  return (
    <motion.div
      className={`group cursor-pointer w-full select-none rounded-2xl transition-colors ${
        isParallel
          ? "p-4 border border-border bg-secondary/40 hover:bg-secondary/70"
          : "py-4 px-3 -mx-3 hover:bg-secondary/50"
      }`}
      onClick={onToggleComplete}
      whileTap={{ scale: 0.996 }}
    >
      <div className="flex items-start gap-4">
        {/* Step Number / Completed Check Circle */}
        <motion.div
          animate={{ scale: isCompleted ? [1, 1.18, 1] : 1 }}
          transition={{ duration: 0.2 }}
          className={`mt-0.5 w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-semibold tabular-nums transition-all ${
            isCompleted
              ? "bg-primary text-primary-foreground border border-primary"
              : "bg-foreground text-background border border-foreground"
          }`}
        >
          {isCompleted ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : idx + 1}
        </motion.div>

        <div className="flex-1 min-w-0 space-y-3">
          {isParallel && (
            <span className="inline-block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              In Parallel
            </span>
          )}
          <p
            className={`text-[15px] leading-relaxed transition-colors ${
              isCompleted
                ? "text-muted-foreground/60 line-through"
                : "text-foreground/90"
            }`}
          >
            {step}
          </p>

          {/* Inline Pill Timer */}
          {initialTime !== null && !isCompleted && (
            <div
              className={`inline-flex items-center gap-2.5 py-1.5 pl-3 pr-2 rounded-full border text-xs transition-all ${
                isTimerRed
                  ? "border-red-300 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-400"
                  : isTimerYellow
                  ? "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-400"
                  : timerState === "running"
                  ? "border-primary/60 bg-accent-50 text-foreground dark:bg-accent-900/20"
                  : "border-border bg-card text-foreground"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-mono text-sm font-semibold tabular-nums">
                {formatTime(timeLeft)}
              </span>

              <div className="h-3.5 w-px bg-border" />

              <div className="flex items-center gap-1">
                {timerState === "running" ? (
                  <button
                    type="button"
                    onClick={handlePause}
                    className="w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center hover:opacity-85 transition-opacity cursor-pointer"
                    title="Pause timer"
                  >
                    <Pause className="w-3 h-3 fill-current" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStart}
                    className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:brightness-95 transition-all cursor-pointer"
                    title={timeLeft === initialTime ? "Start timer" : "Resume timer"}
                  >
                    <Play className="w-3 h-3 fill-current ml-0.5" />
                  </button>
                )}

                {timeLeft !== initialTime && (
                  <button
                    type="button"
                    onClick={handleStop}
                    className="w-6 h-6 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center transition-colors cursor-pointer"
                    title="Reset timer"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
