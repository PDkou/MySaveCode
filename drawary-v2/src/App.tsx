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
import { FixedCanvas } from './components/FixedCanvas';

type Route = BottomNavTab | 'create-drawer' | 'splash' | 'onboarding' | 'home-empty' | 'new-field' | 'field-edit' | 'creation-complete' | 'fill-drawer' | 'backup-progress';
const TABS: readonly BottomNavTab[] = ['home', 'search', 'stats', 'settings'];
const NAMES: Record<Exclude<Route, 'splash' | 'onboarding' | 'home-empty' | 'new-field' | 'field-edit' | 'creation-complete' | 'fill-drawer' | 'backup-progress'>, string> = {
  home: '홈', search: '검색', stats: '통계', settings: '설정', 'create-drawer': '새 서랍 만들기',
};
const isTab = (route: Route): route is BottomNavTab => TABS.some(tab => tab === route);
const STANDALONE_ROUTES: readonly Route[] = ['splash', 'onboarding', 'home-empty', 'new-field', 'field-edit', 'creation-complete', 'fill-drawer', 'backup-progress'];
const parseRoute = (): Route => {
  const route = window.location.hash.replace(/^#\/?/, '');
  if (route === 'create-drawer' || STANDALONE_ROUTES.some(r => r === route) || TABS.some(tab => tab === route)) return route as Route;
  return 'home';
};

/** #03 Home content hotspots that have no destination screen yet (drawer
 * detail / editing aren't built, screens 9+). Per CLAUDE.md, a missing
 * source is a blocker to flag, not something to approximate -- so these
 * are a deliberate no-op for now rather than a guessed navigation target. */
const UNIMPLEMENTED_HOME_ACTIONS: ReadonlySet<HomeAction> = new Set(['edit', 'open-cosmetics', 'open-books', 'open-plants', 'open-travel', 'open-other']);

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
      <FixedCanvas height={844}><NewFieldScreen onBack={() => navigate('create-drawer')} onAdd={() => navigate('create-drawer')} /></FixedCanvas>
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
    // #13 QA route, reachable from #12's "서랍 채우기". onSave has no
    // destination yet (no drawer-detail screen to return the new item
    // into -- that's #15/#16, not in this batch) and is left unwired.
    return <main className="drawary-app-shell" data-route="fill-drawer">
      <FixedCanvas height={844}><FillDrawerScreen onBack={() => navigate('creation-complete')} /></FixedCanvas>
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
      <section className="drawary-route-panel" aria-labelledby={route === 'home' || route === 'search' || route === 'settings' ? undefined : 'drawary-dev-screen-title'}>
        {route === 'home' ? (
          <HomeScreen onAction={(action) => {
            if (action === 'create-drawer') { navigate('create-drawer'); return; }
            if (UNIMPLEMENTED_HOME_ACTIONS.has(action)) return; // no destination screen yet; see CLAUDE.md note above
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
        ) : tabRoute ? (
          <div className="drawary-dev-only">
            <div className="drawary-dev-flag">개발 검수용 · 확정 화면 아님</div>
            <h1 id="drawary-dev-screen-title">{NAMES[route]}</h1>
            <p>V2-08 공통 하단바·화면 이동 동작 확인</p>
            <p className="drawary-dev-detail">이 영역의 실제 확정 화면은 후속 구현 단계에서 연결합니다.</p>
          </div>
        ) : route === 'create-drawer' ? (
          // #09: the real screen, now chained to the real #10/#11/#12
          // screens. onQuickAdd/onReorder still have no real behavior --
          // #09's own fields list is local demo state, not yet backed by
          // shared create-drawer state (V2-12), so a quick-add chip or a
          // drag-reorder has nothing to actually mutate yet.
          <FixedCanvas height={844}>
            <DrawerFieldsScreen
              onBack={returnToTab}
              onAddField={() => navigate('new-field')}
              onEditField={() => navigate('field-edit')}
              onComplete={() => navigate('creation-complete')}
            />
          </FixedCanvas>
        ) : null}
      </section>
      {tabRoute && <footer className="drawary-shell-footer">
        <ResponsiveBottomNav active={route} onNavigate={navigate} onCreateDrawer={() => navigate('create-drawer')} />
      </footer>}
    </main>
  );
}
