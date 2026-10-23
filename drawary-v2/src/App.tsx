import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
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
  defaultDraftFields, QUICK_ADD_KINDS, addDraftField, moveDraftField, removeDraftField, updateDraftField,
  type DraftField,
} from './flow/drawerDraft';
import { NewFieldScreen } from './screens/NewFieldScreen';
import { DrawerFieldEditScreen } from './screens/DrawerFieldEditScreen';
import { NameIconChangeScreen } from './screens/NameIconChangeScreen';
import { CreationCompleteScreen } from './screens/CreationCompleteScreen';
import { FillDrawerScreen } from './screens/FillDrawerScreen';
import { BackupProgressScreen } from './screens/BackupProgressScreen';
import { StatsScreen } from './screens/StatsScreen';
import { computeStats } from './flow/stats';
import { NewDrawerScreen } from './screens/NewDrawerScreen';
import { TemplatePickerScreen } from './screens/TemplatePickerScreen';
import { PremiumScreen, type PremiumNotice } from './screens/PremiumScreen';
import { PremiumPrompt } from './screens/PremiumPrompt';
import { askPremium, closePremiumPrompt, setPremiumScreenReason, takePremiumPrompt, usePremiumUi } from './flow/premiumPrompt';
import { PREMIUM_KEY, PREMIUM_PRODUCT, gateForRoute, isPremium, supportProductId, themeFor, type PremiumReason } from './flow/premium';
import { hasNativeBilling, purchaseProduct, queryBilling } from './data/billing';
import { openLegal } from './data/legalLinks';
import { premiumPrices, type PremiumProductPrices } from './flow/premiumPrices';
import { draftFieldsOf } from './flow/drawerTemplates';
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
import { NotificationCommonSettingsScreen } from './screens/NotificationCommonSettingsScreen';
import { NOTIFY_COMMON_KEY, readNotifyCommon } from './flow/notifySettings';
import { computeNotificationPlan } from './flow/notificationPlan';
import { hasNativeBiometric, authenticateBiometric, deliverBackup, syncNotificationPlan, syncLanguage, hasNativeFeedback, hasNativeSave, sendNativeFeedback, setSecureScreen } from './data/nativeBridge';
import * as repo from './data/repository';
import { assertUniqueDrawerName } from './data/validation';
import { createBackup, readBackup, type ParsedBackup } from './backup/backupFile';
import { useAppLock } from './flow/useAppLock';
import { applyTheme, readTheme, THEME_KEY } from './flow/theme';
import { LANGUAGE_KEY, readLanguage, setLang } from './i18n';
import { savePin, setAppLock, setAutoLock, setBiometric, verifyPin } from './data/appLockActions';
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
import { LanguageSettingsScreen } from './screens/LanguageSettingsScreen';
import { HelpMainScreen } from './screens/HelpMainScreen';
import { FaqScreen } from './screens/FaqScreen';
import { GuideScreen, type GuideRoute } from './screens/GuideScreen';
import { InfoScreen } from './screens/InfoScreen';
import { FeedbackScreen } from './screens/FeedbackScreen';
import { FixedCanvas } from './components/FixedCanvas';
import { useAppLayout } from './components/appLayout';
import { WideFrame } from './wide/WideFrame';
import { DrawerSidebar } from './wide/DrawerSidebar';
import { WideHome } from './wide/WideHome';
import { WideEmptyHome } from './wide/WideEmptyHome';
import { WideSheet } from './wide/WideSheet';
import { WideSettingsGrid } from './wide/WideSettingsGrid';
import { PaneMagnifier } from './wide/PaneMagnifier';
import './wide/wideSettings.css';
import './screens/UnifiedHeader.css';
import './screens/UnifiedButtons.css';
import { WideDrawer } from './wide/WideDrawer';
import { dot, getLocale, t, K } from './i18n';
import { closeOpenOverlay } from './flow/overlayBack';

type StandaloneRoute = 'premium' | 'templates' | 'notification-common' | 'drawer-fields' | 'splash' | 'onboarding' | 'home-empty' | 'new-field' | 'field-edit' | 'creation-complete' | 'fill-drawer' | 'backup-progress' | 'home-edit' | 'drawer-detail' | 'record-detail' | 'record-edit' | 'photo-viewer' | 'table-view' | 'drawer-manage' | 'name-icon-change' | 'drawer-fields-manage' | 'new-field-manage' | 'field-edit-manage' | 'notification-settings' | 'notification-date-field' | 'notification-timing' | 'notification-complete' | 'recurrence-management' | 'recurrence-target-date' | 'recurrence-cycle' | 'recurrence-end-condition' | 'recurrence-complete' | 'theme-settings' | 'security-settings' | 'lock-detail' | 'pin-setup' | 'app-lock' | 'data-management' | 'backup-type' | 'backup-destination' | 'backup-success' | 'restore-file-picker' | 'restore-review' | 'restore-progress' | 'restore-success' | 'data-reset-confirm' | 'language-settings' | 'help-main' | 'faq' | 'guide' | 'info' | 'feedback';
type Route = BottomNavTab | 'create-drawer' | StandaloneRoute;
const TABS: readonly BottomNavTab[] = ['home', 'search', 'stats', 'settings'];
const NAMES: Record<Exclude<Route, StandaloneRoute>, string> = {
  home: K('홈'), search: K('검색'), stats: K('통계'), settings: K('설정'), 'create-drawer': K('새 서랍 만들기'),
};
/** Which row of the settings list each settings-family screen belongs to (wide windows show the list beside the open screen). */
const SETTINGS_PANES: Partial<Record<Route, string>> = {
  settings: 'theme', 'theme-settings': 'theme',
  'security-settings': 'security', 'lock-detail': 'security', 'pin-setup': 'security',
  'data-management': 'data', 'backup-type': 'data', 'backup-destination': 'data', 'backup-success': 'data', 'restore-file-picker': 'data', 'restore-review': 'data', 'restore-success': 'data', 'data-reset-confirm': 'data',
  'language-settings': 'language', 'help-main': 'help', faq: 'help', guide: 'help', info: 'info', feedback: 'feedback',
};
/** The first-level settings screens that get their own wide arrangement (wide/wideSettings.css); the screens they lead to are shown magnified. */
const WIDE_SETTINGS_PAGES: readonly Route[] = ['theme-settings', 'security-settings', 'data-management', 'language-settings', 'help-main', 'info', 'feedback'];
const isTab = (route: Route): route is BottomNavTab => TABS.some(tab => tab === route);
const STANDALONE_ROUTES: readonly Route[] = ['premium', 'templates', 'notification-common', 'splash', 'onboarding', 'home-empty', 'new-field', 'field-edit', 'creation-complete', 'fill-drawer', 'backup-progress', 'home-edit', 'drawer-fields', 'drawer-detail', 'record-detail', 'record-edit', 'photo-viewer', 'table-view', 'drawer-manage', 'name-icon-change', 'drawer-fields-manage', 'new-field-manage', 'field-edit-manage', 'notification-settings', 'notification-date-field', 'notification-timing', 'notification-complete', 'recurrence-management', 'recurrence-target-date', 'recurrence-cycle', 'recurrence-end-condition', 'recurrence-complete', 'theme-settings', 'security-settings', 'lock-detail', 'pin-setup', 'app-lock', 'data-management', 'backup-type', 'backup-destination', 'backup-success', 'restore-file-picker', 'restore-review', 'restore-progress', 'restore-success', 'data-reset-confirm', 'language-settings', 'help-main', 'faq', 'guide', 'info', 'feedback'];
const parseRoute = (): Route => {
  const route = window.location.hash.replace(/^#\/?/, '');
  if (route === 'create-drawer' || STANDALONE_ROUTES.some(r => r === route) || TABS.some(tab => tab === route)) return route as Route;
  return 'home';
};

/** V2-09-01/02: the approved splash and onboarding are also reachable at #/splash and #/onboarding for parity QA.
 * First-run flow (step 6): a cold start with no `#/...` in the address shows the splash, then the onboarding when the
 * person has not seen it (and has no drawers yet, e.g. after restoring a backup), otherwise the home screen.
 * ASSUMPTION (no approved source gives a duration): the splash stays BOOT_SPLASH_MS and fades for the last
 * BOOT_FADE_MS; it never ends before the saved data has loaded.
 * All other routes remain the developer-only V2-08 harness, not finished product screens.
 */
const BOOT_SPLASH_MS = 1600;
const BOOT_FADE_MS = 250;
const onboardingSeen = (): boolean => {
  try { return localStorage.getItem('drawary_onboarding_done') === '1'; } catch { return false; }
};
/** The app plus the "결제할까요?" dialog that any screen can open when a Free limit is reached. */
export default function App() {
  const ui = usePremiumUi();
  return (
    <>
      <AppScreens />
      {ui.prompt && <PremiumPrompt reason={ui.prompt} onMore={() => { takePremiumPrompt(); window.location.hash = '#/premium'; }} onLater={closePremiumPrompt} />}
    </>
  );
}

function AppScreens() {
  const [route, setRoute] = useState<Route>(parseRoute);
  // 'splash' only on a cold start without a route in the address; 'fading' is its last moments.
  const [boot, setBoot] = useState<'splash' | 'fading' | 'done'>(() => (window.location.hash === '' || window.location.hash === '#' ? 'splash' : 'done'));
  const [bootTimeUp, setBootTimeUp] = useState(false);
  const lastTabRef = useRef<BottomNavTab>('home');
  const layout = useAppLayout();
  const store = useStore();
  const [currentDrawerId, setCurrentDrawerId] = useState<string | null>(null);

  // Premium: the purchase flag is saved in the settings; the Android shell re-checks it with Google Play whenever the app opens.
  const premium = isPremium(store.settings);
  const gateRef = useRef({ premium: false, drawerCount: 0 });
  gateRef.current = { premium, drawerCount: store.drawers.length };
  const premiumReason = usePremiumUi().reason;
  const setPremiumReason = setPremiumScreenReason;
  const [premiumNotice, setPremiumNotice] = useState<PremiumNotice | null>(null);
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [playPrices, setPlayPrices] = useState<PremiumProductPrices>({});

  // Create-drawer flow (#08 -> #09 -> #10/#11 -> #12). Everything the user
  // enters lives here until "서랍 만들기 완료하기", which saves the drawer and
  // all its fields in one transaction; backing out saves nothing.
  const [createDraft, setCreateDraft] = useState<{ name: string; icon: string; color: string } | null>(null);
  const [draftFields, setDraftFields] = useState<DraftField[] | null>(null);
  const [editingDraftFieldId, setEditingDraftFieldId] = useState<string | null>(null);
  const creatingRef = useRef(false);
  const fieldsDraft: DraftField[] = draftFields ?? defaultDraftFields();
  const editingDraftField = fieldsDraft.find((f) => f.id === editingDraftFieldId);
  const alertError = (e: unknown) => window.alert(e instanceof Error ? e.message : t('저장하지 못했어요.'));
  const resetCreateFlow = () => { setCreateDraft(null); setDraftFields(null); setEditingDraftFieldId(null); };
  const tryDraft = (next: () => DraftField[]): boolean => {
    try { setDraftFields(next()); return true; } catch (e) { alertError(e); return false; }
  };
  const completeCreate = async () => {
    if (creatingRef.current) return;
    if (!createDraft) { window.alert(t('서랍 이름을 먼저 정해 주세요.')); navigate('create-drawer'); return; }
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
  // Landscape drawer view: the first select field's values are filter chips (none when the drawer has no select field).
  const [chipSel, setChipSel] = useState<{ drawerId: string; key: string } | null>(null);
  const chipField = currentFields.find((f) => f.kind === 'select' && f.options.length > 0);
  const activeChip = chipField && currentDrawer && chipSel?.drawerId === currentDrawer.id && chipField.options.includes(chipSel.key) ? chipSel.key : null;
  const visibleRecords = currentRecords
    .filter((r) => recordMatches(currentFields, r, recordQuery))
    .filter((r) => !chipField || activeChip === null || r.values[chipField.id] === activeChip);
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
    if (!gateRef.current.premium) { askPremium('export'); return; }
    if (kind === 'csv') {
      void saveBlob(new Blob([buildCsv(tableColumns, shown)], { type: 'text/csv;charset=utf-8' }), exportFileName(currentDrawer.name, 'csv'))
        // A browser shows its own download bar; the Android app says where the file went.
        .then((place) => { if (hasNativeSave()) window.alert(t('{place}에 저장했어요.', { place })); })
        .catch(alertError);
    }
    else printHtml(buildPrintHtml(currentDrawer.name, tableColumns, shown, new Date().toLocaleDateString(getLocale())));
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
      title: sum.title, meta: [sum.subtitle, sum.dateLabel].filter(Boolean).join(dot()),
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
    try {
      const files = await pickRecordPhotos();
      if (files.length) set([...current, ...files].slice(0, MAX_RECORD_PHOTOS));
    } catch (e) { alertError(e); }
  };
  // #17 edit form: photos staged until "수정 완료" (null = unchanged, [] = removed).
  const [editPhotos, setEditPhotos] = useState<Blob[] | null>(null);
  const editUrls = useObjectUrls(editPhotos);
  const [editKey, setEditKey] = useState(0);

  // #26 서랍 칸 편집 on an existing drawer: edits are saved straight away (no draft).
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
  // 서랍 칸이 1개뿐이면 기본 선택" case.
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
        statusLabel: r.finished ? t('종료') : r.createdCount > 0 ? t('{createdCount}개 만들었어요', { createdCount: r.createdCount }) : undefined,
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
        quiet: readNotifyCommon(store.settings),
      }));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [store.status, store.notificationRules, store.drawers, store.fields, store.records, store.settings]);

  // #40-#43 보안/잠금. The PIN is saved as a salted hash (see flow/appLock.ts);
  // `lock` says whether the lock screen must cover the app right now.
  const lock = useAppLock(store.status !== 'loading', store.settings);
  const sec = lock.security;
  // With the lock on, the Android app hides the screen from screenshots and the recent-apps list.
  useEffect(() => { if (store.status === 'ready') setSecureScreen(sec.appLock); }, [store.status, sec.appLock]);
  // "앱 잠금 사용" switched off asks for the current PIN first.
  const [confirmLockOff, setConfirmLockOff] = useState(false);

  // #54 언어: the saved choice (or, on the very first start, the phone's language) is what every t() call answers in.
  // Set while rendering, before any screen below is drawn; a change re-renders the whole tree because the setting lives in the store.
  const language = readLanguage(store.settings);
  setLang(language);
  useEffect(() => { if (store.status === 'ready') syncLanguage(language); }, [store.status, language]);

  // #39 테마: the saved choice is put on the page whenever it changes (and once the saved data has loaded).
  const savedTheme = readTheme(store.settings);
  const theme = themeFor(savedTheme, premium); // Free shows Lavender; the saved choice comes back with Premium
  useEffect(() => { if (store.status === 'ready') applyTheme(theme); }, [store.status, theme]);

  // Premium check with Google Play: when the app opens and each time it comes back to the foreground. Only an answer from Play
  // changes the saved flag (a refund or another phone); without an answer (offline, no Play) the saved flag stays.
  const syncPremium = useCallback(async () => {
    const snapshot = await queryBilling();
    if (!snapshot) return null;
    setPlayPrices(snapshot.prices);
    if (snapshot.premium !== gateRef.current.premium) await actions.setSetting(PREMIUM_KEY, snapshot.premium);
    return snapshot;
  }, []);
  useEffect(() => {
    if (store.status !== 'ready' || !hasNativeBilling()) return;
    void syncPremium().catch((e: unknown) => console.error('could not check Premium with Google Play', e));
    const onVisible = () => { if (document.visibilityState === 'visible') void syncPremium().catch(() => undefined); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [store.status, syncPremium]);

  const buyPremium = async () => {
    if (!hasNativeBilling()) { setPremiumNotice('browser'); return; }
    setPurchaseBusy(true);
    try {
      const result = await purchaseProduct(PREMIUM_PRODUCT);
      if (result === 'ok' || result === 'owned') { await syncPremium(); setPremiumNotice('bought'); }
      else if (result === 'pending') setPremiumNotice('pending');
      else if (result !== 'cancelled') setPremiumNotice('error');
    } finally { setPurchaseBusy(false); }
  };
  const restorePurchase = async () => {
    if (!hasNativeBilling()) { setPremiumNotice('browser'); return; }
    setPurchaseBusy(true);
    try {
      const snapshot = await syncPremium();
      setPremiumNotice(!snapshot ? 'error' : snapshot.premium ? 'restored' : 'nothing-to-restore');
    } finally { setPurchaseBusy(false); }
  };
  const buySupport = async (kind: Parameters<typeof supportProductId>[0]) => {
    if (!hasNativeBilling()) { setPremiumNotice('browser'); return; }
    setPurchaseBusy(true);
    try {
      const result = await purchaseProduct(supportProductId(kind));
      if (result === 'ok') setPremiumNotice('thanks');
      else if (result === 'pending') setPremiumNotice('pending');
      else if (result !== 'cancelled') setPremiumNotice('error');
    } finally { setPurchaseBusy(false); }
  };
  const openPremium = (reason: PremiumReason | null = null) => { setPremiumReason(reason); navigate('premium'); };

  // #44-#53 백업/복원/초기화.
  const [backupMode, setBackupMode] = useState<BackupMode>('include');
  const [backupDestination, setBackupDestination] = useState<BackupDestination>('device');
  // #45-#53 run for real: the file that was just written (#48), the backup file that was chosen to restore (#50-#52).
  const [backupResult, setBackupResult] = useState<{ fileName: string; location: string; includesPhotos: boolean } | null>(null);
  const [restorePlan, setRestorePlan] = useState<{ fileName: string; parsed: ParsedBackup } | null>(null);
  const [restoreDone, setRestoreDone] = useState<ParsedBackup['summary'] | null>(null);
  // Restoring and resetting replace everything, so with the lock on they ask for the PIN first.
  const [pinGate, setPinGate] = useState<'restore' | 'reset' | null>(null);

  // #47: make the backup file and hand it over, then #48. The short wait is only so the progress screen is not a flash.
  useEffect(() => {
    if (route !== 'backup-progress' || store.status !== 'ready') return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const started = Date.now();
          const include = backupMode === 'include';
          const made = await createBackup({ ...(await repo.loadAll()), photos: await repo.loadAllPhotos() }, include);
          const location = await deliverBackup(backupDestination, made.fileName, made.blob);
          await new Promise((r) => window.setTimeout(r, Math.max(0, 1200 - (Date.now() - started))));
          if (cancelled) return;
          setBackupResult({ fileName: made.fileName, location, includesPhotos: include });
          navigate('backup-success');
        } catch (e) {
          if (cancelled) return;
          alertError(e);
          navigate('backup-destination');
        }
      })();
    }, 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, store.status]);

  // #51: replace everything with the chosen backup (one all-or-nothing write), then #52.
  useEffect(() => {
    if (route !== 'restore-progress' || store.status !== 'ready' || !restorePlan) return;
    let cancelled = false;
    const plan = restorePlan;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const started = Date.now();
          await actions.replaceAllData(plan.parsed.snapshot);
          await new Promise((r) => window.setTimeout(r, Math.max(0, 1200 - (Date.now() - started))));
          if (cancelled) return;
          setRestoreDone(plan.parsed.summary);
          setCurrentDrawerId(null); setRecordDetailId(null);
          navigate('restore-success');
        } catch (e) {
          if (cancelled) return;
          alertError(e);
          navigate('restore-review');
        }
      })();
    }, 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, store.status, restorePlan]);

  // #53: erase everything on this device and start like a fresh install.
  const resetEverything = () => {
    void actions.resetAllData()
      .then(() => {
        try { localStorage.removeItem('drawary_onboarding_done'); localStorage.removeItem('drawary.theme'); } catch { /* storage unavailable */ }
        resetCreateFlow(); setCurrentDrawerId(null); setRecordDetailId(null); setRestorePlan(null); setRestoreDone(null); setBackupResult(null);
        setPinGate(null);
        navigate('home');
      })
      .catch(alertError);
  };

  // #54-#59 언어/도움말/FAQ/가이드/정보/피드백.
  const [faqTopic, setFaqTopic] = useState<string | undefined>(undefined);

  useEffect(() => {
    const update = () => {
      const next = parseRoute();
      const blocked = gateForRoute(next, gateRef.current);
      if (blocked) { setPremiumReason(blocked); window.location.hash = '#/premium'; return; } // a typed or restored address cannot skip the Free limits either
      if (isTab(next)) lastTabRef.current = next;
      setRoute(next);
    };
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);

  // `replace` swaps the current history entry instead of adding one, so the Android back button never returns to
  // the splash / the onboarding it just left.
  const navigate = useCallback((requested: Route, replace = false) => {
    // A screen Free does not include asks "결제할까요?" in a small dialog instead of opening (the person stays where they are).
    const blocked = gateForRoute(requested, gateRef.current);
    if (blocked) { askPremium(blocked); return; }
    const to: Route = requested;
    if (isTab(to)) lastTabRef.current = to;
    const next = `#/${to}`;
    if (window.location.hash === next) { setRoute(to); return; }
    if (replace) window.history.replaceState(null, '', next);
    else window.location.hash = next;
    setRoute(to);
  }, []);
  const returnToTab = useCallback(() => navigate(lastTabRef.current), [navigate]);

  // First-run flow: splash (at least BOOT_SPLASH_MS, and until the saved data has loaded) -> onboarding or home.
  useEffect(() => {
    if (boot !== 'splash') return;
    const timer = window.setTimeout(() => setBootTimeUp(true), BOOT_SPLASH_MS - BOOT_FADE_MS);
    return () => window.clearTimeout(timer);
  }, [boot]);
  useEffect(() => { if (boot === 'splash' && bootTimeUp && store.status !== 'loading') setBoot('fading'); }, [boot, bootTimeUp, store.status]);
  const hasDrawers = store.drawers.length > 0;
  useEffect(() => {
    if (boot !== 'fading') return;
    const timer = window.setTimeout(() => {
      setBoot('done');
      navigate(onboardingSeen() || hasDrawers ? 'home' : 'onboarding', true);
    }, BOOT_FADE_MS);
    return () => window.clearTimeout(timer);
  }, [boot, hasDrawers, navigate]);
  // Record screens need an open drawer (and #16/#17/#19 a record). A direct URL or a
  // deleted record sends the user back to where there is something to show.
  useEffect(() => {
    if (store.status !== 'ready') return;
    const recordRoute = route === 'record-detail' || route === 'record-edit' || route === 'photo-viewer';
    const manageRoute = route === 'drawer-manage' || route === 'name-icon-change' || route === 'drawer-fields-manage'
      || route === 'new-field-manage' || route === 'field-edit-manage';
    if ((route === 'drawer-detail' || route === 'fill-drawer' || route === 'table-view' || route === 'home-edit' || recordRoute || manageRoute) && !currentDrawer) navigate('home');
    else if (route === 'field-edit-manage' && !manageField) navigate('drawer-fields-manage');
    else if (recordRoute && !selectedRecord) navigate('drawer-detail');
    else if ((route === 'restore-review' || route === 'restore-progress') && !restorePlan) navigate('restore-file-picker');
  }, [route, store.status, currentDrawer, selectedRecord, manageField, navigate]);

  // Wide windows show an item next to its list, so the single-item screen (#16) is skipped when it was reached from that list
  // (back from editing or from the photo viewer lands on the drawer, with the same item chosen).
  useEffect(() => {
    if (layout === 'wide' && route === 'record-detail' && (recordBack === 'drawer-detail' || recordBack === 'search') && store.drawers.length > 0) navigate(recordBack, true);
  }, [layout, route, recordBack, store.drawers.length, navigate]);
  // Wide drawer view: the right-hand pane always shows an item of the list (the first one until another is picked).
  useEffect(() => {
    if (layout !== 'wide' || route !== 'drawer-detail' || store.status !== 'ready') return;
    const first = visibleRecords[0]?.id ?? null;
    if (recordDetailId === null ? first !== null : !visibleRecords.some((r) => r.id === recordDetailId)) setRecordDetailId(first);
  });

  // The phone's back button (Android shell): does what the screen's own back arrow does. Anything open on top (dialog,
  // menu, PIN gate) closes first; on Home (or the lock screen) it returns false and the shell leaves the app.
  const hardwareBack = (): boolean => {
    if (boot !== 'done') return true;
    if (lock.locked) return false;
    if (closeOpenOverlay()) return true;
    if (pinGate) { setPinGate(null); return true; }
    if (confirmLockOff) { setConfirmLockOff(false); return true; }
    if (targetPickerOpen) { setTargetPickerOpen(false); return true; }
    switch (route) {
      case 'home': case 'home-empty': case 'app-lock': case 'splash': return false;
      case 'onboarding': {
        const e = new CustomEvent('drawary:back', { detail: { handled: false } });
        window.dispatchEvent(e);
        return e.detail.handled; // a slide back, or leave the app from the first slide
      }
      case 'search': case 'stats': case 'settings': navigate('home'); return true;
      case 'create-drawer': resetCreateFlow(); returnToTab(); return true;
      case 'drawer-fields': case 'field-edit': navigate(route === 'drawer-fields' ? 'create-drawer' : 'drawer-fields'); return true;
      case 'new-field': navigate('drawer-fields'); return true;
      case 'templates': resetCreateFlow(); returnToTab(); return true;
      case 'premium': returnToTab(); return true;
      case 'creation-complete': case 'theme-settings': case 'security-settings': case 'data-management': case 'language-settings':
      case 'help-main': case 'info': case 'feedback': returnToTab(); return true;
      case 'fill-drawer': navigate(fillBack); return true;
      case 'drawer-detail': setRecordQuery(''); returnToTab(); return true;
      case 'table-view': case 'drawer-manage': navigate('drawer-detail'); return true;
      case 'notification-settings': case 'recurrence-management': case 'notification-complete': case 'recurrence-complete':
      case 'name-icon-change': case 'drawer-fields-manage': navigate('drawer-manage'); return true;
      case 'notification-common': case 'notification-date-field': navigate('notification-settings'); return true;
      case 'notification-timing': navigate('notification-date-field'); return true;
      case 'recurrence-target-date': navigate('recurrence-management'); return true;
      case 'recurrence-cycle': navigate('recurrence-target-date'); return true;
      case 'recurrence-end-condition': navigate('recurrence-cycle'); return true;
      case 'new-field-manage': case 'field-edit-manage': navigate('drawer-fields-manage'); return true;
      case 'lock-detail': navigate('security-settings'); return true;
      case 'pin-setup': navigate('lock-detail'); return true;
      case 'backup-type': case 'restore-file-picker': case 'backup-success': case 'restore-success': case 'data-reset-confirm': navigate('data-management'); return true;
      case 'backup-destination': navigate('backup-type'); return true;
      case 'backup-progress': navigate('backup-destination'); return true;
      case 'restore-review': navigate('restore-file-picker'); return true;
      case 'restore-progress': return true; // the restore is writing: not interruptible
      case 'faq': case 'guide': navigate('help-main'); return true;
      case 'record-detail': navigate(recordBack); return true;
      case 'photo-viewer': navigate('record-detail'); return true;
      case 'record-edit': setEditPhotos(null); navigate('record-detail'); return true;
      case 'home-edit': navigate('home'); return true;
      default: return false;
    }
  };
  const hardwareBackRef = useRef(hardwareBack);
  hardwareBackRef.current = hardwareBack;
  useEffect(() => {
    window.__drawaryBack = () => hardwareBackRef.current();
    return () => { delete window.__drawaryBack; };
  }, []);

  if (boot !== 'done') {
    return <main className="drawary-app-shell drawary-splash-route" data-route="boot-splash"><SplashScreen fadingOut={boot === 'fading'} /></main>;
  }
  // Nothing is drawn until the saved data (and with it the lock setting) has loaded.
  if (store.status === 'loading') return <main className="drawary-app-shell" data-route="loading" />;
  if (lock.locked) {
    return <main className="drawary-app-shell" data-route="locked">
      <FixedCanvas height={844}>
        <AppLockScreen verify={verifyPin} lockedUntil={sec.attempts.lockedUntil} onUnlock={lock.unlock} />
      </FixedCanvas>
    </main>;
  }

  // Landscape windows (see components/appScale.ts): the home, the drawer (#15) and the table (#20) get their own layouts, built
  // from the same data, handlers and approved pieces as the phone screens. Everything else keeps the phone screens.
  const recordFieldRows = (rec: (typeof store.records)[number]): RecordFieldValue[] => {
    const sum = summarizeRecord(currentFields, rec);
    return currentFields
      .filter((f) => hasControl(f.kind) && f.id !== sum.titleFieldId && (f.kind === 'check' || rec.values[f.id] != null))
      .map((f) => ({
        id: f.id, label: f.name, value: formatValue(f, rec.values[f.id]),
        type: (f.kind === 'long_text' ? 'note' : f.kind === 'check' ? 'checkbox' : f.kind) as RecordFieldType,
      }));
  };
  // The chosen item shown beside its list (drawer view and search, wide windows); "수정하기" / "삭제하기" work as in #16.
  const recordPane = (rec: (typeof store.records)[number] | undefined, back: 'drawer-detail' | 'search', hint: string): ReactElement => {
    if (!rec || !currentDrawer || rec.drawerId !== currentDrawer.id) return <p className="wd-detail-empty">{hint}</p>;
    return (
      <RecordDetailScreen
        key={rec.id}
        embedded
        drawerName={currentDrawer.name}
        title={summarizeRecord(currentFields, rec).title}
        photoUri={selectedPhotos.urls[0] ?? ''}
        photoLoading={selectedPhotos.blobs === null}
        fields={recordFieldRows(rec)}
        onEdit={() => { setRecordBack(back); setEditPhotos(null); setEditKey((k) => k + 1); navigate('record-edit'); }}
        onDelete={() => { void guardedSave(async () => { await actions.deleteRecord(rec.id); setRecordDetailId(null); }); }}
        onOpenPhoto={() => { setRecordBack(back); navigate('photo-viewer'); }}
      />
    );
  };
  // The home editor (#6), on the phone and in the wide window: delete asks first (a drawer takes its fields, items and photos
  // with it); reorder is a drag on the card's handle.
  const deleteDrawerAsking = (id: string) => {
    const target = drawerById(store, id);
    if (!target) return;
    const count = recordsOf(store, id).length;
    const detail = count > 0 ? t('\n보관품 {count}개와 사진도 함께 삭제돼요.', { count }) : '';
    if (window.confirm(t('\'{name}\' 서랍을 삭제할까요?{detail}\n삭제한 내용은 되돌릴 수 없어요.', { name: target.name, detail }))) {
      actions.deleteDrawer(id).catch((e: unknown) => window.alert(e instanceof Error ? e.message : t('삭제하지 못했어요.')));
    }
  };
  const reorderDrawers = (ids: string[]) => {
    actions.reorderDrawers(ids).catch((e: unknown) => window.alert(e instanceof Error ? e.message : t('순서를 바꾸지 못했어요.')));
  };
  const renderLandscape = (route: Route, kind: 'land' | 'wide', overlay?: ReactElement): ReactElement | null => {
    // The tab that is lit: the tab screen itself, the settings tab for every settings screen, else the tab this was opened from.
    const activeTab: BottomNavTab = isTab(route) ? route : SETTINGS_PANES[route] ? 'settings' : lastTabRef.current;
    const nav = <ResponsiveBottomNav active={activeTab} onNavigate={navigate} onCreateDrawer={() => navigate('create-drawer')} />;
    const sidebar = (activeId: string | null, onSelect: (id: string) => void) => kind === 'wide'
      ? <DrawerSidebar drawers={homeCards} totalRecords={store.records.length} activeId={activeId} onSelect={onSelect} />
      : undefined;
    const hasDrawers = store.drawers.length > 0;
    if (route === 'home' && !hasDrawers && kind === 'wide') {
      return <WideFrame kind="wide" route="home" nav={nav} overlay={overlay} sidebar={<DrawerSidebar drawers={[]} totalRecords={0} activeId={null} onSelect={() => undefined} />}>
        <WideEmptyHome onCreateDrawer={() => navigate('create-drawer')} onTemplates={() => navigate('templates')} />
      </WideFrame>;
    }
    if (route === 'home' && hasDrawers) {
      return <WideFrame kind={kind} route="home" nav={nav} overlay={overlay} sidebar={sidebar(null, (id) => { setCurrentDrawerId(id); navigate('drawer-detail'); })}>
        <WideHome
          drawers={homeCards}
          totalRecords={store.records.length}
          withBrand={kind === 'land'}
          onOpenDrawer={(id) => { setCurrentDrawerId(id); navigate('drawer-detail'); }}
          onCreateDrawer={() => navigate('create-drawer')}
          onEdit={() => navigate('home-edit')}
        />
      </WideFrame>;
    }
    if (route === 'home-edit' && hasDrawers) {
      return <WideFrame kind={kind} route="home-edit" nav={nav} overlay={overlay} sidebar={sidebar(null, () => undefined)}>
        <WideHome
          editing
          drawers={homeCards}
          totalRecords={store.records.length}
          withBrand={kind === 'land'}
          onOpenDrawer={() => undefined}
          onCreateDrawer={() => navigate('create-drawer')}
          onEdit={() => undefined}
          onDone={() => navigate('home')}
          onDeleteDrawer={deleteDrawerAsking}
          onReorder={reorderDrawers}
        />
      </WideFrame>;
    }
    if (route === 'drawer-detail' && currentDrawer) {
      const summaries: DrawerRecordSummary[] = visibleRecords.map((r) => {
        const sum = summarizeRecord(currentFields, r);
        return { id: r.id, title: sum.title, subtitle: sum.subtitle, dateLabel: sum.dateLabel, thumbnailUri: recordThumbs[r.id] };
      });
      const paneRecord = selectedRecord && selectedRecord.drawerId === currentDrawer.id ? selectedRecord : undefined;
      const detail = kind === 'wide' ? recordPane(paneRecord, 'drawer-detail', t('보관품을 고르면 여기에 보여요.')) : undefined;
      return <WideFrame kind={kind} route="drawer-detail" nav={nav} overlay={overlay}>
        <WideDrawer
          kind={kind}
          drawerName={currentDrawer.name}
          recordCount={currentRecords.length}
          fallbackIconKey={currentDrawer.iconKey}
          records={summaries}
          chipsLabel={chipField?.name}
          chips={chipField ? chipField.options.map((o) => ({ key: o, label: o })) : []}
          activeChip={activeChip}
          onChip={(key) => setChipSel(key === null ? null : { drawerId: currentDrawer.id, key })}
          query={recordQuery}
          onSearch={setRecordQuery}
          selectedId={paneRecord?.id ?? null}
          onSelect={(id) => { if (kind === 'wide') setRecordDetailId(id); else openRecord(id, 'drawer-detail'); }}
          detail={detail}
          onBack={() => { setRecordQuery(''); returnToTab(); }}
          onOpenTable={() => navigate('table-view')}
          onOpenManage={() => navigate('drawer-manage')}
          onFillDrawer={() => startFill('drawer-detail')}
        />
      </WideFrame>;
    }
    if (route === 'table-view' && currentDrawer) {
      return <WideFrame kind={kind} route="table-view" nav={nav} overlay={overlay} sidebar={sidebar(currentDrawer.id, (id) => setCurrentDrawerId(id))}>
        <TableViewScreen
          fill
          key={currentDrawer.id}
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
      </WideFrame>;
    }
    if (route === 'stats') {
      return <WideFrame kind={kind} route="stats" nav={nav} overlay={overlay}>
        <div className="wide-scroll">
          <StatsScreen
            wide
            stats={computeStats(store.drawers, store.fields, store.records, new Date(), (d) => new Intl.DateTimeFormat(getLocale(), { month: 'short' }).format(d))}
            onOpenInsight={(drawerId) => { setCurrentDrawerId(drawerId); navigate('drawer-detail'); }}
          />
        </div>
      </WideFrame>;
    }
    if (SETTINGS_PANES[route] !== undefined && (kind === 'wide' || route === 'settings')) {
      // The settings tab is a card grid; a card opens that settings screen (and the screens it leads to) magnified, and the screen's own back arrow leads back.
      return <WideFrame kind={kind} route={route} nav={nav} overlay={overlay}>
        {route === 'settings' ? (
          <div className="wide-scroll">
            <WideSettingsGrid
              premium={premium}
              onPremium={() => openPremium()}
              onTheme={() => navigate('theme-settings')}
              onSecurity={() => navigate('security-settings')}
              onData={() => navigate('data-management')}
              onLanguage={() => navigate('language-settings')}
              onHelp={() => navigate('help-main')}
              onInfo={() => navigate('info')}
              onFeedback={() => navigate('feedback')}
            />
          </div>
        ) : WIDE_SETTINGS_PAGES.includes(route) ? <div className="wide-sd">{renderRoute(route, true)}</div>
          : <PaneMagnifier>{renderRoute(route, true)}</PaneMagnifier>}
      </WideFrame>;
    }
    if (kind !== 'wide') return null;
    if (route === 'search') {
      const paneRecord = selectedRecord && selectedRecord.drawerId === currentDrawer?.id ? selectedRecord : undefined;
      return <WideFrame kind={kind} route="search" nav={nav} overlay={overlay}>
        <div className="wide-two">
          <div className="wide-two-list">
            <GlobalSearchScreen
              records={searchRecords}
              query={globalQuery}
              onQueryChange={setGlobalQuery}
              onOpenRecord={(recordId, drawerId) => { setCurrentDrawerId(drawerId); setRecordDetailId(recordId); }}
            />
          </div>
          <div className="wide-two-detail">{recordPane(paneRecord, 'search', t('왼쪽에서 고르면 여기에 열려요.'))}</div>
        </div>
      </WideFrame>;
    }
    return null;
  };
  // A screen that belongs to a flow and has no wide arrangement of its own (creating a drawer, filling it, editing an item, premium, the
  // notification and repeat steps, ...) opens as a sheet in the middle of the wide window, over the screen it came from. The frame around it
  // (drawer list, the full-width nav band) is the same as on every other wide screen.
  const renderWideFallback = (route: Route): ReactElement => {
    const fromDrawer = ['fill-drawer', 'record-edit', 'photo-viewer', 'drawer-manage', 'name-icon-change', 'drawer-fields-manage', 'new-field-manage', 'field-edit-manage',
      'notification-settings', 'notification-date-field', 'notification-timing', 'notification-complete', 'recurrence-management', 'recurrence-target-date',
      'recurrence-cycle', 'recurrence-end-condition', 'recurrence-complete'].includes(route);
    const context: Route = route === 'home' || route === 'home-empty' ? 'home'
      : route === 'premium' || route === 'notification-common' ? 'settings'
      : fromDrawer && currentDrawer ? 'drawer-detail' : 'home';
    // forms get a sheet of their own width and scroll in it (the filling and editing forms in two columns); the other screens are shown magnified
    const formSheets: Partial<Record<Route, number>> = { 'fill-drawer': 900, 'record-edit': 900, 'create-drawer': 600 };
    const sheet = route === 'home' || route === 'home-empty' ? undefined
      : formSheets[route] !== undefined
        ? <WideSheet width={formSheets[route]}><div className="wide-sheet-scroll">{renderRoute(route, true, true)}</div></WideSheet>
        : <WideSheet><PaneMagnifier max={1.2}>{renderRoute(route, true)}</PaneMagnifier></WideSheet>;
    return renderLandscape(context, 'wide', sheet) ?? renderRoute(route, true);
  };
  // Every screen's markup, picked by route. Phones and portrait tablets draw just one of them; a wide window (landscape tablet,
  // unfolded foldable) draws its own arrangement (see renderLandscape / renderWideFallback), so this is a function of the route instead of the open route.
  const renderRoute = (route: Route, phoneOnly = false, inSheet = false): ReactElement => {
    if (!phoneOnly && layout !== 'single') {
      const landscape = renderLandscape(route, layout);
      if (landscape) return landscape;
    }
    if (route === 'splash') {
      return <main className="drawary-app-shell drawary-splash-route" data-route="splash"><SplashScreen fadingOut={false}/></main>;
    }
    if (route === 'onboarding') {
      return <main className="drawary-app-shell drawary-onboarding-route" data-route="onboarding">
        <OnboardingScreen onDone={() => navigate('home', true)} />
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
        <FixedCanvas height={844} grow>
          <DrawerFieldsScreen
            fields={fieldsDraft.map(toFieldItem)}
            onBack={() => navigate('create-drawer')}
            onAddField={() => navigate('new-field')}
            onEditField={(field) => { setEditingDraftFieldId(field.id); navigate('field-edit'); }}
            onQuickAdd={(label) => { tryDraft(() => addDraftField(fieldsDraft, { name: t(label), kind: QUICK_ADD_KINDS[label] ?? 'text', required: false, options: [] })); }}
            onReorder={(from, to) => setDraftFields((prev) => moveDraftField(prev ?? defaultDraftFields(), from, to))}
            onComplete={() => { void completeCreate(); }}
          />
        </FixedCanvas>
      </main>;
    }
    if (route === 'premium') {
      // Prices: Google Play's own once it has answered (Android app); until then (and in a browser) samples in the currency of the language (src/flow/premiumPrices.ts).
      return <main className="drawary-app-shell" data-route="premium">
        <FixedCanvas height={844} grow>
          <PremiumScreen
            prices={premiumPrices(language, playPrices)}
            owned={premium}
            reason={premiumReason}
            notice={premiumNotice}
            onNoticeDone={() => setPremiumNotice(null)}
            busy={purchaseBusy}
            onBack={returnToTab}
            onBuyPremium={() => { void buyPremium(); }}
            onRestore={() => { void restorePurchase(); }}
            onSupport={(kind) => { void buySupport(kind); }}
          />
        </FixedCanvas>
      </main>;
    }
    if (route === 'templates') {
      // "템플릿으로 시작": picking one fills the create-drawer flow (name, look, fields) and continues on the field list, where everything can still be changed.
      return <main className="drawary-app-shell" data-route="templates">
        <FixedCanvas height={844} grow>
          <TemplatePickerScreen
            onBack={() => { resetCreateFlow(); returnToTab(); }}
            onOwn={() => navigate('create-drawer')}
            onPick={(tpl) => { setCreateDraft({ name: t(tpl.name), icon: tpl.iconKey, color: tpl.colorKey }); setDraftFields(draftFieldsOf(tpl)); navigate('drawer-fields'); }}
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
        {!inSheet && <section className="drawary-route-panel drawary-dimmed-home" aria-hidden="true">
          <HomeScreen drawers={homeCards} totalRecords={store.records.length} />
        </section>}
        <NewDrawerScreen
          embedded={inSheet}
          initial={createDraft ?? undefined}
          onTemplates={() => navigate('templates')}
          onNext={(draft) => { try { assertUniqueDrawerName(store.drawers, draft.name); } catch (e) { alertError(e); return; } setCreateDraft(draft); navigate('drawer-fields'); }}
          onDismiss={() => { resetCreateFlow(); returnToTab(); }}
        />
      </main>;
    }
    if (route === 'field-edit') {
      // #11: reached by tapping a row in #09, opening straight on that field's
      // edit view. Without a selected field (direct URL) it shows the archive's
      // demo list as before. A field's kind cannot be changed here.
      return <main className="drawary-app-shell" data-route="field-edit">
        <FixedCanvas height={844} grow>
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
      const fillBody = (
          <FillDrawerScreen
            wide={inSheet}
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
      );
      return <main className="drawary-app-shell" data-route="fill-drawer">
        {inSheet ? fillBody : <FixedCanvas height={844} grow>{fillBody}</FixedCanvas>}
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
      // (previously a no-op). 이름/아이콘 변경 -> #25, 서랍 칸 편집 -> #26
      // (both real routes below). 정렬/필터 설정(#27) and 서랍 삭제(#28) are
      // handled as local overlays inside DrawerManageScreen itself now --
      // deleting calls this onDeleteDrawer, which per #28's CONFIRMED.md
      // ("삭제 후 홈 복귀") returns all the way to the home tab. 알림 설정
      // -> #29, 반복 관리 -> #33 (both real routes below). 백업/내보내기
      // has no destination screen among #25-#37, so that one row stays an
      // intentional no-op.
      return <main className="drawary-app-shell" data-route="drawer-manage">
        <FixedCanvas height={844} grow>
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
              when: `${n.daysBefore === 0 ? t('당일') : t('{daysBefore}일 전', { daysBefore: n.daysBefore })}${dot()}${n.time}`,
            }))}
            onOpenRule={(id) => {
              const n = drawerNotifRules.find((x) => x.id === id);
              const field = currentFields.find((f) => f.id === n?.fieldId);
              if (n && window.confirm(t("'{field}' {when} {time} 알림을 삭제할까요?", { field: field?.name ?? '', when: n.daysBefore === 0 ? t('당일') : t('{daysBefore}일 전', { daysBefore: n.daysBefore }), time: n.time }))) {
                void actions.deleteNotificationRule(id).catch(alertError);
              }
            }}
            fieldCount={currentFields.length}
            recordCount={currentRecords.length}
            drawerIconUri={`/assets/drawer-icons/drawer_icon_${drawerIconId}.webp`}
            onBack={() => navigate('drawer-manage')}
            onAddNotification={() => { setNotifTime(readNotifyCommon(store.settings).defaultTime); navigate('notification-date-field'); }}
            onOpenCommonSettings={() => navigate('notification-common')}
          />
        </FixedCanvas>
      </main>;
    }
    if (route === 'notification-common') {
      // 알림 공통 설정 (default time + 알림 쉬는 시간), opened from #29's "알림 공통 설정" row (the user asked for it to be linked, 2026-10-20).
      return <main className="drawary-app-shell" data-route="notification-common">
        <FixedCanvas height={844}>
          <NotificationCommonSettingsScreen
            value={readNotifyCommon(store.settings)}
            onChange={(next) => { void actions.setSetting(NOTIFY_COMMON_KEY, next).catch(alertError); }}
            onBack={() => navigate('notification-settings')}
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
              if (r && window.confirm(t('\'{targetLabel}\' 반복 설정을 삭제할까요?\n이미 만들어진 보관품은 그대로 남아요.', { targetLabel: r.targetLabel }))) {
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
                window.alert(t("이 보관품에는 '{field}' 날짜가 없어요. 날짜를 먼저 채워 주세요.", { field: df?.name ?? t('날짜') }));
                return;
              }
              setRecurrenceTargetId(targetId);
              setRecurrenceDateFieldId(dateFieldId);
              navigate('recurrence-cycle');
            }}
          />
          {targetPickerOpen && (
            <RecordPickerSheet
              title={t('반복할 보관품 선택')}
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
          <ThemeSettingsScreen bigPreview={layout === 'wide'} previewDrawers={homeCards} initialTheme={theme} onBack={returnToTab} onThemeChange={(id) => { if (!premium && id !== 'lavender') { askPremium('theme'); return; } void actions.setSetting(THEME_KEY, id).catch(alertError); }} />
        </FixedCanvas>
      </main>;
    }
    if (route === 'security-settings') {
      // #40 보안 설정, reachable from #38's "보안 설정" row. Back returns
      // to #38. "앱 잠금" row -> #41. 생체 인증 is turned on only after the
      // phone's own prompt has been passed once (so it is known to work).
      return <main className="drawary-app-shell" data-route="security-settings">
        <FixedCanvas height={844}>
          <SecuritySettingsScreen
            appLockEnabled={sec.appLock}
            autoLock={sec.autoLock}
            biometric={sec.biometric}
            biometricAvailable={hasNativeBiometric()}
            onBack={returnToTab}
            onOpenAppLock={() => navigate('lock-detail')}
            onToggleAutoLock={() => { void setAutoLock(!sec.autoLock).catch(alertError); }}
            onToggleBiometric={() => {
              if (sec.biometric) { void setBiometric(false).catch(alertError); return; }
              void authenticateBiometric()
                .then((ok) => (ok ? setBiometric(true) : window.alert(t('지문/얼굴 인식을 확인하지 못했어요. 다시 시도해 주세요.'))))
                .catch(alertError);
            }}
          />
        </FixedCanvas>
      </main>;
    }
    if (route === 'lock-detail') {
      // #41 잠금 설정 상세, reachable from #40's "앱 잠금" row. Back
      // returns to #40. "PIN 설정 / 변경" -> #42. The "앱 잠금 사용" switch
      // is only enabled once a PIN exists; turning it OFF asks for the
      // current PIN first (the #42 screen in its "verify" mode).
      if (confirmLockOff) {
        return <main className="drawary-app-shell" data-route="lock-detail">
          <FixedCanvas height={844}>
            <PinSetupScreen
              mode="verify"
              verify={verifyPin}
              lockedUntil={sec.attempts.lockedUntil}
              onBack={() => setConfirmLockOff(false)}
              onVerified={() => { void setAppLock(false).then(() => setConfirmLockOff(false)).catch(alertError); }}
            />
          </FixedCanvas>
        </main>;
      }
      return <main className="drawary-app-shell" data-route="lock-detail">
        <FixedCanvas height={844}>
          <LockDetailScreen
            hasPin={sec.pin !== null}
            appLockEnabled={sec.appLock}
            onBack={() => navigate('security-settings')}
            onToggleAppLock={() => {
              if (sec.appLock) setConfirmLockOff(true);
              else void setAppLock(true).catch(alertError);
            }}
            onOpenPinSetup={() => navigate('pin-setup')}
          />
        </FixedCanvas>
      </main>;
    }
    if (route === 'pin-setup') {
      // #42 PIN 설정 / 변경, reachable from #41's "PIN 설정 / 변경" row.
      // Back returns to #41. With a PIN already saved, the current PIN is
      // asked first. Completing the flow saves the new PIN's hash and returns
      // to #41.
      return <main className="drawary-app-shell" data-route="pin-setup">
        <FixedCanvas height={844}>
          <PinSetupScreen
            mode={sec.pin ? 'change' : 'set'}
            verify={verifyPin}
            lockedUntil={sec.attempts.lockedUntil}
            onBack={() => navigate('lock-detail')}
            onComplete={(pin) => { void savePin(pin).then(() => navigate('lock-detail')).catch(alertError); }}
          />
        </FixedCanvas>
      </main>;
    }
    if (route === 'app-lock') {
      // #43 앱 잠금 화면 (fullscreen PIN gate, no back button -- matches
      // the archive exactly). The real gate is shown above, before any route,
      // whenever the lock is on and the app is locked. This route stays as a
      // QA preview of the same screen: it checks the real saved PIN and goes
      // home when it is right (with no PIN saved there is nothing to check).
      return <main className="drawary-app-shell" data-route="app-lock">
        <FixedCanvas height={844}>
          <AppLockScreen verify={verifyPin} lockedUntil={sec.attempts.lockedUntil} onUnlock={() => navigate('home')} />
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
      // #48 백업 완료, reached from #47 once the file is written. No back button (decorative arrow only, matching the
      // archive exactly). "확인" -> #44. The file name and place are the real ones.
      const description = backupResult?.includesPhotos ?? backupMode === 'include' ? t('사진 포함 백업') : t('사진 제외 백업');
      return <main className="drawary-app-shell" data-route="backup-success">
        <FixedCanvas height={844}>
          <BackupSuccessScreen
            fileName={backupResult?.fileName ?? ''}
            location={backupResult?.location ?? (backupDestination === 'device' ? 'Download' : 'Google Drive')}
            description={description}
            onConfirm={() => navigate('data-management')}
          />
        </FixedCanvas>
      </main>;
    }
    if (route === 'restore-file-picker') {
      // #49 복원 파일 선택, reachable from #44's "복원하기" row. Back returns to #44. The chosen file is read and
      // checked completely first (nothing on the device is touched yet); a file that is not a Drawary backup is
      // refused with a message and the person stays here. A good one -> #50.
      return <main className="drawary-app-shell" data-route="restore-file-picker">
        <FixedCanvas height={844}>
          <RestoreFilePickerScreen
            onBack={() => navigate('data-management')}
            onFileSelected={(file) => {
              void readBackup(file)
                .then((parsed) => { setRestorePlan({ fileName: file.name, parsed }); navigate('restore-review'); })
                .catch((e: unknown) => alertError(e));
            }}
          />
        </FixedCanvas>
      </main>;
    }
    if (route === 'restore-review') {
      // #50 복원 내용 확인, reachable from #49. Back returns to #49. The figures are counted from the chosen file.
      // "계속" in the confirm dialog -> #51 (with the lock on, the PIN is asked first).
      if (!restorePlan) return <main className="drawary-app-shell" data-route="restore-review" />;
      if (pinGate === 'restore') {
        return <main className="drawary-app-shell" data-route="restore-review">
          <FixedCanvas height={844}>
            <PinSetupScreen
              mode="verify" purpose="restore" verify={verifyPin} lockedUntil={sec.attempts.lockedUntil}
              onBack={() => setPinGate(null)}
              onVerified={() => { setPinGate(null); navigate('restore-progress'); }}
            />
          </FixedCanvas>
        </main>;
      }
      const sum = restorePlan.parsed.summary;
      const d = new Date(sum.createdAt);
      const two = (n: number) => String(n).padStart(2, '0');
      const when = sum.createdAt ? `${d.getFullYear()}.${two(d.getMonth() + 1)}.${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}` : '';
      return <main className="drawary-app-shell" data-route="restore-review">
        <FixedCanvas height={844}>
          <RestoreReviewScreen
            fileName={restorePlan.fileName}
            fileDetails={t('{date} (백업 파일 1개)', { date: when })}
            hasPhotos={sum.includesPhotos}
            recordSummary={t('{drawers}개 서랍, {records}개 기록', { drawers: sum.drawers, records: sum.records })}
            photoSummary={t('{n}장', { n: sum.photos })}
            onBack={() => navigate('restore-file-picker')}
            onConfirmRestore={() => { if (sec.appLock) setPinGate('restore'); else navigate('restore-progress'); }}
          />
        </FixedCanvas>
      </main>;
    }
    if (route === 'restore-progress') {
      // #51 복원 진행, reachable from #50's confirm dialog. Back returns to #50. The restore itself runs in the
      // effect above; when it is done -> #52.
      return <main className="drawary-app-shell" data-route="restore-progress">
        <FixedCanvas height={844}>
          <RestoreProgressScreen onBack={() => navigate('restore-review')} />
        </FixedCanvas>
      </main>;
    }
    if (route === 'restore-success') {
      // #52 복원 완료, reached from #51. Back and "확인" both return to #44 -- going back to the review screen
      // after a completed restore doesn't make sense.
      const sum = restoreDone;
      return <main className="drawary-app-shell" data-route="restore-success">
        <FixedCanvas height={844}>
          <RestoreSuccessScreen
            recordCount={t('{drawers}개 서랍, {records}개 기록', { drawers: sum?.drawers ?? 0, records: sum?.records ?? 0 })}
            photoCount={t('{n}장', { n: sum?.photos ?? 0 })}
            settingsStatus={t('복원 완료')}
            onBack={() => navigate('data-management')}
            onConfirm={() => navigate('data-management')}
          />
        </FixedCanvas>
      </main>;
    }
    if (route === 'data-reset-confirm') {
      // #53 데이터 초기화 확인, reachable from #44's "데이터 초기화" row. "취소"/뒤로가기 return to #44. Confirming (with the
      // lock on: after the PIN) erases drawers, items, photos, notification/repeat rules and all settings on this device,
      // then starts like a fresh install. Files that were backed up outside the app are not touched.
      if (pinGate === 'reset') {
        return <main className="drawary-app-shell" data-route="data-reset-confirm">
          <FixedCanvas height={844}>
            <PinSetupScreen
              mode="verify" purpose="reset" verify={verifyPin} lockedUntil={sec.attempts.lockedUntil}
              onBack={() => setPinGate(null)}
              onVerified={resetEverything}
            />
          </FixedCanvas>
        </main>;
      }
      return <main className="drawary-app-shell" data-route="data-reset-confirm">
        <FixedCanvas height={844}>
          <DataResetConfirmScreen
            onCancel={() => navigate('data-management')}
            onResetConfirmed={() => { if (sec.appLock) setPinGate('reset'); else resetEverything(); }}
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
            savedLanguage={language}
            onBack={returnToTab}
            onCancel={returnToTab}
            onApply={(code) => { void actions.setSetting(LANGUAGE_KEY, code).then(returnToTab).catch(alertError); }}
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
      // 개인정보 처리방침/이용약관/특정상거래법 표기 open the studio website; 오픈소스 라이선스 is a dialog inside the screen.
      return <main className="drawary-app-shell" data-route="info">
        <FixedCanvas height={844}>
          <InfoScreen onBack={returnToTab} onNavigate={(destination) => openLegal(destination, language)} />
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
          <FeedbackScreen onBack={returnToTab} onSubmit={async (draft) => {
            if (!hasNativeFeedback()) return 'unavailable';
            const opened = await sendNativeFeedback(draft);
            if (opened) window.setTimeout(returnToTab, 2500);
            return opened ? 'opened' : 'no-mail';
          }} />
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
                .catch((e: unknown) => window.alert(e instanceof Error ? e.message : t('저장하지 못했어요.')));
            }}
          />
        </FixedCanvas>
      </main>;
    }
    if (route === 'drawer-fields-manage') {
      // #26 서랍 칸 편집. Per REUSE_MAPPING.md this is NOT a new screen --
      // it reuses #09's DrawerFieldsScreen verbatim, only swapping the
      // creation-flow's own title/copy/destination for an edit-mode
      // context (진입점: #24, 완료/뒤로가기: #24로 복귀, 신규 생성 플로우용
      // 문구 미사용) via the title/completeLabel/contextLabel props added
      // for this reuse. contextLabel renders the REUSE_MAPPING's own
      // approved visual refinement: drawer name + field count on one
      // baseline, centered as a group.
      if (!currentDrawer) return <main className="drawary-app-shell" data-route="drawer-fields-manage" />;
      return <main className="drawary-app-shell" data-route="drawer-fields-manage">
        <FixedCanvas height={844} grow>
          <DrawerFieldsScreen
            title={t('서랍 칸 편집')}
            completeLabel={t('완료')}
            contextLabel={{ name: drawerDetailName, detail: t('{length}개 서랍 칸', { length: currentFields.length }) }}
            fields={manageList.map(toFieldItem)}
            onBack={() => navigate('drawer-manage')}
            onAddField={() => navigate('new-field-manage')}
            onEditField={(field) => { setManageFieldId(field.id); navigate('field-edit-manage'); }}
            onQuickAdd={(label) => { void actions.addField(currentDrawer.id, { name: t(label), kind: QUICK_ADD_KINDS[label] ?? 'text' }).catch(alertError); }}
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
        <FixedCanvas height={844} grow>
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
        <FixedCanvas height={844} grow>
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
              if (affected > 0 && !window.confirm(t('지우려는 선택 항목을 쓰고 있는 보관품 {affected}개에서 그 값이 사라져요. 계속할까요?', { affected }))) return;
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
      const rows = recordFieldRows(selectedRecord);
      return <main className="drawary-app-shell" data-route="record-detail">
        <FixedCanvas height={844} grow>
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
      const editBody = (
          <RecordEditScreen
            wide={inSheet}
            key={`${selectedRecord.id}:${editKey}`}
            drawerName={currentDrawer.name}
            fields={currentFields}
            initialDraft={draftFromRecord(currentFields, selectedRecord)}
            photoUri={shownPhoto}
            saving={recordSaving}
            onBack={() => { setEditPhotos(null); navigate('record-detail'); }}
            onPickPhoto={() => { void (async () => {
              try {
                const files = await pickRecordPhotos();
                if (files.length) setEditPhotos(files);
              } catch (e) { alertError(e); }
            })(); }}
            onRemovePhoto={() => setEditPhotos([])}
            onSave={(draft: RecordDraft) => { void guardedSave(async () => {
              await actions.updateRecord(selectedRecord.id, draftToValues(currentFields, draft), editPhotos ?? undefined);
              setPhotoVersion((v) => v + 1);
              setEditPhotos(null);
              navigate('record-detail');
            }); }}
          />
      );
      return <main className="drawary-app-shell" data-route="record-edit">
        {inSheet ? editBody : <FixedCanvas height={844} grow>{editBody}</FixedCanvas>}
      </main>;
    }
    if (route === 'backup-progress') {
      // #47 백업 진행: the backup file is made and handed over by the effect above, then -> #48. Back returns to #46.
      return <main className="drawary-app-shell" data-route="backup-progress">
        <BackupProgressScreen onBack={() => navigate('backup-destination')} />
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
            onDeleteDrawer={deleteDrawerAsking}
            onReorder={reorderDrawers}
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
        <section className="drawary-route-panel"><HomeEmptyScreen onCreateDrawer={() => navigate('create-drawer')} onTemplates={() => navigate('templates')} /></section>
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
            // The whole app waits for the saved data (see the loading gate
            // above), so a returning user never sees a flash of the empty screen.
            store.drawers.length === 0 ? (
              <HomeEmptyScreen onCreateDrawer={() => navigate('create-drawer')} onTemplates={() => navigate('templates')} />
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
              premium={premium}
              onPremium={() => openPremium()}
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
            <StatsScreen
              stats={computeStats(store.drawers, store.fields, store.records, new Date(), (d) => new Intl.DateTimeFormat(getLocale(), { month: 'short' }).format(d))}
              onOpenInsight={(drawerId) => { setCurrentDrawerId(drawerId); navigate('drawer-detail'); }}
            />
          ) : tabRoute ? (
            <div className="drawary-dev-only">
              <div className="drawary-dev-flag">개발 검수용, 확정 화면 아님</div>
              <h1 id="drawary-dev-screen-title">{t(NAMES[route])}</h1>
              <p>V2-08 공통 하단바와 화면 이동 동작 확인</p>
              <p className="drawary-dev-detail">이 영역의 실제 확정 화면은 후속 구현 단계에서 연결합니다.</p>
            </div>
          ) : null}
        </section>
        {tabRoute && <footer className="drawary-shell-footer">
          <ResponsiveBottomNav active={route} onNavigate={navigate} onCreateDrawer={() => navigate('create-drawer')} />
        </footer>}
      </main>
    );
  };
  // A wide window keeps the tab screen (search, stats, settings) on the left and opens everything else on the right, so a screen
  // opens beside the one it came from. The home, the drawer and the table have their own wide layouts (renderLandscape); splash,
  // onboarding, the PIN and progress screens and the home editor stay full width.
  const fullWidth = route === 'splash' || route === 'onboarding' || route === 'app-lock' || route === 'backup-progress' || route === 'restore-progress' || route === 'home-edit';
  const ownLayout = (store.drawers.length > 0 && (route === 'home' || route === 'drawer-detail' || route === 'table-view'))
    || route === 'stats' || (layout === 'wide' && (route === 'search' || SETTINGS_PANES[route] !== undefined));
  if (layout === 'wide' && !fullWidth && !ownLayout) return renderWideFallback(route);
  return renderRoute(route);
}
