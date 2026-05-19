"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";

import { usePusherChannel } from "@/hooks/use-pusher-channel";

export type ChannelKey =
  | "all"
  | "whatsapp"
  | "messenger"
  | "instagram"
  | "tiktok"
  | "linkedin"
  | "webchat"
  | "email"
  | "sms";

export type ChannelCounts = Record<ChannelKey, number>;

const EMPTY: ChannelCounts = {
  all: 0,
  whatsapp: 0,
  messenger: 0,
  instagram: 0,
  tiktok: 0,
  linkedin: 0,
  webchat: 0,
  email: 0,
  sms: 0,
};

/**
 * Fetches per-channel unread counts and invalidates whenever the given
 * Pusher channel emits `message:new` or `conversation:updated`.
 *
 * `locationId` is the workspace scope — 'all' or a specific location.
 * `pusherChannel` is the realtime channel to subscribe to (typically
 * `private-location-{locationId}`). Pass `null` to disable realtime
 * sync (e.g. when scoped to 'all' without a single location).
 */
export function useChannelCounts(locationId: string | "all", pusherChannel: string | null) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ["channel-counts", locationId], [locationId]);

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<ChannelCounts> => {
      const res = await fetch(`/api/channel-counts?locationId=${locationId}`);
      if (!res.ok) throw new Error(`channel-counts ${res.status}`);
      return res.json();
    },
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);



  return {
    counts: query.data ?? EMPTY,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
