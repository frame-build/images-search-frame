/** biome-ignore-all lint/suspicious/noConsole: "Handy for debugging" */

import { put } from "@vercel/blob";
import { FatalError, getStepMetadata, RetryableError } from "workflow";

const MAX_UPLOAD_ATTEMPTS = 3;
const UPLOAD_RETRY_AFTER = "1m" as const;

type SerializableFile = {
  buffer: ArrayBuffer;
  name: string;
  pathname?: string;
  type: string;
  size: number;
  addRandomSuffix?: boolean;
  allowOverwrite?: boolean;
  metadata?: Record<string, unknown>;
};

function classifyUploadError(message: string) {
  if (
    message.includes("rate limit") ||
    message.includes("429") ||
    message.includes("quota")
  ) {
    return { kind: "retryable" as const, message };
  }

  if (message.includes("quota exceeded") || message.includes("storage full")) {
    return {
      kind: "fatal" as const,
      message: `Storage quota exceeded: ${message}`,
    };
  }

  if (
    message.includes("invalid file") ||
    message.includes("unsupported") ||
    message.includes("400")
  ) {
    return {
      kind: "fatal" as const,
      message: `Invalid file type or format: ${message}`,
    };
  }

  return { kind: "unknown" as const, message };
}

export const uploadImage = async (fileData: SerializableFile) => {
  "use step";

  const { attempt, stepStartedAt, stepId } = getStepMetadata();

  console.log(
    `[${stepId}] Uploading image (attempt ${attempt})...`,
    fileData.name
  );

  try {
    const pathname = fileData.pathname ?? fileData.name;
    const blob = await put(pathname, fileData.buffer, {
      access: "public",
      addRandomSuffix: fileData.addRandomSuffix ?? true,
      allowOverwrite: fileData.allowOverwrite ?? false,
      contentType: fileData.type,
    });

    console.log(
      `[${stepId}] Successfully uploaded image ${fileData.name} at ${stepStartedAt.toISOString()}`,
      blob.url
    );

    return blob;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const classification = classifyUploadError(message);

    if (classification.kind === "retryable") {
      throw new RetryableError(
        `Blob storage rate limited: ${classification.message}`,
        { retryAfter: UPLOAD_RETRY_AFTER }
      );
    }

    if (classification.kind === "fatal") {
      throw new FatalError(`[${stepId}] ${classification.message}`);
    }

    // After MAX_UPLOAD_ATTEMPTS attempts for upload operations, give up
    if (attempt >= MAX_UPLOAD_ATTEMPTS) {
      throw new FatalError(
        `[${stepId}] Failed to upload image after ${attempt} attempts as of ${stepStartedAt.toISOString()}: ${message}`
      );
    }

    // Otherwise, retry
    throw new Error(`Image upload failed: ${message}`);
  }
};

uploadImage.maxRetries = MAX_UPLOAD_ATTEMPTS;
