"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  useCallback,
  useSyncExternalStore,
} from "react";
import {
  MessageSquare,
  PanelRightOpen,
} from "lucide-react";

import { ChannelRail } from "@/components/conversations/channel-rail";
import { ContactPanel } from "@/components/conversations/contact-panel";
import { ConversationList } from "@/components/conversations/conversation-list";
import { PusherStatusBanner } from "@/components/conversations/pusher-status-banner";
import { Thread } from "@/components/conversations/thread";
import type { ChannelKey } from "@/hooks/use-channel-counts";
import { cn } from "@/lib/utils";

const VIEWPORT_BREAKPOINT_PX = 1280;

function subscribeViewport(cb: () => void) {
  const mql = window.matchMedia(
    `(min-width: ${VIEWPORT_BREAKPOINT_PX}px)`
  );

  mql.addEventListener("change", cb);

  return () =>
    mql.removeEventListener("change", cb);
}

function readViewportWide() {
  return window.matchMedia(
    `(min-width: ${VIEWPORT_BREAKPOINT_PX}px)`
  ).matches;
}

export default function ConversationsPage() {
  const router = useRouter();

  const pathname = usePathname();

  const searchParams = useSearchParams();

  const channelFilter = (
    searchParams.get("channel") ?? "all"
  ) as ChannelKey;

  const activeConversationId =
    searchParams.get("id");

  const panelExplicit =
    searchParams.get("panel");

  const isWide = useSyncExternalStore(
    subscribeViewport,
    readViewportWide,
    () => true
  );

  const panelOpen = panelExplicit
    ? panelExplicit !== "closed"
    : isWide;

  /*
    MAP CHANNEL TABS
    TO DIFFERENT GHL SUBACCOUNTS
  */

  const CHANNEL_LOCATION_MAP: Record<
    string,
    string
  > = {
    whatsapp:
      "825ecf53-b5d3-4d49-8990-19431663534d",

    messenger:
      "404bf3eb-e224-47b3-8a12-014276c614e8",

    instagram:
      "1ed0d948-c76e-4f5c-a960-fa3ea50685f5",
  };

  /*
    PICK LOCATION BASED ON TAB
  */

  const selectedLocationId =
    channelFilter !== "all"
      ? CHANNEL_LOCATION_MAP[channelFilter]
      : "825ecf53-b5d3-4d49-8990-19431663534d";

  const setParam = useCallback(
    (
      key: string,
      value: string | null
    ) => {
      const next = new URLSearchParams(
        searchParams.toString()
      );

      if (
        value === null ||
        value === ""
      ) {
        next.delete(key);
      } else {
        next.set(key, value);
      }

      router.replace(
        `${pathname}?${next.toString()}`,
        {
          scroll: false,
        }
      );
    },
    [pathname, router, searchParams]
  );

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] min-h-0">
      <PusherStatusBanner />

      <div
        className={cn(
          "grid flex-1 min-h-0",
          panelOpen
            ? "grid-cols-[72px_340px_1fr_360px]"
            : "grid-cols-[72px_340px_1fr]"
        )}
      >
        <ChannelRail
          active={channelFilter}
          onChange={(v) =>
            setParam(
              "channel",
              v === "all" ? null : v
            )
          }
          locationId={selectedLocationId}
          pusherChannel={null}
        />

        <ConversationList
          filters={{
            locationId:
              selectedLocationId,

            channel:
              channelFilter === "all"
                ? undefined
                : channelFilter,

            status:
              (searchParams.get(
                "status"
              ) as
                | "open"
                | "snoozed"
                | "closed") ??
              "open",

            search:
              searchParams.get("q") ??
              undefined,
          }}
          onFiltersChange={(next) => {
            if (
              next.status !==
              ((searchParams.get(
                "status"
              ) as string) ??
                "open")
            ) {
              setParam(
                "status",
                next.status === "open"
                  ? null
                  : next.status
              );
            }

            if (
              (next.search ?? "") !==
              (searchParams.get("q") ??
                "")
            ) {
              setParam(
                "q",
                next.search ?? null
              );
            }
          }}
          activeId={activeConversationId}
          onPick={(id) =>
            setParam("id", id)
          }
          pusherChannel={null}
        />

        {activeConversationId ? (
          <Thread
            conversationId={
              activeConversationId
            }
          />
        ) : (
          <ThreadEmptyState />
        )}

        {panelOpen ? (
          activeConversationId ? (
            <ContactPanel
              conversationId={
                activeConversationId
              }
              onClose={() =>
                setParam(
                  "panel",
                  "closed"
                )
              }
            />
          ) : (
            <aside className="bg-surface border-l border-border flex items-center justify-center text-sm text-text-secondary px-6 text-center">
              Select a conversation
              to see contact details.
            </aside>
          )
        ) : (
          <FloatingReopenButton
            onClick={() =>
              setParam("panel", null)
            }
          />
        )}
      </div>
    </div>
  );
}

function ThreadEmptyState() {
  return (
    <div className="bg-[#FBFCFD] flex flex-col items-center justify-center gap-3 p-10 text-center">
      <div className="w-16 h-16 rounded-full bg-primary-soft text-primary flex items-center justify-center">
        <MessageSquare size={28} />
      </div>

      <h3 className="text-base font-semibold">
        Select a conversation
      </h3>

      <p className="text-sm text-text-secondary max-w-sm">
        Pick one from the list to load
        the thread.
      </p>
    </div>
  );
}

function FloatingReopenButton({
  onClick,
}: {
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open contact panel"
      className="fixed right-6 bottom-6 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/80"
    >
      <PanelRightOpen size={20} />
    </button>
  );
}