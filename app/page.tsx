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
  <div className="columns-3 gap-4">
    {[
      { id: "skeleton-1", aspect: "aspect-square" },
      { id: "skeleton-2", aspect: "aspect-video" },
      { id: "skeleton-3", aspect: "aspect-[9/16]" },
      { id: "skeleton-4", aspect: "aspect-square" },
      { id: "skeleton-5", aspect: "aspect-video" },
      { id: "skeleton-6", aspect: "aspect-[9/16]" },
      { id: "skeleton-7", aspect: "aspect-square" },
      { id: "skeleton-8", aspect: "aspect-video" },
      { id: "skeleton-9", aspect: "aspect-[9/16]" },
    ].map(({ id, aspect }) => {
      const className = `mb-4 rounded-xl bg-card p-2 shadow-xl ${aspect}`;
      return <div className={className} key={id} />;
    })}
  </div>
);

type PageProps = {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
};

const Home = async ({ searchParams }: PageProps) => {
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const shouldImport = Boolean(resolvedSearchParams.import);

  const session = await getSession();
  if (!session) return <Login />;

  return (
    <UploadedImagesProvider>
      <ImportPhotosDialog open={shouldImport} />
      <div className="container relative mx-auto grid items-start gap-12 px-4 py-8 sm:gap-16 lg:grid-cols-[300px_1fr]">
        <div className="lg:sticky lg:top-8">
          <Header />
        </div>
        <Suspense fallback={<ImagesSkeleton />}>
          <Results />
        </Suspense>
      </div>
    </UploadedImagesProvider>
  );
};

export default Home;
