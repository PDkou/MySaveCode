import { useState, type ReactNode } from 'react';
import { ScreenHeader } from '../components/ScreenHeader';
import './LanguageSettingsScreen.css';

export type LanguageCode = 'ko' | 'ja' | 'en';

export interface LanguageSettingsScreenProps {
  savedLanguage?: LanguageCode;
  onBack?: () => void;
  onCancel?: () => void;
  onApply?: (code: LanguageCode) => void;
}

const STRINGS: Record<LanguageCode, { heading: string; hint: string; cancel: string; apply: string; previous: string }> = {
  ko: { heading: '언어 설정', hint: '선택한 언어가 앱 전체에 적용돼요.', cancel: '취소', apply: '적용', previous: '이전 화면' },
  ja: { heading: '言語設定', hint: '選択した言語がアプリ全体に適用されます。', cancel: 'キャンセル', apply: '適用', previous: '前の画面' },
  en: { heading: 'Language settings', hint: 'The selected language will apply throughout the app.', cancel: 'Cancel', apply: 'Apply', previous: 'Back' },
};

const CARDS: { code: LanguageCode; name: string; desc: ReactNode; alt: string; asset: string }[] = [
  { code: 'ko', name: '한국어', desc: '앱 전체를 한국어로', alt: '한복을 입고 인사하는 Drawary 마스코트', asset: '/assets/language/language_ko.png' },
  { code: 'ja', name: '日本語', desc: 'アプリ全体を日本語に', alt: '기모노를 입고 인사하는 Drawary 마스코트', asset: '/assets/language/language_ja.png' },
  { code: 'en', name: 'English', desc: <>Use English throughout<br />the app</>, alt: '여행 가방을 들고 인사하는 Drawary 마스코트', asset: '/assets/language/language_en.png' },
];

/**
 * #54 언어 설정. Ported from
 * `Drawary_54_LANGUAGE_SETTINGS_CANDIDATE_2026-10-14`'s `index.html` --
 * the real card-selection + localization logic ported 1:1 (selecting a
 * card previews that language's own UI strings immediately; "취소"
 * resets the selection back to the last saved language without
 * applying). README.md: 의도적으로 흰색 패널을 씌우지 않음 -- the
 * 3-card layout itself IS the screen's structure, no wrapping panel
 * added (matched). New `language_ko/ja/en.png` assets copied in (the
 * archive's own files, as `.png` not `.webp`).
 *
 * Reached from #38's "언어 설정" row. The source itself only resets or
 * commits the selection and fires `onApply`/`onCancel`/`onBack` --
 * it never navigates on its own. App.tsx decides that both "취소" and
 * "적용" return to #38, since this is a settings screen with no next
 * step defined in the given source.
 */
export function LanguageSettingsScreen({ savedLanguage = 'ko', onBack, onCancel, onApply }: LanguageSettingsScreenProps) {
  const [saved, setSaved] = useState<LanguageCode>(savedLanguage);
  const [selected, setSelected] = useState<LanguageCode>(savedLanguage);
  const t = STRINGS[selected];

  return (
    <main className="lang54-screen" lang={selected} aria-label="언어 설정">
      <ScreenHeader
        title={t.heading}
        onBack={onBack}
        backLabel={t.previous}
        style={{ position: 'absolute', top: 93, height: 50, width: '100%' }}
      />
      <section className="lang54-form" aria-label="언어 선택">
        {CARDS.map((card) => (
          <button
            key={card.code}
            type="button"
            className={`lang54-card${selected === card.code ? ' is-selected' : ''}`}
            data-lang={card.code}
            aria-pressed={selected === card.code}
            onClick={() => setSelected(card.code)}
          >
            <img className="lang54-art" src={card.asset} alt={card.alt} />
            <span className="lang54-card-copy"><strong>{card.name}</strong><span>{card.desc}</span></span>
            <span className="lang54-check" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M5 12l5 5L20 7" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
          </button>
        ))}
        <p className="lang54-footer-note">{t.hint}</p>
        <div className="lang54-actions">
          <button className="lang54-cancel" type="button" onClick={() => { setSelected(saved); onCancel?.(); }}>{t.cancel}</button>
          <button className="lang54-apply" type="button" onClick={() => { setSaved(selected); onApply?.(selected); }}>{t.apply}</button>
        </div>
      </section>
    </main>
  );
}
