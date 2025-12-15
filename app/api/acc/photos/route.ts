import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";

const APS_BASE_URL = "https://developer.api.autodesk.com";
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 50;
const MAX_PAGES = 10;

type PhotosResponse = {
  pagination?: {
    nextPost?: {
      url?: string;
      body?: unknown;
    };
  };
  results?: unknown[];
  data?: unknown[];
};

type FilterRequestBody = {
  cursorState?: string;
  filter?: Record<string, unknown>;
  include?: string[];
  limit?: number;
  sort?: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pickString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string") return value;
  }
  return "";
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
  }

  const limitParam = Number(url.searchParams.get("limit") ?? "");
  const limit =
    Number.isFinite(limitParam) && limitParam > 0 && limitParam <= MAX_LIMIT
      ? limitParam
      : DEFAULT_LIMIT;

  const tokenType = session.tokenType ?? "Bearer";
  const initialUrl = `${APS_BASE_URL}/construction/photos/v1/projects/${encodeURIComponent(projectId)}/photos:filter`;
  const initialBody: FilterRequestBody = {
    filter: {},
    include: ["signedUrls"],
    limit,
    sort: ["createdAt", "desc"],
  };

  const allResults: unknown[] = [];
  let nextUrl: string | null = initialUrl;
  let nextBody: unknown = initialBody;
  let pages = 0;

  while (nextUrl && pages < MAX_PAGES) {
    pages += 1;

    const res = await fetch(nextUrl, {
      method: "POST",
      headers: {
        Authorization: `${tokenType} ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(nextBody),
      cache: "no-store",
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        { error: "Failed to fetch photos", status: res.status, details: text },
        { status: res.status }
      );
    }

    const json = (await res.json()) as PhotosResponse;
    allResults.push(...(json.results ?? json.data ?? []));

    const post = json.pagination?.nextPost;
    const postUrl = typeof post?.url === "string" ? post.url : null;
    const postBody = post?.body;
    nextUrl = postUrl && postBody ? postUrl : null;
    nextBody = postBody;
  }

  const photos = allResults.map((raw) => {
    const photo = isRecord(raw) ? raw : {};
    const signedUrlsCandidate = photo.signedUrls ?? photo.signed_urls;
    const signedUrls = isRecord(signedUrlsCandidate) ? signedUrlsCandidate : {};
    const thumbnailUrl = pickString(signedUrls, [
      "thumbnailUrl",
      "thumbnail_url",
      "thumbnail",
    ]);
    const fileUrl = pickString(signedUrls, [
      "fileUrl",
      "file_url",
      "original",
      "full",
    ]);

    return {
      id: pickString(photo, ["id"]),
      title: pickString(photo, ["title", "name"]),
      description: pickString(photo, ["description"]),
      thumbnailUrl,
      fileUrl,
      takenAt: pickString(photo, ["takenAt", "taken_at", "createdAt"]),
    };
  });

  return NextResponse.json({ photos });
}
