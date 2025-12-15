"use client";

import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
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
  const [error, setError] = useState<string | null>(null);

  const close = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("import");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (!open) return;

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
    if (!open) return;
    if (!hubId) return;

    setError(null);
    setProjects([]);
    setPhotos([]);
    setProjectId("");

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
    if (!open) return;
    if (!projectId) return;

    setError(null);
    setPhotos([]);

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

  const isBusy = useMemo(
    () => loadingHubs || loadingProjects || loadingPhotos,
    [loadingHubs, loadingPhotos, loadingProjects]
  );

  const formatTakenAt = useCallback((takenAt: string) => {
    const date = new Date(takenAt);
    if (Number.isNaN(date.valueOf())) return null;
    return date.toLocaleString();
  }, []);

  const projectPlaceholder = useMemo(() => {
    if (!hubId) return "Select a hub first";
    if (loadingProjects) return "Loading projects…";
    return "Select a project";
  }, [hubId, loadingProjects]);

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
        {photos.map((photo) => (
          <div className="overflow-hidden rounded-lg border" key={photo.id}>
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
          </div>
        ))}
      </div>
    );
  }

  return (
    <Dialog
      onOpenChange={(nextOpen) => {
        if (!nextOpen) close();
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

          <ScrollArea className="h-[60vh] rounded-md border p-3">
            {photosContent}
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button disabled={isBusy} onClick={close} variant="outline">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
