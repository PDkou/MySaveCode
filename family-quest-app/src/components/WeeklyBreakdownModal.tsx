import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useFamily } from '../context/FamilyContext';
import { useTasks } from '../context/TasksContext';
import { AvatarChip } from './AvatarChip';
import { startOfThisWeek } from '../lib/formatDate';

interface WeeklyBreakdownModalProps {
  onClose: () => void;
}

export function WeeklyBreakdownModal({ onClose }: WeeklyBreakdownModalProps) {
  const { t } = useTranslation();
  const { members, avatarUrlByUserId } = useFamily();
  const { tasks } = useTasks();

  const STREAK_HIGHLIGHT_THRESHOLD = 3;

  const rows = useMemo(() => {
    const weekStart = startOfThisWeek();
    const countByUser = new Map<string, number>();
    tasks.forEach((task) => {
      if (task.status !== 'done' || !task.completed_at || !task.completed_by) return;
      if (new Date(task.completed_at) < weekStart) return;
      countByUser.set(task.completed_by, (countByUser.get(task.completed_by) ?? 0) + 1);
    });
    const rawMax = Math.max(0, ...Array.from(countByUser.values()));
    const maxCount = Math.max(1, rawMax);
    return members
      .map((member) => ({ member, count: countByUser.get(member.user_id) ?? 0 }))
      .sort((a, b) => b.count - a.count)
      .map((entry) => ({
        ...entry,
        pct: Math.round((entry.count / maxCount) * 100),
        isMvp: rawMax > 0 && entry.count === rawMax,
      }));
  }, [tasks, members]);

  const total = rows.reduce((sum, row) => sum + row.count, 0);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t('weeklyBreakdown.heading')}</h2>

        {total === 0 ? (
          <p className="empty-message">{t('weeklyBreakdown.empty')}</p>
        ) : (
          <>
            <p className="weekly-breakdown-total">{t('weeklyBreakdown.total', { count: total })}</p>
            <div className="weekly-breakdown-list">
              {rows.map(({ member, count, pct, isMvp }) => (
                <div key={member.user_id} className="weekly-breakdown-row">
                  <span className="weekly-breakdown-name">
                    <AvatarChip name={member.display_name} size={18} photoUrl={avatarUrlByUserId.get(member.user_id)} />
                    {member.display_name}
                    {isMvp && <span className="weekly-breakdown-mvp" title={t('weeklyBreakdown.mvp')}>👑</span>}
                    {member.current_streak >= STREAK_HIGHLIGHT_THRESHOLD && (
                      <span className="weekly-breakdown-streak" title={t('weeklyBreakdown.streak', { count: member.current_streak })}>
                        🔥{member.current_streak}
                      </span>
                    )}
                  </span>
                  <div className="weekly-breakdown-bar-track">
                    <div className="weekly-breakdown-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="weekly-breakdown-count">{count}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn-primary btn-block" onClick={onClose}>
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
