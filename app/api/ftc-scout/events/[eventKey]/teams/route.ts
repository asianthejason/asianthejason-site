// app/api/ftcscout/[...path]/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteParams = {
  params: { path: string[] };
};

function safeJoinPath(parts: string[]): string {
  // Remove empty segments and block traversal attempts
  const cleaned = (parts || []).filter(Boolean).map((p) => p.replace(/^\/+|\/+$/g, ""));
  for (const seg of cleaned) {
    if (seg.includes("..")) {
      throw new Error("Invalid path segment");
    }
  }
  return cleaned.join("/");
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const remotePath = safeJoinPath(params.path);
    const url = new URL(req.url);
    const remoteUrl = `https://api.ftcscout.org/${remotePath}${url.search}`;

    const res = await fetch(remoteUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        // Some public APIs are picky about UA; harmless to include.
        "User-Agent": "asianthejason-site/ftcscout-proxy",
      },
      // Avoid caching surprises during development
      cache: "no-store",
    });

    const contentType = res.headers.get("content-type") || "";

    // If JSON, pass through as JSON
    if (contentType.includes("application/json")) {
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

    // Otherwise, pass through as text
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: { "content-type": contentType || "text/plain; charset=utf-8" },
    });
  } catch (err: any) {
    console.error("FTCScout proxy error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? "FTCScout proxy failed" },
      { status: 500 }
    );
  }
}
