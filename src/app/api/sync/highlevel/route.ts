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
        result.conversations || [];

      console.log(
        "found:",
        conversations.length
      );

      for (const convo of conversations) {
        try {
          if (!convo.contactId)
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
                  convo.contactId
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
                    convo.contactId,

                  name:
                    convo.fullName ||
                    convo.contactName ||
                    "Unknown",

                  phone:
                    convo.phone || null,

                  email:
                    convo.email || null,
                })
                .returning();

            contact = inserted[0];
          }

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
                  convo.id,

                contactId:
                  contact.id,

                channel:
                  mappedChannel,

                status:
                  convo.status ||
                  "open",

                priority:
                  "normal",

                unreadCount:
                  convo.unreadCount ||
                  0,

                lastMessageAt:
                  convo.lastMessageDate
                    ? new Date(
                        convo.lastMessageDate
                      )
                    : new Date(),
              })
              .onConflictDoNothing()
              .returning();

          let localConversation =
            insertedConversation[0];

          if (!localConversation) {
            localConversation =
              await db.query.conversations.findFirst(
                {
                  where: eq(
                    schema.conversations
                      .ghlConversationId,
                    convo.id
                  ),
                }
              );
          }

          if (!localConversation)
            continue;

          // =========================
          // FETCH MESSAGES
          // IMPORTANT FIX:
          // USE LOCATION ID
          // NOT CONVERSATION ID
          // =========================

          try {
            const messagesResult =
              await ghlClient.conversations.getMessages(
                location.ghlLocationId,
                convo.id,
                {
                  limit: 15,
                }
              );

            const messages =
              messagesResult.messages ||
              messagesResult.conversationMessages ||
              [];

            console.log(
              "conversation:",
              convo.id,
              "messages:",
              messages.length
            );

            for (const msg of messages) {
              if (!msg.id)
                continue;

              await db
                .insert(
                  schema.messages
                )
                .values({
                  conversationId:
                    localConversation.id,

                  ghlMessageId:
                    msg.id,

                  body:
                    msg.body ||
                    msg.message ||
                    msg.text ||
                    "",

                  direction:
                    msg.direction ===
                    "outbound"
                      ? "outbound"
                      : "inbound",

                  messageType:
                    msg.messageType ||
                    "text",

                  status:
                    msg.status ||
                    "delivered",

                  createdAt:
                    msg.dateAdded
                      ? new Date(
                          msg.dateAdded
                        )
                      : msg.createdAt
                      ? new Date(
                          msg.createdAt
                        )
                      : new Date(),
                })
                .onConflictDoNothing();
            }
          } catch (err) {
            console.error(
              "message sync failed",
              convo.id,
              err
            );
          }
        } catch (err) {
          console.error(
            "conversation failed:",
            convo.id,
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