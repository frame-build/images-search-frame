import { list } from "@vercel/blob";
import { cacheLife, cacheTag } from "next/cache";
import { ResultsClient } from "./results.client";

export const Results = async () => {
  "use cache";
  cacheLife("minutes");
  cacheTag("images");

  const { blobs } = await list({ limit: 50 });

  return <ResultsClient defaultData={blobs} />;
};
