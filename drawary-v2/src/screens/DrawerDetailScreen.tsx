import { useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import './DrawerDetailScreen.css';
import { t } from '../i18n';

export interface DrawerRecordSummary {
  id: string;
  title: string;
  subtitle?: string;
  dateLabel?: string;
  thumbnailUri?: string;
}

interface DrawerDetailScreenProps {
  drawerName?: string;
  recordCount?: number;
  /** Drawer icon shown in a row that has no photo (defaults to the sample drawer's). */
  fallbackIconKey?: string;
  records?: DrawerRecordSummary[];
  onBack?: () => void;
  onOpenRecord?: (id: string) => void;
  onOpenTable?: () => void;
  onOpenManage?: () => void;
  onSearch?: (query: string) => void;
  onFilter?: () => void;
  onFillDrawer?: () => void;
}

export const DEFAULT_RECORDS: DrawerRecordSummary[] = [
  { id: 'lip', title: '립 틴트', subtitle: '롬앤 쥬시래스팅 틴트', dateLabel: '2024. 03. 12.', thumbnailUri: '/fixtures/sample_lip.webp' },
  { id: 'cushion', title: '쿠션 파운데이션', subtitle: '클리오 킬커버 쿠션', dateLabel: '2024. 02. 28.', thumbnailUri: '/fixtures/sample_cushion.webp' },
  { id: 'palette', title: '아이섀도우 팔레트', subtitle: '데이지크 새도우 팔레트', dateLabel: '2024. 01. 20.', thumbnailUri: '/fixtures/sample_palette.webp' },
  { id: 'perfume', title: '향수', subtitle: '샤넬 코코 마드모아젤', dateLabel: '2023. 12. 10.', thumbnailUri: '/fixtures/sample_perfume.webp' },
];

/**
 * #15 서랍 상세 / 보관품 목록. Ported verbatim from
 * `Drawary_15_FINAL_CONFIRMED_CODE`'s `DrawerDetail.tsx`/`drawer-detail.css`
 * (CONFIRMED.md: tag/stats tabs removed per V3, "•••" menu has 표로 보기 /
 * 서랍 관리 only). Its own README says "사용자 확정 전이므로 15번 미확정
 * 유지," contradicted by the sibling CONFIRMED.md's "FINAL CONFIRMED" in
 * the same archive -- same stale-README pattern as #03/#04/#09-#11/#13/#14.
 * CONFIRMED.md (and the unflagged top-level STATUS.md) wins.
 *
 * Asset paths fixed from the archive's flat layout
 * (`/assets/icon_table.webp` etc.) to this app's real nested layout
 * (`/assets/ui-icons/...`, `/assets/drawer-icons/...`). The 4 sample
 * records' thumbnails are the archive's own QA fixtures (copied to
 * `public/fixtures/`, same convention as #14's photo fixture), not
 * production data -- there's no real drawer/item data model yet
 * (V2-12 territory).
 */
export function DrawerDetailScreen({
  drawerName = '화장품',
  recordCount = 24,
  fallbackIconKey = 'cosmetics',
  records = DEFAULT_RECORDS,
  onBack,
  onOpenRecord,
  onOpenTable,
  onOpenManage,
  onSearch,
  onFilter,
  onFillDrawer,
}: DrawerDetailScreenProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="dd-screen">
      <ScreenHeader
        variant="stacked"
        title={drawerName}
        subtitle={t('보관품 {recordCount}개', { recordCount })}
        onBack={onBack}
        height={109}
        rightSlot={
          <>
            <button
              className="dd-menu"
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-label={t('서랍 메뉴')}
            >•••</button>
            {menuOpen && (
              <div className="dd-menu-popover" role="menu">
                <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onOpenTable?.(); }}>
                  <img src="/assets/ui-icons/icon_table.webp" alt="" />
                  <span>{t('표로 보기')}</span>
                  <b aria-hidden="true">›</b>
                </button>
                <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); onOpenManage?.(); }}>
                  <img src="/assets/ui-icons/icon_edit.webp" alt="" />
                  <span>{t('서랍 관리')}</span>
                  <b aria-hidden="true">›</b>
                </button>
              </div>
            )}
          </>
        }
      />

      <section className="dd-toolbar">
        <label className="dd-search">
          <img className="dd-search-icon" src="/assets/ui-icons/icon_search.webp" alt="" aria-hidden="true" />
          <input
            type="search"
            placeholder={t('보관품 검색하기')}
            onChange={(e) => onSearch?.(e.target.value)}
          />
        </label>
        <button className="dd-filter" type="button" onClick={onFilter} aria-label={t('필터')}>
          <img src="/assets/ui-icons/icon_filter.webp" alt="" />
        </button>
      </section>

      <section className="dd-list">
        {records.map((record) => (
          <button
            className="dd-record"
            type="button"
            key={record.id}
            onClick={() => onOpenRecord?.(record.id)}
          >
            <div className="dd-thumb">
              {record.thumbnailUri
                ? <img src={record.thumbnailUri} alt="" />
                : <img className="is-fallback" src={`/assets/drawer-icons/drawer_icon_${fallbackIconKey}.webp`} alt="" />}
            </div>
            <div className="dd-record-copy">
              <strong>{record.title}</strong>
              {record.subtitle && <small>{record.subtitle}</small>}
              {record.dateLabel && <time>{record.dateLabel}</time>}
            </div>
            <span className="dd-chevron" aria-hidden="true">›</span>
          </button>
        ))}
      </section>

      <button className="dd-fill" type="button" onClick={onFillDrawer}>
        <img src="/assets/ui-icons/icon_add.webp" alt="" />
        <span>{t('서랍 채우기')}</span>
      </button>
    </main>
  );
}
