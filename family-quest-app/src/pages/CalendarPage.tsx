import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { useFamily } from '../context/FamilyContext';
import { useTasks } from '../context/TasksContext';
import { TaskCard } from '../components/TaskCard';
import { EmptyState } from '../components/EmptyState';
import { getTaskPhotoUrls } from '../lib/taskPhotos';
import type { TaskRow } from '../types/database';

function toDateKey(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function CalendarPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { members } = useFamily();
  const { tasks, assigneesByTaskId } = useTasks();

  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [photoUrlByPath, setPhotoUrlByPath] = useState<Map<string, string>>(new Map());

  const locale = i18n.language === 'ja' ? 'ja-JP' : 'ko-KR';

  const nameByUserId = useMemo(() => {
    const map = new Map<string, string>();
    members.forEach((m) => map.set(m.user_id, m.display_name));
    return map;
  }, [members]);

  const assigneeLabel = (taskId: string) => {
    const ids = assigneesByTaskId.get(taskId) ?? [];
    if (ids.length === 0) return t('dashboard.unassigned');
    if (ids.length > 1 && ids.length === members.length) return t('taskForm.everyone');
    return ids.map((id) => nameByUserId.get(id) ?? '').join(', ');
  };

  const tasksByDateKey = useMemo(() => {
    const map = new Map<string, TaskRow[]>();
    tasks.forEach((task) => {
      if (!task.due_at) return;
      const key = toDateKey(new Date(task.due_at));
      const list = map.get(key) ?? [];
      list.push(task);
      map.set(key, list);
    });
    return map;
  }, [tasks]);

  // First completion photo found per date key -- a small preview thumbnail
  // shown on the day cell, not the full gallery.
  const thumbnailPathByDateKey = useMemo(() => {
    const map = new Map<string, string>();
    tasksByDateKey.forEach((dayTasks, key) => {
      const withPhoto = dayTasks.find((task) => task.status === 'done' && task.completion_photo_path);
      if (withPhoto?.completion_photo_path) map.set(key, withPhoto.completion_photo_path);
    });
    return map;
  }, [tasksByDateKey]);

  useEffect(() => {
    const paths = Array.from(new Set(thumbnailPathByDateKey.values()));
    if (paths.length === 0) {
      setPhotoUrlByPath(new Map());
      return;
    }
    let cancelled = false;
    void getTaskPhotoUrls(paths).then((map) => {
      if (!cancelled) setPhotoUrlByPath(map);
    });
    return () => {
      cancelled = true;
    };
  }, [thumbnailPathByDateKey]);

  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long' }).format(cursor),
    [cursor, locale],
  );

  const weekdayLabels = useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
    // Reference week Mon 2024-01-01 .. Sun 2024-01-07.
    return Array.from({ length: 7 }, (_, i) => formatter.format(new Date(2024, 0, 1 + i)));
  }, [locale]);

  const gridDays = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const daysSinceMonday = (firstOfMonth.getDay() + 6) % 7;
    const gridStart = new Date(year, month, 1 - daysSinceMonday);
    return Array.from(
      { length: 42 },
      (_, i) => new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i),
    );
  }, [cursor]);

  const todayKey = toDateKey(new Date());
  const selectedKey = selectedDate ? toDateKey(selectedDate) : null;
  const selectedTasks = selectedKey ? tasksByDateKey.get(selectedKey) ?? [] : [];

  const goToMonth = (offset: number) => {
    setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  return (
    <div className="screen calendar-screen">
      <div className="topbar">
        <button type="button" className="btn btn-ghost" onClick={() => navigate('/')}>
          {t('common.back')}
        </button>
        <div className="topbar-actions calendar-nav">
          <button type="button" className="btn btn-ghost btn-icon" onClick={() => goToMonth(-1)} aria-label={t('calendar.prevMonth')}>
            {'‹'}
          </button>
          <h1 className="calendar-month-label">{monthLabel}</h1>
          <button type="button" className="btn btn-ghost btn-icon" onClick={() => goToMonth(1)} aria-label={t('calendar.nextMonth')}>
            {'›'}
          </button>
        </div>
      </div>

      <div className="calendar-card">
        <div className="calendar-weekday-row">
          {weekdayLabels.map((label, i) => (
            <span
              key={label}
              className={i === 5 ? 'calendar-weekday-sat' : i === 6 ? 'calendar-weekday-sun' : undefined}
            >
              {label}
            </span>
          ))}
        </div>

        <div className="calendar-grid">
          {gridDays.map((day) => {
            const key = toDateKey(day);
            const inMonth = day.getMonth() === cursor.getMonth();
            const dayTasks = tasksByDateKey.get(key) ?? [];
            const openCount = dayTasks.filter((task) => task.status === 'open').length;
            const weekday = day.getDay();
            const thumbnailPath = thumbnailPathByDateKey.get(key);
            const thumbnailUrl = thumbnailPath ? photoUrlByPath.get(thumbnailPath) : undefined;
            return (
              <button
                type="button"
                key={key}
                className={[
                  'calendar-day',
                  inMonth ? '' : 'calendar-day-outside',
                  key === todayKey ? 'calendar-day-today' : '',
                  key === selectedKey ? 'calendar-day-selected' : '',
                  weekday === 6 ? 'calendar-day-sat' : '',
                  weekday === 0 ? 'calendar-day-sun' : '',
                ].filter(Boolean).join(' ')}
                onClick={() => setSelectedDate(key === selectedKey ? null : day)}
              >
                {thumbnailUrl && <img src={thumbnailUrl} alt="" className="calendar-day-photo" />}
                <span className="calendar-day-number">{day.getDate()}</span>
                {dayTasks.length > 0 && (
                  <span className={`calendar-day-count ${openCount > 0 ? '' : 'calendar-day-count-done'}`}>
                    {dayTasks.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="task-detail-section">
          <h2>{new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(selectedDate)}</h2>
          {selectedTasks.length === 0 ? (
            <EmptyState message={t('calendar.noTasksOnDay')} />
          ) : (
            <div className="task-list">
              {selectedTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  assigneeLabel={assigneeLabel(task.id)}
                  creatorName={nameByUserId.get(task.created_by) ?? null}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
