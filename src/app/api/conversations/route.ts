import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";

import { db, schema } from "@/db";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest
) {
  const searchParams =
    request.nextUrl.searchParams;

  const channel =
    searchParams.get("channel");

  const locationId =
    searchParams.get("locationId");

  const status =
    searchParams.get("status");

  const filters = [];

  // CHANNEL FILTER
  if (
    channel &&
    channel !== "all"
  ) {
    filters.push(
      eq(
        schema.conversations.channel,
        channel as any
      )
    );
  }

  // LOCATION FILTER
  if (
    locationId &&
    locationId !== "all"
  ) {
    filters.push(
      eq(
        schema.conversations.locationId,
        locationId
      )
    );
  }

  // STATUS FILTER
  if (status) {
    filters.push(
      eq(
        schema.conversations.status,
        status
      )
    );
  }

  // GET CONVERSATIONS
  const conversations =
    await db.query.conversations.findMany(
      {
        where:
          filters.length > 0
            ? and(...filters)
            : undefined,

        orderBy: [
          desc(
            schema.conversations
              .lastMessageAt
          ),
        ],

        limit: 20,
      }
    );

  // GET CONTACT IDS
  const contactIds =
    conversations.map(
      (c) => c.contactId
    );

  // GET CONTACTS
  const contacts =
    await db.query.contacts.findMany({
      where: inArray(
        schema.contacts.id,
        contactIds
      ),
    });

  // MAP CONTACTS
  const contactMap =
    Object.fromEntries(
      contacts.map((c) => [c.id, c])
    );

  // ATTACH CONTACT TO EACH CONVERSATION
  const finalConversations =
    conversations.map((conversation) => ({
      ...conversation,
      contact:
        contactMap[
          conversation.contactId
        ] || null,
    }));

  return NextResponse.json({
    conversations:
      finalConversations,
  });
}