import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Server-side handler — process.env.NEXT_PUBLIC_API_URL is the live backend URL
// injected by Cloud Run, not a build-time placeholder. This bypasses the
// next.config.ts rewrite() proxy which can buffer SSE chunks before flushing.
export async function POST(req: NextRequest) {
  const backendUrl =
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

  const forwardHeaders = new Headers({
    "Content-Type": "application/json",
  });

  const auth = req.headers.get("Authorization");
  if (auth) forwardHeaders.set("Authorization", auth);

  const body = await req.text();

  const backendRes = await fetch(`${backendUrl}/api/query`, {
    method: "POST",
    headers: forwardHeaders,
    body,
    cache: "no-store",
  });

  if (!backendRes.ok || !backendRes.body) {
    const text = await backendRes.text().catch(() => "");
    return new Response(text, { status: backendRes.status });
  }

  return new Response(backendRes.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      "Connection": "keep-alive",
    },
  });
}
