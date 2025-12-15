"use client";

import { ImageUpIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "./ui/button";

export const ImportPhotosButton = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const openDialog = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("import", "true");
    router.push(`?${params.toString()}`);
  };

  return (
    <Button onClick={openDialog} size="sm">
      <ImageUpIcon className="mr-2 size-4" />
      Import Photos
    </Button>
  );
};
