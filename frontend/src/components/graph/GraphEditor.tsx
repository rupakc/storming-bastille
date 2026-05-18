"use client";

import { useState, useEffect } from "react";
import { X, Trash2, Save } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn, categoryColor } from "@/lib/utils";
import type { EventData, EdgeData } from "@/lib/types";
import type { FlowNode, FlowEdge } from "@/hooks/useGraph";

interface GraphEditorProps {
  selectedNode: FlowNode | null;
  selectedEdge: FlowEdge | null;
  onClose: () => void;
  onUpdateNode: (id: string, data: Partial<EventData>) => void;
  onUpdateEdge: (id: string, data: Partial<EdgeData>) => void;
  onDeleteNode: (id: string) => void;
  onDeleteEdge: (id: string) => void;
}

export function GraphEditor({
  selectedNode,
  selectedEdge,
  onClose,
  onUpdateNode,
  onUpdateEdge,
  onDeleteNode,
  onDeleteEdge,
}: GraphEditorProps) {
  const isOpen = !!(selectedNode || selectedEdge);

  // Node editing state
  const [nodeTitle, setNodeTitle] = useState("");
  const [nodeDate, setNodeDate] = useState("");
  const [nodeDesc, setNodeDesc] = useState("");
  const [nodeCategory, setNodeCategory] = useState("");

  // Edge editing state
  const [edgeLabel, setEdgeLabel] = useState("");
  const [edgeType, setEdgeType] = useState("");

  useEffect(() => {
    if (selectedNode) {
      const d = selectedNode.data as unknown as EventData;
      setNodeTitle(d.title || "");
      setNodeDate(d.date || "");
      setNodeDesc(d.description || "");
      setNodeCategory(d.category || "");
    }
  }, [selectedNode]);

  useEffect(() => {
    if (selectedEdge) {
      const d = selectedEdge.data as unknown as EdgeData;
      setEdgeLabel(d?.label || "");
      setEdgeType(d?.type || "");
    }
  }, [selectedEdge]);

  const handleSaveNode = () => {
    if (!selectedNode) return;
    onUpdateNode(selectedNode.id, {
      title: nodeTitle,
      date: nodeDate,
      description: nodeDesc,
      category: nodeCategory as EventData["category"],
    });
    onClose();
  };

  const handleSaveEdge = () => {
    if (!selectedEdge) return;
    onUpdateEdge(selectedEdge.id, {
      label: edgeLabel,
      type: edgeType as EdgeData["type"],
    });
    onClose();
  };

  const inputClass =
    "w-full px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] transition-colors";

  const labelClass = "block text-xs font-medium text-[var(--text-muted)] mb-1.5";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="absolute top-0 right-0 z-20 w-72 h-full bg-[var(--bg-card)] border-l border-[var(--border-color)] shadow-xl overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              {selectedNode ? "Edit Event" : "Edit Connection"}
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Node editor */}
            {selectedNode && (
              <>
                <div>
                  <label className={labelClass}>Title</label>
                  <input
                    type="text"
                    value={nodeTitle}
                    onChange={(e) => setNodeTitle(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Date</label>
                  <input
                    type="text"
                    value={nodeDate}
                    onChange={(e) => setNodeDate(e.target.value)}
                    placeholder="e.g. 1789-07-14"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Category</label>
                  <select
                    value={nodeCategory}
                    onChange={(e) => setNodeCategory(e.target.value)}
                    className={inputClass}
                  >
                    <option value="political">Political</option>
                    <option value="economic">Economic</option>
                    <option value="social">Social</option>
                    <option value="military">Military</option>
                    <option value="cultural">Cultural</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Description</label>
                  <textarea
                    value={nodeDesc}
                    onChange={(e) => setNodeDesc(e.target.value)}
                    rows={4}
                    className={cn(inputClass, "resize-none")}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSaveNode}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium transition-colors"
                  >
                    <Save size={14} />
                    Save
                  </button>
                  <button
                    onClick={() => {
                      onDeleteNode(selectedNode.id);
                      onClose();
                    }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-medium transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </>
            )}

            {/* Edge editor */}
            {selectedEdge && (
              <>
                <div>
                  <label className={labelClass}>Label</label>
                  <input
                    type="text"
                    value={edgeLabel}
                    onChange={(e) => setEdgeLabel(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Relationship Type</label>
                  <select
                    value={edgeType}
                    onChange={(e) => setEdgeType(e.target.value)}
                    className={inputClass}
                  >
                    <option value="direct">Direct cause</option>
                    <option value="contributing">Contributing factor</option>
                    <option value="enabling">Enabling condition</option>
                    <option value="preventing">Preventing/opposing</option>
                    <option value="consequence">Consequence</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSaveEdge}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium transition-colors"
                  >
                    <Save size={14} />
                    Save
                  </button>
                  <button
                    onClick={() => {
                      onDeleteEdge(selectedEdge.id);
                      onClose();
                    }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-500 text-sm font-medium transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
