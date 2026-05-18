"use client";

import { useState, useEffect } from "react";
import type { PresetPrompt } from "@/lib/types";
import { fetchPresets } from "@/lib/api";

export function usePresets() {
  const [presets, setPresets] = useState<PresetPrompt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchPresets()
      .then((data) => {
        if (!cancelled) setPresets(data);
      })
      .catch(() => {
        // Silently fail — presets are optional
        if (!cancelled) setPresets([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { presets, loading };
}
