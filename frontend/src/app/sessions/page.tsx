"use client";

import { useSessions } from "@/hooks/useSessions";
import { SessionList } from "@/components/sessions/SessionList";
import { motion } from "motion/react";

export default function SessionsPage() {
  const { sessions, loading, deleteSession } = useSessions();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-[var(--text-primary)] font-[family-name:var(--font-display)]">
          Research History
        </h1>
        <p className="text-[var(--text-secondary)] mt-2">
          Your saved historical research sessions.
        </p>
      </motion.div>

      <SessionList
        sessions={sessions}
        loading={loading}
        onDelete={deleteSession}
      />
    </div>
  );
}
