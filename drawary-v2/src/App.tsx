import { screenManifest } from './screenManifest';

/** Developer audit dashboard only. Not the approved Drawary home screen. */
export default function App() {
  return (
    <main className="audit">
      <header className="audit-header">
        <h1>Drawary V2</h1>
        <p>실제 앱 통합 전 개발용 점검 화면입니다. 출시용 UI가 아닙니다.</p>
      </header>
      <section className="progress" aria-label="통합 현황">
        <div><strong>59/59</strong><span>화면 디자인 확정</span></div>
        <div><strong>0/59</strong><span>V2 앱에 통합 완료</span></div>
      </section>
      <section aria-labelledby="screen-list-title">
        <h2 id="screen-list-title">확정 화면 목록</h2>
        <ol className="screen-list">{screenManifest.map((screen) => (
          <li key={screen.id}>
            <span className="screen-id">{String(screen.id).padStart(2, '0')}</span>
            <span className="screen-name">{screen.name}</span>
            <span className="screen-status">통합 대기</span>
          </li>
        ))}</ol>
      </section>
    </main>
  );
}
