"use client";

import Image from "next/image";
import { Trash2Icon } from "lucide-react";
import { useTransition } from "react";
import { toast } from "sonner";
import { deleteImage } from "@/app/actions/delete";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type PreviewProps = {
  url: string;
  priority?: boolean;
  pathname?: string;
  onDelete?: (pathname: string) => void;
};

export const Preview = ({ url, priority, pathname, onDelete }: PreviewProps) => {
  const [isDeleting, startTransition] = useTransition();
  const canDelete = Boolean(pathname && onDelete);

  const handleDelete = () => {
    if (!pathname) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteImage(pathname, url);
        onDelete?.(pathname);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to delete image";
        toast.error(message);
      }
    });
  };

  return (
    <div className="group relative mb-4 rounded-xl bg-card p-2 shadow-xl">
      <Image
        alt={url}
        className="rounded-md"
        height={630}
        priority={priority}
        sizes="630px"
        src={url}
        width={630}
      />

      {canDelete && (
        <AlertDialog>
          <div className="pointer-events-none absolute inset-2 grid place-items-center rounded-md bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <AlertDialogTrigger asChild>
              <Button
                className="pointer-events-auto rounded-full"
                size="icon"
                type="button"
                variant="destructive"
              >
                <Trash2Icon className="size-4" />
                <span className="sr-only">Delete image</span>
              </Button>
            </AlertDialogTrigger>
          </div>

          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete image?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the image from storage and remove it
                from search.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction disabled={isDeleting} onClick={handleDelete}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};
