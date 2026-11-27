import React, { useId } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, ChevronDown } from "lucide-react";
import { IngredientGroup } from "../lib/recipeComponents";

interface IngredientGroupCardsProps {
  groups: IngredientGroup[];
  completedIngredients: Set<number>;
  collapsedGroups: Set<string>;
  onToggleGroupCollapsed: (groupId: string) => void;
  onToggleIngredient: (originalIdx: number) => void;
  formatAmount: (amount: number) => string;
  formatDisplayName?: (name: string) => string;
  compact?: boolean;
}

export default function IngredientGroupCards({
  groups,
  completedIngredients,
  collapsedGroups,
  onToggleGroupCollapsed,
  onToggleIngredient,
  formatAmount,
  formatDisplayName,
  compact = false,
}: IngredientGroupCardsProps) {
  const instanceId = useId();

  return (
    <div className={compact ? "space-y-3" : "space-y-3.5"}>
      {groups.map((group) => {
        const doneCount = group.items.filter((item) =>
          completedIngredients.has(item.originalIdx)
        ).length;
        const isGroupDone =
          group.items.length > 0 && doneCount === group.items.length;
        const isCollapsed = collapsedGroups.has(group.id);
        const panelId = `${instanceId}-${group.id}`;

        return (
          <section
            key={group.id}
            data-ing-group-id={group.id}
            className={`rounded-2xl border overflow-hidden transition-colors ${
              isGroupDone
                ? "border-primary/40 bg-secondary/30"
                : "border-border bg-card/70"
            }`}
          >
            {/* Tinted Collapsible Section Header */}
            <button
              type="button"
              aria-expanded={!isCollapsed}
              aria-controls={panelId}
              onClick={() => onToggleGroupCollapsed(group.id)}
              className="w-full px-3.5 py-2.5 bg-secondary/55 hover:bg-secondary/85 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-[-2px]"
            >
              <span
                className={`text-sm font-semibold tracking-tight transition-colors ${
                  isGroupDone
                    ? "text-muted-foreground line-through"
                    : "text-foreground"
                }`}
              >
                {group.title}
              </span>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-mono tabular-nums px-2 py-0.5 rounded-full border transition-colors ${
                    isGroupDone
                      ? "bg-primary/15 text-primary-dark dark:text-primary border-primary/30 font-semibold"
                      : "bg-card/80 text-muted-foreground border-border/70"
                  }`}
                >
                  {isGroupDone ? (
                    <>
                      <Check className="w-3 h-3" strokeWidth={3} />
                      <span>Done</span>
                    </>
                  ) : (
                    <span>
                      {doneCount} / {group.items.length}
                    </span>
                  )}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-muted-foreground transition-transform duration-200 print:hidden ${
                    isCollapsed ? "-rotate-90" : ""
                  }`}
                />
              </div>
            </button>

            {/* Collapsible Ingredient Rows */}
            <AnimatePresence initial={false}>
              {!isCollapsed && (
                <motion.div
                  id={panelId}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden border-t border-border/70 bg-card/40 print:!h-auto print:!opacity-100"
                >
                  <ul className="divide-y divide-border/60">
                    {group.items.map((item) => {
                      const isCompleted = completedIngredients.has(item.originalIdx);
                      const label = formatDisplayName
                        ? formatDisplayName(item.displayName)
                        : item.displayName;
                      const formattedQty = formatAmount(item.ingredient.amount);
                      const qtyText = [formattedQty, item.ingredient.unit]
                        .filter(Boolean)
                        .join(" ");

                      return (
                        <li key={item.originalIdx}>
                          <button
                            type="button"
                            aria-pressed={isCompleted}
                            onClick={() => onToggleIngredient(item.originalIdx)}
                            className={`w-full flex items-center justify-between gap-3 ${
                              compact ? "px-3.5 py-2.5" : "px-3.5 py-2.5"
                            } text-left group hover:bg-secondary/45 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-[-2px]`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span
                                className={`w-4 h-4 rounded-full shrink-0 flex items-center justify-center border transition-colors ${
                                  isCompleted
                                    ? "bg-primary border-primary text-primary-foreground"
                                    : "border-neutral-300 dark:border-neutral-600 group-hover:border-foreground"
                                }`}
                              >
                                {isCompleted && (
                                  <Check className="w-2.5 h-2.5" strokeWidth={3.5} />
                                )}
                              </span>
                              <span
                                className={`text-sm leading-snug transition-colors ${
                                  isCompleted
                                    ? "line-through text-muted-foreground/60"
                                    : "text-foreground"
                                }`}
                              >
                                {label}
                              </span>
                            </div>

                            {qtyText && (
                              <span
                                className={`font-mono text-xs font-semibold tabular-nums text-right shrink-0 ${
                                  isCompleted
                                    ? "text-muted-foreground/50"
                                    : "text-foreground/85"
                                }`}
                              >
                                {qtyText}
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        );
      })}
    </div>
  );
}
