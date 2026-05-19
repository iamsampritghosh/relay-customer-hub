"use client";

import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo } from "react";



export type ThreadMessage = {
  id: string;
  ghlMessageId: string | null;
  direction: string;
  body: string | null;
  attachments: unknown;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  status: string;
  authorId: string | null;
  authorName: string | null;
  authorInitials: string | null;
  authorTone: string | null;
  createdAt: string;
};

type Page = { items: ThreadMessage[]; nextCursor: string | null };

export function useMessages(conversationId: string | null) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ["messages", conversationId], [conversationId]);

  const query = useInfiniteQuery({
    enabled: !!conversationId,
    queryKey,
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }): Promise<Page> => {
      const params = new URLSearchParams();
      if (pageParam) params.set("cursor", pageParam);
      const res = await fetch(
        `/api/conversations/${conversationId}/messages?${params.toString()}`,
      );
      if (!res.ok) throw new Error(`messages ${res.status}`);
      return res.json();
    },
    getNextPageParam: (last) => last.nextCursor,
  });

  // On message:new from Pusher, append to the cache without refetch
  const onNewMessage = useCallback(
    (data: { conversationId: string; message?: ThreadMessage }) => {
      if (!data?.message || data.conversationId !== conversationId) return;
      queryClient.setQueryData<{ pages: Page[]; pageParams: unknown[] }>(
        queryKey,
        (prev) => {
          if (!prev || prev.pages.length === 0) return prev;
          const [firstPage, ...rest] = prev.pages;
          // Dedup by ghlMessageId or id — composer's optimistic insert may
          // already be in there.
          const existing = firstPage.items.find(
            (m) =>
              (data.message!.ghlMessageId &&
                m.ghlMessageId === data.message!.ghlMessageId) ||
              m.id === data.message!.id,
          );
          if (existing) return prev;
          return {
            ...prev,
            pages: [
              { ...firstPage, items: [...firstPage.items, data.message!] },
              ...rest,
            ],
          };
        },
      );
    },
    [conversationId, queryClient, queryKey],
  );

  

  // Mark as read on mount + whenever the conversation changes.
  useEffect(() => {
    if (!conversationId) return;
    void fetch(`/api/conversations/${conversationId}/read`, { method: "POST" });
  }, [conversationId]);

  const items = useMemo(
    () => query.data?.pages.flatMap((p) => p.items) ?? [],
    [query.data],
  );

  return {
    items,
    isLoading: query.isLoading,
    isError: query.isError,
    hasOlder: query.hasNextPage,
    isFetchingOlder: query.isFetchingNextPage,
    fetchOlder: query.fetchNextPage,
  };
}
