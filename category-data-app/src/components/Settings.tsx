import { useState } from 'react';
import { Modal } from './Modal';
import { ConfirmDialog } from './ConfirmDialog';
import { BackupSheet } from './BackupSheet';
import { BackIcon } from './icons';
import { getNativeBridge } from '../lib/native';
import type { AppData } from '../types';

interface SettingsProps {
  data: AppData;
  onImport: (data: AppData) => void;
  onBack: () => void;
}

const CONTACT_EMAIL = 'db5704@gmail.com';

// Flip this on once a real priced feature actually ships. The disclosure
// text below is scaffolded from Hello, Today's own 特定商取引法 page
// (same developer/business, so the seller-name and email fields are
// already correct as-is) since a paid feature is planned for later here
// too -- but the price/delivery-timing fields are necessarily placeholders
// until there's an actual in-app purchase to describe, and this is not a
// substitute for having it checked once real pricing exists. There's no
// language switcher in this app (unlike Hello, Today's ko/ja/en `l()`)
// for this to key off yet, hence the plain constant rather than a locale
// check -- wire it to a real language setting if/when this app gets one.
const SHOW_TOKUSHOHO = false;

function appVersion(): string {
  const native = getNativeBridge();
  return native?.appVersion?.() || __APP_VERSION__;
}

// A dedicated screen (not the old gear-icon-opens-a-modal shape) now that
// there's more here than just backup/restore -- reached from Home the
// same way GlobalSearch is, as Home-local state rather than its own
// App.tsx view, since it only ever needs what Home already has.
export function Settings({ data, onImport, onBack }: SettingsProps) {
  const [showBackup, setShowBackup] = useState(false);
  const [showTokushoho, setShowTokushoho] = useState(false);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  return (
    <div className="screen settings-screen">
      <header className="app-header">
        <button type="button" className="icon-btn" onClick={onBack} aria-label="뒤로">
          <BackIcon />
        </button>
        <h1>설정</h1>
      </header>

      <div className="screen-content">
        <div className="settings-row">
          <div className="settings-row-text">
            <b>백업</b>
            <span>카테고리와 데이터를 파일로 저장하거나 불러와요</span>
          </div>
          <button type="button" className="settings-row-btn" onClick={() => setShowBackup(true)}>
            관리
          </button>
        </div>

        <div className="settings-row">
          <div className="settings-row-text">
            <b>모든 데이터 삭제</b>
            <span>카테고리와 기록을 모두 지워요</span>
          </div>
          <button type="button" className="settings-row-btn danger" onClick={() => setConfirmDeleteAll(true)}>
            삭제
          </button>
        </div>

        <div className="settings-row">
          <div className="settings-row-text">
            <b>문의하기</b>
            <span>{CONTACT_EMAIL}</span>
          </div>
          <a className="settings-row-btn" href={`mailto:${CONTACT_EMAIL}`}>
            이메일
          </a>
        </div>

        {SHOW_TOKUSHOHO && (
          <div className="settings-row">
            <div className="settings-row-text">
              <b>特定商取引法に基づく表示</b>
              <span>앱 내 결제 관련 표시 사항</span>
            </div>
            <button type="button" className="settings-row-btn" onClick={() => setShowTokushoho(true)}>
              보기
            </button>
          </div>
        )}

        <p className="settings-version">나만의 서랍장 · {appVersion()}</p>
      </div>

      {showBackup && <BackupSheet data={data} onImport={onImport} onClose={() => setShowBackup(false)} />}

      {confirmDeleteAll && (
        <ConfirmDialog
          title="모든 데이터 삭제"
          message={`카테고리 ${data.categories.length}개, 데이터 ${data.entries.length}건이 모두 삭제돼요. 이 작업은 되돌릴 수 없어요. 계속할까요?`}
          confirmLabel="전체 삭제"
          danger
          onConfirm={() => {
            onImport({ version: 1, categories: [], entries: [] });
            setConfirmDeleteAll(false);
          }}
          onCancel={() => setConfirmDeleteAll(false)}
        />
      )}

      {showTokushoho && (
        <Modal title="特定商取引法に基づく表示" onClose={() => setShowTokushoho(false)}>
          <p className="modal-hint">나만의 서랍장 앱 내 결제 관련 표시 사항입니다.</p>
          <dl className="tokusho-list">
            <div className="tokusho-row">
              <dt>販売業者</dt>
              <dd>Howling Creative Studio（運営統括責任者：KIM EUN IL）</dd>
            </div>
            <div className="tokusho-row">
              <dt>所在地・電話番号</dt>
              <dd>ご請求をいただいた場合、遅滞なく開示いたします。下記メールアドレスまでご連絡ください。</dd>
            </div>
            <div className="tokusho-row">
              <dt>メールアドレス</dt>
              <dd>{CONTACT_EMAIL}</dd>
            </div>
            <div className="tokusho-row">
              <dt>販売価格</dt>
              <dd>未定（有料機能の提供開始時に表示します）</dd>
            </div>
            <div className="tokusho-row">
              <dt>商品代金以外の必要料金</dt>
              <dd>なし（通信料はお客様のご負担となります）</dd>
            </div>
            <div className="tokusho-row">
              <dt>お支払い方法・時期</dt>
              <dd>Google Playの決済システムにより、購入手続き完了時に即時決済されます。</dd>
            </div>
            <div className="tokusho-row">
              <dt>商品の提供時期</dt>
              <dd>決済完了後、直ちにアプリ内で該当機能が有効になります。</dd>
            </div>
            <div className="tokusho-row">
              <dt>返品・キャンセル</dt>
              <dd>
                デジタルコンテンツの性質上、購入手続き完了後の返品・返金は原則としてお受けできません。やむを得ない事情がある場合は上記メールアドレスまでご相談ください。
              </dd>
            </div>
            <div className="tokusho-row">
              <dt>動作環境</dt>
              <dd>Android 8.0（API 26）以上</dd>
            </div>
          </dl>
        </Modal>
      )}
    </div>
  );
}
