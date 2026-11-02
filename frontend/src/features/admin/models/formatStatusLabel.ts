/** Format API status values consistently with the Employee section. */
export function formatStatusLabel(value: string | null | undefined): string {
  if (!value?.trim()) return "-";

  return value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}
