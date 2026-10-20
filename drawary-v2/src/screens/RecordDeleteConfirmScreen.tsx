import './RecordDeleteConfirmScreen.css';
import { t, tx } from '../i18n';

interface RecordDeleteConfirmScreenProps {
  recordTitle?: string;
  onCancel?: () => void;
  onDelete?: () => void;
}

/**
 * #18 보관품 삭제 확인. Ported verbatim from
 * `Drawary_18_FINAL_CONFIRMED_CODE`'s `RecordDeleteConfirm.tsx`/
 * `record-delete-confirm.css` (CONFIRMED.md: "11번 서랍칸 삭제 확인의
 * 바텀시트 패턴 재사용" -- confirmed by direct comparison: same handle
 * size/color, icon box, button heights/radii/colors as #11C's
 * `.df-modal-backdrop`/`.df-confirm-sheet`). Its own README says
 * "사용자 확정 전이므로 18번 미확정 유지," contradicted by the sibling
 * CONFIRMED.md's "FINAL CONFIRMED" -- same stale-README pattern as
 * #03/#04/#09-#11/#13-#15/#17. CONFIRMED.md wins.
 *
 * Rendered as a local overlay inside `RecordDetailScreen` (triggered
 * from its "•••" menu's "보관품 삭제"), matching the established
 * component-local-modal convention already used for #11's delete
 * confirm, rather than a separate top-level route.
 */
export function RecordDeleteConfirmScreen({
  recordTitle = '롬앤 쥬시래스팅 틴트',
  onCancel,
  onDelete,
}: RecordDeleteConfirmScreenProps) {
  return (
    <div className="rdc-backdrop" role="presentation" onClick={onCancel}>
      <section
        className="rdc-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="record-delete-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rdc-handle" />

        <div className="rdc-icon">
          <img src="/assets/ui-icons/icon_delete.webp" alt="" />
        </div>

        <h2 id="record-delete-title">{t('이 보관품을 삭제할까요?')}</h2>

        <p>
          {tx('{title} 보관품과\n입력한 내용이 서랍에서 삭제돼요.', { title: <strong>&lsquo;{recordTitle}&rsquo;</strong> })}
          <span className="rdc-warning">{t('삭제한 뒤에는 되돌릴 수 없어요.')}</span>
        </p>

        <div className="rdc-actions">
          <button type="button" className="rdc-cancel" onClick={onCancel}>{t('취소')}</button>
          <button type="button" className="rdc-delete" onClick={onDelete}>{t('삭제하기')}</button>
        </div>
      </section>
    </div>
  );
}
