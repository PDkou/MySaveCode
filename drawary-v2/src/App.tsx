import { useCallback, useEffect, useRef, useState } from 'react';
import { ResponsiveBottomNav } from './components/ResponsiveBottomNav';
import type { BottomNavTab } from './components/BottomNav_FINAL_CONFIRMED';
import { SplashScreen } from './screens/SplashScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { HomeScreen, type HomeDrawerCard } from './screens/HomeScreen';
import { actions, drawerById, fieldsOf, recordsOf, useStore } from './data/store';
import { HomeEmptyScreen } from './screens/HomeEmptyScreen';
import { GlobalSearchScreen } from './screens/GlobalSearchScreen';
import type { GlobalSearchRecord } from './screens/GlobalSearchScreen';
import { SettingsHomeScreen } from './screens/SettingsHomeScreen';
import { DrawerFieldsScreen, toFieldItem } from './screens/DrawerFieldsScreen';
import {
  DEFAULT_DRAFT_FIELDS, QUICK_ADD_KINDS, addDraftField, moveDraftField, removeDraftField, updateDraftField,
  type DraftField,
} from './flow/drawerDraft';
import { NewFieldScreen } from './screens/NewFieldScreen';
import { DrawerFieldEditScreen } from './screens/DrawerFieldEditScreen';
import { NameIconChangeScreen } from './screens/NameIconChangeScreen';
import { CreationCompleteScreen } from './screens/CreationCompleteScreen';
import { FillDrawerScreen } from './screens/FillDrawerScreen';
import { BackupProgressScreen } from './screens/BackupProgressScreen';
import { StatsScreen } from './screens/StatsScreen';
import { NewDrawerScreen } from './screens/NewDrawerScreen';
import { DrawerDetailScreen } from './screens/DrawerDetailScreen';
import { RecordDetailScreen } from './screens/RecordDetailScreen';
import { RecordEditScreen } from './screens/RecordEditScreen';
import { PhotoViewerScreen } from './screens/PhotoViewerScreen';
import { pickRecordPhotos } from './data/recordPhotos';
import { useFirstPhotoUrls, useObjectUrls, usePhotoCounts, useRecordPhotos } from './data/photoHooks';
import { columnsOf, EMPTY_VIEW, toRows, type TableViewState } from './flow/tableQuery';
import { buildCsv, buildPrintHtml, exportFileName } from './flow/exportTable';
import { printHtml, saveBlob } from './data/fileSave';
import { MAX_RECORD_PHOTOS } from './data/types';
import {
  draftFromRecord, draftToValues, formatValue, hasControl, recordMatches, recordSearchText, summarizeRecord,
  type RecordDraft,
} from './flow/recordForm';
import type { RecordFieldType, RecordFieldValue } from './screens/RecordDetailScreen';
import type { DrawerRecordSummary } from './screens/DrawerDetailScreen';
import { TableViewScreen } from './screens/TableViewScreen';
import { DrawerManageScreen } from './screens/DrawerManageScreen';
import { NotificationSettingsScreen } from './screens/NotificationSettingsScreen';
import { NotificationDateFieldScreen } from './screens/NotificationDateFieldScreen';
import { NotificationTimingScreen } from './screens/NotificationTimingScreen';
import { NotificationCompleteScreen } from './screens/NotificationCompleteScreen';
import { RecurrenceManagementScreen, type RecurrenceRuleSummary } from './screens/RecurrenceManagementScreen';
import { RecordPickerSheet } from './screens/RecordPickerSheet';
import { computeNotificationPlan } from './flow/notificationPlan';
import { syncNotificationPlan } from './data/nativeBridge';
import { toISODate } from './flow/recurrence';
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
import { BackupTypeScreen, type BackupMode } from './screens/BackupTypeScreen';
import { BackupDestinationScreen, type BackupDestination } from './screens/BackupDestinationScreen';
import { BackupSuccessScreen } from './screens/BackupSuccessScreen';
import { RestoreFilePickerScreen } from './screens/RestoreFilePickerScreen';
import { RestoreReviewScreen } from './screens/RestoreReviewScreen';
import { RestoreProgressScreen } from './screens/RestoreProgressScreen';
import { RestoreSuccessScreen } from './screens/RestoreSuccessScreen';
import { DataResetConfirmScreen } from './screens/DataResetConfirmScreen';
import { LanguageSettingsScreen, type LanguageCode } from './screens/LanguageSettingsScreen';
import { HelpMainScreen } from './screens/HelpMainScreen';
import { FaqScreen } from './screens/FaqScreen';
import { GuideScreen, type GuideRoute } from './screens/GuideScreen';
import { InfoScreen } from './screens/InfoScreen';
import { FeedbackScreen } from './screens/FeedbackScreen';
import { FixedCanvas } from './components/FixedCanvas';

type StandaloneRoute = 'drawer-fields' | 'splash' | 'onboarding' | 'home-empty' | 'new-field' | 'field-edit' | 'creation-complete' | 'fill-drawer' | 'backup-progress' | 'home-edit' | 'drawer-detail' | 'record-detail' | 'record-edit' | 'photo-viewer' | 'table-view' | 'drawer-manage' | 'name-icon-change' | 'drawer-fields-manage' | 'new-field-manage' | 'field-edit-manage' | 'notification-settings' | 'notification-date-field' | 'notification-timing' | 'notification-complete' | 'recurrence-management' | 'recurrence-target-date' | 'recurrence-cycle' | 'recurrence-end-condition' | 'recurrence-complete' | 'theme-settings' | 'security-settings' | 'lock-detail' | 'pin-setup' | 'app-lock' | 'data-management' | 'backup-type' | 'backup-destination' | 'backup-success' | 'restore-file-picker' | 'restore-review' | 'restore-progress' | 'restore-success' | 'data-reset-confirm' | 'language-settings' | 'help-main' | 'faq' | 'guide' | 'info' | 'feedback';
type Route = BottomNavTab | 'create-drawer' | StandaloneRoute;
const TABS: readonly BottomNavTab[] = ['home', 'search', 'stats', 'settings'];
const NAMES: Record<Exclude<Route, StandaloneRoute>, string> = {
  home: '홈', search: '검색', stats: '통계', settings: '설정', 'create-drawer': '새 서랍 만들기',
};
const isTab = (route: Route): route is BottomNavTab => TABS.some(tab => tab === route);
const STANDALONE_ROUTES: readonly Route[] = ['splash', 'onboarding', 'home-empty', 'new-field', 'field-edit', 'creation-complete', 'fill-drawer', 'backup-progress', 'home-edit', 'drawer-fields', 'drawer-detail', 'record-detail', 'record-edit', 'photo-viewer', 'table-view', 'drawer-manage', 'name-icon-change', 'drawer-fields-manage', 'new-field-manage', 'field-edit-manage', 'notification-settings', 'notification-date-field', 'notification-timing', 'notification-complete', 'recurrence-management', 'recurrence-target-date', 'recurrence-cycle', 'recurrence-end-condition', 'recurrence-complete', 'theme-settings', 'security-settings', 'lock-detail', 'pin-setup', 'app-lock', 'data-management', 'backup-type', 'backup-destination', 'backup-success', 'restore-file-picker', 'restore-review', 'restore-progress', 'restore-success', 'data-reset-confirm', 'language-settings', 'help-main', 'faq', 'guide', 'info', 'feedback'];
const parseRoute = (): Route => {
  const route = window.location.hash.replace(/^#\/?/, '');
  if (route === 'create-drawer' || STANDALONE_ROUTES.some(r => r === route) || TABS.some(tab => tab === route)) return route as Route;
  return 'home';
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
  const store = useStore();
  const [currentDrawerId, setCurrentDrawerId] = useState<string | null>(null);

  // Create-drawer flow (#08 -> #09 -> #10/#11 -> #12). Everything the user
  // enters lives here until "서랍 만들기 완료하기", which saves the drawer and
  // all its fields in one transaction; backing out saves nothing.
  const [createDraft, setCreateDraft] = useState<{ name: string; icon: string; color: string } | null>(null);
  const [draftFields, setDraftFields] = useState<DraftField[] | null>(null);
  const [editingDraftFieldId, setEditingDraftFieldId] = useState<string | null>(null);
  const creatingRef = useRef(false);
  const fieldsDraft: DraftField[] = draftFields ?? [...DEFAULT_DRAFT_FIELDS];
  const editingDraftField = fieldsDraft.find((f) => f.id === editingDraftFieldId);
  const alertError = (e: unknown) => window.alert(e instanceof Error ? e.message : '저장하지 못했어요.');
  const resetCreateFlow = () => { setCreateDraft(null); setDraftFields(null); setEditingDraftFieldId(null); };
  const tryDraft = (next: () => DraftField[]): boolean => {
    try { setDraftFields(next()); return true; } catch (e) { alertError(e); return false; }
  };
  const completeCreate = async () => {
    if (creatingRef.current) return;
    if (!createDraft) { window.alert('서랍 이름을 먼저 정해 주세요.'); navigate('create-drawer'); return; }
    creatingRef.current = true;
    try {
      const { drawer } = await actions.createDrawerWithFields(
        { name: createDraft.name, iconKey: createDraft.icon, colorKey: createDraft.color },
        fieldsDraft.map(({ name, kind, required, options }) => ({ name, kind, required, options })),
      );
      setCurrentDrawerId(drawer.id);
      resetCreateFlow();
      navigate('creation-complete');
    } catch (e) {
      alertError(e);
    } finally {
      creatingRef.current = false;
    }
  };
  // Record screens work on one drawer. It is the one last opened/created; a direct
  // URL with nothing opened yet falls back to the first drawer.
  const currentDrawer = (currentDrawerId ? drawerById(store, currentDrawerId) : undefined)
    ?? (store.status === 'ready' ? store.drawers[0] : undefined);
  const currentFields = currentDrawer ? fieldsOf(store, currentDrawer.id) : [];
  const currentRecords = currentDrawer ? recordsOf(store, currentDrawer.id) : [];
  const drawerDetailName = currentDrawer?.name ?? '';
  const homeCards: HomeDrawerCard[] = store.drawers.map((d) => ({
    id: d.id, name: d.name, iconKey: d.iconKey, colorKey: d.colorKey,
    recordCount: recordsOf(store, d.id).length,
  }));
  // #25 서랍 이름 / 아이콘 변경 writes both of these back on save, and #24
  // reads them straight back out -- the "상단 정보 즉시 갱신" CONFIRMED.md
  // asks for, done via shared App-level state rather than local state in
  // either screen.
  const drawerIconId = currentDrawer?.iconKey ?? 'misc';
  // Records (#13-#19). Photos live in the on-device store keyed by record id;
  // nothing here is demo data any more.
  const [recordDetailId, setRecordDetailId] = useState<string | null>(null);
  const selectedRecord = recordDetailId ? store.records.find((r) => r.id === recordDetailId) : undefined;
  // Bumped after photos change so the readers below load them again.
  const [photoVersion, setPhotoVersion] = useState(0);
  const [recordQuery, setRecordQuery] = useState('');
  // Where #16 was opened from, so back / delete return there (#15, the search tab, or the table).
  const [recordBack, setRecordBack] = useState<'drawer-detail' | 'search' | 'table-view'>('drawer-detail');
  const [globalQuery, setGlobalQuery] = useState('');
  const openRecord = (id: string, from: 'drawer-detail' | 'search' | 'table-view') => {
    setRecordDetailId(id); setRecordBack(from); navigate('record-detail');
  };
  const recordThumbs = useFirstPhotoUrls(currentRecords.map((r) => r.id), photoVersion);
  const selectedPhotos = useRecordPhotos(selectedRecord?.id ?? null, photoVersion);
  // The drawer's table (#20): typed columns and rows, plus the sort/filter it opens with,
  // remembered per drawer in the on-device settings.
  const photoCounts = usePhotoCounts(currentRecords.map((r) => r.id), photoVersion);
  const tableColumns = columnsOf(currentFields);
  const tableRows = toRows(currentRecords, photoCounts);
  const savedView = currentDrawer ? (store.settings[`tableview.${currentDrawer.id}`] as TableViewState | undefined) : undefined;
  const tableView: TableViewState = savedView && Array.isArray(savedView.rules) ? savedView : EMPTY_VIEW;
  // "•••" -> CSV / PDF: exactly the rows the table shows right now (filter, sort and search applied).
  const exportTable = (kind: 'csv' | 'pdf', shown: ReturnType<typeof toRows>) => {
    if (!currentDrawer) return;
    if (kind === 'csv') saveBlob(new Blob([buildCsv(tableColumns, shown)], { type: 'text/csv;charset=utf-8' }), exportFileName(currentDrawer.name, 'csv'));
    else printHtml(buildPrintHtml(currentDrawer.name, tableColumns, shown, new Date().toLocaleDateString('ko-KR')));
  };
  const saveTableView = (view: TableViewState) => {
    if (currentDrawer) void actions.setSetting(`tableview.${currentDrawer.id}`, view).catch(alertError);
  };
  // #05 search index: every record of every drawer (store.records is newest first).
  const searchRecords: GlobalSearchRecord[] = store.records.flatMap((r) => {
    const drawer = drawerById(store, r.drawerId);
    if (!drawer) return [];
    const fields = fieldsOf(store, drawer.id);
    const sum = summarizeRecord(fields, r);
    return [{
      id: r.id, drawerId: drawer.id, drawerName: drawer.name, drawerIcon: `drawer_icon_${drawer.iconKey}.webp`,
      title: sum.title, meta: [sum.subtitle, sum.dateLabel].filter(Boolean).join(' · '),
      searchableText: recordSearchText(fields, r),
    }];
  });

  // #13/#14 fill form: photos picked so far, where "back" returns to, and a counter
  // that remounts the form empty each time it is opened.
  const [fillPhotos, setFillPhotos] = useState<Blob[]>([]);
  const fillUrls = useObjectUrls(fillPhotos);
  const [fillKey, setFillKey] = useState(0);
  const [fillBack, setFillBack] = useState<'creation-complete' | 'drawer-detail'>('drawer-detail');
  const [recordSaving, setRecordSaving] = useState(false);
  const recordSavingRef = useRef(false);
  const startFill = (from: 'creation-complete' | 'drawer-detail') => {
    setFillPhotos([]); setFillKey((k) => k + 1); setFillBack(from); navigate('fill-drawer');
  };
  const pickMorePhotos = async (current: Blob[], set: (b: Blob[]) => void) => {
    const files = await pickRecordPhotos();
    if (files.length) set([...current, ...files].slice(0, MAX_RECORD_PHOTOS));
  };
  // #17 edit form: photos staged until "수정 완료" (null = unchanged, [] = removed).
  const [editPhotos, setEditPhotos] = useState<Blob[] | null>(null);
  const editUrls = useObjectUrls(editPhotos);
  const [editKey, setEditKey] = useState(0);

  // #26 서랍칸 편집 on an existing drawer: edits are saved straight away (no draft).
  // `manageOrder` holds the order while a row is being dragged, saved on release.
  const [manageFieldId, setManageFieldId] = useState<string | null>(null);
  const manageField = currentFields.find((f) => f.id === manageFieldId);
  const [manageOrder, setManageOrder] = useState<string[] | null>(null);
  const manageOrderRef = useRef<string[] | null>(null);
  manageOrderRef.current = manageOrder;
  const manageList = manageOrder
    ? manageOrder.map((id) => currentFields.find((f) => f.id === id)).filter((f): f is NonNullable<typeof f> => !!f)
    : currentFields;
  const guardedSave = async (work: () => Promise<void>) => {
    if (recordSavingRef.current) return;
    recordSavingRef.current = true; setRecordSaving(true);
    try { await work(); } catch (e) { alertError(e); } finally { recordSavingRef.current = false; setRecordSaving(false); }
  };

  // #29-#32 알림 설정 wizard state. dateFields comes from
  // DEFAULT_DRAWER_FIELDS filtered to kind==='date' (the same demo
  // drawer fields #09/#26 already use) -- for this drawer that's
  // exactly one field (구매일), matching CONFIRMED.md's own "날짜
  // 서랍칸이 1개뿐이면 기본 선택" case.
  const dateFields = currentFields.filter((f) => f.kind === 'date').map((f) => ({ id: f.id, name: f.name }));
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
  const recurrenceTargets = currentRecords.map((r) => ({ id: r.id, title: summarizeRecord(currentFields, r).title }));
  const [targetPickerOpen, setTargetPickerOpen] = useState(false);
  const [recurrenceTargetId, setRecurrenceTargetId] = useState<string | undefined>(undefined);
  const [recurrenceDateFieldId, setRecurrenceDateFieldId] = useState<string | undefined>(undefined);
  const [recurrenceCycle, setRecurrenceCycle] = useState<RecurrenceCycle>('monthly');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceEndCondition, setRecurrenceEndCondition] = useState<RecurrenceEndCondition>({ kind: 'never' });
  const drawerNotifRules = currentDrawer ? store.notificationRules.filter((n) => n.drawerId === currentDrawer.id) : [];
  const recurrenceRules: RecurrenceRuleSummary[] = currentDrawer
    ? store.recurrenceRules.filter((r) => r.drawerId === currentDrawer.id).map((r) => ({
        id: r.id,
        targetLabel: r.targetLabel,
        dateFieldName: currentFields.find((f) => f.id === r.fieldId)?.name ?? '',
        cycleLabel: cycleLabel(r.cycle, r.interval),
        enabled: !r.finished,
        statusLabel: r.finished ? '끝남' : r.createdCount > 0 ? `${r.createdCount}개 만듦` : undefined,
      }))
    : [];

  // Recurrence: make the records that have come due (each period once), when the app opens,
  // comes back to the foreground, and every few minutes while it is open.
  useEffect(() => {
    if (store.status !== 'ready') return;
    const run = () => { void actions.runRecurrences(toISODate(new Date())).catch((e: unknown) => console.error('반복 보관품을 만들지 못했어요', e)); };
    run();
    const onVisible = () => { if (document.visibilityState === 'visible') run(); };
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(run, 10 * 60 * 1000);
    return () => { document.removeEventListener('visibilitychange', onVisible); window.clearInterval(timer); };
  }, [store.status]);

  // Notifications: hand the upcoming list to the Android shell (when there is one) after every change.
  useEffect(() => {
    if (store.status !== 'ready') return;
    const timer = window.setTimeout(() => {
      syncNotificationPlan(computeNotificationPlan({
        rules: store.notificationRules, drawers: store.drawers, fields: store.fields, records: store.records, now: Date.now(),
      }));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [store.status, store.notificationRules, store.drawers, store.fields, store.records]);

  // #40-#43 보안/잠금. pinValue is the real PIN #42's flow commits (not
  // the archive's own hardcoded demo PIN); appLockEnabled can only be
  // switched on once a PIN exists, matching #41's own "don't turn on a
  // lock before PIN is configured" rule for real.
  const [pinValue, setPinValue] = useState<string | null>(null);
  const [appLockEnabled, setAppLockEnabled] = useState(false);

  // #44-#53 백업/복원/초기화.
  const [backupMode, setBackupMode] = useState<BackupMode>('include');
  const [backupDestination, setBackupDestination] = useState<BackupDestination>('device');
  const [restoreFileName, setRestoreFileName] = useState<string | null>(null);

  // #54-#59 언어/도움말/FAQ/가이드/정보/피드백.
  const [savedLanguage, setSavedLanguage] = useState<LanguageCode>('ko');
  const [faqTopic, setFaqTopic] = useState<string | undefined>(undefined);

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
  // Record screens need an open drawer (and #16/#17/#19 a record). A direct URL or a
  // deleted record sends the user back to where there is something to show.
  useEffect(() => {
    if (store.status !== 'ready') return;
    const recordRoute = route === 'record-detail' || route === 'record-edit' || route === 'photo-viewer';
    const manageRoute = route === 'drawer-manage' || route === 'name-icon-change' || route === 'drawer-fields-manage'
      || route === 'new-field-manage' || route === 'field-edit-manage';
    if ((route === 'drawer-detail' || route === 'fill-drawer' || route === 'table-view' || recordRoute || manageRoute) && !currentDrawer) navigate('home');
    else if (route === 'field-edit-manage' && !manageField) navigate('drawer-fields-manage');
    else if (recordRoute && !selectedRecord) navigate('drawer-detail');
  }, [route, store.status, currentDrawer, selectedRecord, manageField, navigate]);

  if (route === 'splash') {
    return <main className="drawary-app-shell drawary-splash-route" data-route="splash"><SplashScreen fadingOut={false}/></main>;
  }
  if (route === 'onboarding') {
    return <main className="drawary-app-shell drawary-onboarding-route" data-route="onboarding">
      <OnboardingScreen onDone={() => navigate('home')} />
    </main>;
  }
  if (route === 'new-field') {
    // #10: reached from #09's "서랍 칸 추가". "추가하기" appends to the
    // create-flow draft (a rejected name/options stays here with a message).
    return <main className="drawary-app-shell" data-route="new-field">
      <FixedCanvas height={844}><NewFieldScreen onBack={() => navigate('drawer-fields')} onAdd={(data) => { if (tryDraft(() => addDraftField(fieldsDraft, data))) navigate('drawer-fields'); }} /></FixedCanvas>
    </main>;
  }
  if (route === 'drawer-fields') {
    // #09: the real screen, chained to #10/#11/#12 and reachable only after
    // #08's name/icon/color step. Its list is the create-flow draft held
    // above; nothing is saved until "서랍 만들기 완료하기". Back returns to #08.
    return <main className="drawary-app-shell" data-route="drawer-fields">
      <FixedCanvas height={844}>
        <DrawerFieldsScreen
          fields={fieldsDraft.map(toFieldItem)}
          onBack={() => navigate('create-drawer')}
          onAddField={() => navigate('new-field')}
          onEditField={(field) => { setEditingDraftFieldId(field.id); navigate('field-edit'); }}
          onQuickAdd={(label) => { tryDraft(() => addDraftField(fieldsDraft, { name: label, kind: QUICK_ADD_KINDS[label] ?? 'text', required: false, options: [] })); }}
          onReorder={(from, to) => setDraftFields((prev) => moveDraftField(prev ?? [...DEFAULT_DRAFT_FIELDS], from, to))}
          onComplete={() => { void completeCreate(); }}
        />
      </FixedCanvas>
    </main>;
  }
  if (route === 'create-drawer') {
    // #08 새 서랍 만들기 (name/icon/color) -- the real first step of this
    // flow, reached from the home "+" action / bottom-nav "+" / empty
    // state / edit mode. Reconstructed as a bottom sheet over a dimmed Home
    // (no approved source; see NewDrawerScreen.tsx). What is typed is kept
    // in the create-flow draft, so coming back from #09 shows it again.
    return <main className="drawary-app-shell" data-route="create-drawer">
      <section className="drawary-route-panel drawary-dimmed-home" aria-hidden="true">
        <HomeScreen drawers={homeCards} totalRecords={store.records.length} />
      </section>
      <NewDrawerScreen
        initial={createDraft ?? undefined}
        onNext={(draft) => { setCreateDraft(draft); navigate('drawer-fields'); }}
        onDismiss={() => { resetCreateFlow(); returnToTab(); }}
      />
    </main>;
  }
  if (route === 'field-edit') {
    // #11: reached by tapping a row in #09, opening straight on that field's
    // edit view. Without a selected field (direct URL) it shows the archive's
    // demo list as before. A field's kind cannot be changed here.
    return <main className="drawary-app-shell" data-route="field-edit">
      <FixedCanvas height={844}>
        {editingDraftField ? (
          <DrawerFieldEditScreen
            key={editingDraftField.id}
            field={editingDraftField}
            onBack={() => navigate('drawer-fields')}
            onSave={(patch) => { if (tryDraft(() => updateDraftField(fieldsDraft, editingDraftField.id, patch))) navigate('drawer-fields'); }}
            onDelete={() => { setDraftFields(removeDraftField(fieldsDraft, editingDraftField.id)); setEditingDraftFieldId(null); navigate('drawer-fields'); }}
          />
        ) : (
          <DrawerFieldEditScreen onBack={() => navigate('drawer-fields')} />
        )}
      </FixedCanvas>
    </main>;
  }
  if (route === 'creation-complete') {
    // #12: shows the drawer just saved from #09. "서랍 채우기" chains to #13;
    // "나중에" returns to the tab the flow started from.
    return <main className="drawary-app-shell" data-route="creation-complete">
      <FixedCanvas height={844}><CreationCompleteScreen
        drawerName={currentDrawer?.name}
        iconKey={currentDrawer?.iconKey}
        fieldCount={currentDrawer ? fieldsOf(store, currentDrawer.id).length : undefined}
        onFillDrawer={() => startFill('creation-complete')}
        onLater={returnToTab}
      /></FixedCanvas>
    </main>;
  }
  if (route === 'fill-drawer') {
    // #13/#14: the form follows the open drawer's 서랍 칸; "담기" saves the record
    // and its photos in one transaction and shows it in #15. Back returns to
    // #12 or #15, whichever opened it.
    if (!currentDrawer) return <main className="drawary-app-shell" data-route="fill-drawer" />;
    return <main className="drawary-app-shell" data-route="fill-drawer">
      <FixedCanvas height={844}>
        <FillDrawerScreen
          key={fillKey}
          drawerName={currentDrawer.name}
          fields={currentFields}
          photoUris={fillUrls}
          saving={recordSaving}
          onBack={() => navigate(fillBack)}
          onPickPhotos={() => { void pickMorePhotos(fillPhotos, setFillPhotos); }}
          onRemovePhoto={(i) => setFillPhotos((prev) => prev.filter((_, j) => j !== i))}
          onSave={(draft) => { void guardedSave(async () => {
            await actions.createRecord(currentDrawer.id, draftToValues(currentFields, draft), fillPhotos);
            setPhotoVersion((v) => v + 1);
            setFillPhotos([]);
            navigate('drawer-detail');
          }); }}
        />
      </FixedCanvas>
    </main>;
  }
  if (route === 'drawer-detail') {
    // #15: this drawer's real 보관품, newest first. The search box filters them by
    // any value; "표로 보기" -> #20, "서랍 관리" -> #24.
    if (!currentDrawer) return <main className="drawary-app-shell" data-route="drawer-detail" />;
    const summaries: DrawerRecordSummary[] = currentRecords
      .filter((r) => recordMatches(currentFields, r, recordQuery))
      .map((r) => {
        const sum = summarizeRecord(currentFields, r);
        return { id: r.id, title: sum.title, subtitle: sum.subtitle, dateLabel: sum.dateLabel, thumbnailUri: recordThumbs[r.id] };
      });
    return <main className="drawary-app-shell" data-route="drawer-detail">
      <FixedCanvas height={844}>
        <DrawerDetailScreen
          drawerName={currentDrawer.name}
          recordCount={currentRecords.length}
          fallbackIconKey={currentDrawer.iconKey}
          records={summaries}
          onBack={() => { setRecordQuery(''); returnToTab(); }}
          onSearch={setRecordQuery}
          onFillDrawer={() => startFill('drawer-detail')}
          onOpenRecord={(id) => openRecord(id, 'drawer-detail')}
          onOpenTable={() => navigate('table-view')}
          onOpenManage={() => navigate('drawer-manage')}
        />
      </FixedCanvas>
    </main>;
  }
  if (route === 'table-view') {
    // #20 표 보기, reachable from #15's "•••" menu's "표로 보기": the drawer's 서랍 칸
    // as columns (first one stays put while the rest scroll sideways) and its 보관품
    // as rows. #21 search, #22 sort and #23 filter are states of this screen; the
    // chosen sort/filter is kept per drawer. A row opens #16 and back returns here.
    if (!currentDrawer) return <main className="drawary-app-shell" data-route="table-view" />;
    return <main className="drawary-app-shell" data-route="table-view">
      <FixedCanvas height={844}>
        <TableViewScreen
          drawerName={drawerDetailName}
          recordCount={currentRecords.length}
          columns={tableColumns}
          rows={tableRows}
          view={tableView}
          onViewChange={saveTableView}
          onBack={() => navigate('drawer-detail')}
          onExportCsv={(shown) => exportTable('csv', shown)}
          onExportPdf={(shown) => exportTable('pdf', shown)}
          onOpenRecord={(id) => openRecord(id, 'table-view')}
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
          fieldCount={currentFields.length}
          recordCount={currentRecords.length}
          tableColumns={tableColumns}
          tableRows={tableRows}
          tableView={tableView}
          onTableViewChange={saveTableView}
          onBack={() => navigate('drawer-detail')}
          onRenameDrawer={() => navigate('name-icon-change')}
          onEditFields={() => navigate('drawer-fields-manage')}
          onNotificationSettings={() => navigate('notification-settings')}
          onRecurrenceManage={() => navigate('recurrence-management')}
          onBackupExport={() => {}}
          onDeleteDrawer={() => { if (!currentDrawer) return; void guardedSave(async () => {
            await actions.deleteDrawer(currentDrawer.id);
            setCurrentDrawerId(null); setRecordDetailId(null); setRecordQuery('');
            navigate('home');
          }); }}
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
          rules={drawerNotifRules.map((n) => ({
            id: n.id,
            fieldName: currentFields.find((f) => f.id === n.fieldId)?.name ?? '',
            when: `${n.daysBefore === 0 ? '당일' : `${n.daysBefore}일 전`} · ${n.time}`,
          }))}
          onOpenRule={(id) => {
            const n = drawerNotifRules.find((x) => x.id === id);
            const field = currentFields.find((f) => f.id === n?.fieldId);
            if (n && window.confirm(`'${field?.name ?? ''}' ${n.daysBefore === 0 ? '당일' : `${n.daysBefore}일 전`} ${n.time} 알림을 삭제할까요?`)) {
              void actions.deleteNotificationRule(id).catch(alertError);
            }
          }}
          fieldCount={currentFields.length}
          recordCount={currentRecords.length}
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
            if (!currentDrawer || !dateField) return;
            void actions.addNotificationRule(currentDrawer.id, { fieldId: dateField.id, daysBefore, time })
              .then(() => { setNotifDaysBefore(daysBefore); setNotifTime(time); navigate('notification-complete'); })
              .catch(alertError);
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
          itemCount={currentRecords.length}
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
          fieldCount={currentFields.length}
          itemCount={currentRecords.length}
          rules={recurrenceRules}
          drawerIconUri={`/assets/drawer-icons/drawer_icon_${drawerIconId}.webp`}
          onBack={() => navigate('drawer-manage')}
          onAdd={() => navigate('recurrence-target-date')}
          onOpenRule={(id) => {
            const r = store.recurrenceRules.find((x) => x.id === id);
            if (r && window.confirm(`'${r.targetLabel}' 반복 설정을 삭제할까요?\n이미 만들어진 보관품은 그대로 남아요.`)) {
              void actions.deleteRecurrenceRule(id).catch(alertError);
            }
          }}
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
          fieldCount={currentFields.length}
          itemCount={currentRecords.length}
          targets={recurrenceTargets}
          dateFields={dateFields}
          selectedTargetId={recurrenceTargetId}
          selectedDateFieldId={recurrenceDateFieldId}
          drawerIconUri={`/assets/drawer-icons/drawer_icon_${drawerIconId}.webp`}
          onBack={() => navigate('recurrence-management')}
          onSelectTarget={() => setTargetPickerOpen(true)}
          onSelectDateField={(fieldId) => setRecurrenceDateFieldId(fieldId)}
          onNext={({ targetId, dateFieldId }) => {
            const rec = currentRecords.find((r) => r.id === targetId);
            const df = currentFields.find((f) => f.id === dateFieldId);
            if (!rec || typeof rec.values[dateFieldId] !== 'string') {
              window.alert(`이 보관품에는 '${df?.name ?? '날짜'}' 날짜가 없어요. 날짜를 먼저 채워 주세요.`);
              return;
            }
            setRecurrenceTargetId(targetId);
            setRecurrenceDateFieldId(dateFieldId);
            navigate('recurrence-cycle');
          }}
        />
        {targetPickerOpen && (
          <RecordPickerSheet
            title="반복할 보관품 선택"
            records={currentRecords.map((r) => {
              const sum = summarizeRecord(currentFields, r);
              return { id: r.id, title: sum.title, detail: sum.dateLabel };
            })}
            selectedId={recurrenceTargetId}
            onPick={(id) => { setRecurrenceTargetId(id); setTargetPickerOpen(false); }}
            onClose={() => setTargetPickerOpen(false)}
          />
        )}
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
            if (!currentDrawer || !target || !dateField) return;
            void actions.addRecurrenceRule(currentDrawer.id, {
              targetRecordId: target.id, fieldId: dateField.id, cycle: recurrenceCycle, interval: recurrenceInterval,
              end: condition.kind === 'never' ? { kind: 'never' } : condition.kind === 'count'
                ? { kind: 'count', count: condition.count } : { kind: 'date', endDate: condition.endDate },
              targetLabel: target.title,
            }, toISODate(new Date()))
              .then(() => { setRecurrenceEndCondition(condition); navigate('recurrence-complete'); })
              .catch(alertError);
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
    // returns to #38. 백업 -> #45, 복원 -> #49, 초기화 -> #53 (all real
    // routes now).
    return <main className="drawary-app-shell" data-route="data-management">
      <FixedCanvas height={844}>
        <DataManagementHubScreen
          onBack={returnToTab}
          onBackup={() => navigate('backup-type')}
          onRestore={() => navigate('restore-file-picker')}
          onReset={() => navigate('data-reset-confirm')}
        />
      </FixedCanvas>
    </main>;
  }
  if (route === 'backup-type') {
    // #45 백업 시작 / 종류 선택, reachable from #44's "백업하기" row.
    // Back returns to #44. "다음" -> #46.
    return <main className="drawary-app-shell" data-route="backup-type">
      <FixedCanvas height={844}>
        <BackupTypeScreen
          initialMode={backupMode}
          onBack={() => navigate('data-management')}
          onNext={(mode) => { setBackupMode(mode); navigate('backup-destination'); }}
        />
      </FixedCanvas>
    </main>;
  }
  if (route === 'backup-destination') {
    // #46 저장 위치 선택, reachable from #45's "다음". Back returns to
    // #45. "다음" -> #47 (backup progress, now actually chained into
    // this flow instead of being a standalone QA route).
    return <main className="drawary-app-shell" data-route="backup-destination">
      <FixedCanvas height={844}>
        <BackupDestinationScreen
          initialDestination={backupDestination}
          onBack={() => navigate('backup-type')}
          onNext={(destination) => { setBackupDestination(destination); navigate('backup-progress'); }}
        />
      </FixedCanvas>
    </main>;
  }
  if (route === 'backup-success') {
    // #48 백업 완료, reachable from #47's auto-complete. No back
    // button (decorative arrow only, matching the archive exactly).
    // "확인" -> #44. Sample filename/location are the archive's own
    // displayed values -- there's no real backup engine to report
    // real ones yet (same caveat as every other backup/restore screen
    // in this batch).
    const description = backupMode === 'include' ? '사진 포함 백업' : '사진 제외 백업';
    return <main className="drawary-app-shell" data-route="backup-success">
      <FixedCanvas height={844}>
        <BackupSuccessScreen
          fileName="Drawary_Backup_2026-10-05.zip"
          location={backupDestination === 'device' ? 'Download/Drawary' : 'Google Drive'}
          description={description}
          onConfirm={() => navigate('data-management')}
        />
      </FixedCanvas>
    </main>;
  }
  if (route === 'restore-file-picker') {
    // #49 복원 파일 선택, reachable from #44's "복원하기" row. Back
    // returns to #44. Selecting a valid .zip/.json file -> #50.
    return <main className="drawary-app-shell" data-route="restore-file-picker">
      <FixedCanvas height={844}>
        <RestoreFilePickerScreen
          onBack={() => navigate('data-management')}
          onFileSelected={(file) => { setRestoreFileName(file.name); navigate('restore-review'); }}
        />
      </FixedCanvas>
    </main>;
  }
  if (route === 'restore-review') {
    // #50 복원 내용 확인, reachable from #49's file selection. Back
    // returns to #49. "계속" in the confirm dialog -> #51. Summary
    // figures (5개 서랍 · 128개 기록 / 42장) are the archive's own
    // displayed sample values -- there's no real backup-file parser to
    // report real ones yet.
    return <main className="drawary-app-shell" data-route="restore-review">
      <FixedCanvas height={844}>
        <RestoreReviewScreen
          fileName={restoreFileName ?? 'Drawary_Backup_2026-10-05.zip'}
          fileDetails="2026.10.05 14:58 · 백업 파일 1개"
          hasPhotos
          recordSummary="5개 서랍 · 128개 기록"
          photoSummary="42장"
          onBack={() => navigate('restore-file-picker')}
          onConfirmRestore={() => navigate('restore-progress')}
        />
      </FixedCanvas>
    </main>;
  }
  if (route === 'restore-progress') {
    // #51 복원 진행, reachable from #50's confirm dialog. Back returns
    // to #50. Auto-completes (see RestoreProgressScreen.tsx's own
    // header comment) -> #52.
    return <main className="drawary-app-shell" data-route="restore-progress">
      <FixedCanvas height={844}>
        <RestoreProgressScreen
          onBack={() => navigate('restore-review')}
          onComplete={() => navigate('restore-success')}
        />
      </FixedCanvas>
    </main>;
  }
  if (route === 'restore-success') {
    // #52 복원 완료, reachable from #51's auto-complete. Back and
    // "확인" both return to #44 -- going back to the review screen
    // after a completed restore doesn't make sense.
    return <main className="drawary-app-shell" data-route="restore-success">
      <FixedCanvas height={844}>
        <RestoreSuccessScreen
          recordCount="5개 서랍 · 128개 기록"
          photoCount="42장"
          settingsStatus="복원 완료"
          onBack={() => navigate('data-management')}
          onConfirm={() => navigate('data-management')}
        />
      </FixedCanvas>
    </main>;
  }
  if (route === 'data-reset-confirm') {
    // #53 데이터 초기화 확인, reachable from #44's "데이터 초기화" row.
    // "취소"/뒤로가기 and "데이터 초기화" both return to #44 -- no real
    // deletion happens anywhere (see DataResetConfirmScreen.tsx's own
    // header comment and README.md's explicit "실제 앱 내 비가역 초기화
    // 연결 금지").
    return <main className="drawary-app-shell" data-route="data-reset-confirm">
      <FixedCanvas height={844}>
        <DataResetConfirmScreen
          onCancel={() => navigate('data-management')}
          onResetConfirmed={() => navigate('data-management')}
        />
      </FixedCanvas>
    </main>;
  }
  if (route === 'language-settings') {
    // #54 언어 설정, reachable from #38's "언어 설정" row. Both "취소"
    // and "적용" return to #38 -- the archive's own source never
    // navigates on its own, only resets/commits the selection.
    return <main className="drawary-app-shell" data-route="language-settings">
      <FixedCanvas height={844}>
        <LanguageSettingsScreen
          savedLanguage={savedLanguage}
          onBack={returnToTab}
          onCancel={returnToTab}
          onApply={(code) => { setSavedLanguage(code); returnToTab(); }}
        />
      </FixedCanvas>
    </main>;
  }
  if (route === 'help-main') {
    // #55 도움말 메인, reachable from #38's "도움말" row. Back returns
    // to #38. "자주 묻는 질문" card / quick-help rows -> #56 (quick-help
    // rows pass a specific topic deep-link); "사용 가이드" card -> #57.
    return <main className="drawary-app-shell" data-route="help-main">
      <FixedCanvas height={844}>
        <HelpMainScreen
          onBack={returnToTab}
          onOpenFaq={(topic) => { setFaqTopic(topic); navigate('faq'); }}
          onOpenGuide={() => navigate('guide')}
        />
      </FixedCanvas>
    </main>;
  }
  if (route === 'faq') {
    // #56 자주 묻는 질문, reachable from #55. Back returns to #55.
    return <main className="drawary-app-shell" data-route="faq">
      <FixedCanvas height={844}>
        <FaqScreen initialTopic={faqTopic} onBack={() => navigate('help-main')} />
      </FixedCanvas>
    </main>;
  }
  if (route === 'guide') {
    // #57 사용 가이드, reachable from #55. Back returns to #55. Each
    // step navigates to the real existing screen it names (see
    // GuideScreen.tsx's own header comment) -- a genuine integration,
    // not a no-op.
    const guideRoutes: Record<GuideRoute, Route> = {
      new_drawer: 'create-drawer',
      drawer_fields: 'drawer-fields',
      record_add: 'fill-drawer',
      table_view: 'table-view',
    };
    return <main className="drawary-app-shell" data-route="guide">
      <FixedCanvas height={844}>
        <GuideScreen onBack={() => navigate('help-main')} onNavigate={(step) => navigate(guideRoutes[step])} />
      </FixedCanvas>
    </main>;
  }
  if (route === 'info') {
    // #58 정보, reachable from #38's "정보" row. Back returns to #38.
    // 개인정보 처리방침/이용약관/오픈소스 라이선스 have no destination
    // among the 59 approved screens, so those three stay no-ops.
    return <main className="drawary-app-shell" data-route="info">
      <FixedCanvas height={844}>
        <InfoScreen onBack={returnToTab} onNavigate={() => {}} />
      </FixedCanvas>
    </main>;
  }
  if (route === 'feedback') {
    // #59 피드백, reachable from #38's "피드백" row. Back returns to
    // #38. Submitting has no real backend (see FeedbackScreen.tsx's
    // own header comment) -- shows a real local acknowledgment, then
    // returns to #38.
    return <main className="drawary-app-shell" data-route="feedback">
      <FixedCanvas height={844}>
        <FeedbackScreen onBack={returnToTab} onSubmit={() => setTimeout(returnToTab, 1200)} />
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
            if (!currentDrawer) return;
            actions.updateDrawer(currentDrawer.id, { name, iconKey: iconId })
              .then(() => navigate('drawer-manage'))
              .catch((e: unknown) => window.alert(e instanceof Error ? e.message : '저장하지 못했어요.'));
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
    if (!currentDrawer) return <main className="drawary-app-shell" data-route="drawer-fields-manage" />;
    return <main className="drawary-app-shell" data-route="drawer-fields-manage">
      <FixedCanvas height={844}>
        <DrawerFieldsScreen
          title="서랍칸 편집"
          completeLabel="완료"
          contextLabel={{ name: drawerDetailName, detail: `${currentFields.length}개 서랍칸` }}
          fields={manageList.map(toFieldItem)}
          onBack={() => navigate('drawer-manage')}
          onAddField={() => navigate('new-field-manage')}
          onEditField={(field) => { setManageFieldId(field.id); navigate('field-edit-manage'); }}
          onQuickAdd={(label) => { void actions.addField(currentDrawer.id, { name: label, kind: QUICK_ADD_KINDS[label] ?? 'text' }).catch(alertError); }}
          onReorder={(from, to) => setManageOrder((prev) => {
            const ids = prev ?? currentFields.map((f) => f.id);
            if (from === to || from < 0 || to < 0 || from >= ids.length || to >= ids.length) return ids;
            const next = [...ids]; const [moved] = next.splice(from, 1); next.splice(to, 0, moved); return next;
          })}
          onReorderEnd={() => {
            const ids = manageOrderRef.current;
            if (ids && ids.some((id, i) => id !== currentFields[i]?.id)) {
              void actions.reorderFields(currentDrawer.id, ids).catch(alertError).finally(() => setManageOrder(null));
            } else setManageOrder(null);
          }}
          onComplete={() => navigate('drawer-manage')}
        />
      </FixedCanvas>
    </main>;
  }
  if (route === 'new-field-manage') {
    // #26's reuse of #10 (NewFieldScreen), entered only from drawer-fields-manage;
    // "추가하기" adds the field to the drawer straight away (a rejected name or
    // options stays here with a message).
    if (!currentDrawer) return <main className="drawary-app-shell" data-route="new-field-manage" />;
    return <main className="drawary-app-shell" data-route="new-field-manage">
      <FixedCanvas height={844}>
        <NewFieldScreen
          onBack={() => navigate('drawer-fields-manage')}
          onAdd={(data) => { void actions.addField(currentDrawer.id, data).then(() => navigate('drawer-fields-manage')).catch(alertError); }}
        />
      </FixedCanvas>
    </main>;
  }
  if (route === 'field-edit-manage') {
    // #26's reuse of #11, opened on the tapped field. Saving applies at once. Taking
    // away a choice that records already use clears it from those records, after a
    // confirmation; deleting a field (its own confirm sheet) removes its values from
    // every record, and the last remaining field cannot be deleted.
    if (!manageField) return <main className="drawary-app-shell" data-route="field-edit-manage" />;
    return <main className="drawary-app-shell" data-route="field-edit-manage">
      <FixedCanvas height={844}>
        <DrawerFieldEditScreen
          key={manageField.id}
          field={manageField}
          onBack={() => navigate('drawer-fields-manage')}
          onSave={(patch) => {
            const kept = new Set(patch.options.map((o) => o.trim()).filter(Boolean));
            const removed = manageField.options.filter((o) => !kept.has(o));
            const affected = manageField.kind === 'select'
              ? currentRecords.filter((r) => typeof r.values[manageField.id] === 'string' && removed.includes(r.values[manageField.id] as string)).length
              : 0;
            if (affected > 0 && !window.confirm(`없애는 선택 항목을 쓰고 있는 보관품 ${affected}개의 값이 지워져요. 계속할까요?`)) return;
            void actions.updateField(manageField.id, patch).then(() => navigate('drawer-fields-manage')).catch(alertError);
          }}
          onDelete={() => { void actions.deleteField(manageField.id).then(() => { setManageFieldId(null); navigate('drawer-fields-manage'); }).catch(alertError); }}
        />
      </FixedCanvas>
    </main>;
  }
  if (route === 'record-detail') {
    // #16: the saved record. Its first text field is the heading; the other filled
    // fields are listed below (money as stored, dates with weekday). "수정하기" -> #17;
    // "보관품 삭제" confirms in #18, then deletes the record and its photos and
    // returns to #15. Tapping the photo opens #19.
    if (!selectedRecord || !currentDrawer) return <main className="drawary-app-shell" data-route="record-detail" />;
    const sum = summarizeRecord(currentFields, selectedRecord);
    const rows: RecordFieldValue[] = currentFields
      .filter((f) => hasControl(f.kind) && f.id !== sum.titleFieldId && (f.kind === 'check' || selectedRecord.values[f.id] != null))
      .map((f) => ({
        id: f.id, label: f.name, value: formatValue(f, selectedRecord.values[f.id]),
        type: (f.kind === 'long_text' ? 'note' : f.kind === 'check' ? 'checkbox' : f.kind) as RecordFieldType,
      }));
    return <main className="drawary-app-shell" data-route="record-detail">
      <FixedCanvas height={844}>
        <RecordDetailScreen
          drawerName={currentDrawer.name}
          title={sum.title}
          photoUri={selectedPhotos.urls[0] ?? ''}
          photoLoading={selectedPhotos.blobs === null}
          fields={rows}
          onBack={() => navigate(recordBack)}
          onEdit={() => { setEditPhotos(null); setEditKey((k) => k + 1); navigate('record-edit'); }}
          onDelete={() => { void guardedSave(async () => {
            const id = selectedRecord.id;
            await actions.deleteRecord(id);
            setRecordDetailId(null);
            navigate(recordBack);
          }); }}
          onOpenPhoto={() => navigate('photo-viewer')}
        />
      </FixedCanvas>
    </main>;
  }
  if (route === 'photo-viewer') {
    // #19: this record's photos only; the approved viewer/gestures are untouched.
    if (!selectedRecord || selectedPhotos.urls.length === 0) {
      return <main className="drawary-app-shell" data-route="photo-viewer" />;
    }
    return <main className="drawary-app-shell" data-route="photo-viewer">
      <FixedCanvas height={844}>
        <PhotoViewerScreen
          key={selectedRecord.id}
          photoUris={selectedPhotos.urls}
          onClose={() => navigate('record-detail')}
        />
      </FixedCanvas>
    </main>;
  }
  if (route === 'record-edit') {
    // #17: edits every field of the record; photos are staged until "수정 완료"
    // (back discards). One set of up to 3: "사진 바꾸기" replaces it, × removes it.
    if (!selectedRecord || !currentDrawer) return <main className="drawary-app-shell" data-route="record-edit" />;
    const shownPhoto = editPhotos !== null
      ? (editPhotos.length ? (editUrls[0] ?? selectedPhotos.urls[0] ?? '') : '')
      : (selectedPhotos.urls[0] ?? '');
    return <main className="drawary-app-shell" data-route="record-edit">
      <FixedCanvas height={844}>
        <RecordEditScreen
          key={`${selectedRecord.id}:${editKey}`}
          drawerName={currentDrawer.name}
          fields={currentFields}
          initialDraft={draftFromRecord(currentFields, selectedRecord)}
          photoUri={shownPhoto}
          saving={recordSaving}
          onBack={() => { setEditPhotos(null); navigate('record-detail'); }}
          onPickPhoto={() => { void (async () => {
            const files = await pickRecordPhotos();
            if (files.length) setEditPhotos(files);
          })(); }}
          onRemovePhoto={() => setEditPhotos([])}
          onSave={(draft: RecordDraft) => { void guardedSave(async () => {
            await actions.updateRecord(selectedRecord.id, draftToValues(currentFields, draft), editPhotos ?? undefined);
            setPhotoVersion((v) => v + 1);
            setEditPhotos(null);
            navigate('record-detail');
          }); }}
        />
      </FixedCanvas>
    </main>;
  }
  if (route === 'backup-progress') {
    // #47, now actually chained into the real #45->#46->#47->#48 backup
    // flow (V2-10-45~53 batch) instead of being a standalone-only QA
    // route reachable solely from Settings. Back returns to #46;
    // auto-completes (see BackupProgressScreen.tsx's own header
    // comment on the added onComplete) -> #48.
    return <main className="drawary-app-shell" data-route="backup-progress">
      <BackupProgressScreen onBack={() => navigate('backup-destination')} onComplete={() => navigate('backup-success')} />
    </main>;
  }
  if (route === 'home-edit') {
    // #6 홈 편집 모드: same grid as #3 with delete / reorder controls on
    // each card. Delete here asks first (a drawer takes its fields, items
    // and photos with it); reorder is a drag on the card's handle.
    return <main className="drawary-app-shell" data-route="home-edit">
      <section className="drawary-route-panel">
        <HomeScreen
          mode="edit"
          drawers={homeCards}
          totalRecords={store.records.length}
          onDone={() => navigate('home')}
          onCreateDrawer={() => navigate('create-drawer')}
          onDeleteDrawer={(id) => {
            const target = drawerById(store, id);
            if (!target) return;
            const count = recordsOf(store, id).length;
            const detail = count > 0 ? `\n보관품 ${count}개와 사진도 함께 삭제돼요.` : '';
            if (window.confirm(`'${target.name}' 서랍을 삭제할까요?${detail}\n삭제한 내용은 되돌릴 수 없어요.`)) {
              actions.deleteDrawer(id).catch((e: unknown) => window.alert(e instanceof Error ? e.message : '삭제하지 못했어요.'));
            }
          }}
          onReorder={(ids) => { actions.reorderDrawers(ids).catch((e: unknown) => window.alert(e instanceof Error ? e.message : '순서를 바꾸지 못했어요.')); }}
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
          // #3 / #4: the empty state is shown whenever there are no drawers.
          // Nothing is rendered until the saved data has loaded, so a
          // returning user never sees a flash of the empty screen.
          store.status === 'loading' ? null
          : store.drawers.length === 0 ? (
            <HomeEmptyScreen onCreateDrawer={() => navigate('create-drawer')} />
          ) : (
            <HomeScreen
              drawers={homeCards}
              totalRecords={store.records.length}
              onOpenDrawer={(id) => { setCurrentDrawerId(id); navigate('drawer-detail'); }}
              onCreateDrawer={() => navigate('create-drawer')}
              onEdit={() => navigate('home-edit')}
            />
          )
        ) : route === 'search' ? (
          // #05: every drawer's 보관품; a result opens #16 and back returns here.
          <GlobalSearchScreen
            records={searchRecords}
            query={globalQuery}
            onQueryChange={setGlobalQuery}
            onOpenRecord={(recordId, drawerId) => { setCurrentDrawerId(drawerId); openRecord(recordId, 'search'); }}
          />
        ) : route === 'settings' ? (
          // #38: 테마->#39, 보안->#40, 데이터->#44, 언어->#54, 도움말->
          // #55, 정보->#58, 피드백->#59 -- all real routes now (final
          // batch of the 59 screens).
          <SettingsHomeScreen
            onTheme={() => navigate('theme-settings')}
            onSecurity={() => navigate('security-settings')}
            onData={() => navigate('data-management')}
            onLanguage={() => navigate('language-settings')}
            onHelp={() => navigate('help-main')}
            onInfo={() => navigate('info')}
            onFeedback={() => navigate('feedback')}
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
