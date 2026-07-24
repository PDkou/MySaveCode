import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import { useNotifications } from '../hooks/useNotifications';
import { formatDateTime } from '../lib/formatDate';
import { getPushState, isPushSupported, subscribeToPush, unsubscribeFromPush } from '../lib/pushNotifications';
import type { PushState } from '../lib/pushNotifications';

export function NotificationBell() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { family, members } = useFamily();
  const { notifications, unreadCount, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const [pushState, setPushState] = useState<PushState>('unsupported');
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) return;
    void getPushState().then(setPushState);
  }, []);

  const nameByUserId = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((m) => map.set(m.user_id, m.display_name));
    return map;
  }, [members]);

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next) markAllRead();
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
      <button type="button" className="notification-bell" onClick={toggle} aria-label={t('notifications.title')}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <>
          <div className="notification-backdrop" onClick={() => setOpen(false)} />
          <div className="notification-panel">
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
                        setOpen(false);
                        navigate(`/task/${item.task_id}`);
                      }}
                    >
                      <span className="notification-item-text">
                        {t(`taskDetail.activity.${item.action}`, { name: nameByUserId.get(item.actor_id) ?? '' })}
                      </span>
                      <span className="notification-item-title">{item.taskTitle}</span>
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
