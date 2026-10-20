import { ScreenHeader } from '../components/ScreenHeader';
import './RecurrenceTargetDateScreen.css';
import { t } from '../i18n';

export interface RecurrenceTarget {
  id: string;
  title: string;
}

export interface DateFieldOption {
  id: string;
  name: string;
}

export interface RecurrenceTargetDateScreenProps {
  drawerName: string;
  fieldCount: number;
  itemCount: number;
  targets: RecurrenceTarget[];
  dateFields: DateFieldOption[];
  selectedTargetId?: string;
  selectedDateFieldId?: string;
  drawerIconUri?: string;
  onBack?: () => void;
  onSelectTarget?: () => void;
  onSelectDateField?: (fieldId: string) => void;
  onNext?: (value: { targetId: string; dateFieldId: string }) => void;
}

/**
 * #34 반복 대상 / 날짜 칸. Ported from `Drawary_34_FINAL_CONFIRMED_CODE`'s
 * `RecurrenceTargetDate.tsx`/`recurrence-target-date.css` -- only asset
 * paths remapped. CONFIRMED.md: 반복 동작은 기존 보관품 갱신이 아니라
 * **새 보관품 생성**.
 *
 * `onSelectTarget` in the archive's own source takes no argument at
 * all -- a picker screen for "which 보관품" was presumably meant to
 * exist elsewhere, but none of the 59 approved screens is one. Rather
 * than invent a new screen, the caller (App.tsx) wires this to cycle
 * through `targets` in order on each tap, the same "local demo state"
 * substitute already used for #09's quick-add chips and #22's quick-
 * sort candidates -- disclosed here, not silently guessed at.
 * Reached from #33's "반복 설정하기"/"반복 설정 추가하기"; "다음" -> #35.
 */
export function RecurrenceTargetDateScreen({
  drawerName,
  fieldCount,
  itemCount,
  targets,
  dateFields,
  selectedTargetId,
  selectedDateFieldId,
  drawerIconUri = '/assets/drawer-icons/drawer_icon_cosmetics.webp',
  onBack,
  onSelectTarget,
  onSelectDateField,
  onNext,
}: RecurrenceTargetDateScreenProps) {
  const target = targets.find((x) => x.id === selectedTargetId);
  const effectiveDateId = selectedDateFieldId ?? (dateFields.length === 1 ? dateFields[0]?.id : undefined);
  const selectedDateField = dateFields.find((x) => x.id === effectiveDateId);
  const canNext = Boolean(target && selectedDateField);

  return (
    <section className="rtd-screen">
      <ScreenHeader title={t('반복 설정하기')} onBack={onBack} height={88} />

      <section className="rtd-context">
        <div className="rtd-drawer-icon"><img src={drawerIconUri} alt="" /></div>
        <div className="rtd-context-copy">
          <strong>{drawerName}</strong>
          <span>{t('{fields}개 서랍칸 · {items}개 보관품', { fields: fieldCount, items: itemCount })}</span>
        </div>
      </section>

      <section className="rtd-intro">
        <h2>{t('어떤 보관품을 반복해서 만들까요?')}</h2>
        <p>{t('반복할 보관품과 기준이 될 날짜 서랍칸을 선택해 주세요.')}</p>
      </section>

      <div className="rtd-section-label">{t('반복할 보관품')}</div>
      <button className="rtd-selector" type="button" onClick={onSelectTarget}>
        <span className="rtd-selector-icon"><img src="/assets/ui-icons/icon_list.webp" alt="" /></span>
        <span className="rtd-selector-copy">
          <strong>{target?.title ?? t('보관품을 선택해 주세요')}</strong>
          <span>{target ? t('{drawerName} 서랍의 보관품', { drawerName }) : t('{itemCount}개 보관품 중 선택', { itemCount })}</span>
        </span>
        <span className="rtd-chev">›</span>
      </button>

      <div className="rtd-section-label">{t('기준 날짜')}</div>
      {dateFields.length === 0 ? (
        <div className="rtd-guide">{t('이 서랍에는 날짜 서랍칸이 없어요. 날짜 서랍칸을 먼저 추가해 주세요.')}</div>
      ) : dateFields.map((field) => {
        const active = field.id === effectiveDateId;
        return (
          <button
            className="rtd-field-card"
            type="button"
            key={field.id}
            onClick={() => onSelectDateField?.(field.id)}
          >
            <span className="rtd-field-icon"><img src="/assets/field-types/field_date.webp" alt="" /></span>
            <span className="rtd-field-copy"><strong>{field.name}</strong><span>{t('날짜 서랍칸')}</span></span>
            {active ? <span className="rtd-selected">✓</span> : <span />}
          </button>
        );
      })}

      {dateFields.length > 0 && (
        <div className="rtd-guide">{t('선택한 날짜를 기준으로 다음 보관품의 날짜가 계산돼요.')}</div>
      )}

      <div className="rtd-actions">
        <button className="rtd-prev" type="button" onClick={onBack}>{t('이전')}</button>
        <button
          className="rtd-next"
          type="button"
          disabled={!canNext}
          onClick={() => {
            if (target && selectedDateField) {
              onNext?.({ targetId: target.id, dateFieldId: selectedDateField.id });
            }
          }}
        >
          
          {t('다음')}
        </button>
      </div>
    </section>
  );
}
