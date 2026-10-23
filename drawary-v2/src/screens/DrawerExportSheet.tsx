import './TableSortFilterEntryScreen.css';
import { t } from '../i18n';
import { revealSheet } from '../components/revealSheet';

export interface DrawerExportSheetProps {
  onCancel?: () => void;
  onCsv?: () => void;
  onPdf?: () => void;
}

/**
 * 서랍 관리's "백업 / 내보내기". No approved design exists for it, so it is drawn with #27's sheet (the same classes): this
 * drawer's table as a CSV or PDF file (the 표 보기 menu does the same). The whole-app backup stays in 설정 > 데이터 관리.
 */
export function DrawerExportSheet({ onCancel, onCsv, onPdf }: DrawerExportSheetProps) {
  const options = [
    { key: 'csv', icon: '/assets/ui-icons/icon_table.webp', title: t('CSV로 내보내기'), body: t('엑셀 같은 앱에서 열 수 있는 파일로 저장해요.'), onClick: onCsv },
    { key: 'pdf', icon: '/assets/ui-icons/icon_share.webp', title: t('PDF로 내보내기'), body: t('보기 좋은 표 모양의 파일로 저장해요.'), onClick: onPdf },
  ];
  return (
    <div className="tsf-backdrop" ref={revealSheet} role="presentation" onClick={onCancel}>
      <section className="tsf-sheet" role="dialog" aria-modal="true" aria-labelledby="drawer-export-title" onClick={(e) => e.stopPropagation()}>
        <div className="tsf-handle" />
        <header className="tsf-head">
          <h2 id="drawer-export-title">{t('백업 / 내보내기')}</h2>
          <p>{t('저장할 곳은 파일을 만든 뒤에 직접 고를 수 있어요.')}</p>
        </header>
        <div className="tsf-options">
          {options.map((o) => (
            <button key={o.key} type="button" className="tsf-option" onClick={o.onClick}>
              <span className="tsf-icon"><img src={o.icon} alt="" /></span>
              <span className="tsf-copy"><strong>{o.title}</strong><span>{o.body}</span></span>
              <span className="tsf-chevron" aria-hidden="true">›</span>
            </button>
          ))}
        </div>
        <p className="tsf-note">{t('CSV와 PDF에는 표 보기에서 정한 정렬과 필터가 그대로 적용돼요.')}</p>
        <button type="button" className="tsf-cancel" onClick={onCancel}>{t('취소')}</button>
      </section>
    </div>
  );
}
