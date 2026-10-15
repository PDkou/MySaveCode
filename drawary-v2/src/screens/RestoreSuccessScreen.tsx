import './RestoreSuccessScreen.css';

export interface RestoreSuccessScreenProps {
  recordCount: string;
  photoCount: string;
  settingsStatus: string;
  onBack?: () => void;
  onConfirm?: () => void;
}

/**
 * #52 복원 완료. Ported from
 * `Drawary_52_RESTORE_SUCCESS_CANDIDATE_2026-10-14`'s `index.html`.
 * Unlike #48's decorative-only back arrow, this one's `<button
 * class="back">` is real and wired in the source -- kept functional
 * here too. Reached from #51's auto-complete; "확인" -> #44.
 */
export function RestoreSuccessScreen({ recordCount, photoCount, settingsStatus, onBack, onConfirm }: RestoreSuccessScreenProps) {
  return (
    <main className="rs52-screen" aria-label="복원 완료 화면">
      <header className="rs52-header">
        <button type="button" className="rs52-back" aria-label="이전 화면" onClick={onBack} />
        <span className="rs52-title">복원 완료</span>
      </header>
      <section className="rs52-panel" aria-label="복원 완료 결과">
        <div className="rs52-content">
          <img className="rs52-art" src="/assets/states/backup/state_restore_success.webp" alt="복원 성공 표시를 든 Drawary 마스코트" />
          <h1 className="rs52-heading">복원이 완료됐어요!</h1>
          <p className="rs52-explain">백업 내용을 모두 불러왔어요.</p>
          <div className="rs52-results" aria-label="복원된 항목">
            <div className="rs52-result-row"><span className="rs52-result-label">서랍과 기록</span><span className="rs52-result-value">{recordCount}</span></div>
            <div className="rs52-result-row"><span className="rs52-result-label">사진</span><span className="rs52-result-value">{photoCount}</span></div>
            <div className="rs52-result-row"><span className="rs52-result-label">설정</span><span className="rs52-result-value">{settingsStatus}</span></div>
          </div>
        </div>
        <button type="button" className="rs52-confirm" onClick={onConfirm}>확인</button>
      </section>
    </main>
  );
}
