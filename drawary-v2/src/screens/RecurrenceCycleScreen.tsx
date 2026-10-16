import { useMemo, useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import './RecurrenceCycleScreen.css';

export type RecurrenceCycle = 'weekly' | 'monthly' | 'yearly';

export interface RecurrenceCycleScreenProps {
  targetName: string;
  dateFieldName: string;
  initialCycle?: RecurrenceCycle;
  initialInterval?: number;
  onBack?: () => void;
  onNext?: (value: { cycle: RecurrenceCycle; interval: number }) => void;
}

// Exported so #36/#37 (which only display an already-committed
// cycle+interval, not edit it) can format the same "N개월마다" label
// without duplicating this mapping.
export const CYCLE_META = {
  weekly: { label: '매주', sub: '같은 요일', unit: '주', question: '몇 주마다 만들까요?', image: '/assets/states/recurrence/state_recurrence_weekly.webp' },
  monthly: { label: '매달', sub: '같은 날짜', unit: '개월', question: '몇 개월마다 만들까요?', image: '/assets/states/recurrence/state_recurrence_monthly.webp' },
  yearly: { label: '매년', sub: '같은 월·일', unit: '년', question: '몇 년마다 만들까요?', image: '/assets/states/recurrence/state_recurrence_yearly.webp' },
} as const;

export function cycleLabel(cycle: RecurrenceCycle, interval: number): string {
  return `${interval}${CYCLE_META[cycle].unit}마다`;
}

/**
 * #35 매주 / 매월 / 매년 설정. Ported from
 * `Drawary_35_FINAL_CONFIRMED_CODE`'s `RecurrenceCycleSettings.tsx`/
 * `recurrence-cycle.css` -- only asset paths remapped and the component
 * renamed for this app's `*Screen` convention (`cycleMeta` -> exported
 * `CYCLE_META`, reused by #36/#37 below). CONFIRMED.md: 반복 방식은
 * 기존 보관품 갱신이 아니라 새 보관품 생성. Reached from #34's "다음";
 * "다음" here -> #36.
 */
export function RecurrenceCycleScreen({
  targetName,
  dateFieldName,
  initialCycle = 'monthly',
  initialInterval = 1,
  onBack,
  onNext,
}: RecurrenceCycleScreenProps) {
  const [cycle, setCycle] = useState<RecurrenceCycle>(initialCycle);
  const [interval, setInterval] = useState(Math.max(1, initialInterval));
  const meta = useMemo(() => CYCLE_META[cycle], [cycle]);

  return (
    <main className="rc-screen">
      <ScreenHeader title="반복 주기 설정" onBack={onBack} height={88} />

      <section className="rc-summary">
        <span className="rc-summary-icon"><img src="/assets/field-types/field_date.webp" alt="" /></span>
        <span className="rc-summary-copy">
          <strong>{targetName}</strong>
          <span>기준 날짜 · {dateFieldName}</span>
        </span>
        <span className="rc-summary-tag">새 보관품 생성</span>
      </section>

      <section className="rc-intro">
        <h2>얼마마다 새 보관품을 만들까요?</h2>
        <p>반복 주기를 선택해 주세요.</p>
      </section>

      <div className="rc-cycle-grid">
        {(Object.keys(CYCLE_META) as RecurrenceCycle[]).map((key) => {
          const item = CYCLE_META[key];
          const active = key === cycle;
          return (
            <button
              className={`rc-cycle${active ? ' selected' : ''}`}
              type="button"
              key={key}
              onClick={() => { setCycle(key); setInterval(1); }}
            >
              {active && <span className="rc-check">✓</span>}
              <img src={item.image} alt="" />
              <strong>{item.label}</strong>
              <span>{item.sub}</span>
            </button>
          );
        })}
      </div>

      <div className="rc-section-label">반복 간격</div>
      <section className="rc-interval-card">
        <div className="rc-interval-copy">
          <strong>{meta.question}</strong>
          <span>선택한 주기에 맞춰 다음 보관품을 만들어요.</span>
        </div>
        <div className="rc-stepper">
          <button type="button" aria-label="감소" onClick={() => setInterval((v) => Math.max(1, v - 1))}>−</button>
          <strong>{interval}{meta.unit}</strong>
          <button type="button" aria-label="증가" onClick={() => setInterval((v) => Math.min(99, v + 1))}>＋</button>
        </div>
      </section>

      <div className="rc-preview">
        {dateFieldName}을 기준으로 {interval}{meta.unit}마다 새 보관품을 만들어요.
      </div>

      <div className="rc-actions">
        <button className="rc-prev" type="button" onClick={onBack}>이전</button>
        <button className="rc-next" type="button" onClick={() => onNext?.({ cycle, interval })}>
          다음
        </button>
      </div>
    </main>
  );
}
