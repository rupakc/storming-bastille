"use client";

import { motion } from "motion/react";
import {
  Swords,
  Crown,
  Coins,
  Users,
  Palette,
  Sparkles,
} from "lucide-react";
import { cn, categoryColor } from "@/lib/utils";
import type { PresetPrompt } from "@/lib/types";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  military: Swords,
  political: Crown,
  economic: Coins,
  social: Users,
  cultural: Palette,
};

// Fallback presets in case the API is down
const FALLBACK_PRESETS: PresetPrompt[] = [
  {
    id: "1",
    text: "What caused the French Revolution?",
    category: "political",
  },
  {
    id: "2",
    text: "How did the Silk Road shape world trade?",
    category: "economic",
  },
  {
    id: "3",
    text: "What led to the fall of the Berlin Wall?",
    category: "political",
  },
  {
    id: "4",
    text: "How did the Black Death change feudalism?",
    category: "social",
  },
  {
    id: "5",
    text: "What were the causes of World War I?",
    category: "military",
  },
  {
    id: "6",
    text: "How did the Renaissance begin in Italy?",
    category: "cultural",
  },
];

interface PresetPromptsProps {
  presets?: PresetPrompt[];
  onSelect: (text: string) => void;
}

export function PresetPrompts({ presets, onSelect }: PresetPromptsProps) {
  const items = presets && presets.length > 0 ? presets : FALLBACK_PRESETS;

  return (
    <div className="w-full max-w-2xl mx-auto mt-8">
      <p className="text-sm text-[var(--text-muted)] mb-3 px-1">
        Try one of these to get started:
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((preset, i) => {
          const colors = categoryColor(preset.category);
          const Icon = ICON_MAP[preset.category] || Sparkles;

          return (
            <motion.button
              key={preset.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.35 }}
              onClick={() => onSelect(preset.text)}
              className={cn(
                "group relative text-left p-4 rounded-xl border border-[var(--border-subtle)]",
                "bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)]",
                "shadow-sm hover:shadow-md transition-all duration-200",
                "hover:-translate-y-0.5 active:translate-y-0"
              )}
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "shrink-0 p-2 rounded-lg",
                    colors.bg,
                    colors.text
                  )}
                >
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--text-primary)] leading-snug line-clamp-2">
                    {preset.text}
                  </p>
                  <span
                    className={cn(
                      "inline-block mt-2 category-badge",
                      colors.bg,
                      colors.text
                    )}
                  >
                    {preset.category}
                  </span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
