import { ScreenHeader } from '../components/ScreenHeader';
import './NotificationSettingsScreen.css';
import { t, tl } from '../i18n';

export interface NotificationRuleRow {
  id: string;
  /** Name of the date 서랍 칸 the notification counts from. */
  fieldName: string;
  /** e.g. "7일 전 · 09:00". */
  when: string;
}

export interface NotificationSettingsScreenProps {
  drawerName: string;
  /** This drawer's notifications; tapping a row lets the caller offer to delete it. */
  rules?: NotificationRuleRow[];
  onOpenRule?: (ruleId: string) => void;
  fieldCount: number;
  recordCount: number;
  drawerIconUri?: string;
  onBack?: () => void;
  onAddNotification?: () => void;
  onOpenCommonSettings?: () => void;
}

/**
 * #29 알림 설정. Ported from `Drawary_29_FINAL_CONFIRMED_CODE`'s
 * `NotificationSettings.tsx`/`notification-settings.css` -- only asset
 * paths remapped to this app's nested asset convention. Reached from
 * #24's "알림 설정" row. "알림 추가하기" -> #30. CONFIRMED.md's "알림
 * 공통 설정" (기본 알림 시간과 알림 쉬는 시간) has no destination screen
 * among #29-#37, so `onOpenCommonSettings` stays the caller's own no-op,
 * same reasoning as other not-yet-built destinations.
 *
 * Dropped the archive CSS's `filter:brightness(0) invert(1)` on the
 * "알림 추가하기" button's icon -- that filter assumes a flat
 * single-color glyph, but this app's actual `icon_add.webp` is already
 * a complete colored badge (purple circle + white plus), and inverting
 * it collapses the plus into a solid white blob.
 *
 * V2-12 step 3: the "이 서랍의 알림" section now lists this drawer's saved
 * notifications (rows drawn like the 알림 공통 설정 card below them; no approved
 * design shows them) -- tap one to delete it. #15 (`DrawerDetailScreen`)
 * already uses the same asset unfiltered; matched that precedent.
 */
export function NotificationSettingsScreen({
  drawerName,
  rules = [],
  onOpenRule,
  fieldCount,
  recordCount,
  drawerIconUri = '/assets/drawer-icons/drawer_icon_cosmetics.webp',
  onBack,
  onAddNotification,
  onOpenCommonSettings,
}: NotificationSettingsScreenProps) {
  return (
    <section className="ns-screen">
      <ScreenHeader title={t('알림 설정')} onBack={onBack} height={92} />

      <section className="ns-context">
        <div className="ns-drawer-icon"><img src={drawerIconUri} alt="" /></div>
        <div className="ns-context-copy">
          <strong>{drawerName}</strong>
          <span>{t('{fields}개 서랍 칸, {items}개 보관품', { fields: fieldCount, items: recordCount })}</span>
        </div>
      </section>

      <section className="ns-hero">
        <img className="ns-hero-art" src="/assets/states/reminder/state_notification_settings.webp" alt="" />
        <h2>{tl('설정한 날짜가 다가오면\n알려드려요.')}</h2>
        <p>
          
          {tl('이 서랍에 있는 날짜 서랍 칸을 기준으로\n필요한 시점에 알림을 받을 수 있어요.')}
        </p>
      </section>

      <button className="ns-add-btn uf-cta-primary" type="button" onClick={onAddNotification}>
        <img src="/assets/ui-icons/icon_add.webp" alt="" />
        
        {t('알림 추가하기')}
      </button>

      <div className="ns-section-label">{t('이 서랍의 알림')}</div>
      {rules.map((rule) => (
        <button className="ns-rule-card" type="button" key={rule.id} onClick={() => onOpenRule?.(rule.id)}>
          <div className="ns-common-icon"><img src="/assets/ui-icons/icon_notification.webp" alt="" /></div>
          <div className="ns-common-copy">
            <strong>{rule.fieldName}</strong>
            <span>{rule.when}</span>
          </div>
          <div className="ns-chev">›</div>
        </button>
      ))}
      <button className="ns-common-card" type="button" onClick={onOpenCommonSettings}>
        <div className="ns-common-icon"><img src="/assets/ui-icons/icon_notification.webp" alt="" /></div>
        <div className="ns-common-copy">
          <strong>{t('알림 공통 설정')}</strong>
          <span>{t('기본 알림 시간과 알림 쉬는 시간')}</span>
        </div>
        <div className="ns-chev">›</div>
      </button>

      <div className="ns-tip">{t('알림 추가하기를 누르면 먼저 날짜 서랍 칸을 선택해요.')}</div>
    </section>
  );
}
