import { ScreenHeader } from '../components/ScreenHeader';
import './NotificationCompleteScreen.css';

export interface NotificationCompleteScreenProps {
  drawerName: string;
  itemCount?: number;
  dateFieldName: string;
  daysBefore: number;
  time: string;
  drawerIconUri?: string;
  onAddAnother?: () => void;
  onDone?: () => void;
}

/**
 * #32 알림 완료. Ported from `Drawary_32_FINAL_CONFIRMED_CODE`'s
 * `NotificationComplete.tsx`/`notification-complete.css` -- only asset
 * paths remapped. Reached from #31's "알림 설정하기". "알림 더 추가하기"
 * -> #30; "확인" -> #24 (서랍 관리).
 */
export function NotificationCompleteScreen({
  drawerName,
  itemCount,
  dateFieldName,
  daysBefore,
  time,
  drawerIconUri = '/assets/drawer-icons/drawer_icon_cosmetics.webp',
  onAddAnother,
  onDone,
}: NotificationCompleteScreenProps) {
  const timingLabel = daysBefore === 0 ? '당일' : `${daysBefore}일 전`;

  return (
    <main className="nc-screen">
      <ScreenHeader title="알림 설정 완료" height={88} />

      <div className="nc-hero">
        <img src="/assets/states/reminder/state_notification_enabled.webp" alt="" />
      </div>

      <section className="nc-message">
        <h2>알림을 설정했어요.</h2>
        <p>설정한 날짜가 다가오면 잊지 않도록 알려드릴게요.</p>
      </section>

      <section className="nc-summary">
        <div className="nc-row">
          <div className="nc-icon"><img src={drawerIconUri} alt="" /></div>
          <div className="nc-copy"><span>서랍</span><strong>{drawerName}</strong></div>
          <div className="nc-value">{typeof itemCount === 'number' ? `${itemCount}개 보관품` : ''}</div>
        </div>

        <div className="nc-row">
          <div className="nc-icon"><img src="/assets/field-types/field_date.webp" alt="" /></div>
          <div className="nc-copy"><span>기준 날짜</span><strong>{dateFieldName}</strong></div>
          <div className="nc-value"><strong>{timingLabel}</strong></div>
        </div>

        <div className="nc-row">
          <div className="nc-icon"><img src="/assets/ui-icons/icon_notification.webp" alt="" /></div>
          <div className="nc-copy"><span>알림 시간</span><strong>{time}</strong></div>
          <div className="nc-value">알림 켜짐</div>
        </div>
      </section>

      <div className="nc-tip">
        설정한 알림은 서랍 관리의 알림 설정에서 언제든 바꿀 수 있어요.
      </div>

      <div className="nc-actions">
        <button className="nc-add" type="button" onClick={onAddAnother}>알림 더 추가하기</button>
        <button className="nc-done" type="button" onClick={onDone}>확인</button>
      </div>
    </main>
  );
}
