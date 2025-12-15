import { AuthenticationClient } from "@aps_sdk/authentication";
import { NextResponse } from "next/server";

import { env } from "@/env";
import {
  clearOauthStateCookie,
  createSession,
  readOauthStateCookie,
  setSessionCookie,
} from "@/lib/auth";

const authClient = new AuthenticationClient();
const MS_PER_SECOND = 1000;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");

  const expectedState = await readOauthStateCookie();
  if (!expectedState || returnedState !== expectedState) {
    return NextResponse.json(
      { error: "Invalid OAuth state." },
      { status: 400 }
    );
  }

  if (!code) {
    return NextResponse.json({ error: "Missing OAuth code." }, { status: 400 });
  }

  const token = await authClient.getThreeLeggedToken(
    env.ACC_CLIENT_ID,
    code,
    env.ACC_CALLBACK_URL,
    { clientSecret: env.ACC_CLIENT_SECRET }
  );

  const sessionId = await createSession({
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: Date.now() + token.expires_in * MS_PER_SECOND,
    tokenType: token.token_type,
  });

  const response = NextResponse.redirect(new URL("/?import=1", request.url));
  setSessionCookie(response, sessionId);
  clearOauthStateCookie(response);
  return response;
}
