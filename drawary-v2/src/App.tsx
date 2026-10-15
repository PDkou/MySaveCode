import { useCallback, useEffect, useRef, useState } from 'react';
import { ResponsiveBottomNav } from './components/ResponsiveBottomNav';
import type { BottomNavTab } from './components/BottomNav_FINAL_CONFIRMED';
import { SplashScreen } from './screens/SplashScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { HomeScreen, type HomeAction } from './screens/HomeScreen';
import { HomeEmptyScreen } from './screens/HomeEmptyScreen';
import { GlobalSearchScreen } from './screens/GlobalSearchScreen';
import { MOCK_SEARCH_RECORDS } from './mockData';
import { SettingsHomeScreen } from './screens/SettingsHomeScreen';
import { DrawerFieldsScreen, DEFAULT_DRAWER_FIELDS } from './screens/DrawerFieldsScreen';
import { NewFieldScreen } from './screens/NewFieldScreen';
import { DrawerFieldEditScreen } from './screens/DrawerFieldEditScreen';
import { NameIconChangeScreen } from './screens/NameIconChangeScreen';
import { CreationCompleteScreen } from './screens/CreationCompleteScreen';
import { FillDrawerScreen } from './screens/FillDrawerScreen';
import { BackupProgressScreen } from './screens/BackupProgressScreen';
import { HomeEditScreen } from './screens/HomeEditScreen';
import { StatsScreen } from './screens/StatsScreen';
import { NewDrawerScreen } from './screens/NewDrawerScreen';
import { DrawerDetailScreen, DEFAULT_RECORDS } from './screens/DrawerDetailScreen';
import { RecordDetailScreen } from './screens/RecordDetailScreen';
import { RecordEditScreen } from './screens/RecordEditScreen';
import { PhotoViewerScreen } from './screens/PhotoViewerScreen';
import { TableViewScreen } from './screens/TableViewScreen';
import { DrawerManageScreen } from './screens/DrawerManageScreen';
import { NotificationSettingsScreen } from './screens/NotificationSettingsScreen';
import { NotificationDateFieldScreen } from './screens/NotificationDateFieldScreen';
import { NotificationTimingScreen } from './screens/NotificationTimingScreen';
import { NotificationCompleteScreen } from './screens/NotificationCompleteScreen';
import { RecurrenceManagementScreen, type RecurrenceRuleSummary } from './screens/RecurrenceManagementScreen';
import { RecurrenceTargetDateScreen } from './screens/RecurrenceTargetDateScreen';
import { RecurrenceCycleScreen, type RecurrenceCycle, cycleLabel } from './screens/RecurrenceCycleScreen';
import { RecurrenceEndConditionScreen, type RecurrenceEndCondition, endConditionLabel } from './screens/RecurrenceEndConditionScreen';
import { RecurrenceCompleteScreen } from './screens/RecurrenceCompleteScreen';
import { ThemeSettingsScreen } from './screens/ThemeSettingsScreen';
import { SecuritySettingsScreen } from './screens/SecuritySettingsScreen';
import { LockDetailScreen } from './screens/LockDetailScreen';
import { PinSetupScreen } from './screens/PinSetupScreen';
import { AppLockScreen } from './screens/AppLockScreen';
import { DataManagementHubScreen } from './screens/DataManagementHubScreen';
import { FixedCanvas } from './components/FixedCanvas';

type StandaloneRoute = 'drawer-fields' | 'splash' | 'onboarding' | 'home-empty' | 'new-field' | 'field-edit' | 'creation-complete' | 'fill-drawer' | 'backup-progress' | 'home-edit' | 'drawer-detail' | 'record-detail' | 'record-edit' | 'photo-viewer' | 'table-view' | 'drawer-manage' | 'name-icon-change' | 'drawer-fields-manage' | 'new-field-manage' | 'field-edit-manage' | 'notification-settings' | 'notification-date-field' | 'notification-timing' | 'notification-complete' | 'recurrence-management' | 'recurrence-target-date' | 'recurrence-cycle' | 'recurrence-end-condition' | 'recurrence-complete' | 'theme-settings' | 'security-settings' | 'lock-detail' | 'pin-setup' | 'app-lock' | 'data-management';
type Route = BottomNavTab | 'create-drawer' | StandaloneRoute;
const TABS: readonly BottomNavTab[] = ['home', 'search', 'stats', 'settings'];
const NAMES: Record<Exclude<Route, StandaloneRoute>, string> = {
  home: '홈', search: '검색', stats: '통계', settings: '설정', 'create-drawer': '새 서랍 만들기',
};
const isTab = (route: Route): route is BottomNavTab => TABS.some(tab => tab === route);
const STANDALONE_ROUTES: readonly Route[] = ['splash', 'onboarding', 'home-empty', 'new-field', 'field-edit', 'creation-complete', 'fill-drawer', 'backup-progress', 'home-edit', 'drawer-fields', 'drawer-detail', 'record-detail', 'record-edit', 'photo-viewer', 'table-view', 'drawer-manage', 'name-icon-change', 'drawer-fields-manage', 'new-field-manage', 'field-edit-manage', 'notification-settings', 'notification-date-field', 'notification-timing', 'notification-complete', 'recurrence-management', 'recurrence-target-date', 'recurrence-cycle', 'recurrence-end-condition', 'recurrence-complete', 'theme-settings', 'security-settings', 'lock-detail', 'pin-setup', 'app-lock', 'data-management'];
const parseRoute = (): Route => {
  const route = window.location.hash.replace(/^#\/?/, '');
  if (route === 'create-drawer' || STANDALONE_ROUTES.some(r => r === route) || TABS.some(tab => tab === route)) return route as Route;
  return 'home';
};

/** #03 Home content hotspots that have no destination screen yet. Per
 * CLAUDE.md, a missing source is a blocker to flag, not something to
 * approximate -- so these are a deliberate no-op for now rather than a
 * guessed navigation target. The open-* drawer-card actions now DO have
 * a destination (#15, below), so only "edit" was removed from here
 * once #06 landed; this set no longer needs updating for the open-*
 * actions either. */
const UNIMPLEMENTED_HOME_ACTIONS: ReadonlySet<HomeAction> = new Set([]);

/** HomeAction -> #15's drawerName, matching #03's own card labels.
 * There's no real per-drawer data model yet (V2-12), so #15 always
 * shows the same 4 demo records regardless of which card was opened --
 * only the header's name/count differ, which is honest about what's
 * actually wired rather than faking distinct per-drawer content. */
const DRAWER_NAMES: Record<Exclude<HomeAction, 'create-drawer' | 'edit'>, string> = {
  'open-cosmetics': '화장품',
  'open-books': '책',
  'open-plants': '식물',
  'open-travel': '여행',
  'open-other': '소중한 것들',
};

/** V2-09-01/02: user-approved splash and onboarding components are available
 * at #/splash and #/onboarding for parity QA, and onboarding's "시작하기"/
 * "건너뛰기" both route to #/home as confirmed.
 * NOT yet wired: an automatic splash -> onboarding handoff on first cold
 * start. No approved source specifies the splash's auto-dismiss duration,
 * and CLAUDE.md explicitly forbids inventing one -- this is flagged as an
 * open product decision, not guessed at.
 * All other routes remain the developer-only V2-08 harness, not finished product screens.
 */
export default function App() {
  const [route, setRoute] = useState<Route>(parseRoute);
  const lastTabRef = useRef<BottomNavTab>('home');
  const [drawerDetailName, setDrawerDetailName] = useState('화장품');
  // #25 서랍 이름 / 아이콘 변경 writes both of these back on save, and #24
  // reads them straight back out -- the "상단 정보 즉시 갱신" CONFIRMED.md
  // asks for, done via shared App-level state rather than local state in
  // either screen.
  const [drawerIconId, setDrawerIconId] = useState('cosmetics');
  const [recordDetailId, setRecordDetailId] = useState('lip');
  // '' means "no photo" -- RecordEditScreen's photoUri prop defaults to
  // the fixture only when passed `undefined`, so removal must use ''
  // rather than undefined or the default parameter would silently put
  // the photo right back (a real bug caught during this screen's QA).
  const [editPhotoUri, setEditPhotoUri] = useState('/fixtures/sample_edit_photo.webp');

  // #29-#32 알림 설정 wizard state. dateFields comes from
  // DEFAULT_DRAWER_FIELDS filtered to kind==='date' (the same demo
  // drawer fields #09/#26 already use) -- for this drawer that's
  // exactly one field (구매일), matching CONFIRMED.md's own "날짜
  // 서랍칸이 1개뿐이면 기본 선택" case.
  const dateFields = DEFAULT_DRAWER_FIELDS.filter((f) => f.kind === 'date').map((f) => ({ id: f.id, name: f.name }));
  const [notifDateFieldId, setNotifDateFieldId] = useState<string | undefined>(undefined);
  const [notifDaysBefore, setNotifDaysBefore] = useState(7);
  const [notifTime, setNotifTime] = useState('09:00');

  // #33-#37 반복 관리 wizard state. `recurrenceRules` starts empty so
  // #33 shows CONFIRMED.md's own empty state first; completing #36 adds
  // a rule (see the recurrence-end-condition route). Target candidates
  // reuse #15's own DEFAULT_RECORDS (the real per-drawer item data this
  // app already has) rather than inventing a "선크림" item that exists
  // nowhere else in the app, even though CONFIRMED.md's own illustrative
  // example happens to use that name.
  const recurrenceTargets = DEFAULT_RECORDS.map((r) => ({ id: r.id, title: r.subtitle ?? r.title }));
  const [recurrenceRules, setRecurrenceRules] = useState<RecurrenceRuleSummary[]>([]);
  const [recurrenceTargetId, setRecurrenceTargetId] = useState<string | undefined>(undefined);
  const [recurrenceDateFieldId, setRecurrenceDateFieldId] = useState<string | undefined>(undefined);
  const [recurrenceCycle, setRecurrenceCycle] = useState<RecurrenceCycle>('monthly');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceEndCondition, setRecurrenceEndCondition] = useState<RecurrenceEndCondition>({ kind: 'never' });

  // #40-#43 보안/잠금. pinValue is the real PIN #42's flow commits (not
  // the archive's own hardcoded demo PIN); appLockEnabled can only be
  // switched on once a PIN exists, matching #41's own "don't turn on a
  // lock before PIN is configured" rule for real.
  const [pinValue, setPinValue] = useState<string | null>(null);
  const [appLockEnabled, setAppLockEnabled] = useState(false);

  useEffect(() => {
    const update = () => setRoute(parseRoute());
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);

  const navigate = useCallback((to: Route) => {
    if (isTab(to)) lastTabRef.current = to;
    const next = `#/${to}`;
    if (window.location.hash === next) { setRoute(to); return; }
    window.location.hash = next;
    setRoute(to);
  }, []);
  const returnToTab = useCallback(() => navigate(lastTabRef.current), [navigate]);
  if (route === 'splash') {
    return <main className="drawary-app-shell drawary-splash-route" data-route="splash"><SplashScreen fadingOut={false}/></main>;
  }
  if (route === 'onboarding') {
    return <main className="drawary-app-shell drawary-onboarding-route" data-route="onboarding">
      <OnboardingScreen onDone={() => navigate('home')} />
    </main>;
  }
  if (route === 'new-field') {
    // #10 QA route. Reachable from #09's "서랍 칸 추가" for now; returns to
    // #09 on both back and add. Not yet wired to actually append the new
    // field back into #09's list -- that needs shared create-drawer state
    // across these still-independent screens (V2-12 territory), so this
    // is a real navigable step, not yet a real round-trip of data.
    return <main className="drawary-app-shell" data-route="new-field">
      <FixedCanvas height={844}><NewFieldScreen onBack={() => navigate('drawer-fields')} onAdd={() => navigate('drawer-fields')} /></FixedCanvas>
    </main>;
  }
  if (route === 'drawer-fields') {
    // #09: the real screen, now chained to the real #10/#11/#12 screens,
    // and reachable only after #08's name/icon/color step (below). Back
    // returns to #08 rather than all the way to the previous tab, since
    // #08 -> #09 is the real forward step in this flow.
    // onQuickAdd/onReorder still have no real behavior -- #09's own
    // fields list is local demo state, not yet backed by shared
    // create-drawer state (V2-12), so a quick-add chip or a drag-reorder
    // has nothing to actually mutate yet.
    return <main className="drawary-app-shell" data-route="drawer-fields">
      <FixedCanvas height={844}>
        <DrawerFieldsScreen
          onBack={() => navigate('create-drawer')}
          onAddField={() => navigate('new-field')}
          onEditField={() => navigate('field-edit')}
          onComplete={() => navigate('creation-complete')}
        />
      </FixedCanvas>
    </main>;
  }
  if (route === 'create-drawer') {
    // #08 새 서랍 만들기 (name/icon/color) -- the real first step of this
    // flow, reached from the home "+" action / bottom-nav "+" / empty
    // state / edit mode, all of which already call onCreateDrawer. No
    // approved source exists (STATUS.md: NO_FINAL_CODE_IMAGE_ONLY);
    // reconstructed as a bottom sheet over a dimmed Home -- see
    // NewDrawerScreen.tsx's own header comment. The draft name/icon/color
    // aren't persisted anywhere yet (no shared create-drawer state until
    // V2-12), so "다음" just advances to #09 without carrying them.
    return <main className="drawary-app-shell" data-route="create-drawer">
      <section className="drawary-route-panel drawary-dimmed-home" aria-hidden="true">
        <HomeScreen onAction={() => {}} />
      </section>
      <NewDrawerScreen onNext={() => navigate('drawer-fields')} onDismiss={returnToTab} />
    </main>;
  }
  if (route === 'field-edit') {
    // #11 QA route, reachable from #09's "서랍 칸 수정". Same caveat as
    // #10: its own internal field list/edit state is independent of #09's,
    // not yet unified. Back now actually returns to #09 -- the archive's
    // own back button had no onClick at all (found while adding the
    // #26 reuse's field-edit-manage route, which needed the same prop).
    return <main className="drawary-app-shell" data-route="field-edit">
      <FixedCanvas height={844}><DrawerFieldEditScreen onBack={() => navigate('drawer-fields')} /></FixedCanvas>
    </main>;
  }
  if (route === 'creation-complete') {
    // #12 QA route, reachable from #09's "서랍 만들기 완료하기". "서랍 채우기"
    // chains to the real #13; "나중에" has nowhere more specific to land
    // than the previous tab, since there's no real drawer yet to return to.
    return <main className="drawary-app-shell" data-route="creation-complete">
      <FixedCanvas height={844}><CreationCompleteScreen onFillDrawer={() => navigate('fill-drawer')} onLater={returnToTab} /></FixedCanvas>
    </main>;
  }
  if (route === 'fill-drawer') {
    // #13/#14 QA route, reachable from #12's "서랍 채우기" or #15's own
    // "서랍 채우기" button. onSave returns to #15 (drawer-detail) now
    // that it exists, though the saved item isn't actually appended to
    // #15's record list yet -- that's still V2-12 data-layer territory.
    return <main className="drawary-app-shell" data-route="fill-drawer">
      <FixedCanvas height={844}><FillDrawerScreen onBack={() => navigate('creation-complete')} onSave={() => navigate('drawer-detail')} /></FixedCanvas>
    </main>;
  }
  if (route === 'drawer-detail') {
    // #15 서랍 상세 / 보관품 목록, reachable from #03's drawer-card
    // hotspots. "표로 보기" -> #20. "서랍 관리"(#24) has no destination
    // screen yet -- intentional no-op, same reasoning as other
    // not-yet-built destinations.
    return <main className="drawary-app-shell" data-route="drawer-detail">
      <FixedCanvas height={844}>
        <DrawerDetailScreen
          drawerName={drawerDetailName}
          onBack={returnToTab}
          onFillDrawer={() => navigate('fill-drawer')}
          onOpenRecord={(id) => { setRecordDetailId(id); navigate('record-detail'); }}
          onOpenTable={() => navigate('table-view')}
          onOpenManage={() => navigate('drawer-manage')}
        />
      </FixedCanvas>
    </main>;
  }
  if (route === 'table-view') {
    // #20 표 보기, reachable from #15's "•••" menu's "표로 보기".
    // #21/#22/#23 (search/sort/filter) are built into TableViewScreen
    // itself as internal states -- see its own header comment. CSV/PDF
    // export (the "•••" menu) has no destination yet. Clicking a row
    // opens #16 for that row -- demo rows don't map back to #15's own
    // DEFAULT_RECORDS (different sample data sets), so this always
    // opens the "lip" record; real per-row linking needs V2-12.
    return <main className="drawary-app-shell" data-route="table-view">
      <FixedCanvas height={844}>
        <TableViewScreen
          drawerName={drawerDetailName}
          onBack={() => navigate('drawer-detail')}
          onExport={() => {}}
          onOpenRecord={() => { setRecordDetailId('lip'); navigate('record-detail'); }}
        />
      </FixedCanvas>
    </main>;
  }
  if (route === 'drawer-manage') {
    // #24 서랍 관리 메인, reachable from #15's "•••" menu's "서랍 관리"
    // (previously a no-op). 이름/아이콘 변경 -> #25, 서랍칸 편집 -> #26
    // (both real routes below). 정렬/필터 설정(#27) and 서랍 삭제(#28) are
    // handled as local overlays inside DrawerManageScreen itself now --
    // deleting calls this onDeleteDrawer, which per #28's CONFIRMED.md
    // ("삭제 후 홈 복귀") returns all the way to the home tab. 알림 설정
    // -> #29, 반복 관리 -> #33 (both real routes below). 백업/내보내기
    // has no destination screen among #25-#37, so that one row stays an
    // intentional no-op.
    return <main className="drawary-app-shell" data-route="drawer-manage">
      <FixedCanvas height={844}>
        <DrawerManageScreen
          drawerName={drawerDetailName}
          drawerIconUri={`/assets/drawer-icons/drawer_icon_${drawerIconId}.webp`}
          onBack={() => navigate('drawer-detail')}
          onRenameDrawer={() => navigate('name-icon-change')}
          onEditFields={() => navigate('drawer-fields-manage')}
          onNotificationSettings={() => navigate('notification-settings')}
          onRecurrenceManage={() => navigate('recurrence-management')}
          onBackupExport={() => {}}
          onDeleteDrawer={() => navigate('home')}
        />
      </FixedCanvas>
    </main>;
  }
  if (route === 'notification-settings') {
    // #29 알림 설정, reachable from #24's "알림 설정" row. "알림 추가하기"
    // -> #30. "알림 공통 설정" has no destination among #25-#37, so it
    // stays an intentional no-op.
    return <main className="drawary-app-shell" data-route="notification-settings">
      <FixedCanvas height={844}>
        <NotificationSettingsScreen
          drawerName={drawerDetailName}
          fieldCount={DEFAULT_DRAWER_FIELDS.length}
          recordCount={DEFAULT_RECORDS.length}
          drawerIconUri={`/assets/drawer-icons/drawer_icon_${drawerIconId}.webp`}
          onBack={() => navigate('drawer-manage')}
          onAddNotification={() => navigate('notification-date-field')}
          onOpenCommonSettings={() => {}}
        />
      </FixedCanvas>
    </main>;
  }
  if (route === 'notification-date-field') {
    // #30 날짜 칸 선택, reachable from #29's "알림 추가하기". Back returns
    // to #29. "다음" -> #31.
    return <main className="drawary-app-shell" data-route="notification-date-field">
      <FixedCanvas height={844}>
        <NotificationDateFieldScreen
          drawerName={drawerDetailName}
          dateFields={dateFields}
          selectedId={notifDateFieldId}
          drawerIconUri={`/assets/drawer-icons/drawer_icon_${drawerIconId}.webp`}
          onSelect={(fieldId) => setNotifDateFieldId(fieldId)}
          onBack={() => navigate('notification-settings')}
          onNext={(fieldId) => { setNotifDateFieldId(fieldId); navigate('notification-timing'); }}
        />
      </FixedCanvas>
    </main>;
  }
  if (route === 'notification-timing') {
    // #31 알림 시점 / 시간 설정. No separate TSX exists in the archive for
    // this screen -- see NotificationTimingScreen.tsx's own header
    // comment for what was built fresh vs. ported. Back returns to #30.
    // "알림 설정하기" -> #32.
    const dateField = dateFields.find((f) => f.id === notifDateFieldId) ?? dateFields[0];
    return <main className="drawary-app-shell" data-route="notification-timing">
      <FixedCanvas height={844}>
        <NotificationTimingScreen
          drawerName={drawerDetailName}
          dateFieldName={dateField?.name ?? ''}
          initialDaysBefore={notifDaysBefore}
          initialTime={notifTime}
          drawerIconUri={`/assets/drawer-icons/drawer_icon_${drawerIconId}.webp`}
          onBack={() => navigate('notification-date-field')}
          onSubmit={({ daysBefore, time }) => {
            setNotifDaysBefore(daysBefore);
            setNotifTime(time);
            navigate('notification-complete');
          }}
        />
      </FixedCanvas>
    </main>;
  }
  if (route === 'notification-complete') {
    // #32 알림 완료, reachable from #31's "알림 설정하기". "알림 더
    // 추가하기" -> #30. "확인" -> #24.
    const dateField = dateFields.find((f) => f.id === notifDateFieldId) ?? dateFields[0];
    return <main className="drawary-app-shell" data-route="notification-complete">
      <FixedCanvas height={844}>
        <NotificationCompleteScreen
          drawerName={drawerDetailName}
          itemCount={DEFAULT_RECORDS.length}
          dateFieldName={dateField?.name ?? ''}
          daysBefore={notifDaysBefore}
          time={notifTime}
          drawerIconUri={`/assets/drawer-icons/drawer_icon_${drawerIconId}.webp`}
          onAddAnother={() => navigate('notification-date-field')}
          onDone={() => navigate('drawer-manage')}
        />
      </FixedCanvas>
    </main>;
  }
  if (route === 'recurrence-management') {
    // #33 반복 관리, reachable from #24's "반복 관리" row. "반복
    // 설정하기"/"반복 설정 추가하기" -> #34. Row taps on an existing rule
    // have no destination (CONFIRMED.md only asks for display, not
    // edit), so those stay an intentional no-op.
    return <main className="drawary-app-shell" data-route="recurrence-management">
      <FixedCanvas height={844}>
        <RecurrenceManagementScreen
          drawerName={drawerDetailName}
          fieldCount={DEFAULT_DRAWER_FIELDS.length}
          itemCount={DEFAULT_RECORDS.length}
          rules={recurrenceRules}
          drawerIconUri={`/assets/drawer-icons/drawer_icon_${drawerIconId}.webp`}
          onBack={() => navigate('drawer-manage')}
          onAdd={() => navigate('recurrence-target-date')}
          onOpenRule={() => {}}
        />
      </FixedCanvas>
    </main>;
  }
  if (route === 'recurrence-target-date') {
    // #34 반복 대상 / 날짜 칸, reachable from #33's "반복 설정하기"/"반복
    // 설정 추가하기". `onSelectTarget` cycles through the demo target
    // list -- see RecurrenceTargetDateScreen.tsx's own header comment on
    // why (no dedicated item-picker screen exists among the 59 approved
    // designs). Back returns to #33. "다음" -> #35.
    return <main className="drawary-app-shell" data-route="recurrence-target-date">
      <FixedCanvas height={844}>
        <RecurrenceTargetDateScreen
          drawerName={drawerDetailName}
          fieldCount={DEFAULT_DRAWER_FIELDS.length}
          itemCount={DEFAULT_RECORDS.length}
          targets={recurrenceTargets}
          dateFields={dateFields}
          selectedTargetId={recurrenceTargetId}
          selectedDateFieldId={recurrenceDateFieldId}
          drawerIconUri={`/assets/drawer-icons/drawer_icon_${drawerIconId}.webp`}
          onBack={() => navigate('recurrence-management')}
          onSelectTarget={() => {
            const ids = recurrenceTargets.map((t) => t.id);
            const current = recurrenceTargetId ? ids.indexOf(recurrenceTargetId) : -1;
            setRecurrenceTargetId(ids[(current + 1) % ids.length]);
          }}
          onSelectDateField={(fieldId) => setRecurrenceDateFieldId(fieldId)}
          onNext={({ targetId, dateFieldId }) => {
            setRecurrenceTargetId(targetId);
            setRecurrenceDateFieldId(dateFieldId);
            navigate('recurrence-cycle');
          }}
        />
      </FixedCanvas>
    </main>;
  }
  if (route === 'recurrence-cycle') {
    // #35 매주 / 매월 / 매년 설정, reachable from #34's "다음". Back
    // returns to #34. "다음" -> #36.
    const target = recurrenceTargets.find((t) => t.id === recurrenceTargetId);
    const dateField = dateFields.find((f) => f.id === recurrenceDateFieldId);
    return <main className="drawary-app-shell" data-route="recurrence-cycle">
      <FixedCanvas height={844}>
        <RecurrenceCycleScreen
          targetName={target?.title ?? ''}
          dateFieldName={dateField?.name ?? ''}
          initialCycle={recurrenceCycle}
          initialInterval={recurrenceInterval}
          onBack={() => navigate('recurrence-target-date')}
          onNext={({ cycle, interval }) => {
            setRecurrenceCycle(cycle);
            setRecurrenceInterval(interval);
            navigate('recurrence-end-condition');
          }}
        />
      </FixedCanvas>
    </main>;
  }
  if (route === 'recurrence-end-condition') {
    // #36 반복 종료 조건, reachable from #35's "다음". Back returns to
    // #35. "반복 설정하기" both commits the new rule into
    // `recurrenceRules` (this is the last step with user input before
    // the #37 summary screen) and navigates to #37.
    const target = recurrenceTargets.find((t) => t.id === recurrenceTargetId);
    const dateField = dateFields.find((f) => f.id === recurrenceDateFieldId);
    const label = cycleLabel(recurrenceCycle, recurrenceInterval);
    return <main className="drawary-app-shell" data-route="recurrence-end-condition">
      <FixedCanvas height={844}>
        <RecurrenceEndConditionScreen
          targetName={target?.title ?? ''}
          dateFieldName={dateField?.name ?? ''}
          cycleLabel={label}
          initial={recurrenceEndCondition}
          onBack={() => navigate('recurrence-cycle')}
          onSubmit={(condition) => {
            setRecurrenceEndCondition(condition);
            if (target && dateField) {
              setRecurrenceRules((rules) => [
                ...rules,
                {
                  id: `${target.id}-${Date.now()}`,
                  targetLabel: target.title,
                  dateFieldName: dateField.name,
                  cycleLabel: label,
                  enabled: true,
                },
              ]);
            }
            navigate('recurrence-complete');
          }}
        />
      </FixedCanvas>
    </main>;
  }
  if (route === 'recurrence-complete') {
    // #37 반복 완료, reachable from #36's "반복 설정하기". "반복 더
    // 추가하기" -> #34 (clearing the target/date selection so the next
    // pass starts fresh). "확인" -> #24.
    const target = recurrenceTargets.find((t) => t.id === recurrenceTargetId);
    const dateField = dateFields.find((f) => f.id === recurrenceDateFieldId);
    return <main className="drawary-app-shell" data-route="recurrence-complete">
      <FixedCanvas height={844}>
        <RecurrenceCompleteScreen
          drawerName={drawerDetailName}
          targetName={target?.title ?? ''}
          dateFieldName={dateField?.name ?? ''}
          cycleLabel={cycleLabel(recurrenceCycle, recurrenceInterval)}
          endLabel={endConditionLabel(recurrenceEndCondition)}
          drawerIconUri={`/assets/drawer-icons/drawer_icon_${drawerIconId}.webp`}
          onAddAnother={() => {
            setRecurrenceTargetId(undefined);
            setRecurrenceDateFieldId(undefined);
            navigate('recurrence-target-date');
          }}
          onDone={() => navigate('drawer-manage')}
        />
      </FixedCanvas>
    </main>;
  }
  if (route === 'theme-settings') {
    // #39 테마 설정, reachable from #38's "테마 설정" row. No approved
    // TSX exists, only a self-contained `index.html` -- see
    // ThemeSettingsScreen.tsx's own header comment. Back returns to #38.
    return <main className="drawary-app-shell" data-route="theme-settings">
      <FixedCanvas height={844}>
        <ThemeSettingsScreen onBack={returnToTab} />
      </FixedCanvas>
    </main>;
  }
  if (route === 'security-settings') {
    // #40 보안 설정, reachable from #38's "보안 설정" row. Back returns
    // to #38. "앱 잠금" row -> #41.
    return <main className="drawary-app-shell" data-route="security-settings">
      <FixedCanvas height={844}>
        <SecuritySettingsScreen onBack={returnToTab} onOpenAppLock={() => navigate('lock-detail')} />
      </FixedCanvas>
    </main>;
  }
  if (route === 'lock-detail') {
    // #41 잠금 설정 상세, reachable from #40's "앱 잠금" row. Back
    // returns to #40. "PIN 설정 / 변경" -> #42. The "앱 잠금 사용" switch
    // is only enabled once a real PIN exists (see the pinValue state
    // above); toggling it off is always allowed.
    return <main className="drawary-app-shell" data-route="lock-detail">
      <FixedCanvas height={844}>
        <LockDetailScreen
          hasPin={pinValue !== null}
          appLockEnabled={appLockEnabled}
          onBack={() => navigate('security-settings')}
          onToggleAppLock={() => setAppLockEnabled((v) => !v)}
          onOpenPinSetup={() => navigate('pin-setup')}
        />
      </FixedCanvas>
    </main>;
  }
  if (route === 'pin-setup') {
    // #42 PIN 설정 / 변경, reachable from #41's "PIN 설정 / 변경" row.
    // Back returns to #41. Completing the real new->confirm->done flow
    // (see PinSetupScreen.tsx's own header comment) commits the PIN
    // into shared state and returns to #41, whose "앱 잠금 사용" switch
    // becomes enabled immediately.
    return <main className="drawary-app-shell" data-route="pin-setup">
      <FixedCanvas height={844}>
        <PinSetupScreen
          onBack={() => navigate('lock-detail')}
          onComplete={(pin) => { setPinValue(pin); navigate('lock-detail'); }}
        />
      </FixedCanvas>
    </main>;
  }
  if (route === 'app-lock') {
    // #43 앱 잠금 화면 (fullscreen PIN gate, no back button -- matches
    // the archive exactly). Not reachable from any row in this app yet:
    // none of #40-#44's own flows actually re-launch the app to trigger
    // it, and simulating an app-restart is out of scope for a browser
    // harness. Kept as a standalone QA route instead of inventing a fake
    // trigger, same reasoning as #01's own standalone splash-timing
    // route. `correctPin` uses the real PIN #42 committed, falling back
    // to the archive's own demo PIN only when none has been set yet
    // (see AppLockScreen.tsx's own header comment).
    return <main className="drawary-app-shell" data-route="app-lock">
      <FixedCanvas height={844}>
        <AppLockScreen correctPin={pinValue ?? '2468'} onUnlock={() => {}} />
      </FixedCanvas>
    </main>;
  }
  if (route === 'data-management') {
    // #44 데이터 관리 허브, reachable from #38's "데이터 관리" row. Back
    // returns to #38. 백업(#45)/복원(#49)/초기화(#53) have no destination
    // screen yet, so those three stay intentional no-ops.
    return <main className="drawary-app-shell" data-route="data-management">
      <FixedCanvas height={844}>
        <DataManagementHubScreen onBack={returnToTab} onBackup={() => {}} onRestore={() => {}} onReset={() => {}} />
      </FixedCanvas>
    </main>;
  }
  if (route === 'name-icon-change') {
    // #25 서랍 이름 / 아이콘 변경, reachable from #24's "서랍 이름 / 아이콘
    // 변경" row. Saving updates the shared drawerDetailName/drawerIconId
    // state and returns to #24, whose header re-renders from that same
    // state -- the "상단 정보 즉시 갱신" CONFIRMED.md asks for.
    return <main className="drawary-app-shell" data-route="name-icon-change">
      <FixedCanvas height={844}>
        <NameIconChangeScreen
          initialName={drawerDetailName}
          initialIconId={drawerIconId}
          onBack={() => navigate('drawer-manage')}
          onSave={({ name, iconId }) => {
            setDrawerDetailName(name);
            setDrawerIconId(iconId);
            navigate('drawer-manage');
          }}
        />
      </FixedCanvas>
    </main>;
  }
  if (route === 'drawer-fields-manage') {
    // #26 서랍칸 편집. Per REUSE_MAPPING.md this is NOT a new screen --
    // it reuses #09's DrawerFieldsScreen verbatim, only swapping the
    // creation-flow's own title/copy/destination for an edit-mode
    // context (진입점: #24, 완료/뒤로가기: #24로 복귀, 신규 생성 플로우용
    // 문구 미사용) via the title/completeLabel/contextLabel props added
    // for this reuse. contextLabel renders the REUSE_MAPPING's own
    // approved visual refinement: drawer name + field count on one
    // baseline, centered as a group.
    return <main className="drawary-app-shell" data-route="drawer-fields-manage">
      <FixedCanvas height={844}>
        <DrawerFieldsScreen
          title="서랍칸 편집"
          completeLabel="완료"
          contextLabel={{ name: drawerDetailName, detail: `${DEFAULT_DRAWER_FIELDS.length}개 서랍칸` }}
          onBack={() => navigate('drawer-manage')}
          onAddField={() => navigate('new-field-manage')}
          onEditField={() => navigate('field-edit-manage')}
          onComplete={() => navigate('drawer-manage')}
        />
      </FixedCanvas>
    </main>;
  }
  if (route === 'new-field-manage') {
    // #26's reuse of #10 (NewFieldScreen), entered only from
    // drawer-fields-manage -- back/add both return there instead of the
    // creation-flow's drawer-fields route.
    return <main className="drawary-app-shell" data-route="new-field-manage">
      <FixedCanvas height={844}><NewFieldScreen onBack={() => navigate('drawer-fields-manage')} onAdd={() => navigate('drawer-fields-manage')} /></FixedCanvas>
    </main>;
  }
  if (route === 'field-edit-manage') {
    // #26's reuse of #11 (DrawerFieldEditScreen), entered only from
    // drawer-fields-manage. Added a real onBack prop to DrawerFieldEditScreen
    // itself for this (its own archive never wired the back button at
    // all), reused here and by the existing field-edit route below.
    return <main className="drawary-app-shell" data-route="field-edit-manage">
      <FixedCanvas height={844}><DrawerFieldEditScreen onBack={() => navigate('drawer-fields-manage')} /></FixedCanvas>
    </main>;
  }
  if (route === 'record-detail') {
    // #16 보관품 상세, reachable from #15's record rows. Uses that same
    // record's own demo title (DEFAULT_RECORDS) so the clicked item's
    // content actually carries over, rather than always showing the
    // same hardcoded 롬앤 sample regardless of which row was clicked.
    // Photo: only #15's "lip" row has a matching full-resolution photo
    // available (the same 롬앤 틴트 fixture #14 uses) -- #15's other 3
    // rows only have small 92x98 list thumbnails, so this honestly
    // reuses those (upscaled/soft) rather than inventing a higher-res
    // photo that was never provided. "수정하기" -> #17. "보관품 삭제"
    // opens #18's confirm sheet (handled locally inside
    // RecordDetailScreen); confirming it there calls this onDelete,
    // which per #18's CONFIRMED.md returns to #15 (서랍 상세) -- there's
    // no real deletion from a data model yet (V2-12), so this is
    // navigation-only, same caveat as #09-#13's local demo state.
    const record = DEFAULT_RECORDS.find((r) => r.id === recordDetailId) ?? DEFAULT_RECORDS[0];
    const photoUri = record.id === 'lip' ? '/fixtures/sample_selected_photo.webp' : record.thumbnailUri;
    return <main className="drawary-app-shell" data-route="record-detail">
      <FixedCanvas height={844}>
        <RecordDetailScreen
          drawerName={drawerDetailName}
          title={record.subtitle ?? record.title}
          photoUri={photoUri}
          onBack={() => navigate('drawer-detail')}
          onEdit={() => navigate('record-edit')}
          onDelete={() => navigate('drawer-detail')}
          onOpenPhoto={() => navigate('photo-viewer')}
        />
      </FixedCanvas>
    </main>;
  }
  if (route === 'photo-viewer') {
    // #19 사진 확대/보기, reachable by tapping #16's main photo
    // (CLAUDE.md note: #16's own confirmed source never defines that
    // tap target, so this wiring is this app's own addition -- see
    // RecordDetailScreen.tsx's onOpenPhoto comment). Closing returns to
    // #16 per CONFIRMED.md. No clean 3-photo set for a single item
    // exists in any archive (the real fixtures are mis-captured
    // screenshot crops, like #16's) -- reuses #15's 3 clean item
    // thumbnails purely to exercise the swipe/zoom/thumbnail mechanics,
    // not as "the" approved photo set.
    return <main className="drawary-app-shell" data-route="photo-viewer">
      <FixedCanvas height={844}>
        <PhotoViewerScreen
          photoUris={['/fixtures/sample_lip.webp', '/fixtures/sample_cushion.webp', '/fixtures/sample_palette.webp']}
          onClose={() => navigate('record-detail')}
        />
      </FixedCanvas>
    </main>;
  }
  if (route === 'record-edit') {
    // #17 보관품 수정, reachable from #16's "수정하기" (previously a
    // no-op). Per CONFIRMED.md, "수정 완료" returns to #16 (보관품 상세),
    // not somewhere new. Photo remove/re-add is real local state here
    // (not yet written back into #16's own displayed photo -- no shared
    // record data model exists until V2-12).
    return <main className="drawary-app-shell" data-route="record-edit">
      <FixedCanvas height={844}>
        <RecordEditScreen
          drawerName={drawerDetailName}
          photoUri={editPhotoUri}
          onBack={() => navigate('record-detail')}
          onPickPhoto={() => setEditPhotoUri('/fixtures/sample_edit_photo.webp')}
          onRemovePhoto={() => setEditPhotoUri('')}
          onSave={() => navigate('record-detail')}
        />
      </FixedCanvas>
    </main>;
  }
  if (route === 'backup-progress') {
    // #47 QA route. Standalone screen (no bottom nav); user-confirmed
    // design per docs/V2_07_SCREEN47_QA.md, now React-integrated with the
    // mascot binary the user pushed directly to GitHub (commit 7f5574e).
    // No real backup logic wired yet -- onBack just returns to settings.
    return <main className="drawary-app-shell" data-route="backup-progress">
      <BackupProgressScreen onBack={() => navigate('settings')} />
    </main>;
  }
  if (route === 'home-edit') {
    // #06 QA route, reachable from #03's "편집" hotspot. Delete/reorder
    // are local demo no-ops for now (same V2-12 data-layer caveat as
    // #09's quick-add/reorder) -- this screen only proves the edit-mode
    // overlay itself, not a live mutation of the home grid.
    return <main className="drawary-app-shell" data-route="home-edit">
      <section className="drawary-route-panel">
        <HomeEditScreen
          onDone={() => navigate('home')}
          onDeleteDrawer={() => {}}
          onReorderDrawer={() => {}}
          onCreateDrawer={() => navigate('create-drawer')}
        />
      </section>
      <footer className="drawary-shell-footer">
        <ResponsiveBottomNav active="home" onNavigate={navigate} onCreateDrawer={() => navigate('create-drawer')} />
      </footer>
    </main>;
  }
  if (route === 'home-empty') {
    // V2-09-04 QA route: the confirmed empty state isn't wired as the live
    // '#/home' conditional yet -- that needs a real drawer count from the
    // V2-12 data layer. Standalone here so it can be reviewed/tested now.
    return <main className="drawary-app-shell" data-route="home-empty">
      <section className="drawary-route-panel"><HomeEmptyScreen onCreateDrawer={() => navigate('create-drawer')} /></section>
      <footer className="drawary-shell-footer">
        <ResponsiveBottomNav active="home" onNavigate={navigate} onCreateDrawer={() => navigate('create-drawer')} />
      </footer>
    </main>;
  }
  const tabRoute = isTab(route);
  return (
    <main className="drawary-app-shell" data-route={route}>
      <section className="drawary-route-panel" aria-labelledby={route === 'home' || route === 'search' || route === 'settings' || route === 'stats' ? undefined : 'drawary-dev-screen-title'}>
        {route === 'home' ? (
          <HomeScreen onAction={(action) => {
            if (action === 'create-drawer') { navigate('create-drawer'); return; }
            if (action === 'edit') { navigate('home-edit'); return; }
            if (UNIMPLEMENTED_HOME_ACTIONS.has(action)) return; // no destination screen yet; see CLAUDE.md note above
            setDrawerDetailName(DRAWER_NAMES[action]);
            navigate('drawer-detail');
          }} />
        ) : route === 'search' ? (
          // #05: open-record has no destination screen yet (drawer/item
          // detail aren't built) -- intentional no-op, same reasoning as
          // HomeScreen's open-* actions above.
          <GlobalSearchScreen records={MOCK_SEARCH_RECORDS} onOpenRecord={() => {}} />
        ) : route === 'settings' ? (
          // #38: 테마->#39, 보안->#40, 데이터->#44 all real routes now.
          // 언어/도움말/정보/피드백 (#54/#55/#58/#59) still have no
          // destination screen, so those three rows stay unwired.
          <SettingsHomeScreen
            onTheme={() => navigate('theme-settings')}
            onSecurity={() => navigate('security-settings')}
            onData={() => navigate('data-management')}
          />
        ) : route === 'stats' ? (
          // #07: no approved source exists (STATUS.md: NO_FINAL_CODE_IMAGE_ONLY),
          // reconstructed from the two approved reference renders -- see
          // StatsScreen.tsx's own header comment. onOpenInsight has no
          // destination screen yet, same reasoning as above.
          <StatsScreen />
        ) : tabRoute ? (
          <div className="drawary-dev-only">
            <div className="drawary-dev-flag">개발 검수용 · 확정 화면 아님</div>
            <h1 id="drawary-dev-screen-title">{NAMES[route]}</h1>
            <p>V2-08 공통 하단바·화면 이동 동작 확인</p>
            <p className="drawary-dev-detail">이 영역의 실제 확정 화면은 후속 구현 단계에서 연결합니다.</p>
          </div>
        ) : null}
      </section>
      {tabRoute && <footer className="drawary-shell-footer">
        <ResponsiveBottomNav active={route} onNavigate={navigate} onCreateDrawer={() => navigate('create-drawer')} />
      </footer>}
    </main>
  );
}
