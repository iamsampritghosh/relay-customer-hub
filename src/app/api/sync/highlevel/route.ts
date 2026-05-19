import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { db, schema } from "@/db";
import { ghlClient } from "@/lib/ghl/client";

export const runtime = "nodejs";

export async function GET() {
  const locations =
    await db.query.locations.findMany();

  for (const location of locations) {
    try {
      console.log(
        "syncing:",
        location.name
      );

      const result =
        await ghlClient.conversations.search(
          location.ghlLocationId,
          {
            limit: 10,
          }
        );

      const conversations =
        (result as any).conversations || [];

      console.log(
        "found:",
        conversations.length
      );

      for (const convo of conversations) {
        try {
          if (!(convo as any).contactId)
            continue;

          // =========================
          // FIND / CREATE CONTACT
          // =========================

          let contact =
            await db.query.contacts.findFirst(
              {
                where: eq(
                  schema.contacts
                    .ghlContactId,
                  (convo as any).contactId
                ),
              }
            );

          if (!contact) {
            const inserted =
              await db
                .insert(schema.contacts)
                .values({
                  locationId:
                    location.id,

                  ghlContactId:
                    (convo as any)
                      .contactId,

                  name:
                    (convo as any)
                      .fullName ||
                    (convo as any)
                      .contactName ||
                    "Unknown",

                  phone:
                    (convo as any)
                      .phone || null,

                  email:
                    (convo as any)
                      .email || null,
                })
                .returning();

            contact = inserted[0];
          }

          if (!contact)
            continue;

          // =========================
          // CHANNEL MAPPING
          // =========================

          let mappedChannel =
            "whatsapp";

          const locationName =
            location.name
              ?.toLowerCase() || "";

          // Messenger
          if (
            locationName.includes(
              "nad al hamar orange auto"
            ) &&
            !locationName.includes(
              "nazia"
            )
          ) {
            mappedChannel =
              "messenger";
          }

          // Instagram
          else if (
            locationName.includes(
              "nazia"
            )
          ) {
            mappedChannel =
              "instagram";
          }

          // WhatsApp
          else {
            mappedChannel =
              "whatsapp";
          }

          // =========================
          // CREATE / GET CONVERSATION
          // =========================

          const insertedConversation =
            await db
              .insert(
                schema.conversations
              )
              .values({
                locationId:
                  location.id,

                ghlConversationId:
                  (convo as any).id,

                contactId:
                  contact.id,

                channel:
                  mappedChannel,

                status:
                  (convo as any)
                    .status ||
                  "open",

                priority:
                  "normal",

                unreadCount:
                  (convo as any)
                    .unreadCount ||
                  0,

                lastMessageAt:
                  (convo as any)
                    .lastMessageDate
                    ? new Date(
                        (convo as any)
                          .lastMessageDate
                      )
                    : new Date(),
              })
              .onConflictDoNothing()
              .returning();

          let localConversation =
            insertedConversation[0];

          if (!localConversation) {
            const foundConversation =
              await db.query.conversations.findFirst(
                {
                  where: eq(
                    schema.conversations
                      .ghlConversationId,
                    (convo as any).id
                  ),
                }
              );

            if (foundConversation) {
              localConversation =
                foundConversation;
            }
          }

          if (!localConversation)
            continue;

          // =========================
          // FETCH MESSAGES
          // =========================

          try {
            const messagesResult =
              await ghlClient.conversations.getMessages(
                location.ghlLocationId,
                (convo as any).id,
                {
                  limit: 15,
                }
              );

            const messages: any[] =
              (messagesResult as any)
                .messages ||
              (messagesResult as any)
                .conversationMessages ||
              [];

            console.log(
              "conversation:",
              (convo as any).id,
              "messages:",
              messages.length
            );

            for (const msg of messages) {
              if (!(msg as any).id)
                continue;

              await db
                .insert(
                  schema.messages
                )
                .values({
                  conversationId:
                    localConversation.id,

                  ghlMessageId:
                    (msg as any).id,

                  body:
                    (msg as any).body ||
                    (msg as any)
                      .message ||
                    (msg as any).text ||
                    "",

                  direction:
                    (msg as any)
                      .direction ===
                    "outbound"
                      ? "outbound"
                      : "inbound",

                  messageType:
                    (msg as any)
                      .messageType ||
                    "text",

                  status:
                    (msg as any)
                      .status ||
                    "delivered",

                  createdAt:
                    (msg as any)
                      .dateAdded
                      ? new Date(
                          (msg as any)
                            .dateAdded
                        )
                      : (msg as any)
                          .createdAt
                      ? new Date(
                          (msg as any)
                            .createdAt
                        )
                      : new Date(),
                })
                .onConflictDoNothing();
            }
          } catch (err) {
            console.error(
              "message sync failed",
              (convo as any).id,
              err
            );
          }
        } catch (err) {
          console.error(
            "conversation failed:",
            (convo as any).id,
            err
          );
        }
      }
    } catch (err) {
      console.error(
        "sync failed:",
        location.name,
        err
      );
    }
  }

  return NextResponse.json({
    success: true,
  });
}