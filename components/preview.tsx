"use client";

import Image from "next/image";
import { Maximize2Icon, Trash2Icon } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
    <div className="group relative rounded-xl bg-card p-2 shadow-xl">
      <Image
        alt={url}
        className="block h-auto w-full rounded-md"
        height={630}
        priority={priority}
        sizes="630px"
        src={url}
        width={630}
      />

      <div className="pointer-events-none absolute inset-2 flex items-center justify-center gap-2 rounded-md bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
        <Dialog>
          <DialogTrigger asChild>
            <Button
              className="pointer-events-auto rounded-full"
              size="icon"
              type="button"
              variant="secondary"
            >
              <Maximize2Icon className="size-4" />
              <span className="sr-only">Expand image</span>
            </Button>
          </DialogTrigger>

          <DialogContent
            className="fixed inset-0 left-0 top-0 h-screen w-screen max-w-none translate-x-0 translate-y-0 gap-0 rounded-none border-0 bg-black p-0 text-white sm:max-w-none"
          >
            <DialogTitle className="sr-only">Expanded image</DialogTitle>
            <div className="relative h-screen w-screen">
              <Image
                alt={url}
                className="object-contain"
                fill
                priority={priority}
                sizes="100vw"
                src={url}
              />
            </div>
          </DialogContent>
        </Dialog>

        {canDelete && (
          <AlertDialog>
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

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete image?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the image from storage and remove
                  it from search.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeleting}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction disabled={isDeleting} onClick={handleDelete}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
};
