import './DrawerDeleteConfirmScreen.css';
import { t, tx } from '../i18n';

export interface DrawerDeleteConfirmScreenProps {
  drawerName: string;
  recordCount: number;
  onCancel?: () => void;
  onDelete?: () => void;
}

/**
 * #28 서랍 삭제 확인. Ported from `Drawary_28_FINAL_CONFIRMED_CODE`'s
 * `DrawerDeleteConfirm.tsx`/`drawer-delete-confirm.css` -- only the icon
 * asset path changed, from the archive's flat `/assets/icon_delete.webp`
 * to this app's actual `/assets/ui-icons/icon_delete.webp`. Per
 * CONFIRMED.md this reuses #18's delete-sheet pattern against a
 * background of #24, so it's rendered as a local overlay inside
 * `DrawerManageScreen` (same component-local-modal convention as #18's
 * `RecordDeleteConfirmScreen` inside `RecordDetailScreen`), not a
 * separate route. "삭제 후 홈 복귀" (return to home after delete) is the
 * caller's job via `onDelete`.
 */
export function DrawerDeleteConfirmScreen({ drawerName, recordCount, onCancel, onDelete }: DrawerDeleteConfirmScreenProps) {
  return (
    <div className="ddc-backdrop" role="presentation" onClick={onCancel}>
      <section className="ddc-sheet" role="dialog" aria-modal="true" aria-labelledby="drawer-delete-title" onClick={(e) => e.stopPropagation()}>
        <div className="ddc-handle" />
        <div className="ddc-icon"><img src="/assets/ui-icons/icon_delete.webp" alt="" /></div>
        <h2 id="drawer-delete-title">{t('이 서랍을 삭제할까요?')}</h2>
        <p>
          {tx('{drawer} 서랍과 안에 담긴\n{count}이 모두 삭제돼요.', { drawer: <strong>‘{drawerName}’</strong>, count: <strong>{t('{n}개 보관품', { n: recordCount })}</strong> })}
          <span className="ddc-detail">{t('서랍칸 설정과 알림·반복 설정도 함께 삭제돼요.')}</span>
          <span className="ddc-warning">{t('삭제한 뒤에는 되돌릴 수 없어요.')}</span>
        </p>
        <div className="ddc-actions">
          <button type="button" className="ddc-cancel" onClick={onCancel}>{t('취소')}</button>
          <button type="button" className="ddc-delete" onClick={onDelete}>{t('삭제하기')}</button>
        </div>
      </section>
    </div>
  );
}
