import { useState, type ReactNode } from 'react';
import type { DrawerRecordSummary } from '../screens/DrawerDetailScreen';
import '../screens/DrawerDetailScreen.css';
import { t } from '../i18n';

export interface WideChip { key: string; label: string }

interface WideDrawerProps {
  /** 'wide': list + the chosen item side by side; 'land': a grid of item cards that opens the item on its own screen. */
  kind: 'land' | 'wide';
  drawerName: string;
  recordCount: number;
  fallbackIconKey: string;
  records: DrawerRecordSummary[];
  /** Values of the drawer's first select field, as filter chips; empty when the drawer has none. */
  chipsLabel?: string;
  chips: WideChip[];
  activeChip: string | null;
  onChip: (key: string | null) => void;
  query: string;
  onSearch: (query: string) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** The chosen item's detail (wide only). */
  detail?: ReactNode;
  onBack: () => void;
  onOpenTable: () => void;
  onOpenManage: () => void;
  onFillDrawer: () => void;
}

/**
 * #15 서랍 상세 for landscape windows. Left: back, the drawer's name and count, 카드 보기 / 표 보기, and the filter chips. Right:
 * the search box and "•••" menu (표로 보기 / 서랍 관리, as in #15) over the items. Item rows use #15's own row design.
 */
export function WideDrawer(p: WideDrawerProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const thumb = (r: DrawerRecordSummary) => (
    <div className="dd-thumb">
      {r.thumbnailUri
        ? <img src={r.thumbnailUri} alt="" />
        : <img className="is-fallback" src={`/assets/drawer-icons/drawer_icon_${p.fallbackIconKey}.webp`} alt="" />}
    </div>
  );
  const empty = p.records.length === 0;
  return (
    <section className={`wd wd--${p.kind}`}>
      <aside className="wd-side">
        <button type="button" className="wd-back" aria-label={t('이전 화면')} onClick={p.onBack} />
        <div className="wd-title">
          <h1>{p.drawerName}</h1>
          <span>{t('보관품 {recordCount}개', { recordCount: p.recordCount })}</span>
        </div>
        <div className="wd-tabs" role="tablist">
          <button type="button" role="tab" aria-selected="true" className="is-on">{t('카드 보기')}</button>
          <button type="button" role="tab" aria-selected="false" onClick={p.onOpenTable}>{t('표 보기')}</button>
        </div>
        {p.chips.length > 0 && (
          <div className="wd-chips" role="group" aria-label={p.chipsLabel}>
            {[{ key: '', label: t('전체') }, ...p.chips].map((c) => {
              const on = (p.activeChip ?? '') === c.key;
              return (
                <button key={c.key} type="button" className={on ? 'is-on' : ''} aria-pressed={on} onClick={() => p.onChip(c.key === '' ? null : c.key)}>{c.label}</button>
              );
            })}
          </div>
        )}
      </aside>

      <div className="wd-main">
        <div className="wd-toolbar">
          <label className="dd-search">
            <img className="dd-search-icon" src="/assets/ui-icons/icon_search.webp" alt="" aria-hidden="true" />
            <input type="search" placeholder={t('보관품 검색하기')} defaultValue={p.query} onChange={(e) => p.onSearch(e.target.value)} />
          </label>
          <div className="wd-menu-wrap">
            <button className="dd-menu wd-menu" type="button" onClick={() => setMenuOpen((o) => !o)} aria-expanded={menuOpen} aria-label={t('서랍 메뉴')}>•••</button>
            {menuOpen && (
              <div className="dd-menu-popover wd-popover" role="menu">
                <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); p.onOpenTable(); }}>
                  <img src="/assets/ui-icons/icon_table.webp" alt="" /><span>{t('표로 보기')}</span><b aria-hidden="true">›</b>
                </button>
                <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); p.onOpenManage(); }}>
                  <img src="/assets/ui-icons/icon_edit.webp" alt="" /><span>{t('서랍 관리')}</span><b aria-hidden="true">›</b>
                </button>
              </div>
            )}
          </div>
        </div>

        {p.kind === 'wide' ? (
          <div className="wd-split">
            <div className="wd-list">
              {empty && <p className="wd-empty">{p.recordCount === 0 ? t('아직 담은 보관품이 없어요.') : t('검색 결과가 없어요.')}</p>}
              {p.records.map((r) => (
                <button key={r.id} type="button" className={`dd-record wd-row${r.id === p.selectedId ? ' is-selected' : ''}`} aria-current={r.id === p.selectedId ? 'true' : undefined} onClick={() => p.onSelect(r.id)}>
                  {thumb(r)}
                  <div className="dd-record-copy">
                    <strong>{r.title}</strong>
                    {r.subtitle && <small>{r.subtitle}</small>}
                    {r.dateLabel && <time>{r.dateLabel}</time>}
                  </div>
                  <span className="dd-chevron" aria-hidden="true">›</span>
                </button>
              ))}
            </div>
            <div className="wd-detail">{p.detail}</div>
          </div>
        ) : (
          <div className="wd-cards">
            {empty && <p className="wd-empty">{p.recordCount === 0 ? t('아직 담은 보관품이 없어요.') : t('검색 결과가 없어요.')}</p>}
            {p.records.map((r) => (
              <button key={r.id} type="button" className="wd-card" onClick={() => p.onSelect(r.id)}>
                {thumb(r)}
                <strong>{r.title}</strong>
                {r.dateLabel && <time>{r.dateLabel}</time>}
              </button>
            ))}
          </div>
        )}

        <button className="dd-fill wd-fill" type="button" onClick={p.onFillDrawer}>
          <img src="/assets/ui-icons/icon_add.webp" alt="" />
          <span>{t('서랍 채우기')}</span>
        </button>
      </div>
    </section>
  );
}
