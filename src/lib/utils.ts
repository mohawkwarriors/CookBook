export function formatTime(minutes: number | undefined): string {
  if (!minutes || minutes <= 0) return "0 min";
  const hours = Math.floor(minutes / 60);
  const remainingMins = Math.round(minutes % 60);
  
  if (hours > 0) {
    return `${hours} hr${remainingMins > 0 ? ` ${remainingMins} min` : ''}`;
  }
  return `${remainingMins} min`;
}
