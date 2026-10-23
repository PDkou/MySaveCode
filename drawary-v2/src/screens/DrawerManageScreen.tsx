import { useState } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import './DrawerManageScreen.css';
import { TableSortFilterEntryScreen } from './TableSortFilterEntryScreen';
import { TableSortScreen } from './TableSortScreen';
import { TableFilterScreen } from './TableFilterScreen';
import type { TableColumn, TableRowData, TableViewState } from '../flow/tableQuery';
import { EMPTY_VIEW } from '../flow/tableQuery';
import { DrawerDeleteConfirmScreen } from './DrawerDeleteConfirmScreen';
import { t } from '../i18n';

interface DrawerManageRow {
  key: string;
  label: string;
  icon: string;
  danger?: boolean;
  onClick?: () => void;
}

interface DrawerManageScreenProps {
  /** In the wide window's management sheet: the row whose screen is open on the right. */
  activeKey?: string;
  drawerName?: string;
  drawerIconUri?: string;
  fieldCount?: number;
  recordCount?: number;
  /** The drawer's table (#20): what #27's sort/filter sheets edit. */
  tableColumns?: TableColumn[];
  tableRows?: TableRowData[];
  tableView?: TableViewState;
  onTableViewChange?: (view: TableViewState) => void;
  onBack?: () => void;
  onRenameDrawer?: () => void;
  onEditFields?: () => void;
  onNotificationSettings?: () => void;
  onRecurrenceManage?: () => void;
  onBackupExport?: () => void;
  onDeleteDrawer?: () => void;
}

/**
 * #24 서랍 관리 메인. No separate TSX/CSS exists for this screen, only
 * `render.html` (a self-contained static preview with its own inline
 * `<style>` and base64-inlined icons) + CONFIRMED.md's structural spec.
 * Ported the markup/CSS (`.manage-*`/`.drawer-summary*` classes) and all
 * 7 row labels verbatim from `render.html` (read via regex extraction
 * since the file's base64 image data makes it too large to read
 * normally); the icons themselves are approved `ui-icons/*.webp` assets
 * chosen to match `24_CONFIRMED_RENDER.png`'s icons one-for-one (pencil,
 * 4-square grid, sort arrows, bell, circular-refresh, share-box, trash)
 * -- verified by opening each candidate asset directly, not guessed
 * from filenames alone.
 *
 * CONFIRMED.md's destinations: 이름/아이콘 변경 -> #25, 서랍 칸 편집 ->
 * #26, 정렬/필터 설정 -> #27, 알림 설정 -> #29, 반복 관리 -> #33,
 * 백업/내보내기 -> existing data-management flow, 서랍 삭제 -> #28.
 * #25/#26 are real routes (caller's own onRenameDrawer/onEditFields).
 * #27/#28 are local sheet overlays rendered right here, matching the
 * component-local-modal convention already used for #18's delete
 * confirm -- #27's CONFIRMED.md ("27번은 진입 선택만 담당") is purely an
 * entry-selection sheet into the already-built #22/#23
 * (TableSortScreen/TableFilterScreen), fed this screen's own demo table
 * data since there's no real per-drawer table data yet (V2-12
 * territory, same caveat as #20's own table). [Step 2: these sheets now edit
 * the drawer's real table view -- the same sort/filter #20 opens with.] #28 reuses #18's
 * delete-sheet pattern; confirming calls the caller's onDeleteDrawer,
 * which per CONFIRMED.md ("삭제 후 홈 복귀") is responsible for the
 * actual navigate-home. #29/#33/backup still have no destination screen,
 * so those three rows stay the caller's own no-op handler.
 */
export function DrawerManageScreen({
  activeKey,
  drawerName = '화장품',
  drawerIconUri = '/assets/drawer-icons/drawer_icon_cosmetics.webp',
  fieldCount = 4,
  recordCount = 24,
  tableColumns = [],
  tableRows = [],
  tableView = EMPTY_VIEW,
  onTableViewChange,
  onBack,
  onRenameDrawer,
  onEditFields,
  onNotificationSettings,
  onRecurrenceManage,
  onBackupExport,
  onDeleteDrawer,
}: DrawerManageScreenProps) {
  const [sortFilterOpen, setSortFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const groups: DrawerManageRow[][] = [
    [
      { key: 'rename', label: t('서랍 이름 / 아이콘 변경'), icon: '/assets/ui-icons/icon_edit.webp', onClick: onRenameDrawer },
      { key: 'fields', label: t('서랍 칸 편집'), icon: '/assets/ui-icons/icon_grid.webp', onClick: onEditFields },
      { key: 'sort-filter', label: t('정렬 / 필터 설정'), icon: '/assets/ui-icons/icon_sort.webp', onClick: () => setSortFilterOpen(true) },
    ],
    [
      { key: 'notifications', label: t('알림 설정'), icon: '/assets/ui-icons/icon_notification.webp', onClick: onNotificationSettings },
      { key: 'recurrence', label: t('반복 관리'), icon: '/assets/ui-icons/icon_refresh.webp', onClick: onRecurrenceManage },
    ],
    [
      { key: 'backup', label: t('백업 / 내보내기'), icon: '/assets/ui-icons/icon_share.webp', onClick: onBackupExport },
    ],
    [
      { key: 'delete', label: t('서랍 삭제'), icon: '/assets/ui-icons/icon_delete.webp', danger: true, onClick: () => setDeleteConfirmOpen(true) },
    ],
  ];

  return (
    <section className="dm-screen">
      <ScreenHeader title={t('서랍 관리')} onBack={onBack} height={89} />

      <section className="dm-summary">
        <div className="dm-summary-icon">
          <img src={drawerIconUri} alt="" />
        </div>
        <div className="dm-summary-copy">
          <strong>{drawerName}</strong>
          <span>{t('{fields}개 서랍 칸, {items}개 보관품', { fields: fieldCount, items: recordCount })}</span>
        </div>
      </section>

      {groups.map((rows, groupIndex) => (
        <section className="dm-card" key={groupIndex}>
          {rows.map((row) => (
            <button
              key={row.key}
              type="button"
              className={`dm-row${row.danger ? ' danger' : ''}${row.key === activeKey ? ' is-active' : ''}`}
              onClick={row.onClick}
            >
              <span className="dm-row-icon"><img src={row.icon} alt="" /></span>
              <span className="dm-row-label">{row.label}</span>
              <span className="dm-chevron" aria-hidden="true">›</span>
            </button>
          ))}
        </section>
      ))}

      {sortFilterOpen && (
        <TableSortFilterEntryScreen
          onCancel={() => setSortFilterOpen(false)}
          onPickSort={() => { setSortFilterOpen(false); setSortOpen(true); }}
          onPickFilter={() => { setSortFilterOpen(false); setFilterOpen(true); }}
        />
      )}

      {sortOpen && (
        <TableSortScreen
          columns={tableColumns}
          initial={tableView.sort ?? undefined}
          lastUsedIds={tableView.sort ? [tableView.sort.columnId] : []}
          onCancel={() => setSortOpen(false)}
          onApply={(choice) => { onTableViewChange?.({ ...tableView, sort: choice }); setSortOpen(false); }}
        />
      )}

      {filterOpen && (
        <TableFilterScreen
          columns={tableColumns}
          rows={tableRows}
          initialRules={tableView.rules}
          initialMatchMode={tableView.matchMode}
          recentFieldIds={[...tableView.rules].reverse().map((r) => r.columnId)}
          onCancel={() => setFilterOpen(false)}
          onApply={(rules, matchMode) => { onTableViewChange?.({ ...tableView, rules, matchMode }); setFilterOpen(false); }}
        />
      )}

      {deleteConfirmOpen && (
        <DrawerDeleteConfirmScreen
          drawerName={drawerName}
          recordCount={recordCount}
          onCancel={() => setDeleteConfirmOpen(false)}
          onDelete={() => { setDeleteConfirmOpen(false); onDeleteDrawer?.(); }}
        />
      )}
    </section>
  );
}
