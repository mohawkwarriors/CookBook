import React, { useState, useEffect } from "react";
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
    <div 
      className="relative flex flex-col items-center group cursor-pointer w-full"
      onClick={onToggleComplete}
    >
      {/* Centered Node */}
      <div className={`w-8 h-8 rounded-full border-[4px] border-white dark:border-neutral-900 flex items-center justify-center transition-colors relative z-10 mb-3 ${
        isCompleted 
          ? "bg-accent-500 dark:bg-accent-400 text-white dark:text-neutral-900 dark:border-neutral-900" 
          : "bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50"
      }`}>
        {isCompleted ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : <span className="text-xs font-bold">{idx + 1}</span>}
      </div>

      {/* Card Content */}
      <div className="w-full transition-all duration-300 relative z-10">
        <div className={`p-4 md:p-5 rounded-2xl border-2 transition-all ${
          isCompleted 
            ? "border-neutral-100 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-800/30 opacity-70" 
            : "border-neutral-100 dark:border-neutral-700 bg-[#FDFBF7] dark:bg-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-600 hover:shadow-sm"
        }`}>
          <div className="flex flex-col justify-between gap-4">
            <p className={`text-sm sm:text-sm leading-relaxed transition-all w-full ${
              isCompleted 
                ? "text-neutral-400 dark:text-neutral-500 line-through" 
                : "text-neutral-800 dark:text-neutral-200"
            }`}>
              {step}
            </p>

            {/* Bottom Timer UI */}
            {initialTime !== null && !isCompleted && (
              <div 
                className={`w-full flex items-center justify-center gap-6 sm:gap-8 rounded-xl border transition-all shadow-sm p-1.5 px-3 ${
                  isTimerRed 
                    ? "border-red-200 bg-red-50 dark:border-red-900/40 dark:bg-red-900/20" 
                    : isTimerYellow
                    ? "border-yellow-200 bg-yellow-50 dark:border-yellow-900/40 dark:bg-yellow-900/20"
                    : "border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/80"
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className={`font-mono text-base sm:text-lg font-semibold tracking-wider ${
                  isTimerRed 
                    ? "text-red-600 dark:text-red-400 animate-pulse" 
                    : isTimerYellow
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-neutral-700 dark:text-neutral-300"
                }`}>
                  {formatTime(timeLeft)}
                </div>
                
                <div className="flex items-center justify-evenly gap-2">
                  {timerState === 'running' ? (
                    <button 
                      onClick={handlePause}
                      className="p-2 rounded-lg text-yellow-600 hover:bg-yellow-100 dark:text-yellow-500 dark:hover:bg-yellow-900/30 transition-colors"
                      title="Pause"
                    >
                      <Pause className="w-5 h-5" />
                    </button>
                  ) : timeLeft > 0 && timeLeft !== initialTime ? (
                    <button 
                      onClick={handleStart}
                      className="p-2 rounded-lg text-accent-600 hover:bg-accent-100 dark:text-accent-500 dark:hover:bg-accent-900/30 transition-colors"
                      title="Resume"
                    >
                      <Play className="w-5 h-5 fill-current" />
                    </button>
                  ) : timeLeft === initialTime ? (
                    <button 
                      onClick={handleStart}
                      className="p-2 rounded-lg text-neutral-600 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-700 transition-colors"
                      title="Start Timer"
                    >
                      <Play className="w-5 h-5" />
                    </button>
                  ) : null}

                  {timeLeft !== initialTime && (
                    <button 
                      onClick={handleStop}
                      className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-700 transition-colors"
                      title={timeLeft === 0 ? "Dismiss" : "Stop"}
                    >
                      <Square className="w-5 h-5 fill-current" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
