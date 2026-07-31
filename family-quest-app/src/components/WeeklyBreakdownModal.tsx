import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useFamily } from '../context/FamilyContext';
import { useTasks } from '../context/TasksContext';
import { AvatarChip } from './AvatarChip';
import { ModalHeader } from './ModalHeader';
import { startOfThisWeek } from '../lib/formatDate';
import { questCountsTowardRanking } from '../lib/questRules';

interface WeeklyBreakdownModalProps {
  onClose: () => void;
}

// Wraps a CSV field in quotes and escapes embedded quotes only when needed
// -- keeps the common case (plain names/titles) readable if opened as text.
function csvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function WeeklyBreakdownModal({ onClose }: WeeklyBreakdownModalProps) {
  const { t, i18n } = useTranslation();
  const { family, members, avatarUrlByUserId } = useFamily();
  const { tasks, assigneesByTaskId } = useTasks();

  const STREAK_HIGHLIGHT_THRESHOLD = 3;

  const weekStart = useMemo(() => startOfThisWeek(), []);

  const completedThisWeek = useMemo(
    () =>
      tasks.filter(
        (task) =>
          task.status === 'done' &&
          task.completed_at &&
          task.completed_by &&
          new Date(task.completed_at) >= weekStart &&
          questCountsTowardRanking(task.created_by, task.completed_by, assigneesByTaskId.get(task.id)?.length ?? 0, members.length),
      ),
    [tasks, weekStart, assigneesByTaskId, members.length],
  );

  const rows = useMemo(() => {
    const countByUser = new Map<string, number>();
    completedThisWeek.forEach((task) => {
      countByUser.set(task.completed_by!, (countByUser.get(task.completed_by!) ?? 0) + 1);
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
  }, [completedThisWeek, members]);

  const total = rows.reduce((sum, row) => sum + row.count, 0);

  const handleExportCsv = () => {
    const nameByUserId = new Map(members.map((m) => [m.user_id, m.display_name]));
    const header = [t('weeklyBreakdown.csvTitle'), t('weeklyBreakdown.csvAssignee'), t('weeklyBreakdown.csvCompletedAt')];
    const lines = [header.map(csvField).join(',')];
    completedThisWeek
      .slice()
      .sort((a, b) => new Date(a.completed_at!).getTime() - new Date(b.completed_at!).getTime())
      .forEach((task) => {
        const assigneeName = nameByUserId.get(task.completed_by!) ?? '';
        const completedAt = new Date(task.completed_at!).toLocaleString(i18n.language === 'ja' ? 'ja-JP' : 'ko-KR');
        lines.push([task.title, assigneeName, completedAt].map(csvField).join(','));
      });
    // Leading BOM so Excel (still the most common CSV opener) detects UTF-8
    // instead of misreading Korean/Japanese text as a legacy codepage.
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateLabel = weekStart.toISOString().slice(0, 10);
    a.href = url;
    a.download = `weekly-report-${dateLabel}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <ModalHeader title={t('weeklyBreakdown.heading')} onClose={onClose} />

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

        {family?.room_type === 'business' && total > 0 && (
          <button type="button" className="btn btn-secondary btn-block" onClick={handleExportCsv}>
            {t('weeklyBreakdown.exportCsv')}
          </button>
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
