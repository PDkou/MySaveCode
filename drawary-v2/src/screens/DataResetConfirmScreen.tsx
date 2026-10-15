import { useState } from 'react';
import './DataResetConfirmScreen.css';

export interface DataResetConfirmScreenProps {
  onCancel?: () => void;
  onResetConfirmed?: () => void;
}

/**
 * #53 데이터 초기화 확인. Ported from
 * `Drawary_53_DATA_RESET_CONFIRM_CANDIDATE_2026-10-14`'s `index.html`
 * -- the real checkbox-gated destructive-action logic ported 1:1
 * ("데이터 초기화" stays `disabled` until the acknowledgment checkbox
 * is checked). New `state_generic_warning.webp`/`ui_delete.webp`
 * assets copied in from this archive. Reached from #44's "데이터
 * 초기화" row. Per the archive's own comment ("UI preview only. No
 * deletion of files, storage, or app data is performed here") and
 * README.md ("데이터 삭제 코드는 없음... 실제 앱 내 비가역 초기화 연결
 * 금지"), `onResetConfirmed` does not delete anything -- App.tsx just
 * navigates back to #44, same as cancelling.
 */
export function DataResetConfirmScreen({ onCancel, onResetConfirmed }: DataResetConfirmScreenProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <main className="drc53-screen" aria-label="데이터 초기화 확인 화면">
      <header className="drc53-header">
        <button className="drc53-back" type="button" aria-label="이전 화면" onClick={onCancel} />
        <span className="drc53-title">데이터 초기화</span>
      </header>
      <section className="drc53-panel" aria-labelledby="drc53-heading">
        <div className="drc53-intro">
          <img className="drc53-warning-art" src="/assets/states/generic/state_generic_warning.webp" alt="주의 표시를 든 Drawary 마스코트" />
          <h1 id="drc53-heading" className="drc53-heading">정말 초기화할까요?</h1>
          <p className="drc53-description">이 기기에 저장된 Drawary 데이터를<br />초기화하려고 해요.</p>
        </div>
        <div className="drc53-warning-card">
          <img className="drc53-delete-art" src="/assets/ui-icons/ui_delete.webp" alt="" />
          <div className="drc53-warning-copy">
            <p className="drc53-warning-title">초기화 전에 확인해 주세요</p>
            <div className="drc53-warning-lines">
              <p>서랍과 기록, 앱 설정 등의 데이터가 삭제돼요.</p>
              <p>삭제한 내용은 되돌릴 수 없어요.</p>
              <p>필요한 기록은 먼저 백업해 주세요.</p>
            </div>
          </div>
        </div>
        <label className="drc53-ack" htmlFor="drc53-agree">
          <input
            type="checkbox"
            id="drc53-agree"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
          />
          <span>초기화 안내를 확인했어요</span>
        </label>
        <div className="drc53-actions">
          <button className="drc53-cancel" type="button" onClick={onCancel}>취소</button>
          <button
            className="drc53-reset"
            type="button"
            disabled={!acknowledged}
            onClick={() => acknowledged && onResetConfirmed?.()}
          >
            데이터 초기화
          </button>
        </div>
      </section>
    </main>
  );
}
