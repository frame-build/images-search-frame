import { NextResponse } from "next/server";

import { getSession } from "@/lib/auth";

const APS_BASE_URL = "https://developer.api.autodesk.com";

type HubsResponse = {
  data?: Array<{
    id?: string;
    attributes?: { name?: string };
    name?: string;
  }>;
};

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tokenType = session.tokenType ?? "Bearer";
  const res = await fetch(`${APS_BASE_URL}/project/v1/hubs`, {
    headers: {
      Authorization: `${tokenType} ${session.accessToken}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return NextResponse.json(
      { error: "Failed to fetch hubs", status: res.status, details: text },
      { status: res.status }
    );
  }

  const json = (await res.json()) as HubsResponse;
  const hubs = (json.data ?? []).map((hub) => ({
    id: hub.id ?? "",
    name: hub.attributes?.name ?? hub.name ?? hub.id ?? "",
  }));

  return NextResponse.json({ hubs });
}
