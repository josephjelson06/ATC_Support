import { Bell, CheckCheck } from 'lucide-react';
import { clsx } from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAsyncData } from '../../hooks/useAsyncData';
import { apiFetch, getErrorMessage } from '../../lib/api';
import { formatDateTime, formatRelativeTime, humanizeEnum } from '../../lib/format';
import type { ApiNotification, NotificationListResponse } from '../../lib/types';

const NOTIFICATION_LIMIT = 8;
const POLL_INTERVAL_MS = 30_000;

export default function NotificationMenu() {
  const navigate = useNavigate();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeNotificationId, setActiveNotificationId] = useState<number | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const notificationsQuery = useAsyncData<NotificationListResponse>(
    () => apiFetch<NotificationListResponse>(`/notifications?limit=${NOTIFICATION_LIMIT}`),
    [],
  );

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      notificationsQuery.reload();
    }, POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [notificationsQuery.reload]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener('mousedown', handlePointerDown);

    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isOpen]);

  const notifications = notificationsQuery.data?.items || [];
  const unreadCount = notificationsQuery.data?.unreadCount || 0;

  const applyNotificationRead = (notificationId: number) => {
    notificationsQuery.setData((current) => {
      if (!current) {
        return current;
      }

      let unreadDelta = 0;
      const nextItems = current.items.map((notification) => {
        if (notification.id !== notificationId || notification.isRead) {
          return notification;
        }

        unreadDelta = 1;

        return {
          ...notification,
          isRead: true,
          readAt: new Date().toISOString(),
        };
      });

      return {
        ...current,
        items: nextItems,
        unreadCount: Math.max(0, current.unreadCount - unreadDelta),
      };
    });
  };

  const handleToggle = () => {
    setIsOpen((current) => {
      const next = !current;

      if (next) {
        notificationsQuery.reload();
      }

      return next;
    });
  };

  const handleMarkRead = async (notification: ApiNotification) => {
    if (notification.isRead) {
      return;
    }

    setActionError(null);
    setActiveNotificationId(notification.id);

    try {
      await apiFetch(`/notifications/${notification.id}/read`, {
        method: 'POST',
      });
      applyNotificationRead(notification.id);
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setActiveNotificationId(null);
    }
  };

  const handleOpenNotification = async (notification: ApiNotification) => {
    if (!notification.isRead) {
      await handleMarkRead(notification);
    }

    setIsOpen(false);

    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) {
      return;
    }

    setActionError(null);
    setIsMarkingAll(true);

    try {
      await apiFetch('/notifications/read-all', {
        method: 'POST',
      });
      notificationsQuery.setData((current) =>
        current
          ? {
              ...current,
              unreadCount: 0,
              items: current.items.map((notification) => ({
                ...notification,
                isRead: true,
                readAt: notification.readAt || new Date().toISOString(),
              })),
            }
          : current,
      );
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setIsMarkingAll(false);
    }
  };

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:border-orange-200 hover:text-orange-600"
        aria-label="Open notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-orange-600 px-1.5 text-[10px] font-black text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="absolute right-0 top-12 z-30 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <h2 className="text-sm font-black text-slate-900">Notifications</h2>
              <p className="text-xs text-slate-500">{unreadCount} unread</p>
            </div>
            <button
              type="button"
              onClick={() => void handleMarkAllRead()}
              disabled={isMarkingAll || unreadCount === 0}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </button>
          </div>

          {actionError ? <p className="border-b border-rose-100 bg-rose-50 px-4 py-2 text-xs text-rose-700">{actionError}</p> : null}

          <div className="max-h-[28rem] overflow-y-auto">
            {notificationsQuery.isLoading && notifications.length === 0 ? (
              <div className="px-4 py-6 text-sm text-slate-500">Loading notifications...</div>
            ) : notificationsQuery.error ? (
              <div className="px-4 py-6">
                <p className="text-sm text-rose-600">{notificationsQuery.error}</p>
                <button
                  type="button"
                  onClick={notificationsQuery.reload}
                  className="mt-3 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-slate-700"
                >
                  Retry
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-sm font-bold text-slate-900">You're all caught up.</p>
                <p className="mt-1 text-xs text-slate-500">New ticket activity will show up here.</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={clsx(
                    'flex items-start gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0',
                    notification.isRead ? 'bg-white' : 'bg-orange-50/50',
                  )}
                >
                  <button type="button" onClick={() => void handleOpenNotification(notification)} className="min-w-0 flex-1 text-left">
                    <div className="flex items-center gap-2">
                      {!notification.isRead ? <span className="h-2 w-2 rounded-full bg-orange-600" /> : null}
                      <p className="truncate text-sm font-bold text-slate-900">{notification.title}</p>
                    </div>
                    <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-400">{humanizeEnum(notification.type)}</p>
                    <p className="mt-2 text-sm text-slate-600">{notification.body}</p>
                    <p className="mt-2 text-xs text-slate-400" title={formatDateTime(notification.createdAt)}>
                      {formatRelativeTime(notification.createdAt)}
                    </p>
                  </button>

                  {!notification.isRead ? (
                    <button
                      type="button"
                      onClick={() => void handleMarkRead(notification)}
                      disabled={activeNotificationId === notification.id}
                      className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-500 transition-colors hover:bg-white hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Mark read
                    </button>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
