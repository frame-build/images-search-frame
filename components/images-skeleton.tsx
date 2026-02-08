export const ImagesSkeleton = () => (
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
