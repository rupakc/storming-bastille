"use client";

import { useState, useCallback } from "react";
import { Bookmark, X, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useSessions } from "@/hooks/useSessions";

interface SaveDialogProps {
  queryId: string;
}

export function SaveDialog({ queryId }: SaveDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { saveCurrentSession } = useSessions();

  const handleSave = useCallback(async () => {
    if (!title.trim()) return;
    setSaving(true);
    const result = await saveCurrentSession(title.trim(), queryId);
    setSaving(false);
    if (result) {
      setSaved(true);
      setTimeout(() => {
        setIsOpen(false);
        setSaved(false);
        setTitle("");
      }, 1500);
    }
  }, [title, queryId, saveCurrentSession]);

  if (saved) {
    return (
      <div className="flex items-center gap-2 text-sm text-[var(--color-cat-economic)]">
        <Check size={16} />
        Session saved!
      </div>
    );
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
      >
        <Bookmark size={14} />
        Save this session
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIsOpen(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 400 }}
              className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-[var(--text-primary)] font-[family-name:var(--font-display)]">
                  Save Session
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mb-5">
                <label className="block text-sm text-[var(--text-secondary)] mb-2">
                  Session title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. French Revolution causes"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!title.trim() || saving}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
                >
                  {saving ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Bookmark size={14} />
                  )}
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
