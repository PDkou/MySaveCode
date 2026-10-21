import { ScreenHeader } from '../components/ScreenHeader';
import './NotificationDateFieldScreen.css';
import { t } from '../i18n';

export interface DateFieldOption {
  id: string;
  name: string;
}

export interface NotificationDateFieldScreenProps {
  drawerName: string;
  dateFields: DateFieldOption[];
  selectedId?: string;
  drawerIconUri?: string;
  onSelect?: (fieldId: string) => void;
  onBack?: () => void;
  onNext?: (fieldId: string) => void;
}

/**
 * #30 날짜 칸 선택. Ported from `Drawary_30_FINAL_CONFIRMED_CODE`'s
 * `DateFieldSelection.tsx`/`date-field-selection.css` -- only asset
 * paths remapped. `dateFields` is fed `DEFAULT_DRAWER_FIELDS` filtered
 * to `kind === 'date'` by the caller (App.tsx), which for the demo
 * "화장품" drawer is exactly one field (구매일) -- CONFIRMED.md's own
 * "날짜 서랍 칸이 1개뿐이면 기본 선택" case. Reached from #29's "알림
 * 추가하기"; "다음" -> #31.
 */
export function NotificationDateFieldScreen({
  drawerName,
  dateFields,
  selectedId,
  drawerIconUri = '/assets/drawer-icons/drawer_icon_cosmetics.webp',
  onSelect,
  onBack,
  onNext,
}: NotificationDateFieldScreenProps) {
  const effectiveSelectedId = selectedId ?? (dateFields.length === 1 ? dateFields[0]?.id : undefined);

  return (
    <section className="ndf-screen">
      <ScreenHeader title={t('알림 추가하기')} onBack={onBack} height={88} />

      <section className="ndf-context">
        <div className="ndf-drawer-icon"><img src={drawerIconUri} alt="" /></div>
        <div className="ndf-context-copy">
          <strong>{drawerName}</strong>
          <span>{t('알림을 추가할 서랍')}</span>
        </div>
      </section>

      <section className="ndf-intro">
        <h2>{t('어떤 날짜를 기준으로 알림을 받을까요?')}</h2>
        <p>{t('알림 기준으로 사용할 날짜 서랍 칸을 선택해 주세요.')}</p>
      </section>

      <div className="ndf-section-label">{t('날짜 서랍 칸')}</div>

      {dateFields.map((field) => {
        const active = field.id === effectiveSelectedId;
        return (
          <button
            className={`ndf-field-card${active ? ' is-selected' : ''}`}
            type="button"
            key={field.id}
            onClick={() => onSelect?.(field.id)}
          >
            <span className="ndf-field-icon"><img src="/assets/field-types/field_date.webp" alt="" /></span>
            <span className="ndf-field-copy"><strong>{field.name}</strong><span>{t('날짜')}</span></span>
            {active && <span className="ndf-selected" aria-label={t('선택됨')}>✓</span>}
          </button>
        );
      })}

      <div className="ndf-actions">
        <button className="ndf-prev" type="button" onClick={onBack}>{t('이전')}</button>
        <button
          className="ndf-next"
          type="button"
          disabled={!effectiveSelectedId}
          onClick={() => effectiveSelectedId && onNext?.(effectiveSelectedId)}
        >
          
          {t('다음')}
        </button>
      </div>
    </section>
  );
}
