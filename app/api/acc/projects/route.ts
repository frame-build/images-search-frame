import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";

const APS_BASE_URL = "https://developer.api.autodesk.com";

type ProjectsResponse = {
  data?: Array<{
    id?: string;
    attributes?: { name?: string };
    name?: string;
  }>;
};

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const hubId = url.searchParams.get("hubId");
  if (!hubId) {
    return NextResponse.json({ error: "Missing hubId" }, { status: 400 });
  }

  const tokenType = session.tokenType ?? "Bearer";
  const res = await fetch(
    `${APS_BASE_URL}/project/v1/hubs/${encodeURIComponent(hubId)}/projects`,
    {
      headers: {
        Authorization: `${tokenType} ${session.accessToken}`,
      },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      { error: "Failed to fetch projects", status: res.status, details: text },
      { status: res.status }
    );
  }

  const json = (await res.json()) as ProjectsResponse;
  const projects = (json.data ?? []).map((project) => ({
    id: project.id ?? "",
    name: project.attributes?.name ?? project.name ?? project.id ?? "",
  }));

  return NextResponse.json({ projects });
}
