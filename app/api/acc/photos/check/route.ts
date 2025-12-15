import { list } from "@vercel/blob";
import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const ACC_PREFIX = "acc/";
const LIST_LIMIT = 1000;
const MAX_LIST_PAGES = 20;

function parsePhotoIds(body: unknown) {
  if (!isRecord(body)) {
    return null;
  }

  const photoIdsRaw = body.photoIds;
  if (!Array.isArray(photoIdsRaw)) {
    return null;
  }

  if (!photoIdsRaw.every((id) => typeof id === "string")) {
    return null;
  }

  const normalizedIds = [
    ...new Set(photoIdsRaw.map((id) => id.trim()).filter(Boolean)),
  ];
  return normalizedIds;
}

async function findUploadedIds(photoIds: string[]) {
  const wantedPathnames = new Set(photoIds.map((id) => `${ACC_PREFIX}${id}`));
  const uploadedIds: string[] = [];

  let cursor: string | undefined;
  let pages = 0;

  while (pages < MAX_LIST_PAGES && wantedPathnames.size > 0) {
    pages += 1;
    const res = await list({
      prefix: ACC_PREFIX,
      limit: LIST_LIMIT,
      cursor,
    });

    for (const blob of res.blobs) {
      if (!wantedPathnames.has(blob.pathname)) {
        continue;
      }
      wantedPathnames.delete(blob.pathname);
      uploadedIds.push(blob.pathname.slice(ACC_PREFIX.length));
    }

    if (!res.hasMore) {
      break;
    }
    cursor = res.cursor;
    if (!cursor) {
      break;
    }
  }

  return uploadedIds;
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  const photoIds = parsePhotoIds(body);
  if (!photoIds) {
    return NextResponse.json({ error: "Invalid photoIds" }, { status: 400 });
  }

  if (photoIds.length === 0) {
    return NextResponse.json({ uploadedIds: [] });
  }

  const uploadedIds = await findUploadedIds(photoIds);
  return NextResponse.json({ uploadedIds: uploadedIds ?? [] });
}
