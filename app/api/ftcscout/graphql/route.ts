import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Proxies FTCScout GraphQL requests server-side to avoid browser CORS issues.
 * Client calls: POST /api/ftcscout/graphql with JSON { query, variables, operationName? }
 * Upstream: https://api.ftcscout.org/graphql
 */
export async function POST(req: NextRequest) {
  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const query = body?.query;
  const variables = body?.variables;
  const operationName = body?.operationName;

  if (typeof query !== "string" || query.trim().length === 0) {
    return NextResponse.json(
      { error: "Missing GraphQL `query` string." },
      { status: 400 }
    );
  }

  const upstream = await fetch("https://api.ftcscout.org/graphql", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      // A helpful UA (some providers block empty UA)
      "user-agent": "asianthejason-site/ftcscout-proxy",
    },
    body: JSON.stringify({
      query,
      variables: variables ?? null,
      operationName: operationName ?? null,
    }),
    // Don't cache at the edge; FTCScout changes often.
    cache: "no-store",
  });

  const text = await upstream.text();
  // Pass through status and JSON (or text if somehow not JSON).
  const contentType = upstream.headers.get("content-type") || "application/json";

  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      "content-type": contentType,
      "cache-control": "no-store",
    },
  });
}

// Optional: simple health check
export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      usage:
        "POST JSON { query, variables? } to this endpoint to proxy FTCScout GraphQL.",
    },
    { status: 200 }
  );
}
