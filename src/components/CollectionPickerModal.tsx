import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Bookmark, Plus, Check, FolderHeart } from "lucide-react";
import { Recipe, RecipeCollection } from "../types";
import { useBodyScrollLock } from "../hooks/useBodyScrollLock";

interface CollectionPickerModalProps {
  recipe: Recipe | null;
  collections: RecipeCollection[];
  onClose: () => void;
  onToggleRecipeInCollection: (collectionId: string, recipeId: string) => Promise<void> | void;
  onCreateCollection: (name: string, initialRecipeId?: string) => Promise<void> | void;
}

export default function CollectionPickerModal({
  recipe,
  collections,
  onClose,
  onToggleRecipeInCollection,
  onCreateCollection,
}: CollectionPickerModalProps) {
  const [newName, setNewName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  useBodyScrollLock(Boolean(recipe && recipe.id));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed || !recipe?.id) return;
    setIsCreating(true);
    try {
      await onCreateCollection(trimmed, recipe.id);
      setNewName("");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <AnimatePresence>
      {recipe && recipe.id && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-sm rounded-2xl bg-card border border-border shadow-2xl z-10 overflow-hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Save to collection"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-foreground tracking-tight">
                  Save to Collection
                </h3>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {recipe.title}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer shrink-0"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Existing Collections List */}
            <div className="max-h-64 overflow-y-auto p-3 space-y-1">
              {collections.length === 0 ? (
                <div className="py-7 px-3 text-center space-y-1.5">
                  <FolderHeart className="w-7 h-7 text-muted-foreground/40 mx-auto" />
                  <p className="text-xs font-medium text-foreground">No collections yet</p>
                  <p className="text-[11px] text-muted-foreground">
                    Create one below — like &ldquo;Dinner Party&rdquo; or &ldquo;Weekend Ideas&rdquo;.
                  </p>
                </div>
              ) : (
                collections.map((col) => {
                  const isSaved = col.recipeIds.includes(recipe.id!);
                  return (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => onToggleRecipeInCollection(col.id, recipe.id!)}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                        isSaved
                          ? "bg-secondary text-foreground"
                          : "hover:bg-secondary/60 text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center border shrink-0 transition-colors ${
                            isSaved
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-neutral-300 dark:border-neutral-600"
                          }`}
                        >
                          {isSaved && <Check className="w-3 h-3" strokeWidth={3} />}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{col.name}</p>
                          <p className="text-[11px] text-muted-foreground tabular-nums">
                            {col.recipeIds.length}{" "}
                            {col.recipeIds.length === 1 ? "recipe" : "recipes"}
                          </p>
                        </div>
                      </div>
                      <Bookmark
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isSaved ? "fill-foreground text-foreground" : "text-muted-foreground/40"
                        }`}
                      />
                    </button>
                  );
                })
              )}
            </div>

            {/* Inline Create New Collection Form */}
            <form
              onSubmit={handleCreate}
              className="p-3.5 border-t border-border bg-secondary/40 flex items-center gap-2"
            >
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="New collection (e.g. Dinner Party)"
                maxLength={60}
                className="flex-1 h-9 px-3.5 rounded-full bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
              <button
                type="submit"
                disabled={!newName.trim() || isCreating}
                className="h-9 px-3.5 rounded-full bg-foreground text-background text-xs font-medium hover:opacity-85 disabled:opacity-40 transition-opacity flex items-center gap-1 shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-primary" strokeWidth={2.5} />
                <span>Create</span>
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
