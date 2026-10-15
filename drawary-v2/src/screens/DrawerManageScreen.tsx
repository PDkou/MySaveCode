import './DrawerManageScreen.css';

interface DrawerManageRow {
  key: string;
  label: string;
  icon: string;
  danger?: boolean;
  onClick?: () => void;
}

interface DrawerManageScreenProps {
  drawerName?: string;
  drawerIconUri?: string;
  fieldCount?: number;
  recordCount?: number;
  onBack?: () => void;
  onRenameDrawer?: () => void;
  onEditFields?: () => void;
  onSortFilterSettings?: () => void;
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
 * CONFIRMED.md's destinations: 이름/아이콘 변경 -> #25, 서랍칸 편집 ->
 * #26, 정렬/필터 설정 -> #27, 알림 설정 -> #29, 반복 관리 -> #33,
 * 백업/내보내기 -> existing data-management flow, 서랍 삭제 -> #28.
 * None of #25-#29/#33 exist yet, so every row is wired to the caller's
 * own handler, left as no-ops for now by the caller rather than guessed
 * destinations.
 */
export function DrawerManageScreen({
  drawerName = '화장품',
  drawerIconUri = '/assets/drawer-icons/drawer_icon_cosmetics.webp',
  fieldCount = 4,
  recordCount = 24,
  onBack,
  onRenameDrawer,
  onEditFields,
  onSortFilterSettings,
  onNotificationSettings,
  onRecurrenceManage,
  onBackupExport,
  onDeleteDrawer,
}: DrawerManageScreenProps) {
  const groups: DrawerManageRow[][] = [
    [
      { key: 'rename', label: '서랍 이름 / 아이콘 변경', icon: '/assets/ui-icons/icon_edit.webp', onClick: onRenameDrawer },
      { key: 'fields', label: '서랍칸 편집', icon: '/assets/ui-icons/icon_grid.webp', onClick: onEditFields },
      { key: 'sort-filter', label: '정렬 / 필터 설정', icon: '/assets/ui-icons/icon_sort.webp', onClick: onSortFilterSettings },
    ],
    [
      { key: 'notifications', label: '알림 설정', icon: '/assets/ui-icons/icon_notification.webp', onClick: onNotificationSettings },
      { key: 'recurrence', label: '반복 관리', icon: '/assets/ui-icons/icon_refresh.webp', onClick: onRecurrenceManage },
    ],
    [
      { key: 'backup', label: '백업 / 내보내기', icon: '/assets/ui-icons/icon_share.webp', onClick: onBackupExport },
    ],
    [
      { key: 'delete', label: '서랍 삭제', icon: '/assets/ui-icons/icon_delete.webp', danger: true, onClick: onDeleteDrawer },
    ],
  ];

  return (
    <main className="dm-screen">
      <header className="dm-header">
        <button className="dm-back" type="button" onClick={onBack} aria-label="뒤로가기">‹</button>
        <h1>서랍 관리</h1>
        <span className="dm-header-spacer" />
      </header>

      <section className="dm-summary">
        <div className="dm-summary-icon">
          <img src={drawerIconUri} alt="" />
        </div>
        <div className="dm-summary-copy">
          <strong>{drawerName}</strong>
          <span>{fieldCount}개 서랍칸 · {recordCount}개 보관품</span>
        </div>
      </section>

      {groups.map((rows, groupIndex) => (
        <section className="dm-card" key={groupIndex}>
          {rows.map((row) => (
            <button
              key={row.key}
              type="button"
              className={row.danger ? 'dm-row danger' : 'dm-row'}
              onClick={row.onClick}
            >
              <span className="dm-row-icon"><img src={row.icon} alt="" /></span>
              <span className="dm-row-label">{row.label}</span>
              <span className="dm-chevron" aria-hidden="true">›</span>
            </button>
          ))}
        </section>
      ))}
    </main>
  );
}
