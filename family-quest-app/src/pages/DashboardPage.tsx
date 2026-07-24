import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { useFamily } from '../context/FamilyContext';
import { useTasks } from '../context/TasksContext';
import { LanguageSwitch } from '../components/LanguageSwitch';
import { ThemeToggle } from '../components/ThemeToggle';
import { TaskCard } from '../components/TaskCard';
import { NewTaskModal } from '../components/NewTaskModal';
import { EditNameModal } from '../components/EditNameModal';
import { EditFamilyNameModal } from '../components/EditFamilyNameModal';
import { Spinner } from '../components/Spinner';
import { EmptyState } from '../components/EmptyState';
import { startOfThisWeek } from '../lib/formatDate';

type Filter = 'open' | 'done' | 'all';

export function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signOut, profile, user } = useAuth();
  const { family, members } = useFamily();
  const { tasks, assigneesByTaskId, loading, refresh, requestDelete } = useTasks();

  const [filter, setFilter] = useState<Filter>('open');
  const [onlyMine, setOnlyMine] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showEditName, setShowEditName] = useState(false);
  const [showEditFamilyName, setShowEditFamilyName] = useState(false);
  const [copied, setCopied] = useState(false);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const nameByUserId = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((m) => map.set(m.user_id, m.display_name));
    return map;
  }, [members]);

  const weeklyCompletedCount = useMemo(() => {
    const weekStart = startOfThisWeek();
    return tasks.filter(
      (task) => task.status === 'done' && task.completed_at && new Date(task.completed_at) >= weekStart,
    ).length;
  }, [tasks]);

  const assigneeLabel = (taskId: string) => {
    const ids = assigneesByTaskId.get(taskId) ?? [];
    if (ids.length === 0) return t('dashboard.unassigned');
    if (ids.length > 1 && ids.length === members.length) return t('taskForm.everyone');
    return ids.map((id) => nameByUserId.get(id) ?? '').join(', ');
  };

  const filteredTasks = useMemo(() => {
    let result = filter === 'all' ? tasks : tasks.filter((task) => task.status === filter);
    if (onlyMine && user) {
      result = result.filter((task) => (assigneesByTaskId.get(task.id) ?? []).includes(user.id));
    }
    return result;
  }, [tasks, filter, onlyMine, user, assigneesByTaskId]);

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

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const toggleSelect = (taskId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds((prev) =>
      prev.size === filteredTasks.length ? new Set() : new Set(filteredTasks.map((task) => task.id)),
    );
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    requestDelete(Array.from(selectedIds));
    exitSelectMode();
  };

  const emptyMessageKey =
    filter === 'open' ? 'dashboard.emptyOpen' : filter === 'done' ? 'dashboard.emptyDone' : 'dashboard.emptyAll';

  return (
    <div className="screen dashboard-screen">
      <div className="topbar">
        <div className="family-info">
          <button type="button" className="app-title app-title-button" onClick={() => setShowEditFamilyName(true)}>
            {family?.name ?? t('app.name')}
          </button>
          <div className="family-meta">
            <span>{t('family.memberCount', { count: members.length })}</span>
            <span>{t('dashboard.weeklyCompleted', { count: weeklyCompletedCount })}</span>
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
          <ThemeToggle />
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
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/calendar')}>
          {t('calendar.openButton')}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
        >
          {selectMode ? t('common.cancel') : t('dashboard.selectButton')}
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

      <label className="only-mine-toggle">
        <input type="checkbox" checked={onlyMine} onChange={(e) => setOnlyMine(e.target.checked)} />
        <span>{t('dashboard.onlyMine')}</span>
      </label>

      {selectMode && (
        <div className="bulk-action-bar">
          <label className="checkbox-row bulk-select-all">
            <input
              type="checkbox"
              checked={filteredTasks.length > 0 && selectedIds.size === filteredTasks.length}
              onChange={toggleSelectAll}
            />
            <span>{t('dashboard.selectedCount', { count: selectedIds.size })}</span>
          </label>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleBulkDelete}
            disabled={selectedIds.size === 0}
          >
            {t('dashboard.deleteSelected')}
          </button>
        </div>
      )}

      <div className="task-list">
        {loading ? (
          <Spinner label={t('common.loading')} />
        ) : filteredTasks.length === 0 ? (
          <EmptyState message={t(emptyMessageKey)} />
        ) : (
          filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              assigneeLabel={assigneeLabel(task.id)}
              creatorName={nameByUserId.get(task.created_by) ?? null}
              selectable={selectMode}
              selected={selectedIds.has(task.id)}
              onToggleSelect={toggleSelect}
            />
          ))
        )}
      </div>

      {showNewTask && <NewTaskModal members={members} onClose={() => setShowNewTask(false)} />}
      {showEditName && profile && (
        <EditNameModal currentName={profile.display_name} onClose={() => setShowEditName(false)} />
      )}
      {showEditFamilyName && family && (
        <EditFamilyNameModal currentName={family.name} onClose={() => setShowEditFamilyName(false)} />
      )}
    </div>
  );
}
