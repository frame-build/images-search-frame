import { CheckCircle2Icon, ImageUpIcon } from "lucide-react";
import { Suspense } from "react";
import { ImportPhotosButton } from "./deploy";
import { Button } from "./ui/button";

type HeaderProps = {
  hasSession?: boolean;
};

export const Header = ({ hasSession }: HeaderProps) => {
  const repoUrl =
    process.env.NEXT_PUBLIC_REPO_URL ?? "https://github.com/vercel/vectr";

  return (
    <div className="flex flex-col gap-8 sm:gap-12">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <ImageUpIcon className="size-4" />
          <h1 className="font-semibold tracking-tight">frame.acc.ImageSearch</h1>
        </div>
        <p className="text-balance text-muted-foreground">
          Open-source semantic search for images stored in Autodesk Construction
          Cloud (ACC).
        </p>
        <p className="text-muted-foreground text-sm italic">
          Try searching for "rebar", "excavator", or "safety signage".
        </p>
      </div>

      <ul className="flex flex-col gap-2 text-muted-foreground sm:gap-4">
        <li className="flex gap-2">
          <CheckCircle2Icon className="mt-0.5 size-4 shrink-0" />
          <p className="text-sm">
            Designed for ACC photo libraries{" "}
            <a
              className="underline"
              href="https://construction.autodesk.com/"
              rel="noopener noreferrer"
              target="_blank"
            >
              Autodesk Construction Cloud
            </a>
          </p>
        </li>
        <li className="flex gap-2">
          <CheckCircle2Icon className="mt-0.5 size-4 shrink-0" />
          <p className="text-sm">
            Generates image descriptions using your preferred vision model via
            the{" "}
            <a
              className="underline"
              href="https://ai-sdk.dev/"
              rel="noopener noreferrer"
              target="_blank"
            >
              Vercel AI SDK
            </a>
          </p>
        </li>
        <li className="flex gap-2">
          <CheckCircle2Icon className="mt-0.5 size-4 shrink-0" />
          <p className="text-sm">
            Indexes descriptions + metadata in{" "}
            <a
              className="underline"
              href="https://upstash.com/docs/search/overall/getstarted"
              rel="noopener noreferrer"
              target="_blank"
            >
              Upstash Vector Search
            </a>
          </p>
        </li>
        <li className="flex gap-2">
          <CheckCircle2Icon className="mt-0.5 size-4 shrink-0" />
          <p className="text-sm">
            Reference pipeline uses{" "}
            <a
              className="underline"
              href="https://vercel.com/storage"
              rel="noopener noreferrer"
              target="_blank"
            >
              Vercel Blob Storage
            </a>{" "}
            +{" "}
            <a
              className="underline"
              href="https://useworkflow.dev/"
              rel="noopener noreferrer"
              target="_blank"
            >
              Vercel Workflow
            </a>
          </p>
        </li>
      </ul>

      <div className="flex flex-col gap-2">
        <div className="flex gap-2">
          <Suspense fallback={null}>
            <ImportPhotosButton />
          </Suspense>
          <Button asChild size="sm" variant="outline">
            <a href={repoUrl} rel="noopener noreferrer" target="_blank">
              Source code
            </a>
          </Button>
        </div>

        {hasSession ? (
          <div>
            <Button asChild size="sm" variant="outline">
              <a href="/api/auth/logout">Log out</a>
            </Button>
          </div>
        ) : null}

        <p className="text-muted-foreground text-xs">
          Props to{" "}
          <a
            className="underline"
            href="https://www.linkedin.com/in/haydenbleasel/"
            rel="noopener noreferrer"
            target="_blank"
          >
            Hayden Bleasel
          </a>{" "}
          for the original repo.
        </p>
      </div>
    </div>
  );
};
