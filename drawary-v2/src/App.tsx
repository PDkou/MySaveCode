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
import { DrawerFieldsScreen } from './screens/DrawerFieldsScreen';
import { NewFieldScreen } from './screens/NewFieldScreen';
import { DrawerFieldEditScreen } from './screens/DrawerFieldEditScreen';
import { CreationCompleteScreen } from './screens/CreationCompleteScreen';
import { FillDrawerScreen } from './screens/FillDrawerScreen';
import { BackupProgressScreen } from './screens/BackupProgressScreen';
import { HomeEditScreen } from './screens/HomeEditScreen';
import { StatsScreen } from './screens/StatsScreen';
import { NewDrawerScreen } from './screens/NewDrawerScreen';
import { DrawerDetailScreen, DEFAULT_RECORDS } from './screens/DrawerDetailScreen';
import { RecordDetailScreen } from './screens/RecordDetailScreen';
import { RecordEditScreen } from './screens/RecordEditScreen';
import { FixedCanvas } from './components/FixedCanvas';

type Route = BottomNavTab | 'create-drawer' | 'drawer-fields' | 'splash' | 'onboarding' | 'home-empty' | 'new-field' | 'field-edit' | 'creation-complete' | 'fill-drawer' | 'backup-progress' | 'home-edit' | 'drawer-detail' | 'record-detail' | 'record-edit';
const TABS: readonly BottomNavTab[] = ['home', 'search', 'stats', 'settings'];
const NAMES: Record<Exclude<Route, 'splash' | 'onboarding' | 'home-empty' | 'new-field' | 'field-edit' | 'creation-complete' | 'fill-drawer' | 'backup-progress' | 'home-edit' | 'drawer-fields' | 'drawer-detail' | 'record-detail' | 'record-edit'>, string> = {
  home: '홈', search: '검색', stats: '통계', settings: '설정', 'create-drawer': '새 서랍 만들기',
};
const isTab = (route: Route): route is BottomNavTab => TABS.some(tab => tab === route);
const STANDALONE_ROUTES: readonly Route[] = ['splash', 'onboarding', 'home-empty', 'new-field', 'field-edit', 'creation-complete', 'fill-drawer', 'backup-progress', 'home-edit', 'drawer-fields', 'drawer-detail', 'record-detail', 'record-edit'];
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
  const [recordDetailId, setRecordDetailId] = useState('lip');
  // '' means "no photo" -- RecordEditScreen's photoUri prop defaults to
  // the fixture only when passed `undefined`, so removal must use ''
  // rather than undefined or the default parameter would silently put
  // the photo right back (a real bug caught during this screen's QA).
  const [editPhotoUri, setEditPhotoUri] = useState('/fixtures/sample_edit_photo.webp');

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
    // not yet unified.
    return <main className="drawary-app-shell" data-route="field-edit">
      <FixedCanvas height={844}><DrawerFieldEditScreen /></FixedCanvas>
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
    // hotspots. "표로 보기"(#20)/"서랍 관리"(#24) have no destination
    // screens yet -- intentional no-ops, same reasoning as other
    // not-yet-built destinations.
    return <main className="drawary-app-shell" data-route="drawer-detail">
      <FixedCanvas height={844}>
        <DrawerDetailScreen
          drawerName={drawerDetailName}
          onBack={returnToTab}
          onFillDrawer={() => navigate('fill-drawer')}
          onOpenRecord={(id) => { setRecordDetailId(id); navigate('record-detail'); }}
          onOpenTable={() => {}}
          onOpenManage={() => {}}
        />
      </FixedCanvas>
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
    // photo that was never provided. "수정하기"(#17)/"보관품 삭제"(#18)
    // have no destination screens yet -- intentional no-ops.
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
          onDelete={() => {}}
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
          // #38: every row (테마/보안/데이터/언어/도움말/정보/피드백) targets
          // a screen (#39,#40,#44,#54,#55,#58,#59) not yet integrated --
          // all intentionally unwired for now, same reasoning as above.
          <SettingsHomeScreen />
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
