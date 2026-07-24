import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import { useTasks } from '../context/TasksContext';
import { LanguageSwitch } from '../components/LanguageSwitch';
import { TaskCard } from '../components/TaskCard';
import { NewTaskModal } from '../components/NewTaskModal';
import { EditNameModal } from '../components/EditNameModal';

type Filter = 'open' | 'done' | 'all';

export function DashboardPage() {
  const { t } = useTranslation();
  const { signOut, profile } = useAuth();
  const { family, members } = useFamily();
  const { tasks, loading, refresh } = useTasks();

  const [filter, setFilter] = useState<Filter>('open');
  const [showNewTask, setShowNewTask] = useState(false);
  const [showEditName, setShowEditName] = useState(false);
  const [copied, setCopied] = useState(false);

  const nameByUserId = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((m) => map.set(m.user_id, m.display_name));
    return map;
  }, [members]);

  const filteredTasks = useMemo(() => {
    if (filter === 'all') return tasks;
    return tasks.filter((task) => task.status === filter);
  }, [tasks, filter]);

  const handleCopyInviteCode = async () => {
    if (!family) return;
    try {
      await navigator.clipboard.writeText(family.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can be unavailable (older iOS Safari without a user
      // gesture context); the code is still visible on screen to copy by hand.
    }
  };

  const emptyMessageKey =
    filter === 'open' ? 'dashboard.emptyOpen' : filter === 'done' ? 'dashboard.emptyDone' : 'dashboard.emptyAll';

  return (
    <div className="screen dashboard-screen">
      <div className="topbar">
        <div className="family-info">
          <h1 className="app-title">{family?.name ?? t('app.name')}</h1>
          <div className="family-meta">
            <span>{t('family.memberCount', { count: members.length })}</span>
            {family && (
              <button type="button" className="invite-code-chip" onClick={() => void handleCopyInviteCode()}>
                {family.invite_code} {copied ? `(${t('common.copied')})` : ''}
              </button>
            )}
          </div>
        </div>
        <div className="topbar-actions">
          {profile && (
            <button type="button" className="btn btn-ghost" onClick={() => setShowEditName(true)}>
              {profile.display_name}
            </button>
          )}
          <LanguageSwitch />
          <button type="button" className="btn btn-ghost" onClick={() => void signOut()}>
            {t('auth.logout')}
          </button>
        </div>
      </div>

      <div className="dashboard-toolbar">
        <button type="button" className="btn btn-primary" onClick={() => setShowNewTask(true)}>
          {t('dashboard.newTask')}
        </button>
        <button type="button" className="btn btn-ghost btn-icon" onClick={() => void refresh()} aria-label={t('dashboard.refresh')}>
          {t('dashboard.refresh')}
        </button>
      </div>

      <div className="filter-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'open'}
          className={`filter-tab ${filter === 'open' ? 'filter-tab-active' : ''}`}
          onClick={() => setFilter('open')}
        >
          {t('dashboard.filterOpen')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'done'}
          className={`filter-tab ${filter === 'done' ? 'filter-tab-active' : ''}`}
          onClick={() => setFilter('done')}
        >
          {t('dashboard.filterDone')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={filter === 'all'}
          className={`filter-tab ${filter === 'all' ? 'filter-tab-active' : ''}`}
          onClick={() => setFilter('all')}
        >
          {t('dashboard.filterAll')}
        </button>
      </div>

      <div className="task-list">
        {loading ? (
          <p className="empty-message">{t('common.loading')}</p>
        ) : filteredTasks.length === 0 ? (
          <p className="empty-message">{t(emptyMessageKey)}</p>
        ) : (
          filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              assigneeName={task.assigned_to ? nameByUserId.get(task.assigned_to) ?? null : null}
              creatorName={nameByUserId.get(task.created_by) ?? null}
            />
          ))
        )}
      </div>

      {showNewTask && <NewTaskModal members={members} onClose={() => setShowNewTask(false)} />}
      {showEditName && profile && (
        <EditNameModal currentName={profile.display_name} onClose={() => setShowEditName(false)} />
      )}
    </div>
  );
}
