"use server";

import { Search } from "@upstash/search";
import { del } from "@vercel/blob";
import { revalidateTag } from "next/cache";

const upstash = Search.fromEnv();
const index = upstash.index("images");

export const deleteImage = async (pathname: string, url: string) => {
  await del(url);
  await index.delete(pathname);

  revalidateTag("images", "max");

  return { success: true };
};
