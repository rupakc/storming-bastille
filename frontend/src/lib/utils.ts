import clsx, { type ClassValue } from "clsx";

/**
 * Merge Tailwind classes with clsx.
 * (We skip tailwind-merge to avoid the extra dependency — clsx handles
 * conditional classes well enough for this project.)
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/**
 * Format a historical date string for display.
 * Handles partial dates like "1789", "1789-07", "1789-07-14", and full ISO strings.
 */
export function formatDate(dateStr: string): string {
  if (!dateStr) return "";

  // Year only
  if (/^\d{4}$/.test(dateStr)) return dateStr;

  // Year-month
  if (/^\d{4}-\d{2}$/.test(dateStr)) {
    const [year, month] = dateStr.split("-");
    const date = new Date(Number(year), Number(month) - 1);
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long" });
  }

  // Full date or ISO
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Generate a UUID v4.
 */
export function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Return a Tailwind text/bg color class for a given event category.
 */
export function categoryColor(
  category: string
): { text: string; bg: string; border: string; dot: string } {
  switch (category?.toLowerCase()) {
    case "political":
      return {
        text: "text-[var(--color-cat-political)]",
        bg: "bg-[var(--color-cat-political)]/15",
        border: "border-[var(--color-cat-political)]",
        dot: "bg-[var(--color-cat-political)]",
      };
    case "economic":
      return {
        text: "text-[var(--color-cat-economic)]",
        bg: "bg-[var(--color-cat-economic)]/15",
        border: "border-[var(--color-cat-economic)]",
        dot: "bg-[var(--color-cat-economic)]",
      };
    case "social":
      return {
        text: "text-[var(--color-cat-social)]",
        bg: "bg-[var(--color-cat-social)]/15",
        border: "border-[var(--color-cat-social)]",
        dot: "bg-[var(--color-cat-social)]",
      };
    case "military":
      return {
        text: "text-[var(--color-cat-military)]",
        bg: "bg-[var(--color-cat-military)]/15",
        border: "border-[var(--color-cat-military)]",
        dot: "bg-[var(--color-cat-military)]",
      };
    case "cultural":
      return {
        text: "text-[var(--color-cat-cultural)]",
        bg: "bg-[var(--color-cat-cultural)]/15",
        border: "border-[var(--color-cat-cultural)]",
        dot: "bg-[var(--color-cat-cultural)]",
      };
    default:
      return {
        text: "text-[var(--text-secondary)]",
        bg: "bg-[var(--bg-secondary)]",
        border: "border-[var(--border-color)]",
        dot: "bg-[var(--text-muted)]",
      };
  }
}
