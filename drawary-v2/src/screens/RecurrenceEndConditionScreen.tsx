import { useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import './RecurrenceEndConditionScreen.css';
import { t } from '../i18n';

export type RecurrenceEndCondition =
  | { kind: 'never' }
  | { kind: 'count'; count: number }
  | { kind: 'date'; endDate: string };

export interface RecurrenceEndConditionScreenProps {
  targetName: string;
  dateFieldName: string;
  cycleLabel: string;
  initial?: RecurrenceEndCondition;
  onBack?: () => void;
  onSubmit?: (value: RecurrenceEndCondition) => void;
}

// Exported so #37 (which only displays an already-committed condition)
// can format the same label without duplicating this mapping.
export function endConditionLabel(condition: RecurrenceEndCondition): string {
  if (condition.kind === 'never') return t('계속 만들기');
  if (condition.kind === 'count') return t('{count}개 생성 후 종료', { count: condition.count });
  return condition.endDate ? t('{endDate}까지', { endDate: condition.endDate }) : t('날짜 정하기');
}

/**
 * #36 반복 종료 조건. Ported from `Drawary_36_FINAL_CONFIRMED_CODE`'s
 * `RecurrenceEndConditionScreen.tsx`/`recurrence-end-condition.css` --
 * only asset paths remapped. The archive's own CSS never styles the
 * bare `<input type="date">` rendered for the "날짜 정하기" branch;
 * added a `.red-detail input` rule below matching this screen's other
 * field styling rather than leaving it unstyled browser-default.
 * Reached from #35's "다음"; "반복 설정하기" -> #37 (and is where
 * App.tsx actually appends the new rule to `recurrenceRules`, since
 * this is the last step with user input before the summary screen).
 */
export function RecurrenceEndConditionScreen({
  targetName,
  dateFieldName,
  cycleLabel,
  initial = { kind: 'never' },
  onBack,
  onSubmit,
}: RecurrenceEndConditionScreenProps) {
  const [condition, setCondition] = useState<RecurrenceEndCondition>(initial);

  const options = [
    { kind: 'never' as const, title: t('계속 만들기'), desc: t('직접 멈출 때까지 계속 새 보관품을 만들어요.'), icon: '/assets/ui-icons/icon_refresh.webp' },
    { kind: 'count' as const, title: t('횟수 정하기'), desc: t('정한 횟수만큼 만든 뒤 자동으로 끝나요.'), icon: '/assets/ui-icons/icon_refresh.webp' },
    { kind: 'date' as const, title: t('날짜 정하기'), desc: t('정한 날짜까지만 새 보관품을 만들어요.'), icon: '/assets/ui-icons/icon_calendar.webp' },
  ];

  const selectKind = (kind: 'never' | 'count' | 'date') => {
    if (kind === 'never') setCondition({ kind: 'never' });
    if (kind === 'count') setCondition({ kind: 'count', count: 12 });
    if (kind === 'date') setCondition({ kind: 'date', endDate: '' });
  };

  const canSubmit =
    condition.kind === 'never' ||
    (condition.kind === 'count' && condition.count >= 1) ||
    (condition.kind === 'date' && Boolean(condition.endDate));

  return (
    <main className="red-screen">
      <ScreenHeader title={t('반복 종료 설정')} onBack={onBack} height={88} />

      <section className="red-summary">
        <span className="red-summary-icon"><img src="/assets/field-types/field_date.webp" alt="" /></span>
        <span className="red-summary-copy">
          <strong>{targetName}</strong>
          <span>{dateFieldName} · {cycleLabel}</span>
        </span>
        <span className="red-summary-tag">{t('새 보관품 생성')}</span>
      </section>

      <section className="red-intro">
        <h2>{t('새 보관품을 언제까지 만들까요?')}</h2>
        <p>{t('반복을 계속할지, 횟수나 날짜를 정해 끝낼지 선택해 주세요.')}</p>
      </section>

      <div className="red-options">
        {options.map((item) => {
          const active = condition.kind === item.kind;
          return (
            <button
              className={`red-option${active ? ' selected' : ''}`}
              type="button"
              key={item.kind}
              onClick={() => selectKind(item.kind)}
            >
              <span className="red-opt-icon"><img src={item.icon} alt="" /></span>
              <span className="red-opt-copy">
                <strong>{item.title}</strong>
                <span>{item.desc}</span>
              </span>
              <span className="red-radio">{active ? '✓' : ''}</span>
            </button>
          );
        })}
      </div>

      {condition.kind === 'count' && (
        <div className="red-detail">
          <div className="red-detail-copy">
            <strong>{t('몇 개를 만들고 끝낼까요?')}</strong>
            <span>{t('현재 보관품은 횟수에 포함하지 않아요.')}</span>
          </div>
          <div className="red-stepper">
            <button type="button" onClick={() => setCondition({ kind: 'count', count: Math.max(1, condition.count - 1) })}>−</button>
            <strong>{t('{n}개', { n: condition.count })}</strong>
            <button type="button" onClick={() => setCondition({ kind: 'count', count: Math.min(999, condition.count + 1) })}>＋</button>
          </div>
        </div>
      )}

      {condition.kind === 'date' && (
        <div className="red-detail">
          <div className="red-detail-copy">
            <strong>{t('마지막 기준 날짜')}</strong>
            <span>{t('이 날짜를 넘기면 더 이상 만들지 않아요.')}</span>
          </div>
          <input
            type="date"
            value={condition.endDate}
            onChange={(e) => setCondition({ kind: 'date', endDate: e.target.value })}
          />
        </div>
      )}

      <div className="red-note">{t('종료 조건은 나중에 반복 관리에서 언제든 바꿀 수 있어요.')}</div>

      <div className="red-actions">
        <button className="red-prev" type="button" onClick={onBack}>{t('이전')}</button>
        <button className="red-next" type="button" disabled={!canSubmit} onClick={() => canSubmit && onSubmit?.(condition)}>
          
          {t('반복 설정하기')}
        </button>
      </div>
    </main>
  );
}
