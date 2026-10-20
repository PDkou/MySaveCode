import { ScreenHeader } from '../components/ScreenHeader';
import './RecurrenceCompleteScreen.css';
import { t } from '../i18n';

export interface RecurrenceCompleteScreenProps {
  drawerName: string;
  targetName: string;
  dateFieldName: string;
  cycleLabel: string;
  endLabel: string;
  drawerIconUri?: string;
  onAddAnother?: () => void;
  onDone?: () => void;
}

/**
 * #37 반복 완료. Ported from `Drawary_37_FINAL_CONFIRMED_CODE`'s
 * `RecurrenceComplete.tsx`/`recurrence-complete.css` -- only asset
 * paths remapped. Reached from #36's "반복 설정하기"; "반복 더 추가하기"
 * -> #34; "확인" -> #24 (서랍 관리).
 */
export function RecurrenceCompleteScreen({
  drawerName,
  targetName,
  dateFieldName,
  cycleLabel,
  endLabel,
  drawerIconUri = '/assets/drawer-icons/drawer_icon_cosmetics.webp',
  onAddAnother,
  onDone,
}: RecurrenceCompleteScreenProps) {
  return (
    <main className="rcx-screen">
      <ScreenHeader title={t('반복 설정 완료')} height={88} />

      <div className="rcx-hero">
        <img src="/assets/states/recurrence/state_recurrence_entry_created.webp" alt="" />
      </div>

      <section className="rcx-message">
        <h2>{t('반복 설정을 저장했어요.')}</h2>
        <p>{t('{field}을 기준으로 {cycle} {target} 보관품을 새로 만들어요.', { field: dateFieldName, cycle: cycleLabel, target: targetName })}</p>
      </section>

      <section className="rcx-summary">
        <div className="rcx-row">
          <div className="rcx-icon"><img src={drawerIconUri} alt="" /></div>
          <div className="rcx-copy">
            <span>{t('서랍 · 보관품')}</span>
            <strong>{drawerName} · {targetName}</strong>
          </div>
          <div className="rcx-value">{t('새 보관품 생성')}</div>
        </div>

        <div className="rcx-row">
          <div className="rcx-icon"><img src="/assets/field-types/field_date.webp" alt="" /></div>
          <div className="rcx-copy"><span>{t('기준 날짜')}</span><strong>{dateFieldName}</strong></div>
          <div className="rcx-value"><strong>{cycleLabel}</strong></div>
        </div>

        <div className="rcx-row">
          <div className="rcx-icon"><img src="/assets/ui-icons/icon_refresh.webp" alt="" /></div>
          <div className="rcx-copy"><span>{t('종료 조건')}</span><strong>{endLabel}</strong></div>
          <div className="rcx-value">{t('사용 중')}</div>
        </div>
      </section>

      <div className="rcx-tip">
        
        {t('설정한 반복은 반복 관리에서 언제든 바꾸거나 멈출 수 있어요.')}
      </div>

      <div className="rcx-actions">
        <button className="rcx-add" type="button" onClick={onAddAnother}>{t('반복 더 추가하기')}</button>
        <button className="rcx-done" type="button" onClick={onDone}>{t('확인')}</button>
      </div>
    </main>
  );
}
