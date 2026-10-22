import { ScreenHeader } from '../components/ScreenHeader';
import './RecurrenceManagementScreen.css';
import { t, tl } from '../i18n';

export interface RecurrenceRuleSummary {
  id: string;
  targetLabel: string;
  dateFieldName: string;
  cycleLabel: string;
  enabled: boolean;
  /** Shown instead of 사용 중 / 일시 정지 when set (e.g. a rule whose end condition was reached). */
  statusLabel?: string;
}

export interface RecurrenceManagementScreenProps {
  drawerName: string;
  fieldCount: number;
  itemCount: number;
  rules: RecurrenceRuleSummary[];
  drawerIconUri?: string;
  onBack?: () => void;
  onAdd?: () => void;
  onOpenRule?: (ruleId: string) => void;
}

/**
 * #33 반복 관리. Ported from `Drawary_33_FINAL_CONFIRMED_CODE`'s
 * `RecurrenceManagement.tsx`/`recurrence-management.css` -- only asset
 * paths remapped. CONFIRMED.md: 반복은 알림이 아니라 "다음 주기용
 * 보관품 자동 생성" -- 기존 보관품을 갱신하지 않는다.
 *
 * The archive's own CSS never defines `.rule-card`/`.rule-list` at all,
 * even though its TSX renders both for the `rules.length > 0` branch --
 * a real gap in the given source, not something to port faithfully.
 * Added `.rm-rule-card`/`.rm-rule-list` below, styled consistently with
 * this screen's own `.rm-empty` card (same border/radius/background)
 * and #36's `.option`/`.selected` active-state treatment, rather than
 * guessing a different look. Reached from #24's "반복 관리" row; "반복
 * 설정하기"/"반복 설정 추가하기" -> #34. CONFIRMED.md only asks for rule
 * rows to display ("rules 존재 시 설정 목록 표시 지원"), not to edit an
 * existing rule, so `onOpenRule` stays the caller's own no-op for now --
 * same reasoning as other not-yet-built destinations.
 */
export function RecurrenceManagementScreen({
  drawerName,
  fieldCount,
  itemCount,
  rules,
  drawerIconUri = '/assets/drawer-icons/drawer_icon_cosmetics.webp',
  onBack,
  onAdd,
  onOpenRule,
}: RecurrenceManagementScreenProps) {
  return (
    <section className="rm-screen">
      <ScreenHeader title={t('반복 관리')} onBack={onBack} height={88} />

      <section className="rm-context">
        <div className="rm-drawer-icon"><img src={drawerIconUri} alt="" /></div>
        <div className="rm-context-copy">
          <strong>{drawerName}</strong>
          <span>{t('{fields}개 서랍 칸, {items}개 보관품', { fields: fieldCount, items: itemCount })}</span>
        </div>
      </section>

      {rules.length === 0 ? (
        <>
          <div className="rm-hero">
            <img src="/assets/states/recurrence/state_recurrence_settings.webp" alt="" />
          </div>

          <section className="rm-message">
            <h2>{t('다음 보관품을 자동으로 만들어요.')}</h2>
            <p>{tl('날짜 서랍 칸을 기준으로 매주, 매달, 매년 원하는 주기에 맞춰\n새 보관품을 만들 수 있어요.')}</p>
          </section>

          <button className="rm-primary" type="button" onClick={onAdd}>
            <span className="rm-plus">＋</span>{t('반복 설정하기')}
          </button>

          <div className="rm-section-head">
            <span>{t('설정된 반복')}</span>
            <span>{t('0개')}</span>
          </div>

          <section className="rm-empty">
            <div className="rm-empty-icon"><img src="/assets/ui-icons/icon_refresh.webp" alt="" /></div>
            <div className="rm-empty-copy">
              <strong>{t('아직 반복 설정이 없어요.')}</strong>
              <span>{tl('반복을 설정하면 다음 주기의\n보관품이 자동으로 만들어져요.')}</span>
            </div>
          </section>
        </>
      ) : (
        <>
          <button className="rm-primary" type="button" onClick={onAdd}>
            <span className="rm-plus">＋</span>{t('반복 설정 추가하기')}
          </button>

          <div className="rm-section-head">
            <span>{t('설정된 반복')}</span>
            <span>{t('{n}개', { n: rules.length })}</span>
          </div>

          <div className="rm-rule-list">
            {rules.map((rule) => (
              <button
                type="button"
                className={`rm-rule-card${rule.enabled ? ' is-enabled' : ''}`}
                key={rule.id}
                onClick={() => onOpenRule?.(rule.id)}
              >
                <strong>{rule.targetLabel}</strong>
                <span>{rule.cycleLabel}, {rule.dateFieldName}</span>
                <em>{rule.statusLabel ?? (rule.enabled ? t('사용 중') : t('일시 정지'))}</em>
              </button>
            ))}
          </div>
        </>
      )}

      <div className="rm-guide">{t('반복 설정은 이 서랍의 보관품에만 적용돼요.')}</div>
    </section>
  );
}
