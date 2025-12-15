"use client";

import { CheckCircle2Icon, CheckIcon } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import type { AccHub, AccPhoto, AccProject } from "@/lib/acc-types";

type Props = {
  open: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      isRecord(data) && typeof data.error === "string"
        ? data.error
        : "Request failed";
    throw new Error(message);
  }
  return data as T;
}

async function postJson<T>(
  url: string,
  body: unknown,
  options?: { signal?: AbortSignal }
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: options?.signal,
  });
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      isRecord(data) && typeof data.error === "string"
        ? data.error
        : "Request failed";
    throw new Error(message);
  }
  return data as T;
}

function buildUploadSummary(
  started: number,
  skipped: number,
  failed: number
): string {
  const parts: string[] = [];
  parts.push(`Started ${started} upload${started === 1 ? "" : "s"}`);
  if (skipped > 0) {
    parts.push(`${skipped} skipped`);
  }
  if (failed > 0) {
    parts.push(`${failed} failed`);
  }
  return `${parts.join(" • ")}.`;
}

export function ImportPhotosDialog({ open }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [hubs, setHubs] = useState<AccHub[]>([]);
  const [projects, setProjects] = useState<AccProject[]>([]);
  const [photos, setPhotos] = useState<AccPhoto[]>([]);

  const [hubId, setHubId] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");

  const [loadingHubs, setLoadingHubs] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [loadingUploaded, setLoadingUploaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(
    () => new Set()
  );
  const [uploadedPhotoIds, setUploadedPhotoIds] = useState<Set<string>>(
    () => new Set()
  );

  const close = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("import");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setError(null);
    setLoadingHubs(true);
    getJson<{ hubs: AccHub[] }>("/api/acc/hubs")
      .then((data) => setHubs(data.hubs ?? []))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load hubs")
      )
      .finally(() => setLoadingHubs(false));
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (!hubId) {
      return;
    }

    setError(null);
    setProjects([]);
    setPhotos([]);
    setProjectId("");
    setSelectedPhotos(new Set());
    setUploadedPhotoIds(new Set());

    setLoadingProjects(true);
    getJson<{ projects: AccProject[] }>(
      `/api/acc/projects?hubId=${encodeURIComponent(hubId)}`
    )
      .then((data) => setProjects(data.projects ?? []))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load projects")
      )
      .finally(() => setLoadingProjects(false));
  }, [hubId, open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (!projectId) {
      return;
    }

    setError(null);
    setPhotos([]);
    setSelectedPhotos(new Set());
    setUploadedPhotoIds(new Set());

    setLoadingPhotos(true);
    getJson<{ photos: AccPhoto[] }>(
      `/api/acc/photos?projectId=${encodeURIComponent(projectId)}`
    )
      .then((data) => setPhotos(data.photos ?? []))
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load photos")
      )
      .finally(() => setLoadingPhotos(false));
  }, [open, projectId]);

  useEffect(() => {
    if (!open) {
      return;
    }
    if (!projectId) {
      return;
    }
    if (photos.length === 0) {
      setUploadedPhotoIds(new Set());
      return;
    }

    const controller = new AbortController();
    const photoIds = photos.map((photo) => photo.id).filter(Boolean);
    if (photoIds.length === 0) {
      return;
    }

    setLoadingUploaded(true);
    postJson<{ uploadedIds: string[] }>(
      "/api/acc/photos/check",
      { photoIds },
      { signal: controller.signal }
    )
      .then((data) => {
        const nextUploaded = new Set(data.uploadedIds ?? []);
        setUploadedPhotoIds(nextUploaded);
        setSelectedPhotos((prev) => {
          if (prev.size === 0) {
            return prev;
          }
          const next = new Set(prev);
          for (const id of nextUploaded) {
            next.delete(id);
          }
          return next;
        });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setError(
          err instanceof Error ? err.message : "Failed to check uploads"
        );
      })
      .finally(() => {
        if (controller.signal.aborted) {
          return;
        }
        setLoadingUploaded(false);
      });

    return () => controller.abort();
  }, [open, photos, projectId]);

  const isBusy = useMemo(
    () => loadingHubs || loadingProjects || loadingPhotos || loadingUploaded,
    [loadingHubs, loadingPhotos, loadingProjects, loadingUploaded]
  );

  const formatTakenAt = useCallback((takenAt: string) => {
    const date = new Date(takenAt);
    if (Number.isNaN(date.valueOf())) {
      return null;
    }
    return date.toLocaleString();
  }, []);

  const projectPlaceholder = useMemo(() => {
    if (!hubId) {
      return "Select a hub first";
    }
    if (loadingProjects) {
      return "Loading projects…";
    }
    return "Select a project";
  }, [hubId, loadingProjects]);

  const selectedCount = selectedPhotos.size;

  const selectablePhotoIds = useMemo(() => {
    const ids: string[] = [];
    for (const photo of photos) {
      if (!photo.id) {
        continue;
      }
      if (uploadedPhotoIds.has(photo.id)) {
        continue;
      }
      ids.push(photo.id);
    }
    return ids;
  }, [photos, uploadedPhotoIds]);

  const togglePhoto = useCallback(
    (photoId: string) => {
      if (!photoId) {
        return;
      }
      if (uploadedPhotoIds.has(photoId)) {
        return;
      }
      setSelectedPhotos((prev) => {
        const next = new Set(prev);
        if (next.has(photoId)) {
          next.delete(photoId);
        } else {
          next.add(photoId);
        }
        return next;
      });
    },
    [uploadedPhotoIds]
  );

  const selectAll = useCallback(() => {
    setSelectedPhotos(new Set(selectablePhotoIds));
  }, [selectablePhotoIds]);

  const deselectAll = useCallback(() => {
    setSelectedPhotos(new Set());
  }, []);

  const uploadSelected = useCallback(async () => {
    if (!projectId) {
      return;
    }

    const photosToUpload = photos.filter(
      (photo) => photo.id && selectedPhotos.has(photo.id)
    );
    if (photosToUpload.length === 0) {
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const data = await postJson<{
        started?: Array<{ id: string; runId: string }>;
        skippedIds?: string[];
        errors?: Array<{ id: string; error: string }>;
      }>("/api/upload/from-acc", { photos: photosToUpload, hubId, projectId });

      const startedIds = (data.started ?? []).map((item) => item.id);
      if (startedIds.length > 0) {
        setUploadedPhotoIds((prev) => new Set([...prev, ...startedIds]));
      }
      setSelectedPhotos(new Set());

      const skipped = data.skippedIds?.length ?? 0;
      const failed = data.errors?.length ?? 0;
      toast.success(buildUploadSummary(startedIds.length, skipped, failed));
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to start uploads";
      setError(message);
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }, [hubId, photos, projectId, selectedPhotos]);

  let photosContent: ReactNode;
  if (loadingPhotos) {
    photosContent = (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground text-sm">
        <Spinner />
        Loading photos…
      </div>
    );
  } else if (!projectId) {
    photosContent = (
      <div className="py-16 text-center text-muted-foreground text-sm">
        Select a hub and project to see photos.
      </div>
    );
  } else if (photos.length === 0) {
    photosContent = (
      <div className="py-16 text-center text-muted-foreground text-sm">
        No photos found for this project.
      </div>
    );
  } else {
    photosContent = (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo) => {
          const isUploaded = uploadedPhotoIds.has(photo.id);
          const isSelected = selectedPhotos.has(photo.id);
          let overlay: ReactNode = null;
          if (isUploaded) {
            overlay = (
              <div className="absolute inset-0 grid place-items-center bg-background/70">
                <div className="flex items-center gap-2 rounded-full border bg-background/80 px-3 py-1 text-sm">
                  <CheckCircle2Icon className="size-4 text-emerald-600" />
                  Uploaded
                </div>
              </div>
            );
          } else if (isSelected) {
            overlay = (
              <div className="absolute top-2 right-2 grid size-7 place-items-center rounded-full bg-primary text-primary-foreground shadow">
                <CheckIcon className="size-4" />
              </div>
            );
          }
          return (
            <button
              className="overflow-hidden rounded-lg border text-left disabled:cursor-not-allowed disabled:opacity-75"
              disabled={isUploaded}
              key={photo.id}
              onClick={() => togglePhoto(photo.id)}
              type="button"
            >
              <div className="relative aspect-square bg-muted">
                {photo.thumbnailUrl ? (
                  <Image
                    alt={photo.title || "ACC photo"}
                    className="object-cover"
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                    src={photo.thumbnailUrl}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground text-xs">
                    No thumbnail
                  </div>
                )}
                {overlay}
              </div>
              <div className="grid gap-1 p-2">
                <div className="line-clamp-1 font-medium text-sm">
                  {photo.title || "Untitled"}
                </div>
                {photo.takenAt && (
                  <div className="text-muted-foreground text-xs">
                    {formatTakenAt(photo.takenAt)}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          close();
        }
      }}
      open={open}
    >
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Import Photos from ACC</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <div className="font-medium text-sm">Hub</div>
              <Select
                disabled={loadingHubs || hubs.length === 0}
                onValueChange={setHubId}
                value={hubId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={loadingHubs ? "Loading hubs…" : "Select a hub"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {hubs.map((hub) => (
                    <SelectItem key={hub.id} value={hub.id}>
                      {hub.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <div className="font-medium text-sm">Project</div>
              <Select
                disabled={!hubId || loadingProjects || projects.length === 0}
                onValueChange={setProjectId}
                value={projectId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={projectPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {error && (
            <div className="text-destructive text-sm" role="alert">
              {error}
            </div>
          )}

          {photos.length > 0 && projectId && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-muted-foreground text-sm">
                {loadingUploaded
                  ? "Checking uploaded photos…"
                  : `${selectedCount} selected`}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={isBusy || selectablePhotoIds.length === 0}
                  onClick={selectAll}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Select All
                </Button>
                <Button
                  disabled={isBusy || selectedCount === 0}
                  onClick={deselectAll}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Deselect All
                </Button>
              </div>
            </div>
          )}

          <ScrollArea className="h-[60vh] rounded-md border p-3">
            {photosContent}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button disabled={isBusy} onClick={close} variant="outline">
            Close
          </Button>
          <Button
            disabled={isBusy || uploading || selectedCount === 0}
            onClick={uploadSelected}
            type="button"
          >
            {uploading ? (
              <>
                <Spinner className="mr-2" />
                Uploading…
              </>
            ) : (
              "Upload Selected"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
