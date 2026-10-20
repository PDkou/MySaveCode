import './TableSortFilterEntryScreen.css';
import { t } from '../i18n';

export interface TableSortFilterEntryScreenProps {
  onCancel?: () => void;
  onPickSort?: () => void;
  onPickFilter?: () => void;
}

/**
 * #27 정렬 / 필터 설정. Per CONFIRMED.md: "27번은 진입 선택만 담당" --
 * 정렬은 #22(`TableSortScreen`), 필터는 #23(`TableFilterScreen`)을 그대로
 * 재사용하고, 이 컴포넌트는 그 둘로 가는 진입 선택 바텀시트 역할만
 * 한다 (정렬/필터 로직을 새로 중복 구현하지 않음). No separate TSX
 * exists for this screen, only `render.html` (base64-inlined icons made
 * it too large to read directly, same as #21/#24) + CONFIRMED.md's
 * spec; markup/CSS (`.sf27-*` classes, renamed to this file's `tsf-`
 * prefix) extracted via regex. Icons are the already-approved
 * `ui-icons/icon_sort.webp`/`icon_filter.webp` (the same assets this app
 * already uses for 정렬/필터 elsewhere), chosen by meaning since
 * render.html's own icons are unlabeled base64 data.
 */
export function TableSortFilterEntryScreen({ onCancel, onPickSort, onPickFilter }: TableSortFilterEntryScreenProps) {
  return (
    <div className="tsf-backdrop" role="presentation" onClick={onCancel}>
      <section className="tsf-sheet" role="dialog" aria-modal="true" aria-labelledby="sort-filter-entry-title" onClick={(e) => e.stopPropagation()}>
        <div className="tsf-handle" />
        <header className="tsf-head">
          <h2 id="sort-filter-entry-title">{t('정렬 / 필터 설정')}</h2>
          <p>{t('원하는 설정을 골라주세요. 기존 표 보기 설정 화면을 그대로 사용해요.')}</p>
        </header>

        <div className="tsf-options">
          <button type="button" className="tsf-option" onClick={onPickSort}>
            <span className="tsf-icon"><img src="/assets/ui-icons/icon_sort.webp" alt="" /></span>
            <span className="tsf-copy">
              <strong>{t('정렬')}</strong>
              <span>{t('보관품을 어떤 순서로 볼지 정해요.')}</span>
            </span>
            <span className="tsf-chevron" aria-hidden="true">›</span>
          </button>

          <button type="button" className="tsf-option" onClick={onPickFilter}>
            <span className="tsf-icon"><img src="/assets/ui-icons/icon_filter.webp" alt="" /></span>
            <span className="tsf-copy">
              <strong>{t('필터')}</strong>
              <span>{t('조건에 맞는 보관품만 골라서 봐요.')}</span>
            </span>
            <span className="tsf-chevron" aria-hidden="true">›</span>
          </button>
        </div>

        <p className="tsf-note">{t('정렬은 22번, 필터는 23번 확정 화면을 그대로 불러오는 구조예요.')}</p>

        <button type="button" className="tsf-cancel" onClick={onCancel}>{t('취소')}</button>
      </section>
    </div>
  );
}
