import type { Category, Entry } from '../types';
import { formatFieldValue, sumField } from '../lib/format';
import { CategoryEmoji } from './categoryIcons';

interface PrintViewProps {
  category: Category;
  entries: Entry[];
}

// Rendered off-screen at all times and only made visible by global.css's
// @media print rules (which also hide everything else via .app-shell).
// Printing/"save as PDF" is driven by the browser's native print dialog
// (window.print(), triggered from CategoryDetail) rather than a PDF
// library -- see the PR description for why: it sidesteps embedding a
// Korean-capable font into a client-side PDF generator entirely, and
// matches how "save as PDF" already works from a phone's share sheet /
// print menu.
export function PrintView({ category, entries }: PrintViewProps) {
  const sums = category.fields.map((f) => sumField(f, entries.map((e) => e.values[f.id])));
  const hasSums = sums.some((s) => s !== null);

  return (
    <div className="print-view">
      <h1>
        <CategoryEmoji value={category.emoji} size={22} />
        {category.name}
      </h1>
      <p className="print-meta">
        생성일: {new Date().toLocaleDateString('ko-KR')} · 총 {entries.length}건
      </p>
      <table>
        <thead>
          <tr>
            {category.fields.map((f) => (
              <th key={f.id}>{f.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.id}>
              {category.fields.map((f) => (
                <td key={f.id}>{formatFieldValue(f, entry.values[f.id]) || '—'}</td>
              ))}
            </tr>
          ))}
        </tbody>
        {hasSums && (
          <tfoot>
            <tr>
              {category.fields.map((f, idx) => (
                <td key={f.id}>{sums[idx] !== null ? `합계 ${sums[idx]!.toLocaleString('ko-KR')}` : ''}</td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
