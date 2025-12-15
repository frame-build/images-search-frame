import { BlobNotFoundError, head } from "@vercel/blob";
import { NextResponse } from "next/server";
import { start } from "workflow/api";

import type { AccPhoto } from "@/lib/acc-types";
import { getSession } from "@/lib/auth";

import { processImage } from "../process-image";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const ACC_PREFIX = "acc/";
const MAX_UPLOADS = 25;
const BYTES_PER_KIB = 1024;
const KIB_PER_MIB = 1024;
const MAX_MIB = 25;
const MAX_BYTES = MAX_MIB * KIB_PER_MIB * BYTES_PER_KIB;
const ALLOWED_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"];

type UploadStart = { id: string; runId: string };
type UploadError = { id: string; error: string };

type UploadRequestData = {
  photos: AccPhoto[];
  hubId: string;
  projectId: string;
};

type PhotoProcessResult =
  | { kind: "started"; started: UploadStart }
  | { kind: "skipped"; id: string }
  | { kind: "error"; error: UploadError };

async function getUploadedStatus(pathname: string) {
  try {
    await head(pathname);
    return { uploaded: true as const };
  } catch (err: unknown) {
    if (err instanceof BlobNotFoundError) {
      return { uploaded: false as const };
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return { uploaded: false as const, error: message };
  }
}

type FetchRemoteImageResult =
  | { ok: true; arrayBuffer: ArrayBuffer; headerType: string }
  | { ok: false; error: string };

async function fetchRemoteImage(
  fileUrl: string
): Promise<FetchRemoteImageResult> {
  const remoteRes = await fetch(fileUrl, { cache: "no-store" });
  if (!remoteRes.ok) {
    return {
      ok: false,
      error: `Failed to fetch image (${remoteRes.status})`,
    };
  }

  const contentLength = Number(remoteRes.headers.get("content-length") ?? "");
  if (Number.isFinite(contentLength) && contentLength > MAX_BYTES) {
    return { ok: false, error: "Image exceeds size limit" };
  }

  const arrayBuffer = await remoteRes.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_BYTES) {
    return { ok: false, error: "Image exceeds size limit" };
  }

  const headerType = (remoteRes.headers.get("content-type") ?? "").split(
    ";"
  )[0];
  return { ok: true, arrayBuffer, headerType };
}

function resolveContentType(fileUrl: string, headerType: string) {
  return headerType || inferContentTypeFromUrl(fileUrl);
}

function isAllowedRemoteUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:") {
      return false;
    }
    const host = url.hostname.toLowerCase();
    return host.endsWith("amazonaws.com") || host.endsWith("autodesk.com");
  } catch {
    return false;
  }
}

function inferContentTypeFromUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    const pathname = url.pathname.toLowerCase();
    if (pathname.endsWith(".jpg") || pathname.endsWith(".jpeg")) {
      return "image/jpeg";
    }
    if (pathname.endsWith(".png")) {
      return "image/png";
    }
    if (pathname.endsWith(".webp")) {
      return "image/webp";
    }
  } catch {
    // ignore
  }
  return "";
}

function parseUploadRequest(body: unknown): {
  data?: UploadRequestData;
  error?: string;
} {
  if (!isRecord(body)) {
    return { error: "Invalid request body" };
  }

  const photosRaw = body.photos;
  if (!Array.isArray(photosRaw)) {
    return { error: "Invalid photos" };
  }

  const photos = photosRaw
    .slice(0, MAX_UPLOADS)
    .filter(
      (photo): photo is AccPhoto =>
        isRecord(photo) && typeof photo.id === "string"
    );

  if (photos.length === 0) {
    return { error: "No photos provided" };
  }

  const hubId = typeof body.hubId === "string" ? body.hubId : "";
  const projectId = typeof body.projectId === "string" ? body.projectId : "";

  return { data: { photos, hubId, projectId } };
}

async function processPhoto(
  photo: AccPhoto,
  hubId: string,
  projectId: string
): Promise<PhotoProcessResult> {
  const photoId = photo.id?.trim();
  if (!photoId) {
    return { kind: "error", error: { id: "", error: "Missing photo id" } };
  }

  const pathname = `${ACC_PREFIX}${photoId}`;

  const uploadedStatus = await getUploadedStatus(pathname);
  if (uploadedStatus.uploaded) {
    return { kind: "skipped", id: photoId };
  }
  if (uploadedStatus.error) {
    return {
      kind: "error",
      error: { id: photoId, error: uploadedStatus.error },
    };
  }

  const fileUrl = photo.fileUrl?.trim() ?? "";
  if (!fileUrl) {
    return { kind: "error", error: { id: photoId, error: "Missing fileUrl" } };
  }
  if (!isAllowedRemoteUrl(fileUrl)) {
    return { kind: "error", error: { id: photoId, error: "Invalid fileUrl" } };
  }

  try {
    const fetched = await fetchRemoteImage(fileUrl);
    if (!fetched.ok) {
      return { kind: "error", error: { id: photoId, error: fetched.error } };
    }

    const { arrayBuffer, headerType } = fetched;
    const inferredType = resolveContentType(fileUrl, headerType);
    if (!ALLOWED_CONTENT_TYPES.includes(inferredType)) {
      return {
        kind: "error",
        error: {
          id: photoId,
          error: `Unsupported content-type: ${inferredType || "unknown"}`,
        },
      };
    }

    const fileData = {
      buffer: arrayBuffer,
      name: photo.title?.trim() || photoId,
      pathname,
      type: inferredType,
      size: arrayBuffer.byteLength,
      addRandomSuffix: false,
      allowOverwrite: true,
      metadata: {
        source: "acc",
        acc: {
          id: photoId,
          title: photo.title,
          description: photo.description,
          takenAt: photo.takenAt,
          thumbnailUrl: photo.thumbnailUrl,
          hubId,
          projectId,
        },
      },
    };

    const result = await start(processImage, [fileData]);
    return { kind: "started", started: { id: photoId, runId: result.runId } };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { kind: "error", error: { id: photoId, error: message } };
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = parseUploadRequest(body);
  if (!parsed.data) {
    return NextResponse.json(
      { error: parsed.error ?? "Invalid request" },
      { status: 400 }
    );
  }

  const { photos, hubId, projectId } = parsed.data;

  const started: UploadStart[] = [];
  const skippedIds: string[] = [];
  const errors: UploadError[] = [];

  for (const photo of photos) {
    const result = await processPhoto(photo, hubId, projectId);
    if (result.kind === "started") {
      started.push(result.started);
    } else if (result.kind === "skipped") {
      skippedIds.push(result.id);
    } else {
      errors.push(result.error);
    }
  }

  return NextResponse.json({ started, skippedIds, errors });
}
