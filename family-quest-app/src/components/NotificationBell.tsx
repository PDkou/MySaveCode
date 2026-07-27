import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import { useNotifications } from '../hooks/useNotifications';
import { formatDateTime } from '../lib/formatDate';
import {
  getNotificationPrefs,
  getPushState,
  isPushSupported,
  setNotificationPref,
  subscribeToPush,
  unsubscribeFromPush,
} from '../lib/pushNotifications';
import type { NotificationEventType, PushState } from '../lib/pushNotifications';

const EVENT_TYPES: NotificationEventType[] = ['due', 'created', 'completed', 'reopened', 'comment'];

export function NotificationBell() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { family, members } = useFamily();
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const bellRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);
  const [pushState, setPushState] = useState<PushState>('unsupported');
  const [pushBusy, setPushBusy] = useState(false);
  const [eventPrefs, setEventPrefs] = useState<Record<NotificationEventType, boolean> | null>(null);

  useEffect(() => {
    if (!isPushSupported()) return;
    void getPushState().then(setPushState);
  }, []);

  useEffect(() => {
    if (!user || !family || pushState !== 'subscribed') {
      setEventPrefs(null);
      return;
    }
    void getNotificationPrefs(user.id, family.id).then(setEventPrefs);
  }, [user, family, pushState]);

  const handleEventPrefToggle = async (eventType: NotificationEventType) => {
    if (!user || !family || !eventPrefs) return;
    const next = !eventPrefs[eventType];
    setEventPrefs({ ...eventPrefs, [eventType]: next });
    try {
      await setNotificationPref(user.id, family.id, eventType, next);
    } catch {
      setEventPrefs((prev) => (prev ? { ...prev, [eventType]: !next } : prev));
    }
  };

  const nameByUserId = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((m) => map.set(m.user_id, m.display_name));
    return map;
  }, [members]);

  // markAllRead fires on CLOSE, not open -- notifications are filtered
  // reactively off the "last seen" timestamp, so marking read on open would
  // make the list empty the instant it's opened, before anyone could read
  // it. Closing (backdrop click, item click-through, or toggling shut) is
  // what "I've seen these" actually means -- next time it's opened, only
  // genuinely new items remain.
  const close = () => {
    setOpen(false);
    markAllRead();
  };

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        // Anchor the dropdown to the bell's actual on-screen position (not
        // CSS-relative to its own tiny wrapper) so it stays fully visible
        // regardless of how the header row happens to wrap on a given
        // device/font -- a wrapped row left the wrapper (and so the
        // absolutely-positioned panel) off past the edge of the screen on
        // some phones. Preferred position is right-aligned under the bell,
        // but clamped on both sides so it can never render partly
        // off-screen even if the bell itself ends up near an edge.
        const rect = bellRef.current?.getBoundingClientRect();
        if (rect) {
          const margin = 8;
          const panelWidth = Math.min(300, window.innerWidth * 0.86);
          const idealLeft = rect.right - panelWidth;
          const maxLeft = window.innerWidth - margin - panelWidth;
          const left = Math.max(margin, Math.min(idealLeft, maxLeft));
          setPanelPos({ top: rect.bottom + 8, left });
        }
      } else {
        markAllRead();
      }
      return next;
    });
  };

  const handlePushToggle = async () => {
    if (!user || !family || pushBusy) return;
    setPushBusy(true);
    try {
      if (pushState === 'subscribed') {
        await unsubscribeFromPush();
        setPushState('unsubscribed');
      } else {
        await subscribeToPush(user.id, family.id);
        setPushState('subscribed');
      }
    } catch {
      setPushState(await getPushState());
    } finally {
      setPushBusy(false);
    }
  };

  return (
    <div className="notification-bell-wrap">
      <button ref={bellRef} type="button" className="notification-bell" onClick={toggle} aria-label={t('notifications.title')}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <>
          <div className="notification-backdrop" onClick={close} />
          <div
            className="notification-panel"
            style={panelPos ? { top: panelPos.top, left: panelPos.left } : undefined}
          >
            <div className="notification-panel-header">{t('notifications.title')}</div>

            {pushState !== 'unsupported' && (
              <div className="notification-push-row">
                <span>{t('notifications.pushLabel')}</span>
                {pushState === 'denied' ? (
                  <span className="notification-push-denied">{t('notifications.pushDenied')}</span>
                ) : (
                  <button
                    type="button"
                    className={`push-switch ${pushState === 'subscribed' ? 'push-switch-on' : ''}`}
                    role="switch"
                    aria-checked={pushState === 'subscribed'}
                    disabled={pushBusy}
                    onClick={() => void handlePushToggle()}
                  >
                    <span className="push-switch-knob" />
                  </button>
                )}
              </div>
            )}

            {pushState === 'subscribed' && eventPrefs && (
              <div className="notification-event-prefs">
                {EVENT_TYPES.map((eventType) => (
                  <div key={eventType} className="notification-push-row notification-event-pref-row">
                    <span>{t(`notifications.eventPrefs.${eventType}`)}</span>
                    <button
                      type="button"
                      className={`push-switch push-switch-small ${eventPrefs[eventType] ? 'push-switch-on' : ''}`}
                      role="switch"
                      aria-checked={eventPrefs[eventType]}
                      onClick={() => void handleEventPrefToggle(eventType)}
                    >
                      <span className="push-switch-knob" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {notifications.length === 0 ? (
              <p className="empty-message">{t('notifications.empty')}</p>
            ) : (
              <ul className="notification-list">
                {notifications.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="notification-item"
                      onClick={() => {
                        close();
                        navigate(`/task/${item.task_id}`);
                      }}
                    >
                      <span className="notification-item-text">
                        {item.kind === 'activity'
                          ? t(`taskDetail.activity.${item.action}`, { name: nameByUserId.get(item.actor_id) ?? '' })
                          : t('notifications.newComment', { name: nameByUserId.get(item.actor_id) ?? '' })}
                      </span>
                      <span className="notification-item-title">{item.taskTitle}</span>
                      {item.kind === 'comment' && <span className="notification-item-body">{item.body}</span>}
                      <span className="notification-item-time">{formatDateTime(item.created_at, i18n.language)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
