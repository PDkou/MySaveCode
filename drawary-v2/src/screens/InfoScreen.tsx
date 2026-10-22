import { useEffect, useState } from 'react';
import './InfoScreen.css';
import { getLang, t, tl } from '../i18n';

export type InfoDestination = 'privacy' | 'terms' | 'tokushoho';

export interface InfoScreenProps {
  onBack?: () => void;
  onNavigate?: (destination: InfoDestination) => void;
}

/**
 * #58 정보. Ported from `FINAL_STAGED_2026-10-14`'s `index.html` --
 * the real version-info dialog logic (Escape-to-close, backdrop-click-
 * to-close, focus management) ported 1:1. New
 * `brand_symbol_flower_small.webp` asset copied in.
 *
 * The version comes from package.json (__APP_VERSION__). "개인정보 처리방침"/"이용약관"/"특정상거래법 표기"
 * open the studio website through the caller. "오픈소스 라이선스" has no screen among the 59 approved designs,
 * so it opens a dialog of the same kind as the version dialog (text only, scrollable). Back -> #38.
 */

// The notices below are legal text and stay in English. Fonts: public/fonts/*/LICENSE.txt ships with the app too.
const MIT_TEXT = `MIT License

Copyright (c) Meta Platforms, Inc. and affiliates.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`;

const LICENSES: readonly { name: string; license: string; note?: string }[] = [
  { name: 'React, React DOM, Scheduler', license: 'MIT License', note: 'Copyright (c) Meta Platforms, Inc. and affiliates. Full text below.' },
  { name: 'Noto Sans KR, Noto Sans JP', license: 'SIL Open Font License, Version 1.1', note: 'Google Inc. https://openfontlicense.org' },
  { name: 'Google Play Billing Library', license: 'Apache License, Version 2.0', note: 'https://www.apache.org/licenses/LICENSE-2.0' },
];
export function InfoScreen({ onBack, onNavigate }: InfoScreenProps) {
  const [dialog, setDialog] = useState<'version' | 'licenses' | null>(null);

  useEffect(() => {
    if (!dialog) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setDialog(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [dialog]);

  return (
    <section className="info58-screen" aria-label={t('Drawary 정보 화면')}>
      <header className="info58-appbar">
        {onBack && <button className="info58-back" type="button" aria-label={t('이전 화면')} onClick={onBack} />}
        <span className="info58-appbar-title">{t('정보')}</span>
      </header>
      <section className="info58-brand" aria-label={t('Drawary 브랜드 소개')}>
        <img className="info58-flower" src="/assets/brand/brand_symbol_flower_small.webp" alt={t('Drawary 꽃 로고')} />
        <h1 className="info58-brand-name">Drawary</h1>
        <p className="info58-tagline">{tl('나만의 소중한 것들을,\n더 특별하게 간직해요.')}</p>
        <button className="info58-version-chip" type="button" onClick={() => setDialog('version')}>{t('버전 정보')}</button>
      </section>
      <div className="info58-content">
        <h2 className="info58-section-label">{t('앱 정보')}</h2>
        <section className="info58-card" aria-label={t('앱 정보 메뉴')}>
          <div className="info58-row"><span className="info58-item-name">{t('현재 버전')}</span><span className="info58-current-version">{__APP_VERSION__}</span></div>
          <button className="info58-row info58-row-action" type="button" onClick={() => onNavigate?.('privacy')}>
            <span className="info58-item-name">{t('개인정보 처리방침')}</span><span className="info58-chevron" aria-hidden="true" />
          </button>
          <button className="info58-row info58-row-action" type="button" onClick={() => onNavigate?.('terms')}>
            <span className="info58-item-name">{t('이용약관')}</span><span className="info58-chevron" aria-hidden="true" />
          </button>
          {getLang() === 'ja' && (
            <button className="info58-row info58-row-action" type="button" onClick={() => onNavigate?.('tokushoho')}>
              <span className="info58-item-name">{t('특정상거래법 표기')}</span><span className="info58-chevron" aria-hidden="true" />
            </button>
          )}
          <button className="info58-row info58-row-action" type="button" onClick={() => setDialog('licenses')}>
            <span className="info58-item-name">{t('오픈소스 라이선스')}</span><span className="info58-chevron" aria-hidden="true" />
          </button>
        </section>
        <h2 className="info58-section-label info58-about-label">{t('Drawary 소개')}</h2>
        <section className="info58-about-card">{t('Drawary는 서랍을 만들어 좋아하는 것들을 내 방식대로 기록해 두는 개인 정리 앱이에요.')}</section>
        <p className="info58-credit">Made by Howling Creative Studio</p>
      </div>
      {dialog === 'version' && (
        <div className="info58-overlay" onClick={(e) => { if (e.target === e.currentTarget) setDialog(null); }}>
          <section className="info58-dialog" role="dialog" aria-modal="true">
            <h2>{t('버전 정보')}</h2>
            <p>{t('버전 {version}', { version: __APP_VERSION__ })}</p>
            <button type="button" onClick={() => setDialog(null)}>{t('확인')}</button>
          </section>
        </div>
      )}
      {dialog === 'licenses' && (
        <div className="info58-overlay" onClick={(e) => { if (e.target === e.currentTarget) setDialog(null); }}>
          <section className="info58-dialog info58-dialog-licenses" role="dialog" aria-modal="true" aria-label={t('오픈소스 라이선스')}>
            <h2>{t('오픈소스 라이선스')}</h2>
            <div className="info58-license-body" tabIndex={0}>
              <p>{t('Drawary는 아래 오픈소스를 사용해요.')}</p>
              {LICENSES.map((item) => (
                <div className="info58-license-item" key={item.name}>
                  <strong>{item.name}</strong>
                  <span>{item.license}</span>
                  {item.note && <small>{item.note}</small>}
                </div>
              ))}
              <pre>{MIT_TEXT}</pre>
            </div>
            <button type="button" onClick={() => setDialog(null)}>{t('확인')}</button>
          </section>
        </div>
      )}
    </section>
  );
}
