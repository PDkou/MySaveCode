import { useCallback, useEffect, useRef, useState } from 'react';
import { ResponsiveBottomNav } from './components/ResponsiveBottomNav';
import type { BottomNavTab } from './components/BottomNav_FINAL_CONFIRMED';
import { SplashScreen } from './screens/SplashScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';

type Route = BottomNavTab | 'create-drawer' | 'splash' | 'onboarding';
const TABS: readonly BottomNavTab[] = ['home', 'search', 'stats', 'settings'];
const NAMES: Record<Exclude<Route, 'splash' | 'onboarding'>, string> = {
  home: '홈', search: '검색', stats: '통계', settings: '설정', 'create-drawer': '새 서랍 만들기',
};
const isTab = (route: Route): route is BottomNavTab => TABS.some(tab => tab === route);
const parseRoute = (): Route => {
  const route = window.location.hash.replace(/^#\/?/, '');
  if (route === 'splash' || route === 'onboarding' || route === 'create-drawer' || TABS.some(tab => tab === route)) return route as Route;
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
  const tabRoute = isTab(route);
  return (
    <main className="drawary-app-shell" data-route={route}>
      <section className="drawary-route-panel" aria-labelledby="drawary-dev-screen-title">
        {tabRoute ? (
          <div className="drawary-dev-only">
            <div className="drawary-dev-flag">개발 검수용 · 확정 화면 아님</div>
            <h1 id="drawary-dev-screen-title">{NAMES[route]}</h1>
            <p>V2-08 공통 하단바·화면 이동 동작 확인</p>
            <p className="drawary-dev-detail">이 영역의 실제 확정 화면은 후속 구현 단계에서 연결합니다.</p>
          </div>
        ) : (
          <div className="drawary-dev-only">
            <div className="drawary-dev-flag">개발 검수용 · 확정 화면 아님</div>
            <h1 id="drawary-dev-screen-title">새 서랍 만들기</h1>
            <p>중앙 + 버튼으로 하위 흐름 이동 확인</p>
            <p className="drawary-dev-detail">하위 흐름에는 공통 하단바를 표시하지 않습니다.</p>
            <button type="button" className="drawary-dev-return" onClick={returnToTab}>이전 탭으로 돌아가기</button>
          </div>
        )}
      </section>
      {tabRoute && <footer className="drawary-shell-footer">
        <ResponsiveBottomNav active={route} onNavigate={navigate} onCreateDrawer={() => navigate('create-drawer')} />
      </footer>}
    </main>
  );
}
