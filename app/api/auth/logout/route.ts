import { NextResponse } from "next/server"

import { clearSessionCookie, deleteSession, getSessionId } from "@/lib/auth"

export async function GET(request: Request) {
  const sessionId = await getSessionId()
  if (sessionId) {
    await deleteSession(sessionId)
  }

  const response = NextResponse.redirect(new URL("/", request.url))
  clearSessionCookie(response)
  return response
}

export async function POST(request: Request) {
  return GET(request)
}
