// app/api/ftcscout/[...path]/route.ts
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Next.js (v16) types `context.params` as a Promise in strict mode.
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await context.params;

    // Basic sanitization to avoid traversal
    const cleaned = (path || [])
      .filter(Boolean)
      .map((p) => p.replace(/^\/+|\/+$/g, ""))
      .filter((p) => !p.includes(".."));

    const remotePath = cleaned.join("/");
    const url = new URL(req.url);

    // Proxy to FTCScout (same querystring)
    const remoteUrl = `https://api.ftcscout.org/${remotePath}${url.search}`;

    const res = await fetch(remoteUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
        // harmless, sometimes helps with overly strict upstreams
        "User-Agent": "asianthejason-site/ftcscout-proxy",
      },
      cache: "no-store",
    });

    const contentType = res.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

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
