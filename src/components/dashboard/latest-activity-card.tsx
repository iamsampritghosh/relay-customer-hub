"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNowStrict } from "date-fns";
import Link from "next/link";
import { useCallback, useMemo } from "react";

import { ChartCard } from "@/components/dashboard/chart-card";
import { usePusherChannel } from "@/hooks/use-pusher-channel";

type ActivityItem = {
  id: string;
  type: "inbound" | "resolved" | "assigned" | "system";
  title: string;
  subtitle: string | null;
  channel: string;
  conversationId: string;
  createdAt: string;
};

const CHANNEL_COLOR: Record<string, string> = {
  whatsapp: "var(--color-c-whatsapp)",
  messenger: "var(--color-c-messenger)",
  instagram: "var(--color-c-instagram)",
  tiktok: "var(--color-c-tiktok)",
  linkedin: "var(--color-c-linkedin)",
  webchat: "var(--color-c-webchat)",
  email: "var(--color-c-email)",
  sms: "var(--color-c-sms)",
};

export function LatestActivityCard({
  pusherChannel,
}: {
  /** Pass `private-location-{id}` for live updates, or null for poll-only. */
  pusherChannel?: string | null;
}) {
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ["activity", 6], []);

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: async (): Promise<{ items: ActivityItem[] }> => {
      const res = await fetch("/api/activity?limit=6");
      if (!res.ok) throw new Error(`activity ${res.status}`);
      return res.json();
    },
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey]);


  const items = data?.items ?? [];

  return (
    <ChartCard title="Latest Activity" dropdownLabel="Today">
      <div className="flex flex-col">
        {isLoading && items.length === 0 ? (
          <p className="text-xs text-text-tertiary py-2">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-text-tertiary py-2">
            Nothing yet — events will appear here as they happen.
          </p>
        ) : (
          items.map((item) => (
            <Link
              key={item.id}
              href={`/conversations?id=${item.conversationId}`}
              className="grid grid-cols-[auto_1fr_auto] gap-3 p-2.5 rounded-lg hover:bg-canvas items-start animate-in fade-in-0 slide-in-from-top-1 duration-200"
            >
              <span
                className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                style={{ background: CHANNEL_COLOR[item.channel] ?? "#9CA3AF" }}
                aria-hidden
              />
              <div className="min-w-0">
                <div className="text-[13px] font-semibold text-text-primary leading-snug">
                  {item.title}
                </div>
                {item.subtitle && (
                  <div className="text-[12px] text-text-secondary mt-0.5 truncate">
                    {item.subtitle}
                  </div>
                )}
              </div>
              <span className="text-[11px] text-text-secondary bg-canvas px-2 py-0.5 rounded-full whitespace-nowrap font-medium flex-shrink-0">
                {formatDistanceToNowStrict(new Date(item.createdAt), { addSuffix: false })}
              </span>
            </Link>
          ))
        )}
      </div>
    </ChartCard>
  );
}
