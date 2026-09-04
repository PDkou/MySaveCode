import { useMemo, useState } from 'react';
import type { Entry, FieldDef } from '../types';
import { formatFieldValue, sumField } from '../lib/format';

interface DataTableProps {
  fields: FieldDef[];
  entries: Entry[];
  onRowClick: (entry: Entry) => void;
}

type SortState = { fieldId: string; dir: 1 | -1 } | null;

export function DataTable({ fields, entries, onRowClick }: DataTableProps) {
  const [sort, setSort] = useState<SortState>(null);

  const sorted = useMemo(() => {
    if (!sort) return entries;
    const field = fields.find((f) => f.id === sort.fieldId);
    if (!field) return entries;
    const isNumeric = field.type === 'number' || field.type === 'currency' || field.type === 'rating';
    return entries.slice().sort((a, b) => {
      const av = a.values[sort.fieldId] ?? '';
      const bv = b.values[sort.fieldId] ?? '';
      let cmp: number;
      if (isNumeric) {
        cmp = (Number(av) || 0) - (Number(bv) || 0);
      } else {
        cmp = av.localeCompare(bv, 'ko');
      }
      return cmp * sort.dir;
    });
  }, [entries, fields, sort]);

  const toggleSort = (fieldId: string) => {
    setSort((prev) => {
      if (!prev || prev.fieldId !== fieldId) return { fieldId, dir: 1 };
      if (prev.dir === 1) return { fieldId, dir: -1 };
      return null;
    });
  };

  if (fields.length === 0) {
    return <p className="empty-hint">먼저 "필드 관리"에서 이 카테고리의 항목을 설정해 주세요.</p>;
  }

  if (entries.length === 0) {
    return <p className="empty-hint">아직 입력된 데이터가 없어요. 오른쪽 아래 + 버튼으로 데이터를 추가해 보세요.</p>;
  }

  const sums = fields.map((f) => sumField(f, sorted.map((e) => e.values[f.id])));
  const hasSums = sums.some((s) => s !== null);

  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            {fields.map((f) => {
              const active = sort?.fieldId === f.id;
              return (
                <th key={f.id}>
                  <button type="button" className="th-sort-btn" onClick={() => toggleSort(f.id)}>
                    {f.name}
                    <span className={`sort-arrow ${active ? 'active' : ''}`}>
                      {active ? (sort!.dir === 1 ? '▲' : '▼') : '⇅'}
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((entry) => (
            <tr key={entry.id} className="data-row" onClick={() => onRowClick(entry)}>
              {fields.map((f) => (
                <td key={f.id}>{formatFieldValue(f, entry.values[f.id]) || '—'}</td>
              ))}
            </tr>
          ))}
        </tbody>
        {hasSums && (
          <tfoot>
            <tr>
              {fields.map((f, idx) => (
                <td key={f.id}>{sums[idx] !== null ? <strong>합계 {sums[idx]!.toLocaleString('ko-KR')}</strong> : ''}</td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
