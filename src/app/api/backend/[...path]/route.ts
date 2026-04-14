import { NextResponse } from "next/server";

function joinUrl(base: string, path: string): string {
  const b = base.replace(/\/+$/, "");
  const p = path.replace(/^\/+/, "");
  return `${b}/${p}`;
}

function isAdminPath(path: string): boolean {
  return (
    path.startsWith("api/v1/operators") ||
    path.startsWith("api/v1/analytics") ||
    path.startsWith("api/v1/bookings") ||
    path.startsWith("api/v1/flagged-bookings")
  );
}

async function proxy(req: Request, pathParts: string[]) {
  const backendOrigin = process.env.BACKEND_ORIGIN;
  if (!backendOrigin) {
    return NextResponse.json(
      { error: "BACKEND_ORIGIN not set" },
      { status: 500 },
    );
  }

  const adminKey = process.env.ADMIN_API_KEY ?? "";
  const path = pathParts.join("/");
  const url = new URL(req.url);
  const targetUrl = new URL(joinUrl(backendOrigin, path));
  targetUrl.search = url.search;

  const headers = new Headers(req.headers);
  headers.delete("host");

  if (isAdminPath(path)) {
    if (!adminKey) {
      return NextResponse.json(
        { error: "ADMIN_API_KEY not set" },
        { status: 500 },
      );
    }
    headers.set("x-admin-key", adminKey);
  }

  let body: ArrayBuffer | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    body = await req.arrayBuffer();
  }

  const res = await fetch(targetUrl, {
    method: req.method,
    headers,
    body,
    redirect: "manual",
  });

  const resHeaders = new Headers(res.headers);
  // Avoid leaking hop-by-hop headers and let Next manage encoding.
  resHeaders.delete("content-encoding");
  resHeaders.delete("transfer-encoding");
  resHeaders.delete("connection");

  return new NextResponse(res.body, {
    status: res.status,
    headers: resHeaders,
  });
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxy(req, path);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxy(req, path);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxy(req, path);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxy(req, path);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  return proxy(req, path);
}

