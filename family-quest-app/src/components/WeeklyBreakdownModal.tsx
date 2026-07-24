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
  const { members } = useFamily();
  const { tasks } = useTasks();

  const rows = useMemo(() => {
    const weekStart = startOfThisWeek();
    const countByUser = new Map<string, number>();
    tasks.forEach((task) => {
      if (task.status !== 'done' || !task.completed_at || !task.completed_by) return;
      if (new Date(task.completed_at) < weekStart) return;
      countByUser.set(task.completed_by, (countByUser.get(task.completed_by) ?? 0) + 1);
    });
    const maxCount = Math.max(1, ...Array.from(countByUser.values()));
    return members
      .map((member) => ({ member, count: countByUser.get(member.user_id) ?? 0 }))
      .sort((a, b) => b.count - a.count)
      .map((entry) => ({ ...entry, pct: Math.round((entry.count / maxCount) * 100) }));
  }, [tasks, members]);

  const total = rows.reduce((sum, row) => sum + row.count, 0);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t('weeklyBreakdown.heading')}</h2>

        {total === 0 ? (
          <p className="empty-message">{t('weeklyBreakdown.empty')}</p>
        ) : (
          <div className="weekly-breakdown-list">
            {rows.map(({ member, count, pct }) => (
              <div key={member.user_id} className="weekly-breakdown-row">
                <span className="weekly-breakdown-name">
                  <AvatarChip name={member.display_name} size={18} />
                  {member.display_name}
                </span>
                <div className="weekly-breakdown-bar-track">
                  <div className="weekly-breakdown-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="weekly-breakdown-count">{count}</span>
              </div>
            ))}
          </div>
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
