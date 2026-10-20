import { useMemo, useState } from 'react';
import './TableSortScreen.css';
import { K, t } from '../i18n';

export interface PickableRecord {
  id: string;
  title: string;
  /** Second line, e.g. the date. */
  detail?: string;
}

interface RecordPickerSheetProps {
  title?: string;
  records: PickableRecord[];
  selectedId?: string;
  onPick: (id: string) => void;
  onClose: () => void;
}

/**
 * Picks one 보관품 from a searchable list (#34's "반복할 보관품"). None of
 * the 59 approved designs is a record picker, so this reuses the approved
 * bottom-sheet look of #22's 서랍칸 picker (same handle, header, search box
 * and list classes). The caller places it inside the screen's own canvas.
 */
export function RecordPickerSheet({ title = K('보관품 선택'), records, selectedId, onPick, onClose }: RecordPickerSheetProps) {
  const [query, setQuery] = useState('');
  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('ko-KR');
    return q ? records.filter((r) => `${r.title} ${r.detail ?? ''}`.toLocaleLowerCase('ko-KR').includes(q)) : records;
  }, [records, query]);
  return (
    <div className="sv3-backdrop" role="presentation" onClick={onClose}>
      <section className="sv3-sheet" role="dialog" aria-modal="true" aria-label={t(title)} onClick={(e) => e.stopPropagation()}>
        <div className="sv3-handle" />
        <header className="sv3-picker-head">
          <button type="button" className="sv3-back" onClick={onClose} aria-label={t('닫기')}>‹</button>
          <div><h2>{t(title)}</h2><p>{t('반복해서 만들 보관품을 골라 주세요.')}</p></div>
        </header>
        <label className="sv3-search">
          <img src="/assets/ui-icons/icon_search.webp" alt="" />
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('보관품 검색')} />
          <span />
        </label>
        <div className="sv3-list">
          {visible.map((r) => (
            <button key={r.id} type="button" className={r.id === selectedId ? 'on' : ''} onClick={() => onPick(r.id)}>
              <span>{r.title}{r.detail && <small style={{ marginLeft: 8, opacity: 0.65, fontWeight: 600 }}>{r.detail}</small>}</span><i />
            </button>
          ))}
          {visible.length === 0 && <div style={{ padding: 16, color: '#9a95a2', fontSize: 12 }}>{t('보관품이 없어요.')}</div>}
        </div>
      </section>
    </div>
  );
}
