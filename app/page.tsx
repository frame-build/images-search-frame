import type { Metadata } from "next";
import { Suspense } from "react";
import { Header } from "@/components/header";
import { ImportPhotosDialog } from "@/components/import-photos-dialog";
import { Login } from "@/components/login";
import { Results } from "@/components/results";
import { UploadedImagesProvider } from "@/components/uploaded-images-provider";
import { getSession } from "@/lib/auth";

export const metadata: Metadata = {
  title: "vectr",
  description: "vectr",
};

const ImagesSkeleton = () => (
  <div className="h-full min-h-[50vh] max-h-[50vh] overflow-hidden rounded-lg border p-4">
    <div className="gap-4 sm:columns-2 md:columns-3 lg:columns-2 xl:columns-3">
      {[
        { id: "skeleton-1", aspect: "aspect-square" },
        { id: "skeleton-2", aspect: "aspect-video" },
        { id: "skeleton-3", aspect: "aspect-[9/16]" },
        { id: "skeleton-4", aspect: "aspect-square" },
        { id: "skeleton-5", aspect: "aspect-video" },
        { id: "skeleton-6", aspect: "aspect-[9/16]" },
      ].map(({ id, aspect }) => {
        const className = `mb-4 rounded-xl bg-muted/40 p-2 ${aspect} animate-pulse`;
        return <div className={className} key={id} />;
      })}
    </div>
  </div>
);

type PageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

const HeaderGate = async () => {
  const session = await getSession();
  return <Header hasSession={Boolean(session)} />;
};

const AuthenticatedResults = async () => {
  const session = await getSession();
  if (!session) return <Login />;

  return <Results />;
};

const ImportDialogGate = async ({ searchParams }: PageProps) => {
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const shouldImport = Boolean(resolvedSearchParams.import);

  return <ImportPhotosDialog open={shouldImport} />;
};

const Home = ({ searchParams }: PageProps) => {
  return (
    <UploadedImagesProvider>
      <Suspense fallback={null}>
        <ImportDialogGate searchParams={searchParams} />
      </Suspense>
      <div className="container relative mx-auto grid items-start gap-12 px-4 py-8 sm:gap-16 lg:grid-cols-[300px_1fr]">
        <div className="lg:sticky lg:top-8">
          <Suspense fallback={<Header hasSession={false} />}>
            <HeaderGate />
          </Suspense>
        </div>
        <Suspense fallback={<ImagesSkeleton />}>
          <AuthenticatedResults />
        </Suspense>
      </div>
    </UploadedImagesProvider>
  );
};

export default Home;
