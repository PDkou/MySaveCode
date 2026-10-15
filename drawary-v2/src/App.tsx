import { useCallback, useEffect, useRef, useState } from 'react';
import { ResponsiveBottomNav } from './components/ResponsiveBottomNav';
import type { BottomNavTab } from './components/BottomNav_FINAL_CONFIRMED';

type Route = BottomNavTab | 'create-drawer';
const TABS: readonly BottomNavTab[] = ['home', 'search', 'stats', 'settings'];
const NAMES: Record<Route, string> = {
  home: '홈', search: '검색', stats: '통계', settings: '설정', 'create-drawer': '새 서랍 만들기',
};
const parseRoute = (): Route => {
  const route = window.location.hash.replace(/^#\/?/, '');
  return route === 'create-drawer' || TABS.some(tab => tab === route) ? route as Route : 'home';
};

/** V2-08 developer-only routing harness. Product screens are deliberately NOT fabricated here. */
export default function App() {
  const [route, setRoute] = useState<Route>(parseRoute);
  const lastTabRef = useRef<BottomNavTab>('home');

  useEffect(() => {
    const update = () => setRoute(parseRoute());
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);

  const navigate = useCallback((to: Route) => {
    if (TABS.some(tab => tab === to)) lastTabRef.current = to as BottomNavTab;
    const next = `#/${to}`;
    if (window.location.hash === next) { setRoute(to); return; }
    window.location.hash = next;
    setRoute(to);
  }, []);
  const returnToTab = useCallback(() => navigate(lastTabRef.current), [navigate]);
  const tabRoute = route !== 'create-drawer';
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
