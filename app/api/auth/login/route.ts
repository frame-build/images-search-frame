import { AuthenticationClient, ResponseType } from "@aps_sdk/authentication"
import { NextResponse } from "next/server"

import { env } from "@/env"
import { ACC_SCOPES, setOauthStateCookie } from "@/lib/auth"

const authClient = new AuthenticationClient()

export async function GET() {
  const state = crypto.randomUUID()

  const authorizeUrl = authClient.authorize(
    env.ACC_CLIENT_ID,
    ResponseType.Code,
    env.ACC_CALLBACK_URL,
    ACC_SCOPES,
    { state }
  )

  const response = NextResponse.redirect(authorizeUrl)
  setOauthStateCookie(response, state)
  return response
}

