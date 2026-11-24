export function formatTime(minutes: number | undefined): string {
  if (!minutes || minutes <= 0) return "0 min";
  const hours = Math.floor(minutes / 60);
  const remainingMins = Math.round(minutes % 60);

  if (hours > 0) {
    return `${hours} hr${remainingMins > 0 ? ` ${remainingMins} min` : ""}`;
  }
  return `${remainingMins} min`;
}

export function getMealTypeColor(type: string | undefined): string {
  switch (type) {
    case "Starter":
      return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 border border-red-200 dark:border-red-800/70";
    case "Main":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800/70";
    case "Side":
      return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 border border-green-200 dark:border-green-800/70";
    case "Drink":
      return "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400 border border-orange-200 dark:border-orange-800/70";
    case "Dessert":
      return "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400 border border-purple-200 dark:border-purple-800/70";
    case "Snack":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/70";
    default:
      return "border border-border text-muted-foreground bg-secondary";
  }
}

export function getMealTypeButtonColor(type: string | undefined, selected: boolean): string {
  if (!selected) {
    switch (type) {
      case "Starter":
        return "bg-red-100/80 text-red-700 border border-red-200/80 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800/50 dark:hover:bg-red-900/50";
      case "Main":
        return "bg-blue-100/80 text-blue-700 border border-blue-200/80 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50 dark:hover:bg-blue-900/50";
      case "Side":
        return "bg-green-100/80 text-green-700 border border-green-200/80 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50 dark:hover:bg-green-900/50";
      case "Drink":
        return "bg-orange-100/80 text-orange-700 border border-orange-200/80 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800/50 dark:hover:bg-orange-900/50";
      case "Dessert":
        return "bg-purple-100/80 text-purple-700 border border-purple-200/80 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800/50 dark:hover:bg-purple-900/50";
      case "Snack":
        return "bg-amber-100/80 text-amber-800 border border-amber-200/80 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800/50 dark:hover:bg-amber-900/50";
      default:
        return "bg-secondary text-muted-foreground border border-transparent hover:text-foreground";
    }
  }

  switch (type) {
    case "Starter":
      return "bg-red-600 text-white border border-red-600 dark:bg-red-500 dark:text-white dark:border-red-500 shadow-xs";
    case "Main":
      return "bg-blue-600 text-white border border-blue-600 dark:bg-blue-500 dark:text-white dark:border-blue-500 shadow-xs";
    case "Side":
      return "bg-green-600 text-white border border-green-600 dark:bg-green-500 dark:text-white dark:border-green-500 shadow-xs";
    case "Drink":
      return "bg-orange-600 text-white border border-orange-600 dark:bg-orange-500 dark:text-white dark:border-orange-500 shadow-xs";
    case "Dessert":
      return "bg-purple-600 text-white border border-purple-600 dark:bg-purple-500 dark:text-white dark:border-purple-500 shadow-xs";
    case "Snack":
      return "bg-amber-600 text-white border border-amber-600 dark:bg-amber-500 dark:text-neutral-950 dark:border-amber-500 shadow-xs";
    default:
      return "bg-foreground text-background border border-foreground";
  }
}
