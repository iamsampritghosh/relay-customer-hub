"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Conversation = {
  id: string;
  channel: string;
  unreadCount: number;
  lastMessageAt: string | null;

  contact?: {
    name?: string | null;
  } | null;
};

type Filters = {
  locationId?: string;
  channel?: string;
  status?: string;
  search?: string;
};

type Props = {
  filters: Filters;

  onFiltersChange?: (
    next: Filters
  ) => void;

  activeId?: string | null;

  onPick?: (
    id: string
  ) => void;

  pusherChannel?: string | null;
};

export function ConversationList({
  filters,
}: Props) {
  const [conversations, setConversations] =
    useState<Conversation[]>([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        const params =
          new URLSearchParams();

        if (filters.channel) {
          params.set(
            "channel",
            filters.channel
          );
        }

        if (filters.locationId) {
          params.set(
            "locationId",
            filters.locationId
          );
        }

        if (filters.status) {
          params.set(
            "status",
            filters.status
          );
        }

        const res = await fetch(
          `/api/conversations?${params.toString()}`
        );

        const data =
          await res.json();

        setConversations(
          data.conversations || []
        );
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [filters]);

  if (loading) {
    return (
      <div className="p-4 text-muted-foreground">
        Loading conversations...
      </div>
    );
  }

  if (
    !conversations ||
    conversations.length === 0
  ) {
    return (
      <div className="p-4 text-muted-foreground">
        No conversations found
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      {conversations.map(
        (conversation) => (
          <Link
            key={conversation.id}
            href={`/conversations?id=${conversation.id}`}
            className="border-b border-border p-4 hover:bg-muted/40 transition"
          >
            <div className="flex items-center justify-between">
              <div className="font-medium">
                {conversation.contact
                  ?.name || "Unknown"}
              </div>

              <div className="text-xs text-muted-foreground">
                {conversation.channel}
              </div>
            </div>

            <div className="mt-1 text-sm text-muted-foreground">
              unread:{" "}
              {conversation.unreadCount}
            </div>
          </Link>
        )
      )}
    </div>
  );
}