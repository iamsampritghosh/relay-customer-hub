import { z } from "zod";

import {
  contactResponse,
  contactUpsertResponse,
  conversationSearchResponse,
  conversationSchema,
  locationResponse,
  messageSendResponse,
} from "./schemas";

import { getTokenResolver } from "./tokens";

const GHL_BASE_URL =
  "https://services.leadconnectorhq.com";

const GHL_API_VERSION =
  "2021-04-15";

export class GhlApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly path: string,
    message: string,
    public readonly body?: unknown
  ) {
    super(
      `GHL ${status} ${path}: ${message}`
    );

    this.name = "GhlApiError";
  }
}

export class RateLimitError extends GhlApiError {
  constructor(
    public readonly retryAfterSeconds: number,
    path: string,
    body?: unknown
  ) {
    super(
      429,
      path,
      `rate limited (retry after ${retryAfterSeconds}s)`,
      body
    );

    this.name =
      "RateLimitError";
  }
}

type FetchInit =
  Omit<RequestInit, "headers"> & {
    headers?: Record<
      string,
      string
    >;

    query?: Record<
      | string,
      | string
      | number
      | boolean
      | null
      | undefined
    >;
  };

function buildUrl(
  path: string,
  query?: FetchInit["query"]
): string {
  const url = new URL(
    GHL_BASE_URL + path
  );

  if (query) {
    for (const [k, v] of Object.entries(
      query
    )) {
      if (
        v === null ||
        v === undefined
      )
        continue;

      url.searchParams.set(
        k,
        String(v)
      );
    }
  }

  return url.toString();
}

export async function ghlFetch<
  T = unknown
>(
  locationId: string,
  path: string,
  init: FetchInit = {}
): Promise<T> {
  const resolver =
    getTokenResolver();

  let token =
    await resolver.getValidAccessToken(
      locationId
    );

  const started = Date.now();

  const method = (
    init.method ?? "GET"
  ).toUpperCase();

  const doRequest = async (
    bearer: string
  ) => {
    const {
      query,
      headers,
      ...rest
    } = init;

    const response = await fetch(
      buildUrl(path, query),
      {
        ...rest,

        method,

        headers: {
          Authorization: `Bearer ${bearer}`,

          Version:
            GHL_API_VERSION,

          Accept:
            "application/json",

          "Content-Type":
            "application/json",

          ...headers,
        },
      }
    );

    return response;
  };

  let response =
    await doRequest(token);

  if (response.status === 401) {
    token =
      await resolver.forceRefreshAccessToken(
        locationId
      );

    response =
      await doRequest(token);
  }

  const ms =
    Date.now() - started;

  console.log(
    JSON.stringify({
      ghl: true,
      method,
      path,
      status: response.status,
      ms,
    })
  );

  if (response.status === 429) {
    const retryAfter = Number(
      response.headers.get(
        "Retry-After"
      ) ?? "60"
    );

    let body:
      | unknown
      | undefined =
      undefined;

    try {
      body =
        await response.json();
    } catch {}

    throw new RateLimitError(
      Number.isFinite(
        retryAfter
      )
        ? retryAfter
        : 60,
      path,
      body
    );
  }

  if (!response.ok) {
    let body:
      | unknown
      | undefined =
      undefined;

    let message =
      response.statusText;

    try {
      body =
        await response.json();

      const maybeMessage =
        (
          body as {
            message?: string;
          }
        )?.message;

      if (maybeMessage)
        message =
          maybeMessage;
    } catch {}

    throw new GhlApiError(
      response.status,
      path,
      message,
      body
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

async function call<T>(
  schema: z.ZodType<T>,
  locationId: string,
  path: string,
  init?: FetchInit
): Promise<T> {
  const raw =
    await ghlFetch(
      locationId,
      path,
      init
    );

  return schema.parse(raw);
}

// ======================================================
// SAFE MESSAGE RESPONSE
// ======================================================

const safeMessagesResponse = z.any();

// ======================================================
// CONVERSATIONS
// ======================================================

export const conversations = {
  search(
    locationId: string,
    params: {
      contactId?: string;

      status?:
        | "open"
        | "closed"
        | "all";

      assignedTo?: string;

      limit?: number;

      startAfter?: string;
    } = {}
  ) {
    return call(
      conversationSearchResponse,
      locationId,
      "/conversations/search",
      {
        query: {
          locationId,
          ...params,
        },
      }
    );
  },

  get(
    locationId: string,
    conversationId: string
  ) {
    return call(
      conversationSchema,
      locationId,
      `/conversations/${conversationId}`
    );
  },

  // ======================================================
  // DISABLED READ API
  // ======================================================

  async read(
    _locationId: string,
    _conversationId: string
  ) {
    return {
      success: true,
    };
  },

  // ======================================================
  // FIXED MESSAGE FETCHER
  // ======================================================

  async getMessages(
    locationId: string,
    conversationId: string,
    params: {
      limit?: number;
      lastMessageId?: string;
    } = {}
  ) {
    const raw =
      await call(
        safeMessagesResponse,
        locationId,
        `/conversations/${conversationId}/messages`,
        {
          query: params,
        }
      );

    console.log(
      "RAW MESSAGE RESPONSE:",
      JSON.stringify(raw).slice(
        0,
        1000
      )
    );

    // ======================================================
    // FIXED EXTRACTION
    // ======================================================

    let extractedMessages: any[] =
      [];

    if (
      Array.isArray(raw)
    ) {
      extractedMessages =
        raw;
    } else if (
      Array.isArray(
        raw?.messages
      )
    ) {
      extractedMessages =
        raw.messages;
    } else if (
      Array.isArray(
        raw?.messages?.messages
      )
    ) {
      extractedMessages =
        raw.messages.messages;
    } else if (
      Array.isArray(
        raw?.data?.messages
      )
    ) {
      extractedMessages =
        raw.data.messages;
    }

    console.log(
      "PARSED MESSAGE COUNT:",
      extractedMessages.length
    );

    return {
      messages:
        extractedMessages.map(
          (msg: any) => ({
            id:
              msg.id ||
              crypto.randomUUID(),

            body:
              msg.body ||
              msg.message ||
              msg.text ||
              "",

            direction:
              msg.direction ||
              (msg.messageType ===
              "TYPE_OUTBOUND"
                ? "outbound"
                : "inbound"),

            dateAdded:
              msg.dateAdded ||
              msg.createdAt ||
              new Date().toISOString(),

            attachments:
              Array.isArray(
                msg.attachments
              )
                ? msg.attachments.map(
                    (a: any) =>
                      typeof a ===
                      "string"
                        ? {
                            url: a,
                          }
                        : a
                  )
                : [],
          })
        ),
    };
  },

  messages: {
    async list(
      locationId: string,
      conversationId: string,
      params: {
        limit?: number;
        lastMessageId?: string;
      } = {}
    ) {
      return conversations.getMessages(
        locationId,
        conversationId,
        params
      );
    },

    send(
      locationId: string,
      body: {
        conversationId: string;

        contactId?: string;

        type:
          | "WhatsApp"
          | "SMS"
          | "Email";

        message?: string;

        html?: string;

        subject?: string;

        attachments?: string[];
      }
    ) {
      return call(
        messageSendResponse,
        locationId,
        "/conversations/messages",
        {
          method: "POST",

          body: JSON.stringify(
            body
          ),
        }
      );
    },
  },
};

// ======================================================
// CONTACTS
// ======================================================

export const contacts = {
  get(
    locationId: string,
    contactId: string
  ) {
    return call(
      contactResponse,
      locationId,
      `/contacts/${contactId}`
    );
  },

  upsert(
    locationId: string,
    body: {
      phone?: string;

      email?: string;

      firstName?: string;

      lastName?: string;

      name?: string;

      tags?: string[];
    }
  ) {
    return call(
      contactUpsertResponse,
      locationId,
      "/contacts/upsert",
      {
        method: "POST",

        body: JSON.stringify({
          locationId,
          ...body,
        }),
      }
    );
  },
};

// ======================================================
// LOCATIONS
// ======================================================

export const locations = {
  get(locationId: string) {
    return call(
      locationResponse,
      locationId,
      `/locations/${locationId}`
    );
  },
};

export const ghlClient = {
  conversations,
  contacts,
 locations,
};