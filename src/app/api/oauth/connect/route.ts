import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { requireCurrentUser } from "@/lib/auth";
import { sign } from "@/lib/crypto";

export const runtime = "nodejs";

const SCOPES = [
  "conversations.readonly",
  "conversations.write",
  "conversations/message.readonly",
  "conversations/message.write",
  "contacts.readonly",
  "contacts.write",
  "locations.readonly",
].join(" ");

const STATE_COOKIE = "ghl_oauth_state";

export async function GET() {
  // Must be signed in to initiate — caller becomes locations.createdBy at callback.
  await requireCurrentUser();

  const clientId = process.env.GHL_CLIENT_ID;
  const redirectUri = process.env.GHL_REDIRECT_URI;
  const stateSecret = process.env.OAUTH_STATE_SECRET;
  if (!clientId || !redirectUri || !stateSecret) {
    return NextResponse.json(
      { error: "GHL OAuth env vars not configured" },
      { status: 500 },
    );
  }

  const nonce = randomBytes(24).toString("hex");
  const issuedAt = Date.now().toString();
  const payload = `${nonce}.${issuedAt}`;
  const signature = sign(payload, stateSecret);
  const state = `${payload}.${signature}`;

  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 minutes — generous for slow OAuth click-through
  });

  const url = new URL("https://marketplace.leadconnectorhq.com/oauth/chooselocation");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("state", state);

  return NextResponse.redirect(url.toString());
}
