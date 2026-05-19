"use client";

import {
  AtSign,
  Aperture,
  Briefcase,
  Globe,
  MessageCircle,
  MessageSquare,
  MessagesSquare,
  Music,
  Phone,
  type LucideIcon,
} from "lucide-react";

import {
  useChannelCounts,
  type ChannelKey,
} from "@/hooks/use-channel-counts";

import { cn } from "@/lib/utils";

type RailItem = {
  id: ChannelKey;
  name: string;
  icon: LucideIcon;
  enabled: boolean;

  /** Either a single brand color or a multi-stop gradient. */
  background: string;
};

// Lucide 1.x removed brand icons (trademark concerns)
// so we use generic glyphs + brand colors.

const ITEMS: RailItem[] = [
  {
    id: "whatsapp",
    name: "WhatsApp",
    icon: MessageCircle,
    enabled: true,
    background: "var(--color-c-whatsapp)",
  },

  {
    id: "messenger",
    name: "Messenger",
    icon: MessageSquare,
    enabled: true,
    background: "var(--color-c-messenger)",
  },

  {
    id: "instagram",
    name: "Instagram",
    icon: Aperture,
    enabled: true,
    background:
      "linear-gradient(135deg, #F58529, #DD2A7B, #8134AF)",
  },

  {
    id: "tiktok",
    name: "TikTok",
    icon: Music,
    enabled: false,
    background: "var(--color-c-tiktok)",
  },

  {
    id: "linkedin",
    name: "LinkedIn",
    icon: Briefcase,
    enabled: false,
    background: "var(--color-c-linkedin)",
  },

  {
    id: "webchat",
    name: "Webchat",
    icon: Globe,
    enabled: false,
    background: "var(--color-c-webchat)",
  },

  {
    id: "email",
    name: "Email",
    icon: AtSign,
    enabled: false,
    background: "var(--color-c-email)",
  },

  {
    id: "sms",
    name: "SMS",
    icon: Phone,
    enabled: false,
    background: "var(--color-c-sms)",
  },
];

export function ChannelRail({
  active,
  onChange,
  locationId,
  pusherChannel,
}: {
  active: ChannelKey;

  onChange: (next: ChannelKey) => void;

  locationId: string | "all";

  pusherChannel: string | null;
}) {
  const { counts } = useChannelCounts(
    locationId,
    pusherChannel
  );

  return (
    <aside className="bg-canvas border-r border-border flex flex-col items-center gap-2.5 py-4 overflow-y-auto">
      <RailTile
        name="All channels"
        tooltip="All channels"
        icon={MessagesSquare}
        background="#1A1F2E"
        enabled
        unread={counts.all}
        active={active === "all"}
        onClick={() => onChange("all")}
      />

      <div
        className="w-6 h-px bg-border my-1"
        aria-hidden
      />

      {ITEMS.map((item) => (
        <RailTile
          key={item.id}
          name={item.name}
          tooltip={
            item.enabled
              ? item.name
              : `${item.name} — Coming soon. Connect via HighLevel.`
          }
          icon={item.icon}
          background={item.background}
          enabled={item.enabled}
          unread={counts[item.id]}
          active={active === item.id}
          onClick={
            item.enabled
              ? () => onChange(item.id)
              : undefined
          }
        />
      ))}
    </aside>
  );
}

function RailTile({
  name,
  tooltip,
  icon: Icon,
  background,
  enabled,
  unread,
  active,
  onClick,
}: {
  name: string;

  tooltip: string;

  icon: LucideIcon;

  background: string;

  enabled: boolean;

  unread: number;

  active: boolean;

  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={tooltip}
      aria-label={`${name}${
        unread > 0
          ? `, ${unread} unread`
          : ""
      }`}
      disabled={!enabled}
      className={cn(
        "relative w-14 h-14 rounded-2xl bg-surface shadow-sm border border-transparent transition-all flex items-center justify-center",

        enabled
          ? "hover:-translate-y-px hover:shadow-md cursor-pointer"
          : "cursor-not-allowed opacity-60 grayscale",

        active &&
          enabled &&
          "border-primary/20 shadow-md scale-105"
      )}
    >
      {active && enabled && (
        <span
          className="absolute -left-2.5 top-2.5 bottom-2.5 w-[3px] bg-primary rounded-r"
          aria-hidden
        />
      )}

      <span
        className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white"
        style={{ background }}
      >
        <Icon size={18} />
      </span>

      {unread > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-unread-badge text-white text-[10px] font-bold flex items-center justify-center px-1.5 border-2 border-canvas">
          {unread > 99
            ? "99+"
            : unread}
        </span>
      )}
    </button>
  );
}