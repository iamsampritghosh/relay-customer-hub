import { z } from "zod";

export const channelEnum = z.enum([
  "WhatsApp",
  "Messenger",
  "Instagram",
  "TikTok",
  "LinkedIn",
  "Webchat",
  "Email",
  "SMS",
]);
export type Channel = z.infer<typeof channelEnum>;

export const conversationStatusEnum = z.enum(["open", "closed", "snoozed"]);
export type ConversationStatus = z.infer<typeof conversationStatusEnum>;

export const messageDirectionEnum = z.enum(["inbound", "outbound"]);
export type MessageDirection = z.infer<typeof messageDirectionEnum>;

export const attachmentSchema = z
  .object({
    url: z.string().url(),
    type: z.string().optional(),
    name: z.string().optional(),
    size: z.number().int().nonnegative().optional(),
  })
  .passthrough();
export type Attachment = z.infer<typeof attachmentSchema>;

export const conversationSchema = z
  .object({
    id: z.string(),
    contactId: z.string(),
    locationId: z.string(),

    // FIXED
    type: z.string().optional().nullable(),

    lastMessageBody: z.string().nullish(),
    lastMessageType: z.string().nullish(),

    // FIXED
    lastMessageDate: z
      .union([z.string(), z.number()])
      .nullish(),

    unreadCount: z.number().int().nonnegative().optional(),
    assignedTo: z.string().nullish(),
    status: z.string().optional(),
    fullName: z.string().nullish(),
    contactName: z.string().nullish(),
    email: z.string().email().nullish(),
    phone: z.string().nullish(),
  })
  .passthrough();
export type Conversation = z.infer<typeof conversationSchema>;

export const conversationSearchResponse = z
  .object({
    conversations: z.array(conversationSchema),
    total: z.number().int().optional(),
    nextStartAfterDate: z.union([z.string(), z.number()]).nullish(),
  })
  .passthrough();
export type ConversationSearchResponse = z.infer<
  typeof conversationSearchResponse
>;

export const messageSchema = z
  .object({
    id: z.string(),
    type: z.union([z.string(), z.number()]).optional(),
    messageType: z.string().optional(),
    locationId: z.string().optional(),
    contactId: z.string().optional(),
    conversationId: z.string(),
    dateAdded: z.string().optional(),
    body: z.string().nullish(),
    direction: z.string().optional(),
    status: z.string().optional(),
    contentType: z.string().optional(),
    attachments: z.array(attachmentSchema).optional(),
    meta: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();
export type Message = z.infer<typeof messageSchema>;

export const messagesListResponse = z
  .object({
    messages: z
      .object({
        lastMessageId: z.string().nullish(),
        nextPage: z.boolean().nullish(),
        messages: z.array(messageSchema),
      })
      .passthrough(),
  })
  .passthrough();
export type MessagesListResponse = z.infer<typeof messagesListResponse>;

export const messageSendResponse = z
  .object({
    conversationId: z.string(),
    messageId: z.string(),
    messageIds: z.array(z.string()).optional(),
  })
  .passthrough();
export type MessageSendResponse = z.infer<typeof messageSendResponse>;

export const contactSchema = z
  .object({
    id: z.string(),
    locationId: z.string().optional(),
    firstName: z.string().nullish(),
    lastName: z.string().nullish(),
    name: z.string().nullish(),
    email: z.string().email().nullish(),
    phone: z.string().nullish(),
    timezone: z.string().nullish(),
    tags: z.array(z.string()).optional(),
    customFields: z.array(z.record(z.string(), z.unknown())).optional(),
    dateAdded: z.string().nullish(),
    dateUpdated: z.string().nullish(),
  })
  .passthrough();
export type Contact = z.infer<typeof contactSchema>;

export const contactResponse = z
  .object({
    contact: contactSchema,
  })
  .passthrough();
export type ContactResponse = z.infer<typeof contactResponse>;

export const contactUpsertResponse = z
  .object({
    contact: contactSchema,
    new: z.boolean().optional(),
  })
  .passthrough();
export type ContactUpsertResponse = z.infer<
  typeof contactUpsertResponse
>;

export const locationSchema = z
  .object({
    id: z.string(),
    name: z.string().nullish(),
    phone: z.string().nullish(),
    email: z.string().email().nullish(),
    timezone: z.string().nullish(),
    address: z.string().nullish(),
    website: z.string().url().nullish(),
  })
  .passthrough();
export type Location = z.infer<typeof locationSchema>;

export const locationResponse = z
  .object({
    location: locationSchema,
  })
  .passthrough();
export type LocationResponse = z.infer<typeof locationResponse>;