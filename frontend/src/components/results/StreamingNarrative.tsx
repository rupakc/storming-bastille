"use client";

import { useRef, useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import { cn } from "@/lib/utils";

interface StreamingNarrativeProps {
  content: string;
  isStreaming: boolean;
}

function stripJsonBlock(text: string): string {
  // Remove complete ```json ... ``` blocks
  let cleaned = text.replace(/```json[\s\S]*?```/g, "").replace(/```\n?\{[\s\S]*?\n?```/g, "");
  // Remove truncated/incomplete JSON blocks (no closing ```)
  cleaned = cleaned.replace(/```json[\s\S]*$/g, "");
  // Remove any standalone JSON object that looks like event data
  cleaned = cleaned.replace(/\{\s*"events"\s*:\s*\[[\s\S]*$/g, "");
  return cleaned.trimEnd();
}

export function StreamingNarrative({
  content,
  isStreaming,
}: StreamingNarrativeProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [renderedContent, setRenderedContent] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const cleanContent = useMemo(() => stripJsonBlock(content), [content]);

  // Debounce markdown rendering during streaming to avoid re-parsing on every token
  // Render immediately when not streaming, debounce to 80ms batches while streaming
  useEffect(() => {
    if (!isStreaming) {
      setRenderedContent(cleanContent);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setRenderedContent(cleanContent);
    }, 80);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [cleanContent, isStreaming]);

  useEffect(() => {
    if (isStreaming && scrollRef.current) {
      const el = scrollRef.current;
      const isNearBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight < 150;
      if (isNearBottom) {
        el.scrollTop = el.scrollHeight;
      }
    }
  }, [renderedContent, isStreaming]);

  if (!cleanContent) {
    return (
      <div className="p-6 text-[var(--text-muted)] text-sm italic">
        The narrative analysis will stream here...
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-6 py-4 scroll-smooth"
    >
      <div
        className={cn(
          "narrative-prose text-[var(--text-primary)] text-[15px] leading-relaxed",
          isStreaming && "streaming-cursor"
        )}
      >
        <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
          {renderedContent}
        </ReactMarkdown>
      </div>
    </div>
  );
}
