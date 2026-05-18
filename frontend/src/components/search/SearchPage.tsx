"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Logo } from "@/components/shared/Logo";
import { SearchBox } from "./SearchBox";
import { PresetPrompts } from "./PresetPrompts";
import { usePresets } from "@/hooks/usePresets";
import { generateId } from "@/lib/utils";

export function SearchPage() {
  const router = useRouter();
  const { presets } = usePresets();

  const handleSubmit = useCallback(
    (query: string) => {
      const id = generateId();
      // Encode query in URL params so the query page can read it
      const params = new URLSearchParams({ q: query });
      router.push(`/query/${id}?${params.toString()}`);
    },
    [router]
  );

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden">
      {/* Decorative background gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-[var(--color-gold-300)]/10 via-transparent to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-gradient-radial from-[var(--color-slate-blue-200)]/8 via-transparent to-transparent rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-2xl mx-auto flex flex-col items-center">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <div className="flex justify-center mb-4">
            <Logo size="large" />
          </div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="text-lg text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed"
          >
            Explore the causal chains behind history&rsquo;s pivotal moments.
            Ask a question and watch the connections unfold.
          </motion.p>
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="w-full"
        >
          <SearchBox onSubmit={handleSubmit} autoFocus />
        </motion.div>

        {/* Presets */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="w-full"
        >
          <PresetPrompts presets={presets} onSelect={handleSubmit} />
        </motion.div>
      </div>
    </div>
  );
}
