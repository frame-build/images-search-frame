import { AuthenticationClient, Scopes } from "@aps_sdk/authentication"
import { Redis } from "@upstash/redis"
import { cookies } from "next/headers"
import type { NextResponse } from "next/server"

import { env } from "@/env"

const redis = Redis.fromEnv()
const authClient = new AuthenticationClient()

export const SESSION_COOKIE_NAME = "acc_session"
const SESSION_KEY_PREFIX = "session:"

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 15
const STATE_COOKIE_NAME = "acc_oauth_state"
const STATE_TTL_SECONDS = 60 * 5

export const ACC_SCOPES: Scopes[] = [Scopes.DataRead, Scopes.AccountRead]

export type AccSession = {
  accessToken: string
  refreshToken?: string
  expiresAt: number
  tokenType?: string
}

type StoredSession = {
  accessToken: string
  refreshToken?: string
  expiresAt: number
  tokenType?: string
}

const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
}

function sessionKey(sessionId: string) {
  return `${SESSION_KEY_PREFIX}${sessionId}`
}

export async function getSessionId() {
  const cookieStore = await cookies()
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null
}

export async function getSession(): Promise<AccSession | null> {
  const sessionId = await getSessionId()
  if (!sessionId) return null

  const stored = await redis.get<StoredSession>(sessionKey(sessionId))
  if (!stored) return null

  if (stored.expiresAt > Date.now() + 30_000) {
    return stored
  }

  if (!stored.refreshToken) return stored

  try {
    const refreshed = await authClient.refreshToken(stored.refreshToken, env.ACC_CLIENT_ID, {
      clientSecret: env.ACC_CLIENT_SECRET,
      scopes: ACC_SCOPES,
    })

    const updated: StoredSession = {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token ?? stored.refreshToken,
      expiresAt: Date.now() + refreshed.expires_in * 1000,
      tokenType: refreshed.token_type,
    }

    await redis.set(sessionKey(sessionId), updated, { ex: SESSION_TTL_SECONDS })
    return updated
  } catch {
    return stored
  }
}

export async function createSession(session: AccSession) {
  const sessionId = crypto.randomUUID()
  await redis.set(sessionKey(sessionId), session, { ex: SESSION_TTL_SECONDS })
  return sessionId
}

export async function deleteSession(sessionId: string) {
  await redis.del(sessionKey(sessionId))
}

export function setSessionCookie(response: NextResponse, sessionId: string) {
  response.cookies.set(SESSION_COOKIE_NAME, sessionId, {
    ...cookieBase,
    maxAge: SESSION_TTL_SECONDS,
  })
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    ...cookieBase,
    maxAge: 0,
  })
}

export function setOauthStateCookie(response: NextResponse, state: string) {
  response.cookies.set(STATE_COOKIE_NAME, state, {
    ...cookieBase,
    maxAge: STATE_TTL_SECONDS,
  })
}

export async function readOauthStateCookie() {
  const cookieStore = await cookies()
  return cookieStore.get(STATE_COOKIE_NAME)?.value ?? null
}

export function clearOauthStateCookie(response: NextResponse) {
  response.cookies.set(STATE_COOKIE_NAME, "", {
    ...cookieBase,
    maxAge: 0,
  })
}
