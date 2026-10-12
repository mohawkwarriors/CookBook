import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Check, Play, Pause, Square, Clock } from "lucide-react";

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
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export default function InstructionStep({ step, idx, isCompleted, isParallel, onToggleComplete }: InstructionStepProps) {
  const initialTime = extractTimeInSeconds(step);
  
  const [timeLeft, setTimeLeft] = useState(initialTime || 0);
  const [timerState, setTimerState] = useState<'idle' | 'running' | 'paused'>('idle');

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerState === 'running' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setTimerState('idle');
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
    setTimerState('running');
  };

  const handlePause = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTimerState('paused');
  };

  const handleStop = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTimerState('idle');
    setTimeLeft(initialTime || 0);
  };

  const isTimerActive = timerState !== 'idle' || timeLeft !== initialTime;
  const isTimerRed = isTimerActive && timeLeft <= 5;
  const isTimerYellow = isTimerActive && timeLeft <= 30 && !isTimerRed;

  return (
    <motion.div 
      className="relative flex flex-col items-start group cursor-pointer w-full select-none"
      onClick={onToggleComplete}
      whileTap={{ scale: 0.995 }}
    >
      {/* Node & Content Layout */}
      <div className="w-full flex gap-6 md:gap-8">
        <div className="flex flex-col items-center shrink-0">
          <motion.div 
            animate={{ 
              scale: isCompleted ? [1, 1.25, 1] : 1,
            }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className={`w-10 h-10 rounded-full border-[6px] border-[#FDFBF7] dark:border-neutral-800 flex items-center justify-center transition-all duration-500 relative z-10 ${
            isCompleted 
              ? "bg-accent-500 dark:bg-accent-400 text-white dark:text-neutral-900 shadow-[0_0_15px_rgba(16,185,129,0.3)]" 
              : "bg-neutral-900 dark:bg-neutral-50 text-white dark:text-neutral-900"
          }`}>
            {isCompleted ? <Check className="w-4 h-4" strokeWidth={4} /> : <span className="text-sm font-bold">{idx + 1}</span>}
          </motion.div>
        </div>

        <div className="flex-1 pb-10">
          <div className="space-y-4">
            <p className={`text-base md:text-lg leading-relaxed transition-all duration-500 ${
              isCompleted 
                ? "text-neutral-400 dark:text-neutral-600 line-through" 
                : "text-neutral-800 dark:text-neutral-100"
            }`}>
              {step}
            </p>

            {/* Timer UI */}
            {initialTime !== null && !isCompleted && (
              <div 
                className={`inline-flex items-center gap-4 py-2 px-4 rounded-xl border transition-all duration-300 shadow-sm ${
                  isTimerRed 
                    ? "border-red-200 bg-red-50 text-red-600 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-400" 
                    : isTimerYellow
                    ? "border-yellow-200 bg-yellow-50 text-yellow-600 dark:border-yellow-900/40 dark:bg-yellow-900/20 dark:text-yellow-400"
                    : "border-neutral-100 bg-white dark:border-neutral-800 dark:bg-neutral-900/50 text-neutral-600 dark:text-neutral-400"
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 opacity-50" />
                  <span className="font-editorial text-xl font-bold tabular-nums tracking-tight">
                    {formatTime(timeLeft)}
                  </span>
                </div>
                
                <div className="h-4 w-px bg-neutral-200 dark:bg-neutral-800" />
                
                <div className="flex items-center gap-1">
                  {timerState === 'running' ? (
                    <button 
                      onClick={handlePause}
                      className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                      title="Pause"
                    >
                      <Pause className="w-4 h-4 fill-current" />
                    </button>
                  ) : (
                    <button 
                      onClick={handleStart}
                      className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-accent-600 transition-colors"
                      title={timeLeft === initialTime ? "Start" : "Resume"}
                    >
                      <Play className="w-4 h-4 fill-current" />
                    </button>
                  )}

                  {timeLeft !== initialTime && (
                    <button 
                      onClick={handleStop}
                      className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 transition-colors"
                      title="Reset"
                    >
                      <Square className="w-4 h-4 fill-current" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
