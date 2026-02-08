import type { Metadata } from "next";
import { Suspense } from "react";
import { Header } from "@/components/header";
import { ImagesSkeleton } from "@/components/images-skeleton";
import { Results } from "@/components/results";
import { UploadedImagesProvider } from "@/components/uploaded-images-provider";

export const metadata: Metadata = {
  title: "vectr",
  description: "vectr",
};

const Home = () => {
  return (
    <UploadedImagesProvider>
      <div className="container relative mx-auto grid items-start gap-12 px-4 py-8 sm:gap-16 lg:grid-cols-[300px_1fr]">
        <div className="lg:sticky lg:top-8">
          <Header hasSession={false} readOnly />
        </div>
        <Suspense fallback={<ImagesSkeleton />}>
          <Results readOnly />
        </Suspense>
      </div>
    </UploadedImagesProvider>
  );
};

export default Home;
