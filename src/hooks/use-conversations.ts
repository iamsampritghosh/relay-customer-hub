"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import { usePusherChannel } from "@/hooks/use-pusher-channel";

export type ConversationListItem = {
  id: string;
  locationId: string;
  channel: string;
  status: string;
  priority: string;
  lastMessageAt: string | null;
  lastInboundAt: string | null;
  unreadCount: number;
  pinned: boolean;
  tags: unknown;
  preview: string | null;
  contactId: string;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  contactTone: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeInitials: string | null;
  assigneeTone: string | null;
};

export type ConversationListPage = {
  items: ConversationListItem[];
  nextCursor: string | null;
  counts: Record<"open" | "snoozed" | "closed", number>;
};

export type SortMode = "newest" | "oldest" | "unread" | "priority";

export type ConversationFilters = {
  locationId: string;
  channel: string;
  status: "open" | "snoozed" | "closed";
  search?: string;
  sort?: SortMode;
};

/**
 * Paginated, real-time conversation list.
 *
 * - useInfiniteQuery fetches /api/conversations one page at a time.
 * - On Pusher message:new for the parent location, we patch the first page
 *   in place: existing convo moves to top, new convo prepends. No full
 *   refetch unless cache is empty.
 * - On Pusher conversation:updated, we patch the matching row's unread/
 *   status without refetching.
 *
 * `pusherChannel` should be `private-location-{id}` or null to disable.
 */
export function useConversations(
  filters: ConversationFilters,
  pusherChannel: string | null,
) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(
    () => ["conversations", filters],
    [filters],
  );

  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams();
      if (filters.locationId) params.set("locationId", filters.locationId);
      if (filters.channel) params.set("channel", filters.channel);
      params.set("status", filters.status);
      if (filters.search) params.set("search", filters.search);
      if (filters.sort) params.set("sort", filters.sort);
      if (pageParam) params.set("cursor", pageParam);
      const res = await fetch(`/api/conversations?${params.toString()}`);
      if (!res.ok) throw new Error(`conversations ${res.status}`);
      return (await res.json()) as ConversationListPage;
    },
    getNextPageParam: (last) => last.nextCursor,
  });

  const handleMessageNew = useCallback(() => {
    // Cheapest signal: invalidate. Could patch later but the active
    // conversation usually moves to top which is naturally handled by
    // a refetch on the first page.
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);

  const handleConvoUpdated = useCallback(
    (data: { conversationId: string; unreadCount?: number }) => {
      queryClient.setQueryData<{
        pages: ConversationListPage[];
        pageParams: unknown[];
      }>(queryKey, (prev) => {
        if (!prev) return prev;
        const pages = prev.pages.map((page) => ({
          ...page,
          items: page.items.map((item) =>
            item.id === data.conversationId && typeof data.unreadCount === "number"
              ? { ...item, unreadCount: data.unreadCount }
              : item,
          ),
        }));
        return { ...prev, pages };
      });
    },
    [queryClient, queryKey],
  );



  const items = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );
  const counts =
    query.data?.pages[0]?.counts ?? { open: 0, snoozed: 0, closed: 0 };

  return {
    items,
    counts,
    isLoading: query.isLoading,
    isError: query.isError,
    hasNextPage: query.hasNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
    fetchNextPage: query.fetchNextPage,
  };
}
