"use client"

import { useRealtimeNotifications } from "@/components/providers/realtime-notifications-provider"
import { cn } from "@workspace/ui/lib/utils"

type RealtimeNotificationBadgeProps = {
  className?: string
}

function RealtimeNotificationBadge({
  className,
}: RealtimeNotificationBadgeProps) {
  const { unreadCount } = useRealtimeNotifications()

  if (!unreadCount || unreadCount < 1) {
    return null
  }

  return (
    <span
      aria-label={`${unreadCount} notifiche non lette`}
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[0.65rem] leading-none font-semibold text-primary-foreground",
        className
      )}
      data-notification-badge
      data-unread-count={unreadCount}
    >
      {unreadCount > 99 ? "99+" : unreadCount}
    </span>
  )
}

export { RealtimeNotificationBadge }
